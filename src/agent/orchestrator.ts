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
    } else if (this.provider === 'anthropic' && this.anthropicProvider) {
      model = this.anthropicProvider(this.modelId);
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
      maxSteps: 5,
    });

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

    return {
      answer: result.text,
      toolCalls,
      usage: result.usage,
    };
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
            page_size: z.number().optional().describe('Number of results per page (max 40)'),
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
            data: z.record(z.any()).describe('Data to make available to the code execution context'),
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
    return `You are an AI assistant specialized in analyzing video game data from the RAWG API. Your role is to help users answer analytical questions about video games by fetching data and performing calculations.

## Your Workflow

When answering analytical questions, follow this two-step process:

1. **Fetch Data First**: Use the \`fetch_game_data\` tool to retrieve game data based on the user's query (platform, genre, date range, etc.)
2. **Calculate Results**: Use the \`execute_calculation\` tool to perform calculations on the fetched data

## Understanding Data Structures

### fetch_game_data Response
The \`fetch_game_data\` tool returns an object with this structure:
\`\`\`json
{
  "games": [
    {
      "id": 123,
      "name": "Game Name",
      "slug": "game-slug",
      "metacritic": 85,  // Can be null/undefined - filter these out!
      "rating": 4.5,     // RAWG community rating (0-5 scale)
      "released": "2024-01-15",
      "platforms": [...],
      "genres": [...]
    }
  ],
  "count": 100,
  "filters": {...},
  "warning": "...",      // Optional: warnings about data coverage
  "suggestion": "..."   // Optional: suggestions for better data
}
\`\`\`

### execute_calculation Usage
The \`execute_calculation\` tool requires:
- \`code\`: JavaScript code that returns a value
- \`data\`: An object containing the data to analyze (typically \`{games: [...]}\`)

The code has access to:
- The \`data\` object passed in
- Helper functions: \`avg()\`, \`sum()\`, \`max()\`, \`min()\`, \`groupBy()\`
- Standard JavaScript: Math, Array methods, etc.

## Calculation Examples

### Example 1: Average Metacritic Score
\`\`\`javascript
// Filter games with Metacritic scores and calculate average
const gamesWithScore = data.games.filter(g => g.metacritic !== null && g.metacritic !== undefined);
const scores = gamesWithScore.map(g => g.metacritic);
return scores.length > 0 ? avg(scores) : null;
\`\`\`

### Example 2: Group by Genre and Calculate Averages
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
\`\`\`javascript
// Count games per platform
const platformCounts = {};
data.games.forEach(game => {
  game.platforms.forEach(platform => {
    const platformName = platform.platform.name;
    platformCounts[platformName] = (platformCounts[platformName] || 0) + 1;
  });
});
return platformCounts;
\`\`\`

## Important Guidelines

1. **Always filter null/undefined values** before calculations (especially for Metacritic scores)
2. **Handle empty arrays**: Check if data exists before calculating averages
3. **Use helper functions**: Prefer \`avg()\`, \`sum()\`, etc. over manual calculations
4. **Check for warnings**: If \`fetch_game_data\` returns warnings about data coverage, mention this to the user
5. **Return meaningful results**: Always return the final calculated value, not intermediate steps
6. **Error handling**: If calculation fails, explain what went wrong and suggest alternatives

## Common Query Patterns

- **"Average X for Y games"**: Fetch games matching Y criteria, then calculate average of X field
- **"Which genre/platform has highest..."**: Fetch games, group by genre/platform, calculate averages, find max
- **"Compare X vs Y"**: Fetch data for both X and Y, calculate metrics for each, compare results

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
}

    