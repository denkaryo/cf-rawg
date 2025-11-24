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
│   └── index.ts        # Worker entry point
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

## License

ISC

