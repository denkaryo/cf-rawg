export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response('Hello from Game Analytics MCP Server', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};

interface Env {
  RAWG_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  CLAUDE_MODEL?: string;
}

