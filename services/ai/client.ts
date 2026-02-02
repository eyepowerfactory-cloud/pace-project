// AI Client with Resilience (Claude API)

import Anthropic from '@anthropic-ai/sdk';
import { withRetry, withTimeout, isRetryableError } from '../resilience';

export interface AiCallOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<AiCallOptions> = {
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 1024,
  temperature: 0.7,
  timeoutMs: 15000, // 15秒
};

/**
 * Claude API 呼び出し（Resilience適用）
 *
 * - Retry: 最大2回（ネットワークエラー、5xx、429）
 * - Timeout: 15秒
 * - Exponential Backoff + Jitter
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options: AiCallOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const client = new Anthropic({ apiKey });

  return withRetry(
    () =>
      withTimeout(async () => {
        const response = await client.messages.create({
          model: opts.model,
          max_tokens: opts.maxTokens,
          temperature: opts.temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });

        // テキストコンテンツ抽出
        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text content in AI response');
        }

        return textContent.text;
      }, opts.timeoutMs),
    {
      maxAttempts: 2,
      backoffMs: 500,
      jitter: true,
      retryableErrors: isRetryableError,
    }
  );
}

/**
 * Claude API 呼び出し（JSON出力）
 *
 * JSON形式のレスポンスをパースして返す
 */
export async function callClaudeJson<T = any>(
  systemPrompt: string,
  userPrompt: string,
  options: AiCallOptions = {}
): Promise<T> {
  const rawOutput = await callClaude(systemPrompt, userPrompt, options);

  try {
    // JSONブロック抽出（```json ... ``` or 直接JSON）
    const jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawOutput;

    return JSON.parse(jsonStr.trim());
  } catch (error) {
    throw new Error(`Failed to parse AI JSON output: ${error}`);
  }
}

/**
 * トークン数推定（概算）
 *
 * 正確なトークン数は tiktoken を使用する必要があるが、
 * 概算として文字数 / 4 を使用（英語の場合）
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
