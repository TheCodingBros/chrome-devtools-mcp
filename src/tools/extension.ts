/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {z} from 'zod';

import {ToolCategory} from './categories.js';
import {defineTool} from './ToolDefinition.js';

interface ExtensionLog {
  ctx: string;
  level: string;
  msg: unknown[];
  sid: string;
  t: string;
}

export const get_extension_logs = defineTool({
  name: 'get_extension_logs',
  description: `Retrieve captured console logs from an extension's development log sink.

This tool accesses logs stored in chrome.storage.local by extensions that implement a dev log sink system. It can retrieve logs from all extension contexts (background/service worker, options, popup, sidebar).

Use this tool for:
- Debugging extension behavior across different contexts
- Accessing historical console output with timestamps
- Monitoring extension activity during development
- Retrieving logs when DevTools is not directly accessible for extension pages

The extension must store logs in chrome.storage.local under the '__dev_logs' key in this format:
{
  "ctx": "background",  // Context: background, options, popup, sidebar
  "level": "info",      // Log level: log, info, warn, error
  "msg": ["message"],   // Log message array
  "sid": "session_id",  // Session identifier
  "t": "2025-01-01T00:00:00.000Z"  // ISO timestamp
}`,
  annotations: {
    title: 'get_extension_logs',
    category: ToolCategory.DEBUGGING,
    readOnlyHint: true,
  },
  schema: {
    extensionId: z
      .string()
      .trim()
      .min(1)
      .describe('Chrome extension ID (32-character string)'),
    contextType: z
      .enum(['background', 'options', 'popup', 'sidebar', 'all'])
      .optional()
      .default('all')
      .describe('Filter logs by extension context type'),
    logLevel: z
      .enum(['log', 'info', 'warn', 'error', 'all'])
      .optional()
      .default('all')
      .describe('Filter logs by severity level'),
    maxEntries: z
      .number()
      .min(1)
      .max(1000)
      .optional()
      .default(100)
      .describe('Maximum number of log entries to return (1-1000)'),
    since: z
      .number()
      .optional()
      .describe('Only return logs after this timestamp (Unix timestamp in ms)'),
    sessionId: z
      .string()
      .optional()
      .describe('Filter logs by specific session ID'),
  },
  handler: async (request, response, context) => {
    const {extensionId, contextType, logLevel, maxEntries, since, sessionId} =
      request.params;

    try {
      // Save the original selected page index to restore later
      const originalPageIdx = context.getSelectedPageIdx();

      // Create a new page to access the extension context
      const page = await context.newPage();
      const newPageIdx = context.getSelectedPageIdx();

      try {
        // Try to navigate to the extension's options page first
        const extensionUrl = `chrome-extension://${extensionId}/options.html`;

        try {
          await page.goto(extensionUrl, {
            waitUntil: 'networkidle0',
            timeout: 10000,
          });
        } catch {
          // If options.html doesn't exist, try a generic extension page
          const fallbackUrl = `chrome-extension://${extensionId}/`;
          await page.goto(fallbackUrl, {
            waitUntil: 'networkidle0',
            timeout: 10000,
          });
        }

        // Access the extension's chrome.storage.local to read logs
        const logs = await page.evaluate(
          async (params: {
            since?: number;
            sessionId?: string;
            maxEntries: number;
            contextType: string;
            logLevel: string;
          }) => {
            const {since, sessionId, maxEntries, contextType, logLevel} =
              params;

            try {
              // Access chrome.storage.local API (available in extension context)
              // @ts-expect-error - chrome APIs are available in extension context
              const result = await chrome.storage.local.get('__dev_logs');
              const allLogs = result.__dev_logs || [];

              // Apply filters
              let filteredLogs = allLogs;

              if (since) {
                filteredLogs = filteredLogs.filter(
                  (log: ExtensionLog) => new Date(log.t).getTime() >= since,
                );
              }

              if (sessionId) {
                filteredLogs = filteredLogs.filter(
                  (log: ExtensionLog) => log.sid === sessionId,
                );
              }

              if (contextType !== 'all') {
                filteredLogs = filteredLogs.filter(
                  (log: ExtensionLog) =>
                    log.ctx === contextType ||
                    (contextType === 'background' &&
                      log.ctx === 'service_worker'),
                );
              }

              if (logLevel !== 'all') {
                filteredLogs = filteredLogs.filter(
                  (log: ExtensionLog) => log.level === logLevel,
                );
              }

              // Sort by timestamp (most recent first)
              filteredLogs.sort(
                (a: ExtensionLog, b: ExtensionLog) =>
                  new Date(b.t).getTime() - new Date(a.t).getTime(),
              );

              // Limit results
              return filteredLogs.slice(0, maxEntries);
            } catch (error) {
              return {
                error: `Failed to access extension storage: ${error instanceof Error ? error.message : String(error)}`,
              };
            }
          },
          {since, sessionId, maxEntries, contextType, logLevel},
        );

        if (logs && 'error' in logs) {
          response.appendResponseLine(`Error: ${logs.error}`);
          return;
        }

        if (!logs || logs.length === 0) {
          response.appendResponseLine(
            'No logs found matching the specified criteria.',
          );
          response.appendResponseLine('');
          response.appendResponseLine('This could mean:');
          response.appendResponseLine(
            '- The extension does not implement a dev log sink',
          );
          response.appendResponseLine('- No logs have been generated yet');
          response.appendResponseLine(
            '- The filter criteria are too restrictive',
          );
          return;
        }

        response.appendResponseLine(
          `Found ${logs.length} log entries for extension ${extensionId}`,
        );
        response.appendResponseLine('');

        // Group logs by session for better readability
        const logsBySession = new Map();
        for (const log of logs) {
          if (!logsBySession.has(log.sid)) {
            logsBySession.set(log.sid, []);
          }
          logsBySession.get(log.sid).push(log);
        }

        for (const [sessionId, sessionLogs] of logsBySession) {
          response.appendResponseLine(`Session: ${sessionId}`);
          response.appendResponseLine('─'.repeat(50));

          for (const log of sessionLogs) {
            const timestamp = new Date(log.t).toISOString();
            const level = log.level.toUpperCase().padEnd(5);
            const context = log.ctx.padEnd(10);
            const message = Array.isArray(log.msg)
              ? log.msg.join(' ')
              : String(log.msg);

            response.appendResponseLine(
              `${timestamp} [${level}] ${context} ${message}`,
            );
          }
          response.appendResponseLine('');
        }
      } finally {
        // Close the temporary page and restore original selection
        // closePage() sets selected to 0, so we need to restore after
        await context.closePage(newPageIdx);
        context.setSelectedPageIdx(originalPageIdx);
      }
    } catch (error) {
      response.appendResponseLine(
        `Failed to retrieve extension logs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});

export const test_extension_access = defineTool({
  name: 'test_extension_access',
  description: `Perform basic functionality testing on a Chrome extension.

This tool tests whether an extension is properly loaded and accessible, checks its basic functionality, and reports on its status across different contexts.

Use this tool for:
- Verifying extension installation and loading
- Basic functionality testing
- Checking extension accessibility across contexts
- Quick health checks during development`,
  annotations: {
    title: 'test_extension_access',
    category: ToolCategory.DEBUGGING,
    readOnlyHint: true,
  },
  schema: {
    extensionId: z
      .string()
      .trim()
      .min(1)
      .describe('Chrome extension ID (32-character string)'),
  },
  handler: async (request, response, context) => {
    const {extensionId} = request.params;

    response.appendResponseLine(`Testing extension: ${extensionId}`);
    response.appendResponseLine('');

    try {
      // Save the original selected page index to restore later
      const originalPageIdx = context.getSelectedPageIdx();

      // Test 1: Check if extension pages are accessible
      const page = await context.newPage();
      const newPageIdx = context.getSelectedPageIdx();
      const testResults: string[] = [];

      try {
        // Test options page
        try {
          await page.goto(`chrome-extension://${extensionId}/options.html`, {
            waitUntil: 'networkidle0',
            timeout: 5000,
          });
          testResults.push('✓ Options page accessible');
        } catch {
          testResults.push('✗ Options page not accessible');
        }

        // Test manifest accessibility
        try {
          await page.goto(`chrome-extension://${extensionId}/manifest.json`, {
            waitUntil: 'networkidle0',
            timeout: 5000,
          });
          testResults.push('✓ Manifest accessible');
        } catch {
          testResults.push('✗ Manifest not accessible');
        }

        // Test root page
        try {
          await page.goto(`chrome-extension://${extensionId}/`, {
            waitUntil: 'networkidle0',
            timeout: 5000,
          });
          testResults.push('✓ Extension root accessible');
        } catch {
          testResults.push('✗ Extension root not accessible');
        }

        // Test storage access (if we can access an extension page)
        try {
          await page.goto(`chrome-extension://${extensionId}/`, {
            timeout: 5000,
          });

          const storageTest = await page.evaluate(async () => {
            try {
              // @ts-expect-error - chrome APIs are available in extension context
              await chrome.storage.local.get('test');
              return {success: true, message: 'Storage API accessible'};
            } catch (error) {
              return {
                success: false,
                message: `Storage API error: ${error instanceof Error ? error.message : String(error)}`,
              };
            }
          });

          if (storageTest.success) {
            testResults.push('✓ Storage API accessible');
          } else {
            testResults.push(`✗ Storage API issue: ${storageTest.message}`);
          }
        } catch {
          testResults.push('✗ Could not test storage API');
        }
      } finally {
        // Close the temporary page and restore original selection
        // closePage() sets selected to 0, so we need to restore after
        await context.closePage(newPageIdx);
        context.setSelectedPageIdx(originalPageIdx);
      }

      // Display results
      response.appendResponseLine('Extension Test Results:');
      response.appendResponseLine('─'.repeat(30));
      for (const result of testResults) {
        response.appendResponseLine(result);
      }

      // Summary
      const successCount = testResults.filter(r => r.startsWith('✓')).length;
      const totalTests = testResults.length;

      response.appendResponseLine('');
      response.appendResponseLine(
        `Summary: ${successCount}/${totalTests} tests passed`,
      );

      if (successCount === totalTests) {
        response.appendResponseLine(
          '🎉 Extension appears to be working correctly!',
        );
      } else if (successCount > 0) {
        response.appendResponseLine(
          '⚠️  Extension has some issues but is partially functional',
        );
      } else {
        response.appendResponseLine(
          '❌ Extension appears to have significant issues',
        );
      }
    } catch (error) {
      response.appendResponseLine(
        `Failed to test extension: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
