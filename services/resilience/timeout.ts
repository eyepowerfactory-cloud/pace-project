// Timeout with AbortController

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Timeout wrapper
 *
 * @example
 * const result = await withTimeout(
 *   () => longRunningOperation(),
 *   5000 // 5秒でタイムアウト
 * );
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await fn();
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(timeoutMs);
    }

    throw error;
  }
}

/**
 * Promise.race ベースのタイムアウト
 *
 * AbortControllerが使えない場合の代替実装
 */
export async function withTimeoutRace<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}
