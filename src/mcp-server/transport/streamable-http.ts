import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

interface SessionState {
  sessionId: string;
  messages: JSONRPCMessage[];
  controller?: ReadableStreamDefaultController;
}

const sessions = new Map<string, SessionState>();

function generateSessionId(): string {
  return crypto.randomUUID();
}

function createSSEMessage(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function handleStreamableHTTPRequest(
  request: Request,
  server: Server
): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = request.headers.get('mcp-session-id') || url.searchParams.get('sessionId');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id',
    'Access-Control-Expose-Headers': 'mcp-session-id',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method === 'GET') {
    const newSessionId = sessionId || generateSessionId();
    
    const stream = new ReadableStream({
      start(controller) {
        const session: SessionState = {
          sessionId: newSessionId,
          messages: [],
          controller,
        };
        sessions.set(newSessionId, session);
        // Do not send any non-JSON-RPC events on connect.
        // The SSE stream should only carry JSON-RPC messages.
      },
      cancel() {
        sessions.delete(newSessionId);
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'mcp-session-id': newSessionId,
        ...corsHeaders,
      },
    });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.text();
      const message = JSON.parse(body) as JSONRPCMessage;
      const req: any = message as any;
      const method: string | undefined = typeof req.method === 'string' ? req.method : undefined;
      const id: string | number | undefined = req.id as any;

      // Handle JSON-RPC notifications (no id) gracefully
      if (id === undefined) {
        // Accept standard MCP notifications like notifications/initialized
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      }

      if (!method) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0' as const,
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

      const handler = (server as any)._requestHandlers?.get(method);
      if (!handler) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0' as const,
            id,
            error: { code: -32601, message: `Method not found: ${method}` },
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
        { method, params: (req as any).params || {} },
        {}
      );

      const response: any = {
        jsonrpc: '2.0' as const,
        id,
        result,
      };

      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!;
        session.messages.push(response as any);
        if (session.controller) {
          session.controller.enqueue(
            new TextEncoder().encode(createSSEMessage(response))
          );
        }
      }

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...(sessionId && { 'mcp-session-id': sessionId }),
            ...corsHeaders,
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          // For parse errors, JSON-RPC allows id to be omitted or null.
          // Omit the id to satisfy strict validators.
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

  if (request.method === 'DELETE') {
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      if (session.controller) {
        session.controller.close();
      }
      sessions.delete(sessionId);
    }

    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders,
  });
}

