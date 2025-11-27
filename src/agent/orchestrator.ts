import { generateText, tool } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { InternalMCPClient } from './mcp-client';

export type LLMProvider = 'openai' | 'anthropic';

export interface AgentResponse {
  answer: string;
  toolCalls: Array<{
    tool: string;
    args: any;
    result: any;
  }>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
  model?: string;
}

export class AgentOrchestrator {
  private mcpClient: InternalMCPClient;
  private provider: LLMProvider;
  private openaiProvider?: ReturnType<typeof createOpenAI>;
  private anthropicProvider?: ReturnType<typeof createAnthropic>;
  private modelId: string;

  constructor(
    rawgApiKey: string,
    options: {
      provider?: LLMProvider;
      openaiApiKey?: string;
      anthropicApiKey?: string;
      modelName?: string;
    }
  ) {
    this.mcpClient = new InternalMCPClient(rawgApiKey);
    
    // Default to OpenAI
    this.provider = options.provider || 'openai';
    
    // Initialize OpenAI provider
    if (this.provider === 'openai') {
      if (!options.openaiApiKey || options.openaiApiKey.trim().length === 0) {
        throw new Error('OpenAI API key is required when using OpenAI provider');
      }
      try {
        this.openaiProvider = createOpenAI({
          apiKey: options.openaiApiKey.trim(),
        });
      } catch (error) {
        throw new Error(`Failed to initialize OpenAI provider: ${error instanceof Error ? error.message : String(error)}`);
      }
      // Default OpenAI model
      this.modelId = options.modelName || 'gpt-4o-mini';
    } else {
      // Initialize Anthropic provider
      if (!options.anthropicApiKey || options.anthropicApiKey.trim().length === 0) {
        throw new Error('Anthropic API key is required when using Anthropic provider');
      }
      try {
        this.anthropicProvider = createAnthropic({
          apiKey: options.anthropicApiKey.trim(),
        });
      } catch (error) {
        throw new Error(`Failed to initialize Anthropic provider: ${error instanceof Error ? error.message : String(error)}`);
      }
      // Default Anthropic model
      this.modelId = options.modelName || 'claude-3-5-haiku-20241022';
    }
  }

  async processQuery(userQuery: string): Promise<AgentResponse> {
    return this.processQueryWithHistory([
      { role: 'user' as const, content: userQuery },
    ]);
  }

