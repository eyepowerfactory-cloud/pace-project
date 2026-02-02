// Circuit Breaker Pattern

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreakerError extends Error {
  constructor() {
    super('Circuit breaker is OPEN');
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit Breaker
 *
 * - CLOSED: 通常動作
 * - OPEN: 連続失敗後、リクエスト拒否
 * - HALF_OPEN: タイムアウト後、試行的に再開
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt: number = Date.now();

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitBreakerError();
      }
      // タイムアウト経過 → HALF_OPEN へ
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeout;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }
}

/**
 * グローバルCircuit Breaker（サービス単位）
 */
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  name: string,
  options: CircuitBreakerOptions
): CircuitBreaker {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(options));
  }
  return breakers.get(name)!;
}
