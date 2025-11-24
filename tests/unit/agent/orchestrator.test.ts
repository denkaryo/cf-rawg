import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AgentOrchestrator } from '../../../src/agent/orchestrator';
import { InternalMCPClient } from '../../../src/agent/mcp-client';

vi.mock('../../../src/agent/mcp-client');

describe('Agent Orchestrator', () => {
  const mockRawgApiKey = 'test-rawg-key';
  const mockAnthropicApiKey = 'test-anthropic-key';
  let orchestrator: AgentOrchestrator;
  let mockMcpClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockMcpClient = {
      listTools: vi.fn(),
      callTool: vi.fn(),
    };

    vi.mocked(InternalMCPClient).mockImplementation(() => mockMcpClient as any);
    orchestrator = new AgentOrchestrator(mockRawgApiKey, mockAnthropicApiKey);
  });

  test('converts MCP tools to AI SDK format', async () => {
    mockMcpClient.listTools.mockResolvedValue([
      {
        name: 'fetch_game_data',
        description: 'Fetch games',
        inputSchema: {},
      },
      {
        name: 'execute_calculation',
        description: 'Execute code',
        inputSchema: {},
      },
    ]);

    const tools = await (orchestrator as any).buildTools();

    expect(tools.fetch_game_data).toBeDefined();
    expect(tools.execute_calculation).toBeDefined();
    expect(tools.fetch_game_data.description).toBe('Fetch games');
    expect(tools.execute_calculation.description).toBe('Execute code');
  });

  test('builds tools with correct parameters', async () => {
    mockMcpClient.listTools.mockResolvedValue([
      {
        name: 'fetch_game_data',
        description: 'Fetch games',
        inputSchema: {},
      },
    ]);

    const tools = await (orchestrator as any).buildTools();

    expect(tools.fetch_game_data).toBeDefined();
    expect(tools.fetch_game_data.execute).toBeDefined();
    expect(typeof tools.fetch_game_data.execute).toBe('function');
  });

  test('tool execute functions call MCP client', async () => {
    mockMcpClient.listTools.mockResolvedValue([
      {
        name: 'fetch_game_data',
        description: 'Fetch games',
        inputSchema: {},
      },
    ]);

    mockMcpClient.callTool.mockResolvedValue({
      games: [{ name: 'Test Game' }],
      count: 1,
    });

    const tools = await (orchestrator as any).buildTools();
    const result = await tools.fetch_game_data.execute({
      platform: '4',
    });

    expect(mockMcpClient.callTool).toHaveBeenCalledWith('fetch_game_data', {
      platform: '4',
    });
    expect(result.games).toBeDefined();
  });
});

