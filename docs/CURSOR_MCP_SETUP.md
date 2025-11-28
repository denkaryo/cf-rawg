# Connecting Cursor to cf-rawg MCP Server

## Server URL

```
https://cf-rawg.dkalaslioglu.workers.dev/mcp
```

## Configuration Methods

### Method 1: Using Cursor UI

1. Open Cursor Settings (Cmd+Shift+J / Ctrl+Shift+J)
2. Navigate to **Features** > **Model Context Protocol**
3. Click **+ Add New MCP Server**
4. Select **Streamable HTTP** as the transport type
5. Enter the following:
   - **Name**: `cf-rawg` or `Game Analytics`
   - **URL**: `https://cf-rawg.dkalaslioglu.workers.dev/mcp`
   - **Headers** (if needed): Leave empty or add custom headers
6. Save the configuration

### Method 2: Using mcp.json

Create or edit `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "cf-rawg": {
      "url": "https://cf-rawg.dkalaslioglu.workers.dev/mcp",
      "transport": "streamableHttp"
    }
  }
}
```

Or for global configuration, edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "game-analytics": {
      "url": "https://cf-rawg.dkalaslioglu.workers.dev/mcp"
    }
  }
}
```

## Verification

After adding the server:

1. Open Cursor chat
2. Look for **Available Tools** section
3. You should see:
   - `fetch_game_data` - Fetch game data from RAWG API
   - `execute_calculation` - Execute JavaScript code for calculations

## Protocol Details

This server implements the **Streamable HTTP** transport protocol with:

- **GET /mcp** - Starts SSE stream for server-to-client messages
- **POST /mcp** - Sends JSON-RPC requests
- **DELETE /mcp** - Closes session
- **OPTIONS /mcp** - CORS preflight

### Session Management

- Server generates session IDs automatically
- Session ID included in `mcp-session-id` header
- Sessions maintained in-memory for SSE streaming

### CORS Support

The server supports cross-origin requests:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, mcp-session-id`

## Example Usage in Cursor Chat

After connecting, you can ask:

1. "What's the average Metacritic score for PC games released in Q1 2024?"
2. "Which genre had the most highly-rated games in 2023?"
3. "How do PlayStation exclusive ratings compare to Xbox exclusives?"

The agent will automatically use the MCP tools to fetch data and perform calculations.

## Troubleshooting

### Check MCP Logs

1. Open Output panel in Cursor (Cmd+Shift+U / Ctrl+Shift+U)
2. Select **MCP Logs** from dropdown
3. Look for connection errors or authentication issues

### Common Issues

- **Connection timeout**: Check server URL is correct and accessible
- **CORS errors**: Server already has CORS headers configured
- **SSE connection failed**: Verify GET /mcp returns `Content-Type: text/event-stream`

### Testing Server Manually

Test SSE endpoint:
```bash
curl -i -X GET https://cf-rawg.dkalaslioglu.workers.dev/mcp \
  -H "Accept: text/event-stream"
```

Test tool listing:
```bash
curl -X POST https://cf-rawg.dkalaslioglu.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

