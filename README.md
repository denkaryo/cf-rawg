# Game Analytics MCP Server

Production-ready MCP server + AI agent system for analyzing video game data using RAWG API, deployed on Cloudflare Workers.

## Overview

This project implements a Model Context Protocol (MCP) server that provides tools for fetching and analyzing video game data. An AI agent orchestrates these tools to answer analytical questions about games.

## Architecture

- **MCP Server**: Provides `fetch_game_data` and `execute_calculation` tools
- **RAWG Client**: Type-safe client for RAWG Video Games Database API
- **Code Executor**: Safe, dynamic code execution for flexible calculations
- **AI Agent**: Uses Anthropic Claude (Haiku) to orchestrate tools
- **UI**: Chat interface with evaluation metrics display

## Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- Cloudflare account
- RAWG API key: https://rawg.io/apidocs
- Anthropic API key: https://console.anthropic.com/

### Installation

```bash
pnpm install
```

The installation process will automatically copy QuickJS WASM files from `node_modules` to `src/` directory via the `postinstall` script. If you need to manually copy WASM files (e.g., after updating dependencies), run:

```bash
pnpm copy-wasm
```

This runs `scripts/copy-wasm-file-into-src.sh` which copies the required WASM files needed for code execution in Cloudflare Workers.

### Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

### Local Development

```bash
pnpm dev
```

This starts the Cloudflare Worker locally at `http://localhost:8787`

### Testing

```bash
# Unit tests
pnpm test:unit

# Integration tests (actual API calls)
pnpm test:integration
```

### Deployment

```bash
pnpm deploy
```

## Project Structure

```
cf-rawg/
├── src/
│   ├── mcp-server/     # MCP Server Domain
│   ├── rawg/           # RAWG API Client Domain
│   ├── executor/       # Code Execution Domain
│   ├── agent/          # Agent Orchestration Domain
│   ├── ui/             # UI/Presentation Domain
│   ├── RELEASE_SYNC.wasm  # QuickJS WASM module (generated and not tracked by Git)
│   └── index.ts        # Worker entry point
├── scripts/
│   └── copy-wasm-file-into-src.sh  # Script to copy WASM files from node_modules
├── tests/
│   ├── unit/           # Unit tests
│   └── integration/    # Actual test scripts
└── wrangler.toml       # Cloudflare config
```

## Development Approach

This project follows a domain-driven, test-first approach:

1. Write unit tests for each domain
2. Implement the code to pass tests
3. Write actual test scripts (no mocks) to validate real behavior
4. Move to next phase only after tests pass

## Known Limitations

### Metacritic Score Coverage

RAWG database has limited Metacritic score coverage, which varies significantly by year:

- **2001-2010**: Best coverage (5-15% of games have Metacritic scores)
- **2011-2021**: Declining coverage (0.1-1% of games)
- **2022+**: Very sparse coverage (less than 0.1% of games)
- **2024**: Only 2 games total have Metacritic scores across all platforms
- **2025**: Zero games with Metacritic scores

For queries about recent games (2022+), we use the `rating` field instead, which has 85-100% coverage. The `rating` field contains RAWG community ratings (0-5 scale) and is much more reliable for recent data.

The `fetch_game_data` tool will automatically warn when Metacritic data is sparse and suggest using the rating field as an alternative.

### Cloudflare Workers Code Execution Limitations

Cloudflare Workers has strict security restrictions that prevent traditional JavaScript code execution methods:

#### Why `new Function()` Doesn't Work

Cloudflare Workers runtime blocks dynamic code generation using `new Function()` constructor and `eval()` function. When attempting to use these methods, the runtime throws:
```
"Code generation from strings disallowed for this context"
```

This is a security feature to prevent code injection attacks and maintain isolation between worker instances.

#### Why Direct QuickJS WASM Loading Doesn't Work

Initially, we attempted to use `quickjs-emscripten` library directly, but it failed because:

1. **Dynamic WASM Loading**: The library tries to load WASM files via `fetch()` using `self.location.href`, which doesn't exist in Cloudflare Workers environment
2. **Error**: `TypeError: Cannot read properties of undefined (reading 'href')`
3. **Root Cause**: Cloudflare Workers bundles all code at build time and doesn't support runtime WASM module loading via network requests

#### Solution: Embedded WASM Files

We solved this by:

1. **Embedding WASM at Build Time**: Using `scripts/copy-wasm-file-into-src.sh` script to copy WASM files from `node_modules` into the `src/` directory
2. **Automatic Setup**: The script runs automatically via `postinstall` hook after `pnpm install`
3. **Direct Import**: Importing WASM files directly as modules: `import cloudflareWasmModule from '../RELEASE_SYNC.wasm'`
4. **Custom Variant**: Creating a Cloudflare-specific variant using `newVariant()` that uses the embedded WASM module instead of trying to load it dynamically
5. **QuickJS Runtime**: Using QuickJS's `evalCode()` method instead of `new Function()` to execute JavaScript code safely

**Manual WASM Copy**: If you need to manually copy WASM files (e.g., after updating dependencies), run:
```bash
pnpm copy-wasm
```

#### Code Execution Constraints

- **No Top-Level Return**: QuickJS doesn't support top-level `return` statements. Code with `return` statements must be wrapped in an IIFE (Immediately Invoked Function Expression)
- **Context Serialization**: All context data must be serializable to JSON (functions are filtered out and provided separately as code strings)
- **Memory Limits**: QuickJS runtime has a 10MB memory limit per execution
- **Timeout**: Maximum execution time is 5 seconds

#### Bundle Size Impact

The QuickJS WASM module adds approximately **600KB** to the worker bundle:
- Before: ~894 KB
- After: ~1495 KB (gzip: ~420 KB)

This is acceptable for the functionality provided, as it enables full JavaScript execution in a sandboxed environment.

## License

ISC

