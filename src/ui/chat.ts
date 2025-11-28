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

    /* App layout (chat left, evaluation right) */
    .app-layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 20px;
      align-items: start;
    }

    .left-pane {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .right-pane {
      position: sticky;
      top: 20px;
      align-self: start;
      height: fit-content;
      width: 100%;
      min-width: 0;
    }

    @media (max-width: 1100px) {
      .app-layout {
        grid-template-columns: 1fr;
      }
      .right-pane {
        position: static;
      }
      .eval-panel {
        max-height: none !important;
      }
    }

    /* Evaluation panel */
    .eval-panel {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 16px;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
      width: 100%;
    }

    .eval-title {
      font-size: 16px;
      font-weight: 600;
      color: #222;
      margin-bottom: 8px;
    }

    .eval-subtitle {
      font-size: 12px;
      color: #666;
      margin-bottom: 12px;
    }

    .eval-section {
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
      background: #fafafa;
    }

    .eval-section h3 {
      font-size: 13px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }

    .eval-kv {
      font-size: 12px;
      color: #444;
      margin: 2px 0;
      word-break: break-word;
    }

    .eval-pre {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 8px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 240px;
      overflow: auto;
    }

    .eval-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .eval-actions button {
      padding: 6px 10px;
      font-size: 12px;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
      background: #fff;
      cursor: pointer;
    }

    .eval-actions button:hover {
      background: #f4f6f8;
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

    function useChat({ api, onError, isNearBottom, requestForceScroll }) {
      const [messages, setMessages] = useState([]);
      const [input, setInput] = useState('');
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState(null);
      const [lastFetch, setLastFetch] = useState(null);
      const [lastCalc, setLastCalc] = useState(null); // kept for backward compatibility
      // Evaluation history and selection
      const [calcHistory, setCalcHistory] = useState([]); // [{hash, code, data, serverResult, timestamp, manualCode, manualResult, manualError, manualAttempted, manualRanAt}]
      const [activeHash, setActiveHash] = useState(null);
      const [followLatest, setFollowLatest] = useState(true);
      const followLatestRef = useRef(true);
      useEffect(() => { followLatestRef.current = followLatest; }, [followLatest]);

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
          let initialContent = ''; // Content before tool calls (reasoning)
          let finalContent = ''; // Content after tool calls (final answer)
          let currentToolCalls = [];
          let toolCallMap = new Map(); // Map toolCallId to tool call object
          let hasToolCalls = false; // Track if tool calls have been added
          let finalAnswerMessageId = null; // ID for the final answer message (created after tool calls)
          let inTextChunk = false; // Track whether we're inside a text chunk that may span multiple lines
          // Track pending tool args for evaluation capture
          let pendingFetchArgs = null;
          let pendingCalcArgs = null;
          let pendingCalcHash = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            // Capture near-bottom state before applying updates from this chunk
            let wasNearBottom = true;
            try {
              if (typeof isNearBottom === 'function') {
                wasNearBottom = !!isNearBottom();
              }
            } catch (_) {}

            for (const line of lines) {
              // Only skip empty lines when not in the middle of a text chunk
              if (!line.trim() && !inTextChunk) continue;
              
              try {
                // AI SDK data stream format: prefix:data
                // 0: = text chunk
                // 2: = data chunk
                let parsed;
                if (line.startsWith('0:')) {
                  // Text chunk
                  const textDelta = line.slice(2);
                  inTextChunk = true;
                  
                  // If tool calls exist, this is final answer - create new message bubble
                  if (hasToolCalls) {
                    finalContent += textDelta;
                    // Create final answer message if it doesn't exist
                    if (!finalAnswerMessageId) {
                      finalAnswerMessageId = \`msg-final-\${Date.now()}\`;
                      const finalAnswerMessage = {
                        id: finalAnswerMessageId,
                        role: 'assistant',
                        content: finalContent,
                        toolCalls: [],
                      };
                      setMessages(prev => [...prev, finalAnswerMessage]);
                    } else {
                      // Update existing final answer message
                      setMessages(prev => prev.map(msg => 
                        msg.id === finalAnswerMessageId 
                          ? { ...msg, content: finalContent }
                          : msg
                      ));
                    }
                  } else {
                    // No tool calls yet - this is initial reasoning
                    initialContent += textDelta;
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: initialContent }
                        : msg
                    ));
                  }
                  continue;
                } else if (line.startsWith('2:')) {
                  // Data chunk
                  inTextChunk = false;
                  parsed = JSON.parse(line.slice(2));
                } else if (line.startsWith('data: ')) {
                  // SSE format fallback
                  inTextChunk = false;
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  parsed = JSON.parse(data);
                } else {
                  // Continuation of a text chunk (preserve exact whitespace/newlines)
                  if (inTextChunk) {
                    const continuation = line;
                    if (hasToolCalls) {
                      finalContent += '\\n' + continuation;
                      if (finalAnswerMessageId) {
                        setMessages(prev => prev.map(msg => 
                          msg.id === finalAnswerMessageId 
                            ? { ...msg, content: finalContent }
                            : msg
                        ));
                      }
                    } else {
                      initialContent += '\\n' + continuation;
                      setMessages(prev => prev.map(msg => 
                        msg.id === assistantMessageId 
                          ? { ...msg, content: initialContent }
                          : msg
                      ));
                    }
                  }
                  continue;
                }
                
                // Handle different message types from AI SDK streaming
                if (parsed.type === 'text-delta') {
                  const textDelta = parsed.textDelta || '';
                  inTextChunk = true;
                  
                  // If tool calls exist, this is final answer - create new message bubble
                  if (hasToolCalls) {
                    finalContent += textDelta;
                    // Create final answer message if it doesn't exist
                    if (!finalAnswerMessageId) {
                      finalAnswerMessageId = \`msg-final-\${Date.now()}\`;
                      const finalAnswerMessage = {
                        id: finalAnswerMessageId,
                        role: 'assistant',
                        content: finalContent,
                        toolCalls: [],
                      };
                      setMessages(prev => [...prev, finalAnswerMessage]);
                    } else {
                      // Update existing final answer message
                      setMessages(prev => prev.map(msg => 
                        msg.id === finalAnswerMessageId 
                          ? { ...msg, content: finalContent }
                          : msg
                      ));
                    }
                  } else {
                    // No tool calls yet - this is initial reasoning
                    initialContent += textDelta;
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: initialContent }
                        : msg
                    ));
                  }
                } else if (parsed.type === 'tool-call') {
                  inTextChunk = false;
                  // Mark that tool calls have been added
                  hasToolCalls = true;
                  
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
                  // Capture evaluation state on tool-call
                  if ((toolCall.tool || '').includes('fetch_game_data')) {
                    pendingFetchArgs = toolCall.args || {};
                  }
                  if ((toolCall.tool || '').includes('execute_calculation')) {
                    pendingCalcArgs = toolCall.args || {};
                    // Prepare deterministic data snapshot for manual run
                    try {
                      const snapshot = pendingCalcArgs && pendingCalcArgs.data ? JSON.parse(JSON.stringify(pendingCalcArgs.data)) : null;
                      const hash = snapshot ? hashString(stableStringify(snapshot)) : \`calc-\${Date.now()}\`;
                      pendingCalcHash = hash;
                      const entry = {
                        hash,
                        code: pendingCalcArgs.code || '',
                        data: snapshot,
                        serverResult: null,
                        timestamp: Date.now(),
                        manualCode: pendingCalcArgs.code || '',
                        manualResult: undefined,
                        manualError: null,
                        manualAttempted: false,
                        manualRanAt: null,
                      };
                      setCalcHistory(prev => [...prev, entry]);
                      if (followLatestRef.current) {
                        setActiveHash(hash);
                      }
                      // Maintain legacy lastCalc for existing UI references
                      setLastCalc({
                        code: entry.code,
                        data: entry.data,
                        serverResult: null,
                        snapshotHash: entry.hash,
                        timestamp: entry.timestamp,
                      });
                    } catch (e) {
                      // Ignore snapshot errors
                    }
                  }
                } else if (parsed.type === 'tool-result') {
                  inTextChunk = false;
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
                    // Update evaluation state on tool-result
                    const toolName = (toolCall.tool || '').toString();
                    if (toolName.includes('fetch_game_data')) {
                      try {
                        setLastFetch({
                          args: pendingFetchArgs,
                          result: parsed.result,
                          timestamp: Date.now(),
                        });
                      } catch (e) {
                        // ignore
                      }
                    } else if (toolName.includes('execute_calculation')) {
                      const resultObj = parsed.result;
                      setCalcHistory(prev => prev.map(e => e.hash === pendingCalcHash ? { ...e, serverResult: resultObj } : e));
                      setLastCalc(prev => prev ? { ...prev, serverResult: resultObj } : prev);
                    }
                  } else if (currentToolCalls.length > 0) {
                    // Fallback: update last tool call
                    const lastCall = currentToolCalls[currentToolCalls.length - 1];
                    lastCall.result = parsed.result || parsed;
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, toolCalls: [...currentToolCalls] }
                        : msg
                    ));
                    // Best-effort eval state update
                    const toolName = (lastCall.tool || '').toString();
                    if (toolName.includes('fetch_game_data')) {
                      setLastFetch({
                        args: pendingFetchArgs,
                        result: parsed.result,
                        timestamp: Date.now(),
                      });
                    } else if (toolName.includes('execute_calculation')) {
                      const resultObj = parsed.result;
                      if (pendingCalcHash) {
                        setCalcHistory(prev => prev.map(e => e.hash === pendingCalcHash ? { ...e, serverResult: resultObj } : e));
                      }
                      setLastCalc(prev => prev ? { ...prev, serverResult: resultObj } : prev);
                    }
                  }
                } else if (parsed.type === 'finish') {
                  inTextChunk = false;
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
                  
                  // Update initial reasoning message with tool calls (no usage/model here)
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { 
                          ...msg, 
                          content: initialContent,
                          toolCalls: currentToolCalls,
                        }
                      : msg
                  ));
                  
                  // Update final answer message with usage/model (if it exists)
                  if (finalAnswerMessageId) {
                    setMessages(prev => prev.map(msg => 
                      msg.id === finalAnswerMessageId 
                        ? { 
                            ...msg, 
                            content: finalContent,
                            usage: normalizedUsage,
                            model: parsed.model,
                          }
                        : msg
                    ));
                  } else {
                    // No final answer message - update initial message with usage/model
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { 
                            ...msg, 
                            content: initialContent,
                            toolCalls: currentToolCalls,
                            usage: normalizedUsage,
                            model: parsed.model,
                          }
                        : msg
                    ));
                  }
                }
              } catch (e) {
                // Ignore parse errors for non-JSON lines
                console.debug('Stream parse error:', e, 'Line:', line);
              }
            }
            // After applying all updates for this chunk, request a forced scroll if we were near bottom
            if (wasNearBottom && typeof requestForceScroll === 'function') {
              try { requestForceScroll(); } catch (_) {}
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
        lastFetch,
        lastCalc,
        calcHistory,
        activeHash,
        setActiveHash,
        followLatest,
        setFollowLatest,
        setCalcHistory,
      };
    }

    // Stable stringify for deep comparison (sort object keys)
    function stableStringify(value) {
      const seen = new WeakSet();
      const stringify = (val) => {
        if (val && typeof val === 'object') {
          if (seen.has(val)) return '"[Circular]"';
          seen.add(val);
          if (Array.isArray(val)) {
            return '[' + val.map(v => stringify(v)).join(',') + ']';
          }
          const keys = Object.keys(val).sort();
          return '{' + keys.map(k => JSON.stringify(k) + ':' + stringify(val[k])).join(',') + '}';
        }
        return JSON.stringify(val);
      };
      return stringify(value);
    }

    // Simple hash for snapshot identification
    function hashString(str) {
      let h = 5381;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
      }
      return (h >>> 0).toString(36);
    }

    // Helper functions available to manual calculations (browser-side)
    const helpers = {
      avg: (arr) => Array.isArray(arr) && arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : NaN,
      sum: (arr) => Array.isArray(arr) ? arr.reduce((a,b)=>a+b,0) : 0,
      min: (arr) => Array.isArray(arr) && arr.length ? Math.min(...arr) : NaN,
      max: (arr) => Array.isArray(arr) && arr.length ? Math.max(...arr) : NaN,
      groupBy: (arr, key) => {
        if (!Array.isArray(arr)) return {};
        const getNested = (obj, path) => path.split('.').reduce((v,k)=> (v==null?undefined:v[k]), obj);
        const out = {};
        for (const item of arr) {
          const k = String(getNested(item, key));
          if (!out[k]) out[k] = [];
          out[k].push(item);
        }
        return out;
      }
    };

    function runManualCalculation(code, data) {
      try {
        const trimmed = (code || '').trim();
        if (!trimmed) return { success: false, error: 'Code is empty' };
        const needsWrap = /\breturn\s+/.test(trimmed);
        const wrapped = needsWrap ? \`(function(){ \${trimmed} })()\` : trimmed;
        const fn = new Function('data', 'avg', 'sum', 'min', 'max', 'groupBy', '"use strict";\\n' + wrapped);
        const value = fn(data, helpers.avg, helpers.sum, helpers.min, helpers.max, helpers.groupBy);
        return { success: true, value };
      } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
      }
    }

    function formatEvalValue(value) {
      if (value === undefined) return 'undefined';
      if (value === null) return 'null';
      try {
        if (typeof value === 'string') return value;
        return JSON.stringify(value, null, 2);
      } catch (e) {
        try {
          return String(value);
        } catch {
          return '[unprintable value]';
        }
      }
    }

    function EvaluationPanel({
      lastFetch,
      calcHistory,
      activeHash,
      followLatest,
      onSelectHash,
      onToggleFollow,
      onManualCodeChange,
      onManualRun,
      onSyncServerCode,
    }) {
      const activeEntry = calcHistory.find(e => e.hash === activeHash) || calcHistory[calcHistory.length - 1] || null;
      const serverValue = activeEntry && activeEntry.serverResult ? activeEntry.serverResult.result : undefined;
      const comparable = activeEntry && activeEntry.manualAttempted ? (serverValue !== undefined) : false;
      const matches = comparable ? stableStringify(serverValue) === stableStringify(activeEntry.manualResult) : undefined;

      const downloadData = () => {
        if (!activeEntry || !activeEntry.data) return;
        const blob = new Blob([JSON.stringify(activeEntry.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`data-\${activeEntry.hash || 'snapshot'}.json\`;
        a.click();
        URL.revokeObjectURL(url);
      };

      const copyCode = () => {
        try {
          navigator.clipboard.writeText(activeEntry ? (activeEntry.manualCode || activeEntry.code || '') : '');
        } catch (_) {}
      };

      return (
        <div className="eval-panel">
          <div className="eval-title">Evaluation</div>
          <div className="eval-subtitle">Inspect fetched data and calculations. Re-run the calculation manually in your browser.</div>

          <div className="eval-section">
            <h3>Context</h3>
            <div className="eval-kv">
              <strong>Snapshot:</strong>&nbsp;
              {activeEntry ? (activeEntry.hash || 'N/A') : 'N/A'}
            </div>
            <div className="eval-actions" style={{ marginTop: '8px' }}>
              <select
                onChange={(e) => onSelectHash(e.target.value)}
                value={activeEntry ? activeEntry.hash : ''}
                style={{ flex: 1, padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #e0e0e0' }}
              >
                {calcHistory.length === 0 && <option value="">No snapshots</option>}
                {calcHistory.slice().reverse().map((e) => (
                  <option key={e.hash} value={e.hash}>
                    {new Date(e.timestamp).toLocaleTimeString()} — {e.hash}
                  </option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <input type="checkbox" checked={followLatest} onChange={onToggleFollow} />
                Follow latest
              </label>
            </div>
          </div>

          <div className="eval-section">
            <h3>Fetched Data</h3>
            {!lastFetch && <div className="eval-kv">No fetch recorded yet. Ask a question to trigger data fetch.</div>}
            {lastFetch && (
              <>
                <div className="eval-kv"><strong>Filters:</strong> {JSON.stringify(lastFetch.args || {})}</div>
                {lastFetch.result && (
                  <>
                    <div className="eval-kv"><strong>Total:</strong> {lastFetch.result.count != null ? lastFetch.result.count : 'N/A'}</div>
                    {lastFetch.result.summary && (
                      <div className="eval-kv">
                        <strong>Summary:</strong> avgMetacritic={String(lastFetch.result.summary.avgMetacritic)}, avgRating={String(lastFetch.result.summary.avgRating)}, shown={String(lastFetch.result.summary.shown)}
                      </div>
                    )}
                    {lastFetch.result.warning && <div className="eval-kv"><strong>Warning:</strong> {lastFetch.result.warning}</div>}
                    {lastFetch.result.suggestion && <div className="eval-kv"><strong>Suggestion:</strong> {lastFetch.result.suggestion}</div>}
                    <div className="eval-kv" style={{ marginTop: '6px' }}><strong>Games (preview):</strong></div>
                    <div className="eval-pre">
                      {JSON.stringify((lastFetch.result.games || []).slice(0, 5), null, 2)}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="eval-section">
            <h3>Calculation (server)</h3>
            {!activeEntry && <div className="eval-kv">No calculation recorded yet. Trigger a calculation to view details.</div>}
            {activeEntry && (
              <>
                <div className="eval-kv"><strong>Snapshot:</strong> {activeEntry.hash || 'N/A'}</div>
                <div className="eval-kv" style={{ marginTop: '6px' }}><strong>Code (server-used):</strong></div>
                <div className="eval-pre">{activeEntry.code || ''}</div>
                {activeEntry.serverResult && (
                  <>
                    <div className="eval-kv" style={{ marginTop: '6px' }}><strong>Server result:</strong></div>
                    <div className="eval-pre">{JSON.stringify(activeEntry.serverResult, null, 2)}</div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="eval-section">
            <h3>Manual calculation (browser)</h3>
            <div className="eval-kv">Runs locally with the same helpers: avg, sum, min, max, groupBy.</div>
            <textarea
              value={activeEntry ? (activeEntry.manualCode ?? activeEntry.code ?? '') : ''}
              onChange={(e) => activeEntry && onManualCodeChange(activeEntry.hash, e.target.value)}
              placeholder="Paste or edit calculation code here..."
              style={{ width: '100%', height: '120px', fontFamily: 'Courier New, monospace', fontSize: '12px', padding: '8px', borderRadius: '6px', border: '1px solid #e0e0e0', marginTop: '8px' }}
            />
            <div className="eval-actions">
              <button onClick={() => activeEntry && onManualRun(activeEntry.hash, (activeEntry.manualCode ?? activeEntry.code ?? ''), activeEntry.data)} disabled={!activeEntry || !activeEntry.data}>Calculate manually</button>
              <button onClick={copyCode} disabled={!activeEntry || (!activeEntry.manualCode && !activeEntry.code)}>Copy code</button>
              <button onClick={downloadData} disabled={!activeEntry || !activeEntry.data}>Download data.json</button>
              <button onClick={() => activeEntry && onSyncServerCode(activeEntry.hash)} disabled={!activeEntry || !activeEntry.code}>Sync server code</button>
            </div>
            {activeEntry && activeEntry.manualAttempted && activeEntry.manualError && (
              <div className="eval-status fail" style={{ display: 'block' }}>Manual execution error: {activeEntry.manualError}</div>
            )}
            {activeEntry && activeEntry.manualAttempted && !activeEntry.manualError && (
              <>
                <div className="eval-kv" style={{ marginTop: '8px' }}><strong>Manual result:</strong></div>
                <div className="eval-pre">{formatEvalValue(activeEntry.manualResult)}</div>
              </>
            )}
            {activeEntry && activeEntry.manualAttempted && comparable && (
              <div className={\`eval-status \${matches ? 'pass' : 'fail'}\`} style={{ display: 'block' }}>
                {matches ? 'PASS: Manual result matches server result' : 'FAIL: Manual result differs from server result'}
              </div>
            )}
          </div>
        </div>
      );
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
      const messagesRef = useRef(null);
      const inputRef = useRef(null);
      // Track expanded state for Input and Output separately
      const [expandedInputs, setExpandedInputs] = useState(new Set());
      const [expandedOutputs, setExpandedOutputs] = useState(new Set());
      const [scrollTick, setScrollTick] = useState(0);
      
      const { 
        messages, input, handleInputChange, handleSubmit, sendMessage, isLoading, error, 
        lastFetch, lastCalc, calcHistory, activeHash, setActiveHash, followLatest, setFollowLatest, setCalcHistory 
      } = useChat({
        api: '/api/chat',
        onError: (error) => {
          console.error('Chat error:', error);
        },
        isNearBottom: () => {
          const el = messagesRef.current;
          if (!el) return true;
          const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
          return distance < 160;
        },
        requestForceScroll: () => setScrollTick(t => t + 1),
      });

      // Auto-focus input after messages update (when loading completes)
      useEffect(() => {
        if (!isLoading && inputRef.current) {
          inputRef.current.focus();
        }
      }, [isLoading, messages]);

      const toggleInput = useCallback((messageIdx, callIdx) => {
        const key = \`\${messageIdx}-\${callIdx}\`;
        setExpandedInputs(prev => {
          const newSet = new Set(prev);
          if (newSet.has(key)) {
            newSet.delete(key);
          } else {
            newSet.add(key);
          }
          return newSet;
        });
      }, []);

      const toggleOutput = useCallback((messageIdx, callIdx) => {
        const key = \`\${messageIdx}-\${callIdx}\`;
        setExpandedOutputs(prev => {
          const newSet = new Set(prev);
          if (newSet.has(key)) {
            newSet.delete(key);
          } else {
            newSet.add(key);
          }
          return newSet;
        });
      }, []);

      const scrollToBottom = useCallback((force = false) => {
        const el = messagesRef.current;
        if (!el) return;
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        // Only auto-scroll if already near the bottom, or when forced
        if (force || distance < 120) {
          el.scrollTop = el.scrollHeight;
        }
      }, []);

      useEffect(() => {
        scrollToBottom();
      }, [messages, scrollToBottom]);
      
      // If we were near bottom before a streaming update and the eval panel changed layout,
      // force-scroll the chat container back to bottom after updates complete.
      useEffect(() => {
        if (scrollTick > 0) {
          scrollToBottom(true);
        }
      }, [scrollTick, lastFetch, lastCalc, calcHistory, scrollToBottom]);

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
          <div className="app-layout">
            <div className="left-pane">
              <div className="chat-container">
                <div className="messages" ref={messagesRef}>
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
                        const isInputExpanded = expandedInputs.has(key);
                        const isOutputExpanded = expandedOutputs.has(key);
                        const hasResult = call.result !== null && call.result !== undefined;
                        
                        return (
                          <div key={callIdx} className="tool-call">
                            <div className="tool-name">{call.tool}</div>
                            
                            {/* Input Section - Collapsible */}
                            <div 
                              className={\`tool-call-toggle \${isInputExpanded ? 'expanded' : ''}\`}
                              onClick={() => toggleInput(msgIdx, callIdx)}
                            >
                              <span className="tool-call-toggle-icon">▶</span>
                              <span>{isInputExpanded ? 'Hide Input' : 'View Input'}</span>
                            </div>
                            
                            {isInputExpanded && (
                              <div className="tool-call-section">
                                <div className="tool-call-section-label">Input</div>
                                <div className="tool-call-content">
                                  {JSON.stringify(call.args, null, 2)}
                                </div>
                              </div>
                            )}
                            
                            {/* Output Section - Collapsible */}
                            {hasResult && (
                              <>
                                <div 
                                  className={\`tool-call-toggle \${isOutputExpanded ? 'expanded' : ''}\`}
                                  onClick={() => toggleOutput(msgIdx, callIdx)}
                                >
                                  <span className="tool-call-toggle-icon">▶</span>
                                  <span>{isOutputExpanded ? 'Hide Output' : 'View Output'}</span>
                                </div>
                                
                                {isOutputExpanded && (
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
            <div className="right-pane">
              <EvaluationPanel 
                lastFetch={lastFetch}
                calcHistory={calcHistory}
                activeHash={activeHash}
                followLatest={followLatest}
                onSelectHash={setActiveHash}
                onToggleFollow={() => setFollowLatest(v => !v)}
                onManualCodeChange={(hash, code) => {
                  // Persist manual code per snapshot
                  // eslint-disable-next-line no-undef
                  setCalcHistory(prev => prev.map(e => e.hash === hash ? { ...e, manualCode: code } : e));
                }}
                onManualRun={(hash, code, data) => {
                  const res = runManualCalculation(code, data);
                  // eslint-disable-next-line no-undef
                  setCalcHistory(prev => prev.map(e => e.hash === hash 
                    ? { 
                        ...e, 
                        manualAttempted: true, 
                        manualError: res.success ? null : (res.error || 'Manual execution failed'), 
                        manualResult: res.success ? res.value : undefined, 
                        manualRanAt: Date.now() 
                      } 
                    : e));
                }}
                onSyncServerCode={(hash) => {
                  // eslint-disable-next-line no-undef
                  setCalcHistory(prev => prev.map(e => e.hash === hash ? { ...e, manualCode: e.code || '' } : e));
                }}
              />
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