  async processQueryWithHistory(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<AgentResponse> {
    const tools = await this.buildTools();

    // Get the appropriate model based on provider
    let model;
    if (this.provider === 'openai' && this.openaiProvider) {
      model = this.openaiProvider(this.modelId);
      console.log(`[AgentOrchestrator] Using OpenAI model: ${this.modelId}`);
    } else if (this.provider === 'anthropic' && this.anthropicProvider) {
      model = this.anthropicProvider(this.modelId);
      console.log(`[AgentOrchestrator] Using Anthropic model: ${this.modelId}`);
    } else {
      throw new Error(`Provider ${this.provider} is not properly initialized`);
    }

    const systemPrompt = this.buildSystemPrompt();

    const result = await generateText({
      model,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      tools,
      maxSteps: 10, // Increased to allow for multiple tool calls + final response generation
    });

    // Log model verification from response (if available)
    if ((result as any).response?.model) {
      console.log(`[AgentOrchestrator] Response model: ${(result as any).response.model}`);
    }

    const toolCalls: AgentResponse['toolCalls'] = [];
    
    if (result.steps) {
      for (const step of result.steps) {
        const stepAny = step as any;
        if (stepAny.stepType === 'tool-call' || stepAny.toolCalls) {
          const calls = stepAny.toolCalls || [stepAny];
          for (const call of calls) {
            toolCalls.push({
              tool: call.toolName || call.toolCallId || 'unknown',
              args: call.args || {},
              result: stepAny.result || call.result || null,
            });
          }
        } else if (stepAny.stepType === 'tool-result') {
          const lastCall = toolCalls[toolCalls.length - 1];
          if (lastCall) {
            lastCall.result = stepAny.result || stepAny;
          }
        }
      }
    }

    // Check if we have a final answer
    // If result.text is empty but we have tool calls, the LLM might have stopped after tool calls
    // In this case, we should still return something meaningful
    let finalAnswer = result.text;
    
    if (!finalAnswer || finalAnswer.trim().length === 0) {
      if (toolCalls.length > 0) {
        // LLM completed tool calls but didn't generate a final response
        // This shouldn't happen with proper prompting, but handle it gracefully
        console.warn(`[AgentOrchestrator] WARNING: No final answer generated after ${toolCalls.length} tool calls`);
        finalAnswer = 'I completed the calculations. Please review the tool call results above.';
      } else {
        finalAnswer = 'I processed your query but did not generate a response.';
      }
    }

    // Log detailed information for debugging
    console.log(`[AgentOrchestrator] Response prepared with model: ${this.modelId}`);
    console.log(`[AgentOrchestrator] Tool calls: ${toolCalls.length}`);
    console.log(`[AgentOrchestrator] Final answer length: ${finalAnswer?.length || 0} characters`);
    console.log(`[AgentOrchestrator] Finish reason: ${(result as any).finishReason || 'unknown'}`);
    console.log(`[AgentOrchestrator] Tokens: ${result.usage?.promptTokens || 0}/${result.usage?.completionTokens || 0}`);

    const response = {
      answer: finalAnswer,
      toolCalls,
      usage: result.usage,
      model: this.modelId,
    };
    
    return response;
  }

  private async buildTools() {
    const mcpTools = await this.mcpClient.listTools();

    const tools: Record<string, any> = {};

    for (const mcpTool of mcpTools) {
      if (mcpTool.name === 'fetch_game_data') {
        tools.fetch_game_data = tool({
          description: mcpTool.description,
          parameters: z.object({
            platform: z.string().optional().describe("Platform ID (use these IDs): PC=4, PlayStation 5=187, PlayStation 4=18, Xbox Series X/S=186, Xbox One=1, Nintendo Switch=7"),
            genre: z.string().optional().describe("Genre ID or slug (e.g., 'action', '4')"),
            dates: z.string().optional().describe("Date range in format 'YYYY-MM-DD,YYYY-MM-DD'"),
            metacritic: z.string().optional().describe("Metacritic score range in format 'min,max'"),
            page_size: z.number().optional().describe('Number of results per page (default: 20, max: 40). IMPORTANT: Use 20-30 for most queries. This provides sufficient sample size for statistical calculations while keeping responses efficient. Only use larger values if explicitly needed.'),
          }),
          execute: async (args: any) => {
            return await this.mcpClient.callTool('fetch_game_data', args);
          },
        });
      }

      if (mcpTool.name === 'execute_calculation') {
        tools.execute_calculation = tool({
          description: mcpTool.description,
          parameters: z.object({
            code: z.string().describe('JavaScript code to execute. Should return a value.'),
            data: z.record(z.any()).describe('REQUIRED: Data to make available to the code execution context. Pass the result from fetch_game_data as this parameter (e.g., {games: [...]}).'),
          }),
          execute: async (args: any) => {
            return await this.mcpClient.callTool('execute_calculation', args);
          },
        });
      }
    }

    return tools;
  }

  private buildSystemPrompt(): string {
    const currentDate = this.getCurrentDate();
    
    return `You are an AI assistant specialized in analyzing video game data from the RAWG API. Your role is to help users answer analytical questions about video games by fetching data and performing calculations.

## Current Date
Today's date is: ${currentDate}

Use this date when interpreting relative time references (e.g., "this year", "last month", "Q1 2024") or when calculating date ranges for queries.

## Your Workflow

When answering analytical questions, follow this three-step process:

1. **Fetch Data First**: Use the \`fetch_game_data\` tool to retrieve game data based on the user's query (platform, genre, date range, etc.)
2. **Calculate Results**: Use the \`execute_calculation\` tool to perform calculations on the fetched data
   - **CRITICAL**: You MUST pass the result from \`fetch_game_data\` as the \`data\` parameter
   - Format: \`{code: "...", data: {games: [...]}}\`
   - The \`data\` parameter is REQUIRED - always include it!
3. **Provide Final Answer**: After completing calculations, ALWAYS provide a clear, natural language explanation of the results to answer the user's question. Do not stop after tool calls - you must explain what the results mean and answer the original question.

## Efficiency Guidelines ⚡

**CRITICAL**: Always prioritize efficiency to ensure fast responses:

1. **Page Size**: Always use \`page_size: 20\` or \`page_size: 30\` when calling \`fetch_game_data\`
   - For statistical queries (averages, comparisons), 20-30 games provides sufficient sample size
   - Larger samples don't significantly improve accuracy for most calculations
   - Only fetch more if explicitly needed for specific analysis (e.g., "top 50 games")
   - Default is 20 if you don't specify, which is optimal for most queries

2. **Data Requirements**: Only fetch what you need
   - For Metacritic score queries: Only need \`metacritic\` field (already included in minimal response)
   - For rating queries: Only need \`rating\` field (already included)
   - For date-based queries: Only need \`released\` field (already included)
   - Nested data (platforms, genres arrays) are automatically excluded unless filtering by platform/genre

3. **Avoid Over-Fetching**: 
   - Don't fetch multiple pages unless absolutely necessary
   - A single fetch with 20-30 games is usually sufficient for calculations
   - If response includes \`summary\` field, you can use those stats directly without fetching more

## Understanding Data Structures

### fetch_game_data Response
The \`fetch_game_data\` tool returns an object with this structure:
\`\`\`json
{
  "games": [
    {
      "id": 123,
      "name": "Game Name",
      "metacritic": 85,  // Can be null/undefined - filter these out!
      "rating": 4.5,     // RAWG community rating (0-5 scale)
      "released": "2024-01-15"
      // Note: platforms/genres arrays are only included if filtering by platform/genre
    }
  ],
  "count": 100,          // Total count available (may be larger than games.length)
  "filters": {...},
  "summary": {            // Optional: Included if response was truncated
    "totalCount": 100,
    "shown": 20,
    "avgMetacritic": 82.5,
    "avgRating": 4.2,
    "minMetacritic": 60,
    "maxMetacritic": 95
  },
  "truncated": true,      // Optional: True if response was truncated
  "warning": "...",      // Optional: warnings about data coverage
  "suggestion": "..."   // Optional: suggestions for better data
}
\`\`\`

**Important**: If \`summary\` is present, you can use those statistics directly for calculations without needing to process all games. The summary includes averages calculated from ALL matching games, not just the ones shown.

### execute_calculation Usage
The \`execute_calculation\` tool requires **BOTH** parameters:
- \`code\`: JavaScript code that returns a value
- \`data\`: **REQUIRED** - An object containing the data to analyze (typically \`{games: [...]}\`)

**IMPORTANT**: Always pass the result from \`fetch_game_data\` as the \`data\` parameter!

The code has access to:
- The \`data\` object passed in (e.g., \`data.games\` to access the games array)
- Helper functions: \`avg()\`, \`sum()\`, \`max()\`, \`min()\`, \`groupBy()\`
- Standard JavaScript: Math, Array methods, etc.

### Complete Tool Call Example

When calling \`execute_calculation\`, you MUST provide both \`code\` and \`data\`:

\`\`\`json
{
  "code": "const gamesWithScore = data.games.filter(g => g.metacritic !== null); const scores = gamesWithScore.map(g => g.metacritic); return scores.length > 0 ? avg(scores) : null;",
  "data": {
    "games": [
      {"id": 1, "name": "Game 1", "metacritic": 85, "rating": 4.5},
      {"id": 2, "name": "Game 2", "metacritic": 90, "rating": 4.7}
    ]
  }
}
\`\`\`

**Remember**: The \`data\` parameter should contain the result from your \`fetch_game_data\` call!

## Calculation Examples

### Example 1: Average Metacritic Score

**Step 1**: Fetch games
\`\`\`json
{
  "tool": "fetch_game_data",
  "args": {"platform": "4", "dates": "2024-01-01,2024-12-31", "page_size": 20}
}
\`\`\`

**Step 2**: Calculate average (pass the result from Step 1 as \`data\`)
\`\`\`json
{
  "tool": "execute_calculation",
  "args": {
    "code": "const gamesWithScore = data.games.filter(g => g.metacritic !== null && g.metacritic !== undefined); const scores = gamesWithScore.map(g => g.metacritic); return scores.length > 0 ? avg(scores) : null;",
    "data": {
      "games": [...]  // Pass the games array from fetch_game_data result here!
    }
  }
}
\`\`\`

**Code only** (for reference):
\`\`\`javascript
// Filter games with Metacritic scores and calculate average
const gamesWithScore = data.games.filter(g => g.metacritic !== null && g.metacritic !== undefined);
const scores = gamesWithScore.map(g => g.metacritic);
return scores.length > 0 ? avg(scores) : null;
\`\`\`

### Example 2: Group by Genre and Calculate Averages

**Step 1**: Fetch games (with genres included)
\`\`\`json
{
  "tool": "fetch_game_data",
  "args": {"genre": "action", "dates": "2023-01-01,2023-12-31", "page_size": 20}
}
\`\`\`

**Step 2**: Calculate averages per genre (pass result from Step 1 as \`data\`)
\`\`\`json
{
  "tool": "execute_calculation",
  "args": {
    "code": "const grouped = groupBy(data.games, 'genres'); const result = {}; for (const genre in grouped) { const games = grouped[genre]; const ratings = games.map(g => g.rating).filter(r => r !== null); result[genre] = ratings.length > 0 ? avg(ratings) : null; } return result;",
    "data": {
      "games": [...]  // Pass the games array from fetch_game_data result here!
    }
  }
}
\`\`\`

**Code only** (for reference):
\`\`\`javascript
// Group games by genre and calculate average rating per genre
const grouped = groupBy(data.games, 'genres');
const result = {};
for (const genre in grouped) {
  const games = grouped[genre];
  const ratings = games.map(g => g.rating).filter(r => r !== null);
  result[genre] = ratings.length > 0 ? avg(ratings) : null;
}
return result;
\`\`\`

### Example 3: Count Games by Platform

**Step 1**: Fetch games (with platforms included - filter by platform to ensure platforms array is included)
\`\`\`json
{
  "tool": "fetch_game_data",
  "args": {"platform": "4", "page_size": 20}
}
\`\`\`

**Step 2**: Count games per platform (pass result from Step 1 as \`data\`)
\`\`\`json
{
  "tool": "execute_calculation",
  "args": {
    "code": "const platformCounts = {}; data.games.forEach(game => { if (game.platforms) { game.platforms.forEach(platform => { const platformName = platform.platform.name; platformCounts[platformName] = (platformCounts[platformName] || 0) + 1; }); } }); return platformCounts;",
    "data": {
      "games": [...]  // Pass the games array from fetch_game_data result here!
    }
  }
}
\`\`\`

**Code only** (for reference):
\`\`\`javascript
// Count games per platform
const platformCounts = {};
data.games.forEach(game => {
  if (game.platforms) {
    game.platforms.forEach(platform => {
      const platformName = platform.platform.name;
      platformCounts[platformName] = (platformCounts[platformName] || 0) + 1;
    });
  }
});
return platformCounts;
\`\`\`

## Important Guidelines

1. **ALWAYS pass the \`data\` parameter**: When calling \`execute_calculation\`, you MUST include both \`code\` and \`data\` parameters. Pass the result from \`fetch_game_data\` as \`data\`.
2. **ALWAYS provide a final answer**: After completing tool calls, you MUST provide a natural language response explaining the results and answering the user's question. Never stop after just calling tools - always explain what the results mean.
3. **Always filter null/undefined values** before calculations (especially for Metacritic scores)
4. **Handle empty arrays**: Check if data exists before calculating averages
5. **Use helper functions**: Prefer \`avg()\`, \`sum()\`, etc. over manual calculations
6. **Check for warnings**: If \`fetch_game_data\` returns warnings about data coverage, mention this to the user
7. **Return meaningful results**: Always return the final calculated value, not intermediate steps
8. **Error handling**: If calculation fails, explain what went wrong and suggest alternatives
9. **Explain your reasoning**: When providing the final answer, briefly explain how you arrived at the conclusion (e.g., "I fetched X games and calculated the average rating per genre, finding that Y genre had the highest average rating of Z")

## Common Query Patterns

- **"Average X for Y games"**: Fetch games matching Y criteria with \`page_size: 20\`, then calculate average of X field. If response includes \`summary.avgX\`, use that directly.
- **"Which genre/platform has highest..."**: Fetch games with \`page_size: 20-30\`, group by genre/platform, calculate averages, find max
- **"Compare X vs Y"**: Fetch data for both X and Y with \`page_size: 20\` each, calculate metrics for each, compare results

## Metacritic Score Limitations

Metacritic scores have limited coverage in RAWG database:
- Best coverage: 2001-2010 (5-15% of games)
- Declining coverage: 2011-2021 (0.1-1% of games)
- Very sparse: 2022+ (less than 0.1% of games)
- 2024: Only 2 games total have Metacritic scores

If Metacritic data is sparse or unavailable, suggest using the \`rating\` field instead, which has 85-100% coverage for most years.

## Platform IDs Reference

When filtering by platform, use these numeric IDs:
- PC = 4
- PlayStation 5 = 187
- PlayStation 4 = 18
- Xbox Series X/S = 186
- Xbox One = 1
- Nintendo Switch = 7
- macOS = 5
- Linux = 6
- iOS = 3
- Android = 21

Remember: Always fetch data first, then perform calculations. Never try to calculate without fetching data first.`;
  }

  private getCurrentDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    return `${weekday}, ${year}-${month}-${day}`;
  }
}

    
    
    