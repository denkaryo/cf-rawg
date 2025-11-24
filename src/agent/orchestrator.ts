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

    