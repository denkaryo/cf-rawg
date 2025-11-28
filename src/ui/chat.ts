/**
 * Chat UI Domain
 * 
 * Exports the HTML template for the chat interface.
 * React is loaded from CDN to keep bundle size small.
 */

export function getChatUIHTML(): string {
  return `<!DOCTYPE html>
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
  <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
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

    /* Markdown styling */
    .message-bubble h1,
    .message-bubble h2,
    .message-bubble h3,
    .message-bubble h4,
    .message-bubble h5,
    .message-bubble h6 {
      margin-top: 16px;
      margin-bottom: 8px;
      font-weight: 600;
      line-height: 1.4;
    }

    .message-bubble h1 { font-size: 1.5em; }
    .message-bubble h2 { font-size: 1.3em; }
    .message-bubble h3 { font-size: 1.1em; }

    .message-bubble p {
      margin-bottom: 12px;
      line-height: 1.6;
    }

    .message-bubble p:last-child {
      margin-bottom: 0;
    }

    .message-bubble strong {
      font-weight: 600;
    }

    .message-bubble em {
      font-style: italic;
    }

    .message-bubble ul,
    .message-bubble ol {
      margin: 12px 0;
      padding-left: 24px;
    }

    .message-bubble li {
      margin-bottom: 6px;
      line-height: 1.5;
    }

    .message-bubble ol {
      list-style-type: decimal;
    }

    .message-bubble ul {
      list-style-type: disc;
    }

    .message-bubble a {
      color: #007bff;
      text-decoration: underline;
      word-break: break-word;
    }

    .message.user .message-bubble a {
      color: #ffffff;
      text-decoration: underline;
    }

    .message-bubble a:hover {
      color: #0056b3;
    }

    .message.user .message-bubble a:hover {
      color: #e0e0e0;
    }

    .message-bubble img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 12px 0;
      display: block;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .message-bubble code {
      background: rgba(0,0,0,0.05);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }

    .message.user .message-bubble code {
      background: rgba(255,255,255,0.2);
      color: #ffffff;
    }

    .message-bubble pre {
      background: rgba(0,0,0,0.05);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 12px 0;
    }

    .message.user .message-bubble pre {
      background: rgba(255,255,255,0.15);
    }

    .message-bubble pre code {
      background: none;
      padding: 0;
    }

    .message-bubble blockquote {
      border-left: 3px solid #007bff;
      padding-left: 16px;
      margin: 12px 0;
      color: #666;
      font-style: italic;
    }

    .message.user .message-bubble blockquote {
      border-left-color: rgba(255,255,255,0.5);
      color: rgba(255,255,255,0.9);
    }

    .message-bubble hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 16px 0;
    }

    .message.user .message-bubble hr {
      border-top-color: rgba(255,255,255,0.3);
    }

    .message-bubble table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
    }

    .message-bubble th,
    .message-bubble td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }

    .message.user .message-bubble th,
    .message.user .message-bubble td {
      border-color: rgba(255,255,255,0.3);
    }

    .message-bubble th {
      background: #f8f9fa;
      font-weight: 600;
    }

    .message.user .message-bubble th {
      background: rgba(255,255,255,0.2);
    }

    .tool-calls {
      margin-top: 8px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      font-size: 13px;
    }

    .tool-call {
      margin-bottom: 12px;
      padding: 12px;
      background: white;
      border-left: 3px solid #007bff;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .tool-call:last-child {
      margin-bottom: 0;
    }

    .tool-call.expanded {
      background: #ffffff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .tool-name {
      font-weight: 600;
      color: #007bff;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .tool-call-section {
      margin-top: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 4px;
      border: 1px solid #e9ecef;
    }

    .tool-call-section-label {
      font-weight: 600;
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .tool-call-content {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 400px;
      overflow-y: auto;
      padding: 8px;
      background: white;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }

    .tool-call-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      user-select: none;
      margin-top: 8px;
      color: #007bff;
      font-size: 13px;
      font-weight: 500;
    }

    .tool-call-toggle:hover {
      background: #f0f0f0;
    }

    .tool-call-toggle-icon {
      font-size: 12px;
      transition: transform 0.2s ease;
    }

    .tool-call-toggle.expanded .tool-call-toggle-icon {
      transform: rotate(90deg);
    }

    .tool-args {
      color: #666;
      font-size: 12px;
      font-family: monospace;
      word-break: break-word;
    }

    .input-area {
      padding: 20px;
      border-top: 1px solid #e9ecef;
    }

    .input-area form {
      display: flex;
      gap: 0;
    }

    .input-area input {
      flex: 1;
      width: 100%;
      padding: 14px 18px;
      border: 2px solid #ddd;
      border-radius: 8px 0 0 8px;
      font-size: 15px;
      font-family: 'Poppins', sans-serif;
    }

    .input-area input:focus {
      outline: none;
      border-color: #007bff;
    }

    .input-area button {
      padding: 14px 24px;
      background: #007bff;
      color: white;
      border: 2px solid #007bff;
      border-left: none;
      border-radius: 0 8px 8px 0;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      font-family: 'Poppins', sans-serif;
      white-space: nowrap;
    }

    .input-area button:hover {
      background: #0056b3;
      border-color: #0056b3;
    }

    .input-area button:disabled {
      background: #ccc;
      border-color: #ccc;
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

    .example-queries {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px 20px;
      border-top: 1px solid #e9ecef;
      background: #fafafa;
    }

    .example-queries-title {
      font-size: 14px;
      font-weight: 500;
      color: #666;
      margin-bottom: 8px;
    }

    .example-query-button {
      padding: 12px 16px;
      background: white;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      font-family: 'Poppins', sans-serif;
      color: #333;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .example-query-button:hover {
      border-color: #007bff;
      background: #f8f9ff;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .example-query-button:active {
      transform: translateY(0);
    }

    .example-query-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      border-color: #e9ecef;
      background: white;
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

      const sendMessage = useCallback(async (messageText) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage = { role: 'user', content: messageText.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        setError(null);

        // Create assistant message placeholder for streaming
        const assistantMessageId = \`msg-\${Date.now()}\`;
        const assistantMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          toolCalls: [],
        };
        setMessages([...newMessages, assistantMessage]);

        try {
          // Use streaming endpoint (default behavior)
          const response = await fetch(api, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream',
            },
            body: JSON.stringify({ messages: newMessages }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to get response' }));
            throw new Error(errorData.error || 'Failed to get response');
          }

          // Handle streaming response (AI SDK data stream format)
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let currentContent = '';
          let currentToolCalls = [];
          let toolCallMap = new Map(); // Map toolCallId to tool call object

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (!line.trim()) continue;
              
              try {
                // AI SDK data stream format: prefix:data
                // 0: = text chunk
                // 2: = data chunk
                let parsed;
                if (line.startsWith('0:')) {
                  // Text chunk
                  const textDelta = line.slice(2);
                  currentContent += textDelta;
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: currentContent }
                      : msg
                  ));
                  continue;
                } else if (line.startsWith('2:')) {
                  // Data chunk
                  parsed = JSON.parse(line.slice(2));
                } else if (line.startsWith('data: ')) {
                  // SSE format fallback
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  parsed = JSON.parse(data);
                } else {
                  continue;
                }
                
                // Handle different message types from AI SDK streaming
                if (parsed.type === 'text-delta') {
                  currentContent += parsed.textDelta || '';
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: currentContent }
                      : msg
                  ));
                } else if (parsed.type === 'tool-call') {
                  // New tool call starting
                  const toolCall = {
                    tool: parsed.toolName || parsed.tool,
                    args: parsed.args || {},
                    result: null,
                  };
                  if (parsed.toolCallId) {
                    toolCallMap.set(parsed.toolCallId, toolCall);
                  }
                  currentToolCalls = [...currentToolCalls, toolCall];
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, toolCalls: [...currentToolCalls] }
                      : msg
                  ));
                } else if (parsed.type === 'tool-result') {
                  // Tool call completed
                  const toolCallId = parsed.toolCallId;
                  if (toolCallId && toolCallMap.has(toolCallId)) {
                    const toolCall = toolCallMap.get(toolCallId);
                    toolCall.result = parsed.result || parsed;
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, toolCalls: [...currentToolCalls] }
                        : msg
                    ));
                  } else if (currentToolCalls.length > 0) {
                    // Fallback: update last tool call
                    const lastCall = currentToolCalls[currentToolCalls.length - 1];
                    lastCall.result = parsed.result || parsed;
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, toolCalls: [...currentToolCalls] }
                        : msg
                    ));
                  }
                } else if (parsed.type === 'finish') {
                  // Stream finished
                  // Normalize usage object - convert null to 0
                  const normalizedUsage = parsed.usage ? {
                    promptTokens: (parsed.usage.promptTokens != null && typeof parsed.usage.promptTokens === 'number') 
                      ? parsed.usage.promptTokens 
                      : 0,
                    completionTokens: (parsed.usage.completionTokens != null && typeof parsed.usage.completionTokens === 'number')
                      ? parsed.usage.completionTokens
                      : 0,
                  } : undefined;
                  
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { 
                          ...msg, 
                          content: currentContent,
                          toolCalls: currentToolCalls,
                          usage: normalizedUsage,
                          model: parsed.model,
                        }
                      : msg
                  ));
                }
              } catch (e) {
                // Ignore parse errors for non-JSON lines
                console.debug('Stream parse error:', e, 'Line:', line);
              }
            }
          }
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
      }, [messages, api, isLoading, onError]);

      const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        await sendMessage(input);
      }, [input, sendMessage]);

      return {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        sendMessage,
        isLoading,
        error,
      };
    }

    function formatToolResult(result) {
      if (result === null || result === undefined) {
        return 'null';
      }

      // Handle large arrays (e.g., games array from fetch_game_data)
      if (Array.isArray(result) && result.length > 20) {
        return JSON.stringify({
          summary: \`Array with \${result.length} items\`,
          preview: result.slice(0, 5),
          note: '... (showing first 5 items, expand to see full result)'
        }, null, 2);
      }

      // Handle objects with large arrays (e.g., fetch_game_data response)
      if (result && typeof result === 'object' && result.games && Array.isArray(result.games)) {
        const games = result.games;
        if (games.length > 20) {
          const formatted = {
            ...result,
            games: {
              count: games.length,
              preview: games.slice(0, 5),
              note: '... (showing first 5 games, expand to see all)'
            }
          };
          return JSON.stringify(formatted, null, 2);
        }
      }

      // Handle string results (might be JSON string from MCP)
      if (typeof result === 'string') {
        try {
          const parsed = JSON.parse(result);
          return JSON.stringify(parsed, null, 2);
        } catch (e) {
          return result;
        }
      }

      // Default: pretty print
      return JSON.stringify(result, null, 2);
    }

    function renderMarkdown(content) {
      if (!content || typeof content !== 'string') {
        return '';
      }
      
      try {
        // Configure marked options
        if (typeof marked !== 'undefined') {
          marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
          });
          
          // Parse markdown to HTML
          const html = marked.parse(content);
          
          // Sanitize HTML to prevent XSS
          if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(html, {
              ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'code', 'pre', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
              ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
              ALLOW_DATA_ATTR: false
            });
          }
          
          // If DOMPurify not available, return HTML (marked output is generally safe)
          return html;
        }
        
        // Fallback: return plain text if marked is not available
        // Content will be escaped by React's dangerouslySetInnerHTML
        return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      } catch (error) {
        console.error('Markdown rendering error:', error);
        // Return escaped content on error
        return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
    }

    function ChatApp() {
      const messagesEndRef = useRef(null);
      const inputRef = useRef(null);
      const [expandedToolCalls, setExpandedToolCalls] = useState(new Set());
      
      const { messages, input, handleInputChange, handleSubmit, sendMessage, isLoading, error } = useChat({
        api: '/api/chat',
        onError: (error) => {
          console.error('Chat error:', error);
        },
      });

      // Auto-focus input after messages update (when loading completes)
      useEffect(() => {
        if (!isLoading && inputRef.current) {
          inputRef.current.focus();
        }
      }, [isLoading, messages]);

      const toggleToolCall = useCallback((messageIdx, callIdx) => {
        const key = \`\${messageIdx}-\${callIdx}\`;
        setExpandedToolCalls(prev => {
          const newSet = new Set(prev);
          if (newSet.has(key)) {
            newSet.delete(key);
          } else {
            newSet.add(key);
          }
          return newSet;
        });
      }, []);

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
          <div className="chat-container">
            <div className="messages">
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', marginTop: '40px' }}>
                  <p>Start a conversation by asking a question about video games.</p>
                  <p style={{ marginTop: '8px', fontSize: '14px' }}>Or click one of the example queries above to get started.</p>
                </div>
              )}
              {messages.map((msg, msgIdx) => (
                <div key={msg.id || msgIdx} className={\`message \${msg.role}\`}>
                  <div 
                    className="message-bubble"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="tool-calls">
                      <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>Tool Calls:</div>
                      {msg.toolCalls.map((call, callIdx) => {
                        const key = \`\${msgIdx}-\${callIdx}\`;
                        const isExpanded = expandedToolCalls.has(key);
                        const hasResult = call.result !== null && call.result !== undefined;
                        
                        return (
                          <div key={callIdx} className={\`tool-call \${isExpanded ? 'expanded' : ''}\`}>
                            <div className="tool-name">{call.tool}</div>
                            
                            <div className="tool-call-section">
                              <div className="tool-call-section-label">Input</div>
                              <div className="tool-call-content">
                                {JSON.stringify(call.args, null, 2)}
                              </div>
                            </div>
                            
                            {hasResult && (
                              <>
                                <div 
                                  className={\`tool-call-toggle \${isExpanded ? 'expanded' : ''}\`}
                                  onClick={() => toggleToolCall(msgIdx, callIdx)}
                                >
                                  <span className="tool-call-toggle-icon">▶</span>
                                  <span>{isExpanded ? 'Hide Result' : 'View Result'}</span>
                                </div>
                                
                                {isExpanded && (
                                  <div className="tool-call-section">
                                    <div className="tool-call-section-label">Output</div>
                                    <div className="tool-call-content">
                                      {formatToolResult(call.result)}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {!hasResult && (
                              <div className="tool-call-section" style={{ opacity: 0.6 }}>
                                <div className="tool-call-section-label">Output</div>
                                <div className="tool-call-content">No result returned</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {(msg.usage || msg.model) && (
                    <div className="usage">
                      {msg.model && <span>Model: {msg.model} | </span>}
                      {msg.usage && (
                        <span>Tokens: {msg.usage.promptTokens != null ? msg.usage.promptTokens : 'N/A'} prompt + {msg.usage.completionTokens != null ? msg.usage.completionTokens : 'N/A'} completion</span>
                      )}
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
            {messages.length === 0 && (
              <div className="example-queries">
                <div className="example-queries-title">Try these example queries:</div>
                <button
                  className="example-query-button"
                  onClick={() => sendMessage("What's the average Metacritic score for PC games released in Q1 2024?")}
                  disabled={isLoading}
                >
                  What's the average Metacritic score for PC games released in Q1 2024?
                </button>
                <button
                  className="example-query-button"
                  onClick={() => sendMessage("Which genre had the most highly-rated games in 2023?")}
                  disabled={isLoading}
                >
                  Which genre had the most highly-rated games in 2023?
                </button>
                <button
                  className="example-query-button"
                  onClick={() => sendMessage("How do PlayStation exclusive ratings compare to Xbox exclusives?")}
                  disabled={isLoading}
                >
                  How do PlayStation exclusive ratings compare to Xbox exclusives?
                </button>
              </div>
            )}
            <div className="input-area">
              <form onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about video games..."
                  disabled={isLoading}
                  autoFocus
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
}

