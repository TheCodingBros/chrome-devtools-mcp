# Setup Guide: Chrome DevTools MCP with Claude Code for Extension Debugging (macOS)

## Prerequisites

Ensure you have these installed on macOS:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [Google Chrome](https://www.google.com/chrome/) (stable version)
- [Claude Code CLI](https://claude.ai/code) (installed and authenticated)

## Step 1: Build the MCP Server

```bash
# Clone and build the project
git clone https://github.com/ChromeDevTools/chrome-devtools-mcp.git
cd chrome-devtools-mcp
npm install
npm run build
```

Verify the build created the `build/` directory with compiled JavaScript files:

```bash
ls build/
# Should show: index.js, tool-handler.js, url-utils.js, tools/
```

## Step 2: Prepare Your Extension

Prepare your extension for debugging:

```bash
# Ensure your extension is unpacked in a directory
# Example structure:
# /path/to/your-extension/
# ├── manifest.json
# ├── background.js (or service_worker.js)
# ├── options.html
# ├── popup.html
# └── sidebar.html
```

## Step 3: Configure Chrome Profile

Set up the dedicated Chrome profile for MCP:

```bash
# Create the profile directory
mkdir -p ~/.cache/chrome-devtools-mcp/mcp-profile

# Launch Chrome Canary with the profile (keep this running)
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
  --user-data-dir=$HOME/.cache/chrome-devtools-mcp/mcp-profile
```

**Important Setup in Chrome:**

1. Sign into Chrome with your Google account
2. Open DevTools (F12 or right-click → Inspect)
3. Go to DevTools Settings (⚙️) → Experiments or AI innovations
4. Enable "AI assistance"
5. Close Chrome completely

## Step 4: Configure Claude Code MCP Client

### Cursor

Create a `.cursor/mcp.json` file with the following content:

```json
{
  "mcpServers": {
    "chrome-devtools-mcp-pwai": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/yourusername/path/to/chrome-devtools-mcp/build/index.js",
        "--channel=canary",
        "--extensionPath=/Users/yourusername/path/to/extension_project/build/folder",
        "--log-file=/Users/yourusername/path/to/extension_project/logs.txt"
      ]
    }
  }
}
```

### Claude Code

```bash
# Add the MCP server to Claude Code
claude mcp add chrome-devtools-mcp --scope project \
  -- npx -y @privatewebai/chrome-devtools-mcp --channel=dev --extensionPath=/Users/yourusername/path/to/extension_project/build/folder --log-file=/Users/yourusername/path/to/extension_project/logs.txt
```

**Replace the paths:**

- `/Users/yourusername/path/to/chrome-devtools-mcp/build/index.js` with your actual project path
- `/Users/yourusername/path/to/your-extension` with your extension's directory path

This will effectively create a .mcp.json file in the root of your project, you can also manually create this file as an alternative method:

```json
{
  "mcpServers": {
    "chrome-devtools-mcp-pwai": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "@privatewebai/chrome-devtools-mcp",
        "--channel=dev",
        "--extensionPath=/Users/yourusername/path/to/extension_project/build/folder",
        "--log-file=/Users/yourusername/path/to/extension_project/logs.txt"
      ]
    }
  }
}
```

## Step 5: Start Claude Code

```bash
# Start Claude Code
claude-code

# The MCP server will automatically:
# 1. Connect to your running Chrome instance
# 2. Access your loaded extension
# 3. Enable extension debugging features
```

## Step 6: Test the Connection

Once Claude Code starts, verify the connection works:

```
Get extension logs for [your-extension-id]
```

You should see logs from your extension's contexts.

## Extension Debugging Commands

### Get Console Logs

```
Get console logs from extension mnhjigbdgnofilmnjhodpbggbpoibkof background context
```

### Test Extension Functionality

```
Test the extension with ID mnhjigbdgnofilmnjhodpbggbpoibkof and check if it's working properly
```
## Chrome Launch Options

### Basic Launch (Recommended)

```bash
# Standard launch with debugging enabled
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --remote-debugging-address=127.0.0.1
```

### Launch with Extension Auto-Loading

```bash
# Launch Chrome with your extension pre-loaded
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --remote-debugging-address=127.0.0.1 \
  --load-extension=/path/to/your-extension
```

### Custom User Profile

```bash
# Use a dedicated profile for extension development
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir=$HOME/.chrome-extension-dev \
  --load-extension=/path/to/your-extension
```

## Troubleshooting

### Common Issues

**1. "Cannot connect to Chrome"**

```bash
# Check if Chrome is running with debugging enabled
curl http://127.0.0.1:9222/json/version
# Should return Chrome version info

# If not working, restart Chrome with the debugging command
```

**2. "Extension not found"**

```bash
# Verify extension is loaded in Chrome
# Go to chrome://extensions/ and check your extension is there
# Copy the extension ID and use it in Claude Code commands
```

**3. "No logs available"**

```bash
# Make sure your extension is actively running
# Check browser console in extension pages (right-click → Inspect)
# Try triggering extension functionality to generate logs
```

## Example Usage Session

Once everything is set up:

```
User: Check the console logs from my extension's background script

Claude: I'll retrieve the console logs from your extension's background context.

[Retrieves and analyzes logs using cdp_extension_get_logs]

I found several log entries from your background script. Here's what I see:
- 3 info messages about initialization
- 1 warning about deprecated API usage
- 2 error messages related to storage permissions

The errors suggest your extension needs additional permissions for chrome.storage.local access...

[Provides specific debugging guidance based on actual console output]
```

## Available Tools

### `get_extension_logs`

Retrieve captured console logs from an extension's development log sink stored in `chrome.storage.local`.

The extension must store logs in `chrome.storage.local` under the `__dev_logs` key in this format:
```json
{
  "ctx": "background",
  "level": "info",
  "msg": ["message"],
  "sid": "session_id",
  "t": "2025-01-01T00:00:00.000Z"
}
```

**Parameters:**

- `extensionId` (required): Chrome extension ID (32-character string)
- `contextType` (optional): Filter by context (`background`, `options`, `popup`, `sidebar`, `all`)
- `logLevel` (optional): Filter by level (`log`, `info`, `warn`, `error`, `all`)
- `maxEntries` (optional): Maximum entries to return (1-1000, default: 100)
- `since` (optional): Only return logs after this timestamp (Unix timestamp in ms)
- `sessionId` (optional): Filter by specific session ID

### `test_extension_access`

Perform basic functionality testing on a Chrome extension.

**Parameters:**

- `extensionId` (required): Chrome extension ID (32-character string)

This tool tests whether an extension is properly loaded and accessible, checks its basic functionality, and reports on its status across different contexts.

## Extension Context Types Supported

- **Background scripts/Service workers** - Monitor background processes and API calls
- **Options pages** - Debug extension settings and configuration interfaces
- **Popup pages** - Debug extension popup interfaces
- **Sidebar/Sidepanel pages** - Debug sidebar panels and content
