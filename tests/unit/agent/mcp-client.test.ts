import { describe, test, expect, vi, beforeEach } from 'vitest';
import { InternalMCPClient } from '../../../src/agent/mcp-client';
import { createMCPServer } from '../../../src/mcp-server/server';
import { handleMCPRequest } from '../../../src/mcp-server/transport/http';

vi.mock('../../../src/mcp-server/server');
vi.mock('../../../src/mcp-server/transport/http');

describe('InternalMCPClient', () => {
  const mockRawgApiKey = 'test-api-key';
  let client: InternalMCPClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new InternalMCPClient(mockRawgApiKey);
  });

  test('calls tools correctly', async () => {
    const mockServer = createMCPServer({ rawgApiKey: mockRawgApiKey });
    
    vi.mocked(handleMCPRequest).mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ result: 30, success: true }),
              },
            ],
          },
        }),
        { status: 200 }
      )
    );

    const result = await client.callTool('execute_calculation', {
      code: 'return avg(data)',
      data: { data: [10, 20, 30, 40, 50] },
    });

    expect(result.result).toBe(30);
    expect(result.success).toBe(true);
  });

  test('lists tools correctly', async () => {
    const mockServer = createMCPServer({ rawgApiKey: mockRawgApiKey });
    
    vi.mocked(handleMCPRequest).mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            tools: [
              { name: 'fetch_game_data', description: 'Fetch games' },
              { name: 'execute_calculation', description: 'Execute code' },
            ],
          },
        }),
        { status: 200 }
      )
    );

    const tools = await client.listTools();

    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('fetch_game_data');
    expect(tools[1].name).toBe('execute_calculation');
  });

  test('handles errors', async () => {
    vi.mocked(handleMCPRequest).mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          error: { code: -32601, message: 'Tool not found' },
        }),
        { status: 404 }
      )
    );

    await expect(
      client.callTool('invalid_tool', {})
    ).rejects.toThrow('MCP error: Tool not found');
  });
});

