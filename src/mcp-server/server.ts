import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { RAWGClient } from '../rawg/client';
import { handleFetchGameData } from './tools/fetch-game-data';
import { handleExecuteCalculation } from './tools/execute-calculation';
import { fetchGameDataTool, executeCalculationTool } from './tools/index.js';

export interface MCPServerOptions {
  rawgApiKey: string;
}

export function createMCPServer(options: MCPServerOptions) {
  const server = new Server(
    {
      name: 'game-analytics-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const rawgClient = new RAWGClient(options.rawgApiKey);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [fetchGameDataTool, executeCalculationTool],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'fetch_game_data') {
      const result = await handleFetchGameData(args as any, rawgClient);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'execute_calculation') {
      const result = await handleExecuteCalculation(args as any);
      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: result.error, executionTime: result.executionTime }, null, 2),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  return server;
}

