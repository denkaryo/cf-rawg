import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

export async function handleMCPRequest(
  request: Request,
  server: Server
): Promise<Response> {
  if (request.method === 'POST') {
    try {
      const body = await request.text();
      const message = JSON.parse(body);

      if (!message.method) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: message.id || null,
            error: { code: -32600, message: 'Invalid Request' },
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const handler = (server as any)._requestHandlers?.get(message.method);
      if (!handler) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: message.id || null,
            error: { code: -32601, message: `Method not found: ${message.method}` },
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const result = await handler(
        { method: message.method, params: message.params || {} },
        {}
      );

      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: message.id || null,
          result,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: error instanceof Error ? error.message : String(error),
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  if (request.method === 'GET') {
    return new Response('MCP Server is running', {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
