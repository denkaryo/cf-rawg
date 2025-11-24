import { createMCPServer } from '../mcp-server/server';
import { handleMCPRequest } from '../mcp-server/transport/http';

export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}

export class InternalMCPClient {
  private server: ReturnType<typeof createMCPServer>;

  constructor(rawgApiKey: string) {
    this.server = createMCPServer({ rawgApiKey });
  }

  async listTools(): Promise<Tool[]> {
    const request = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });

    const response = await handleMCPRequest(request, this.server);
    const result = await response.json() as any;

    if (result.error) {
      throw new Error(`MCP error: ${result.error.message}`);
    }

    return result.result?.tools || [];
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    const request = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      }),
    });

    const response = await handleMCPRequest(request, this.server);
    const result = await response.json() as any;

    if (result.error) {
      throw new Error(`MCP error: ${result.error.message}`);
    }

    if (result.result?.content && result.result.content.length > 0) {
      const content = result.result.content[0];
      if (content.type === 'text') {
        return JSON.parse(content.text);
      }
      return content;
    }

    return result.result;
  }
}

