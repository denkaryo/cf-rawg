import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

export async function handleMCPRequest(
  request: Request,
  server: Server
): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

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
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
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
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
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
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
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
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  }

  if (request.method === 'GET') {
    return new Response('MCP Server is running', {
      headers: { 
        'Content-Type': 'text/plain',
        ...corsHeaders,
      },
    });
  }

  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders,
  });
}
