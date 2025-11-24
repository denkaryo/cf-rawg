# End-to-End Tests

These tests require a running server instance.

## Running E2E Tests

1. Start the server in one terminal:
```bash
pnpm dev
```

2. Note the port number from the output (e.g., "Ready on http://localhost:44111")

3. In another terminal, run the e2e test with the correct port:
```bash
SERVER_URL=http://localhost:PORT pnpm test:e2e
```

Or set the port in the test file and run:
```bash
pnpm test:e2e
```

## What the E2E Test Validates

- Server starts and responds to HTTP requests
- MCP tools/list endpoint returns available tools
- MCP tools/call fetch_game_data works with real RAWG API
- MCP tools/call execute_calculation works with code execution
- Error handling for invalid methods
- End-to-end flow: fetch data + calculate results

