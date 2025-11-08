/**
 * Enhanced fetch utility with retry, timeout, and error handling.
 *
 * Provides automatic retries with exponential backoff for transient failures,
 * configurable timeouts, and network error detection.
 */

export interface FetchWithRetryOptions extends RequestInit {
  timeout?: number; // Request timeout in milliseconds (default: 30000)
  retries?: number; // Number of retry attempts (default: 3)
  retryDelay?: number; // Initial retry delay in milliseconds (default: 1000)
  retryOn?: number[]; // HTTP status codes to retry (default: [408, 429, 500, 502, 503, 504])
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public isNetworkError = false,
    public isTimeout = false
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with automatic retry, exponential backoff, and timeout.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
    retryOn = DEFAULT_RETRY_STATUS_CODES,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check if we should retry based on status code
        if (!response.ok && retryOn.includes(response.status) && attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt);
          const error = new FetchError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response.statusText
          );

          onRetry?.(attempt + 1, error, delay);

          await sleep(delay);
          continue; // Retry
        }

        return response;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      if (attempt === retries) {
        // Final attempt failed, throw error
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new FetchError(
              `Request timeout after ${timeout}ms`,
              undefined,
              undefined,
              false,
              true
            );
          }
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new FetchError(
              'Network error: Please check your internet connection',
              undefined,
              undefined,
              true,
              false
            );
          }
          throw new FetchError(error.message);
        }
        throw new FetchError('Unknown error occurred');
      }

      // Retry on network errors and timeouts
      const delay = retryDelay * Math.pow(2, attempt);
      lastError = error instanceof Error ? error : new Error(String(error));

      onRetry?.(attempt + 1, lastError, delay);

      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript doesn't know that
  throw lastError || new Error('Request failed after all retries');
}

/**
 * Fetch JSON with automatic retry and error handling.
 */
export async function fetchJSON<T = unknown>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options);

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new FetchError(
      errorText || `HTTP ${response.status}`,
      response.status,
      response.statusText
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new FetchError('Invalid JSON response', response.status, response.statusText);
  }
}

/**
 * Check if device is online.
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Wait for device to come back online.
 */
export function waitForOnline(timeout = 60000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onlineHandler);
      reject(new Error('Device did not come online within timeout'));
    }, timeout);

    const onlineHandler = (): void => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', onlineHandler);
      resolve();
    };

    window.addEventListener('online', onlineHandler);
  });
}
