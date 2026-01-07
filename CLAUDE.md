# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome DevTools MCP is a Model Context Protocol (MCP) server that allows AI coding assistants to control and inspect a live Chrome browser. It provides browser automation, debugging capabilities, and performance analysis through the Chrome DevTools protocol and Puppeteer.

## Development Commands

### Build and Type Checking

- `npm run build` - Compiles TypeScript and runs post-build processing
- `npm run typecheck` - Type checks without emitting files
- `npm run format` - Runs ESLint with auto-fix and Prettier
- `npm run check-format` - Lints and checks formatting without fixes

### Testing

- `npm test` - Builds and runs all tests
- `npm run test:only` - Builds and runs tests marked with `test.only`
- `npm run test:only:no-build` - Runs tests with `test.only` without rebuilding
- `npm run test:update-snapshots` - Updates test snapshots

### Documentation

- `npm run docs` - Builds project and regenerates tool documentation
- `npm run docs:generate` - Generates tool reference documentation only

### Running the Server

- `npm start` - Builds and starts the MCP server
- `npm run start-debug` - Starts with debug logging enabled

## Architecture

### Core Components

**Main Entry Point (`src/main.ts`)**

- Sets up the MCP server using `@modelcontextprotocol/sdk`
- Registers all tools from different categories
- Uses a mutex to serialize tool execution
- Handles browser initialization and context management

**Browser Management (`src/browser.ts`, `src/McpContext.ts`)**

- `resolveBrowser()` handles Chrome browser discovery and launching
- `McpContext` manages browser instance, pages, network/console collectors
- Supports connecting to existing browser instances or launching new ones

**Tool System (`src/tools/`)**

- Each tool category is in a separate file (input, pages, performance, etc.)
- Tools use `ToolDefinition` interface with Zod schemas for validation
- All tools are registered automatically in `main.ts`
- Tool categories: Input automation, Navigation, Emulation, Performance, Network, Debugging

**DevTools Integration**

- Uses `chrome-devtools-frontend` package for trace processing and performance analysis
- Heavy integration with Chrome DevTools models for performance insights
- Custom formatters in `src/formatters/` for console, network, and snapshot data

### Key Patterns

**Page Management**

- Uses `PageCollector` to track pages, network requests, and console messages
- Maintains selected page state and handles page navigation
- Each page has its own collectors for network and console data

**Response Handling**

- `McpResponse` class builds structured responses with text, images, and metadata
- Tools can include page snapshots, network data, console logs automatically
- Supports pagination for large datasets (network requests, console messages)

**Performance Tracing**

- `src/trace-processing/parse.ts` processes Chrome DevTools traces
- Uses Chrome DevTools frontend models for analysis and insights
- Stores trace results in context for later analysis

### File Structure Highlights

- `src/tools/` - All MCP tool implementations
- `src/formatters/` - Data formatting utilities for different content types
- `src/trace-processing/` - Performance trace analysis
- `tests/` - Comprehensive test suite with snapshots
- `scripts/` - Build and documentation generation scripts

## Configuration

The project uses modern TypeScript with ES modules (`"type": "module"` in package.json). Key configurations:

- **Node.js**: Requires >= 22.12.0
- **TypeScript**: Targets ES2023 with bundler module resolution
- **ESLint**: Flat config with TypeScript, import, and stylistic rules
- **Testing**: Node.js test runner with custom setup and snapshots

## Extension Support

The server now supports loading Chrome extensions during browser launch:

- **EXTENSION_PATH** - Set this environment variable to automatically load an unpacked extension
- Extensions are loaded with activity logging enabled for debugging
- Use extension debugging tools: `extension_get_logs`, `extension_simple_test`

## Development Notes

- All tools must be thread-safe due to mutex serialization
- Heavy use of Chrome DevTools frontend types and utilities
- Network conditions and CPU throttling are supported for emulation
- Browser user data is persistent by default (use `--isolated` for temporary)
- Debug logging available via `DEBUG=*` environment variable
