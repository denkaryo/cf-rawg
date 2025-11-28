# Game Analytics MCP Server

Production-ready MCP server + AI agent system for analyzing video game data using RAWG API, deployed on Cloudflare Workers.

## Overview

This project implements a Model Context Protocol (MCP) server that provides tools for fetching and analyzing video game data. An AI agent orchestrates these tools to answer analytical questions about games.

## Architecture

- **MCP Server**: Provides `fetch_game_data` and `execute_calculation` tools via Streamable HTTP transport
- **RAWG Client**: Type-safe client for RAWG Video Games Database API
- **Code Executor**: Safe, dynamic code execution for flexible calculations
- **AI Agent**: Uses OpenAI or Anthropic models to orchestrate tools
- **UI**: Chat interface with evaluation metrics display

## Using with Cursor

This server implements the Model Context Protocol and can be connected directly to Cursor as a remote MCP server. See [CURSOR_MCP_SETUP.md](./docs/CURSOR_MCP_SETUP.md) for configuration instructions.

**Server URL**: `https://cf-rawg.dkalaslioglu.workers.dev/mcp`

## Evaluation Panel (Frontend)

The chat UI includes a right-side Evaluation panel that:
- Shows the last `fetch_game_data` filters, counts, summaries, and warnings
- Captures each `execute_calculation` call as a snapshot (code + data)
- Lets you re-run the calculation locally (with `avg`, `sum`, `min`, `max`, `groupBy`)
- Compares manual vs server result and reports PASS/FAIL

See detailed behavior and usage in [docs/EVALUATION.md](./docs/EVALUATION.md).

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

### Response Size and Performance Limitations

During development, we encountered significant performance issues when processing analytical queries:

#### The Problem

1. **Large Response Payloads**: RAWG API returns full game objects with many nested fields (platforms arrays, genres arrays, ratings objects, etc.), resulting in 4-7KB per game object
2. **Excessive Token Usage**: Sending 40+ full game objects to the LLM consumed 2000-4000 tokens per query, just for the data payload
3. **Slow Query Processing**: Large payloads caused 10-30 second response times as the LLM processed massive amounts of data
4. **Cost Implications**: High token usage significantly increased API costs

#### The Solution

We implemented several optimizations to address these limitations:

1. **Smart Default Page Size**: Set default `page_size` to 20 games (instead of no default), which provides sufficient statistical validity for most calculations while reducing payload size by 50%

2. **Response Trimming**: Automatically trim game objects to only essential fields (`id`, `name`, `metacritic`, `rating`, `released`), reducing each game object from 4-7KB to 1-2KB

3. **Selective Field Inclusion**: Platforms and genres arrays are only included when filtering by those fields, avoiding unnecessary nested data

4. **Summary Statistics**: For large datasets, include pre-calculated summary statistics (averages, min/max) so the LLM can answer queries without processing all individual games

5. **Agent Efficiency Guidelines**: Updated system prompts to guide the agent to use small page sizes (20-30 games) for most queries

#### Results

These optimizations achieved:
- **80% reduction** in response size (150-300KB → 20-40KB)
- **75% reduction** in token usage (~2000-4000 → ~500-1000 tokens)
- **60-70% faster** query processing (10-30s → 3-8s)
- **80% cost reduction** per query

The system now efficiently handles analytical queries while maintaining calculation accuracy, as 20-30 games provides sufficient sample size for statistical operations like averages and comparisons.

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

## Time Spent

Approximate breakdown of effort:

- Phase 0 — Architecture and research (project shaping, RAWG docs, MCP docs, plan refinement): ~1.0 h
- Phase 1 — RAWG client domain (types, filters, client, integration test): ~1.0 h
- Phase 2 — Code execution domain (QuickJS WASM sandbox, validator, runtime): ~3.5 h
- Phase 3 — MCP server domain (tools, server wiring, unit tests): ~1.0 h
- Phase 4 — Agent orchestration (AI SDK integration, tools mapping, prompts): ~1.5 h
- Phase 5 — UI and evaluation display (chat UI, streaming, eval panel): ~2.0 h
- Phase 6 — Testing and refinement (unit + integration, streaming polish): ~1.0 h
- Phase 7 — Deployment (Cloudflare configuration, wrangler, prod checks): ~0.5 h
- Debugging and polish (performance trimming, CORS, Cursor Streamable HTTP): ~2.5 h

Total: ~14.0 hours

## License

ISC

