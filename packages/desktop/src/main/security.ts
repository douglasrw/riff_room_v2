/**
 * Security utilities for Electron main process.
 * Provides input sanitization and path validation to prevent attacks.
 */

import path from 'path';
import { app } from 'electron';

/**
 * Sanitize file path to prevent path traversal attacks.
 * Ensures file is within allowed directory.
 *
 * @param filePath - User-provided file path
 * @param allowedDir - Base directory to restrict access to (defaults to userData)
 * @returns Sanitized absolute path
 * @throws Error if path is outside allowed directory
 *
 * @example
 * ```ts
 * const safePath = sanitizeFilePath('../../../etc/passwd', app.getPath('userData'));
 * // Throws: Invalid file path: access denied
 * ```
 */
export const sanitizeFilePath = (
  filePath: string,
  allowedDir: string = app.getPath('userData')
): string => {
  // Normalize and resolve to absolute path
  const normalized = path.normalize(filePath);
  const resolved = path.resolve(allowedDir, normalized);
  const allowedResolved = path.resolve(allowedDir);

  // FIXED: Proper path traversal check using path.relative()
  // Prevents bypass on Windows with patterns like C:\Users\..
  const relative = path.relative(allowedResolved, resolved);

  // Check if path escapes allowed directory
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid file path: access denied');
  }

  return resolved;
};

/**
 * Validate and sanitize user input strings.
 * Prevents injection attacks and malformed input.
 *
 * @param input - User input string
 * @param maxLength - Maximum allowed length (default 1000)
 * @returns Sanitized string
 * @throws Error if input is invalid
 *
 * @example
 * ```ts
 * const clean = sanitizeInput('Hello\x00World'); // Returns 'HelloWorld'
 * ```
 */
export const sanitizeInput = (input: unknown, maxLength: number = 1000): string => {
  if (typeof input !== 'string') {
    throw new Error('Invalid input type: expected string');
  }

  if (input.length > maxLength) {
    throw new Error(`Input too long (max ${maxLength} characters)`);
  }

  // Remove null bytes and control characters (except whitespace)
  const sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
};

/**
 * Validate URL to ensure it's safe to load.
 * Only allows localhost in development, blocks external URLs.
 *
 * @param url - URL to validate
 * @param isDev - Whether in development mode
 * @returns True if URL is safe
 */
export const isUrlSafe = (url: string, isDev: boolean = false): boolean => {
  try {
    const parsed = new URL(url);

    // In production, only allow file:// protocol
    if (!isDev) {
      return parsed.protocol === 'file:';
    }

    // In development, allow localhost HTTP
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const allowedHosts = ['localhost', '127.0.0.1', '::1'];
      return allowedHosts.includes(parsed.hostname);
    }

    return parsed.protocol === 'file:';
  } catch {
    return false;
  }
};

/**
 * Rate limiter for IPC calls to prevent DoS.
 * Tracks calls per channel and enforces limits.
 */
export class IPCRateLimiter {
  private callCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly limit: number;
  private readonly window: number;

  /**
   * @param limit - Max calls per window (default 100)
   * @param window - Time window in ms (default 60000 = 1 minute)
   */
  constructor(limit: number = 100, window: number = 60000) {
    this.limit = limit;
    this.window = window;
  }

  /**
   * Check if call is allowed for given channel.
   *
   * @param channel - IPC channel name
   * @returns True if call is within rate limit
   */
  check(channel: string): boolean {
    const now = Date.now();
    const record = this.callCounts.get(channel);

    if (!record || now > record.resetTime) {
      // Reset window
      this.callCounts.set(channel, {
        count: 1,
        resetTime: now + this.window,
      });
      return true;
    }

    if (record.count >= this.limit) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Reset limits for a channel.
   */
  reset(channel: string): void {
    this.callCounts.delete(channel);
  }

  /**
   * Clear all limits.
   */
  clearAll(): void {
    this.callCounts.clear();
  }
}
