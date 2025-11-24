import { generateText, tool } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { InternalMCPClient } from './mcp-client';

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
  private anthropicProvider: ReturnType<typeof createAnthropic>;
  private modelId: string;

  constructor(rawgApiKey: string, anthropicApiKey: string, modelName?: string) {
    if (!anthropicApiKey || anthropicApiKey.trim().length === 0) {
      throw new Error('Anthropic API key is required and cannot be empty');
    }
    
    this.mcpClient = new InternalMCPClient(rawgApiKey);
    this.modelId = modelName || 'claude-3-5-haiku-20241022';
    
    try {
      this.anthropicProvider = createAnthropic({
        apiKey: anthropicApiKey.trim(),
      });
    } catch (error) {
      throw new Error(`Failed to initialize Anthropic provider: ${error instanceof Error ? error.message : String(error)}`);
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

    const model = this.anthropicProvider(this.modelId);

    const result = await generateText({
      model,
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
            platform: z.string().optional().describe("Platform ID or slug (e.g., 'pc', '4' for PC)"),
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
}

    