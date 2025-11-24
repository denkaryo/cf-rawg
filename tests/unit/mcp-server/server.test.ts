import { describe, test, expect } from 'vitest';
import { createMCPServer } from '../../../src/mcp-server/server';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

describe('MCP Server', () => {
  const mockRawgApiKey = 'test-api-key';

  test('creates server instance', () => {
    const server = createMCPServer({ rawgApiKey: mockRawgApiKey });
    expect(server).toBeDefined();
  });

  test('has request handlers registered', () => {
    const server = createMCPServer({ rawgApiKey: mockRawgApiKey });
    const handlers = (server as any)._requestHandlers;
    expect(handlers).toBeDefined();
    expect(handlers.has('tools/list')).toBe(true);
    expect(handlers.has('tools/call')).toBe(true);
  });

  test('lists available tools', async () => {
    const server = createMCPServer({ rawgApiKey: mockRawgApiKey });
    
    const request = ListToolsRequestSchema.parse({
      method: 'tools/list',
      params: {},
    });

    const handler = (server as any)._requestHandlers.get('tools/list');
    const result = await handler(request, {});

    expect(result.tools).toBeDefined();
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools.length).toBe(2);
    expect(result.tools.some((t: any) => t.name === 'fetch_game_data')).toBe(true);
    expect(result.tools.some((t: any) => t.name === 'execute_calculation')).toBe(true);
  });
});

