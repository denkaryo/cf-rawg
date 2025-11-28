import { createMCPServer } from './mcp-server/server';
import { handleMCPRequest } from './mcp-server/transport/http';
import { AgentOrchestrator } from './agent/orchestrator';
import { getChatUIHTML } from './ui/chat';

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

    if (url.pathname === '/api/debug' && request.method === 'GET') {
      const provider = (env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic';
      const modelName = provider === 'openai' ? env.OPENAI_MODEL : env.CLAUDE_MODEL;
      
      return new Response(
        JSON.stringify({
          hasRawgKey: !!env.RAWG_API_KEY,
          rawgKeyLength: env.RAWG_API_KEY?.length || 0,
          hasOpenAIKey: !!env.OPENAI_API_KEY,
          openaiKeyLength: env.OPENAI_API_KEY?.length || 0,
          openaiKeyPrefix: env.OPENAI_API_KEY?.substring(0, 10) || 'none',
          hasAnthropicKey: !!env.ANTHROPIC_API_KEY,
          anthropicKeyLength: env.ANTHROPIC_API_KEY?.length || 0,
          anthropicKeyPrefix: env.ANTHROPIC_API_KEY?.substring(0, 10) || 'none',
          llmProvider: provider,
          modelName: modelName || (provider === 'openai' ? 'gpt-4o-mini (default)' : 'claude-3-5-haiku-20241022 (default)'),
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      // Check if client wants streaming (default to streaming for better UX)
      const acceptHeader = request.headers.get('accept') || '';
      const streamParam = url.searchParams.get('stream');
      // Default to streaming unless explicitly disabled
      if (streamParam !== 'false' && (acceptHeader.includes('text/event-stream') || streamParam === 'true' || streamParam === null)) {
        return handleChatRequestStreaming(request, env);
      }
      return handleChatRequest(request, env);
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return serveChatUI();
    }

    if (url.pathname.startsWith('/ui/')) {
      return serveStaticFile(url.pathname, env);
    }

    return new Response('Game Analytics MCP Server', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};

interface Env {
  RAWG_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  LLM_PROVIDER?: 'openai' | 'anthropic';
  OPENAI_MODEL?: string;
  CLAUDE_MODEL?: string;
}

async function handleChatRequestStreaming(request: Request, env: Env): Promise<Response> {
  if (!env.RAWG_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'RAWG_API_KEY not configured' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // Determine provider (default to OpenAI)
  const provider = (env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic';
  
  // Validate API keys based on provider
  if (provider === 'openai') {
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  } else if (provider === 'anthropic') {
    if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  }

  try {
    const body = await request.json() as { messages?: Array<{ role: string; content: string }> };
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response(
        JSON.stringify({ error: 'Last message must be from user' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Create orchestrator with provider-specific options
    const modelName = provider === 'openai' ? env.OPENAI_MODEL : env.CLAUDE_MODEL;
    console.log(`[handleChatRequestStreaming] Provider: ${provider}, Model: ${modelName || '(default)'}`);
    
    const orchestrator = new AgentOrchestrator(env.RAWG_API_KEY!, {
      provider,
      openaiApiKey: env.OPENAI_API_KEY,
      anthropicApiKey: env.ANTHROPIC_API_KEY,
      modelName,
    });

    const typedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const { stream } = await orchestrator.processQueryWithHistoryStreaming(typedMessages);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

async function handleChatRequest(request: Request, env: Env): Promise<Response> {
  if (!env.RAWG_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'RAWG_API_KEY not configured' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // Determine provider (default to OpenAI)
  const provider = (env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic';
  
  // Validate API keys based on provider
  if (provider === 'openai') {
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'OPENAI_API_KEY not configured',
          debug: 'Check .dev.vars file or Cloudflare dashboard'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    if (env.OPENAI_API_KEY.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid OPENAI_API_KEY',
          debug: `Key length: ${env.OPENAI_API_KEY?.length || 0}`,
          hasKey: !!env.OPENAI_API_KEY,
          keyPrefix: env.OPENAI_API_KEY?.substring(0, 10) || 'none'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  } else if (provider === 'anthropic') {
    if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'ANTHROPIC_API_KEY not configured',
          debug: 'Check .dev.vars file or Cloudflare dashboard'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    if (env.ANTHROPIC_API_KEY.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid ANTHROPIC_API_KEY',
          debug: `Key length: ${env.ANTHROPIC_API_KEY?.length || 0}`,
          hasKey: !!env.ANTHROPIC_API_KEY,
          keyPrefix: env.ANTHROPIC_API_KEY?.substring(0, 10) || 'none'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  }

  try {
    const body = await request.json() as { messages?: Array<{ role: string; content: string }> };
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response(
        JSON.stringify({ error: 'Last message must be from user' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Create orchestrator with provider-specific options
    const modelName = provider === 'openai' ? env.OPENAI_MODEL : env.CLAUDE_MODEL;
    console.log(`[handleChatRequest] Provider: ${provider}, Model: ${modelName || '(default)'}`);
    
    const orchestrator = new AgentOrchestrator(env.RAWG_API_KEY!, {
      provider,
      openaiApiKey: env.OPENAI_API_KEY,
      anthropicApiKey: env.ANTHROPIC_API_KEY,
      modelName,
    });

    const typedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const result = await orchestrator.processQueryWithHistory(typedMessages);

    return new Response(
      JSON.stringify({
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        toolCalls: result.toolCalls,
        usage: result.usage,
        model: result.model,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

function serveChatUI(): Response {
  const html = getChatUIHTML();
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

async function serveStaticFile(pathname: string, env: Env): Promise<Response> {
  return new Response('Not found', { status: 404 });
}
