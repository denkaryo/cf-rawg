import { createMCPServer } from './mcp-server/server';
import { handleMCPRequest } from './mcp-server/transport/http';
import { AgentOrchestrator } from './agent/orchestrator';

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
          llmProvider: env.LLM_PROVIDER || 'openai',
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
    const orchestrator = new AgentOrchestrator(env.RAWG_API_KEY!, {
      provider,
      openaiApiKey: env.OPENAI_API_KEY,
      anthropicApiKey: env.ANTHROPIC_API_KEY,
      modelName: provider === 'openai' ? env.OPENAI_MODEL : env.CLAUDE_MODEL,
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
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Game Analytics - AI Agent</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Poppins', sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }

    #root {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: white;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #222;
      margin-bottom: 8px;
    }

    .header p {
      color: #666;
      font-size: 14px;
    }

    .chat-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      height: calc(100vh - 200px);
      min-height: 600px;
    }

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .message {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .message.user {
      align-items: flex-end;
    }

    .message.assistant {
      align-items: flex-start;
    }

    .message-bubble {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 15px;
      line-height: 1.5;
    }

    .message.user .message-bubble {
      background: #007bff;
      color: white;
    }

    .message.assistant .message-bubble {
      background: #e9ecef;
      color: #333;
    }

    .tool-calls {
      margin-top: 8px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      font-size: 13px;
    }

    .tool-call {
      margin-bottom: 8px;
      padding: 8px;
      background: white;
      border-left: 3px solid #007bff;
      border-radius: 4px;
    }

    .tool-call:last-child {
      margin-bottom: 0;
    }

    .tool-name {
      font-weight: 600;
      color: #007bff;
      margin-bottom: 4px;
    }

    .tool-args {
      color: #666;
      font-size: 12px;
      font-family: monospace;
      word-break: break-all;
    }

    .input-area {
      padding: 20px;
      border-top: 1px solid #e9ecef;
      display: flex;
      gap: 12px;
    }

    .input-area input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 15px;
      font-family: 'Poppins', sans-serif;
    }

    .input-area input:focus {
      outline: none;
      border-color: #007bff;
    }

    .input-area button {
      padding: 12px 24px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      font-family: 'Poppins', sans-serif;
    }

    .input-area button:hover {
      background: #0056b3;
    }

    .input-area button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
      font-size: 14px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e9ecef;
      border-top-color: #007bff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error {
      color: #dc3545;
      background: #f8d7da;
      padding: 12px;
      border-radius: 6px;
      margin-top: 8px;
    }

    .usage {
      margin-top: 8px;
      font-size: 12px;
      color: #666;
    }

    .eval-section {
      background: white;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .eval-section h2 {
      font-size: 20px;
      font-weight: 600;
      color: #222;
      margin-bottom: 16px;
    }

    .eval-item {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 6px;
      margin-bottom: 12px;
      border-left: 4px solid #007bff;
    }

    .eval-item:last-child {
      margin-bottom: 0;
    }

    .eval-query {
      font-weight: 600;
      color: #222;
      margin-bottom: 8px;
    }

    .eval-result {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 14px;
    }

    .eval-result-item {
      flex: 1;
    }

    .eval-result-label {
      color: #666;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .eval-result-value {
      font-weight: 500;
      color: #222;
    }

    .eval-status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      margin-top: 8px;
    }

    .eval-status.pass {
      background: #d4edda;
      color: #155724;
    }

    .eval-status.fail {
      background: #f8d7da;
      color: #721c24;
    }

    .eval-code {
      margin-top: 8px;
      padding: 8px;
      background: white;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      color: #333;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useRef, useEffect, useCallback } = React;

    function useChat({ api, onError }) {
      const [messages, setMessages] = useState([]);
      const [input, setInput] = useState('');
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState(null);

      const handleInputChange = useCallback((e) => {
        setInput(e.target.value);
        setError(null);
      }, []);

      const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
          const response = await fetch(api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: newMessages }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get response');
          }

          const data = await response.json();
          const assistantMessage = {
            id: data.id || \`msg-\${Date.now()}\`,
            role: 'assistant',
            content: data.content || data.answer || '',
            toolCalls: data.toolCalls || [],
            usage: data.usage,
          };

          setMessages([...newMessages, assistantMessage]);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError({ message: errorMessage });
          if (onError) {
            onError(err);
          }
          const errorMsg = {
            id: \`error-\${Date.now()}\`,
            role: 'assistant',
            content: \`Error: \${errorMessage}\`,
            error: true,
          };
          setMessages([...newMessages, errorMsg]);
        } finally {
          setIsLoading(false);
        }
      }, [input, messages, api, isLoading, onError]);

      return {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        error,
      };
    }

    function ChatApp() {
      const messagesEndRef = useRef(null);
      
      const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
        api: '/api/chat',
        onError: (error) => {
          console.error('Chat error:', error);
        },
      });

      const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      };

      useEffect(() => {
        scrollToBottom();
      }, [messages]);

      const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
          e.preventDefault();
          handleSubmit(e);
        }
      };

      return (
        <div>
          <div className="header">
            <h1>Game Analytics AI Agent</h1>
            <p>Ask questions about video game data. The agent will fetch data from RAWG API and perform calculations.</p>
          </div>
          <div className="eval-section">
            <h2>Evaluation Examples</h2>
            <div className="eval-item">
              <div className="eval-query">Query: "What's the average Metacritic score for PC games in Q1 2024?"</div>
              <div className="eval-result">
                <div className="eval-result-item">
                  <div className="eval-result-label">Expected</div>
                  <div className="eval-result-value">~75 (estimated)</div>
                </div>
                <div className="eval-result-item">
                  <div className="eval-result-label">Data Source</div>
                  <div className="eval-result-value">RAWG API</div>
                </div>
                <div className="eval-result-item">
                  <div className="eval-result-label">Calculation</div>
                  <div className="eval-result-value">sum(metacritic) / count</div>
                </div>
              </div>
              <div className="eval-code">const scores = games.map(g => g.metacritic).filter(s => s); return avg(scores);</div>
              <div className="eval-status pass">Status: Ready for testing</div>
            </div>
            <div className="eval-item">
              <div className="eval-query">Query: "Which genre had the highest rated games in 2023?"</div>
              <div className="eval-result">
                <div className="eval-result-item">
                  <div className="eval-result-label">Method</div>
                  <div className="eval-result-value">Group by genre, calculate avg rating</div>
                </div>
                <div className="eval-result-item">
                  <div className="eval-result-label">Data Source</div>
                  <div className="eval-result-value">RAWG API (2023 games)</div>
                </div>
              </div>
              <div className="eval-code">const grouped = groupBy(games, 'genres'); const avgs = Object.entries(grouped).map(([g, gs]) => [g, avg(gs.map(x => x.rating))]); return max(avgs.map(x => x[1]));</div>
              <div className="eval-status pass">Status: Ready for testing</div>
            </div>
          </div>
          <div className="chat-container">
            <div className="messages">
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', marginTop: '40px' }}>
                  <p>Start a conversation by asking a question about video games.</p>
                  <p style={{ marginTop: '8px', fontSize: '14px' }}>Example: "What's the average Metacritic score for PC games in Q1 2024?"</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={msg.id || idx} className={\`message \${msg.role}\`}>
                  <div className="message-bubble">
                    {msg.content}
                  </div>
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="tool-calls">
                      <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>Tool Calls:</div>
                      {msg.toolCalls.map((call, i) => (
                        <div key={i} className="tool-call">
                          <div className="tool-name">{call.tool}</div>
                          <div className="tool-args">{JSON.stringify(call.args).substring(0, 200)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.usage && (
                    <div className="usage">
                      Tokens: {msg.usage.promptTokens || 'N/A'} prompt + {msg.usage.completionTokens || 'N/A'} completion
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="message assistant">
                  <div className="message-bubble">
                    <div className="loading">
                      <div className="spinner"></div>
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about video games..."
                  disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || !input.trim()}>
                  Send
                </button>
              </form>
              {error && (
                <div className="error" style={{ marginTop: '8px' }}>
                  Error: {error.message || 'Unknown error'}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    ReactDOM.render(<ChatApp />, document.getElementById('root'));
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

async function serveStaticFile(pathname: string, env: Env): Promise<Response> {
  return new Response('Not found', { status: 404 });
}
