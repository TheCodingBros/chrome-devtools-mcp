/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Extracts the extension ID from a chrome-extension:// URL
 */
export function extractExtensionId(url: string): string {
  if (!url.startsWith('chrome-extension://')) {
    throw new Error('Not a chrome-extension URL');
  }

  const urlObj = new URL(url);
  return urlObj.hostname;
}

/**
 * Determines the context type of an extension URL
 */
export function getExtensionContextType(url: string): string {
  if (!url.startsWith('chrome-extension://')) {
    return 'web';
  }

  const pathname = new URL(url).pathname.toLowerCase();

  if (pathname.includes('background') || pathname.includes('service_worker')) {
    return 'service_worker';
  }

  if (pathname.includes('options')) {
    return 'options';
  }

  if (pathname.includes('popup')) {
    return 'popup';
  }

  if (pathname.includes('sidebar') || pathname.includes('sidepanel')) {
    return 'sidebar';
  }

  if (pathname.includes('content_script')) {
    return 'content_script';
  }

  return 'extension_page';
}

/**
 * Checks if two extension URLs belong to the same extension
 */
export function isSameExtension(url1: string, url2: string): boolean {
  if (
    !url1.startsWith('chrome-extension://') ||
    !url2.startsWith('chrome-extension://')
  ) {
    return false;
  }

  try {
    return extractExtensionId(url1) === extractExtensionId(url2);
  } catch {
    return false;
  }
}
