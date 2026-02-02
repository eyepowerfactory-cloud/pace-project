// Retry with Exponential Backoff + Jitter (taisun_agent パターン)

export interface RetryOptions {
  maxAttempts?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  jitter?: boolean;
  retryableErrors?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  backoffMs: 500,
  maxBackoffMs: 10000,
  jitter: true,
  retryableErrors: () => true,
};

/**
 * Retry with Exponential Backoff
 *
 * @example
 * const result = await withRetry(
 *   () => callExternalAPI(),
 *   { maxAttempts: 3, backoffMs: 1000, jitter: true }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 最終試行またはリトライ不可エラーの場合
      if (attempt >= opts.maxAttempts || !opts.retryableErrors(error)) {
        throw error;
      }

      // バックオフ時間計算
      const backoff = calculateBackoff(
        attempt,
        opts.backoffMs,
        opts.maxBackoffMs,
        opts.jitter
      );

      console.warn(`Retry attempt ${attempt}/${opts.maxAttempts} after ${backoff}ms`, {
        error: error instanceof Error ? error.message : String(error),
      });

      await sleep(backoff);
    }
  }

  throw lastError;
}

/**
 * Exponential Backoff with Jitter
 */
function calculateBackoff(
  attempt: number,
  baseMs: number,
  maxMs: number,
  jitter: boolean
): number {
  // Exponential: base * 2^(attempt-1)
  const exponential = baseMs * Math.pow(2, attempt - 1);
  const capped = Math.min(exponential, maxMs);

  if (!jitter) return capped;

  // Full Jitter: random(0, capped)
  return Math.floor(Math.random() * capped);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 一般的なリトライ可能エラー判定
 */
export function isRetryableError(error: any): boolean {
  // ネットワークエラー
  if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
    return true;
  }

  // HTTPステータスコード（5xx, 429）
  if (error?.response?.status) {
    const status = error.response.status;
    return status === 429 || (status >= 500 && status < 600);
  }

  // AI APIエラー（Anthropic）
  if (error?.type === 'overloaded_error' || error?.type === 'rate_limit_error') {
    return true;
  }

  return false;
}
