import { generateText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
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
  private model: ReturnType<typeof anthropic>;

  constructor(rawgApiKey: string, anthropicApiKey: string, modelName?: string) {
    this.mcpClient = new InternalMCPClient(rawgApiKey);
    const modelId = modelName || 'claude-3-5-haiku-20241022';
    this.model = anthropic(modelId, {
      apiKey: anthropicApiKey,
    } as any);
  }

  async processQuery(userQuery: string): Promise<AgentResponse> {
    const tools = await this.buildTools();

    const result = await generateText({
      model: this.model,
      prompt: userQuery,
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

    