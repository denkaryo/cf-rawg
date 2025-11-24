import { createMCPServer } from './mcp-server/server';
import { handleMCPRequest } from './mcp-server/transport/http';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/mcp')) {
      if (!env.RAWG_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'RAWG_API_KEY not configured' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const server = createMCPServer({ rawgApiKey: env.RAWG_API_KEY });
      return handleMCPRequest(request, server);
    }

    return new Response('Game Analytics MCP Server', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};

interface Env {
  RAWG_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  CLAUDE_MODEL?: string;
}
