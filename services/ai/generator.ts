// AI生成統合（Repair + Fallback + Logging）

import { prisma } from '@/lib/prisma';
import { PromptKey, AiGenerationType } from '@prisma/client';
import { callClaudeJson } from './client';
import { resolvePromptVersion, replaceTemplateVariables } from './prompt-resolver';
import {
  checkToneViolations,
  generateRepairSystemPrompt,
  ToneViolation,
} from '@/domains/tone/validator';
import { getFallbackCopy } from '@/domains/tone/fallbacks';
import { z } from 'zod';

/**
 * Suggestion Copy スキーマ
 */
const SuggestionCopySchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  options: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * AI生成：Suggestion Copy
 *
 * 提案文言をAIで生成し、Paceトーンを自動検証
 *
 * @param userId ユーザーID
 * @param suggestionType 提案タイプ
 * @param context コンテキスト（状態、タスク情報等）
 * @returns 生成された提案文言
 */
export async function generateSuggestionCopy(
  userId: string,
  suggestionType: string,
  context: any
): Promise<{ title: string; message: string; options?: any[] }> {
  const startTime = Date.now();

  // 1. PromptVersion解決
  const promptVersion = await resolvePromptVersion('SUGGESTION_COPY', userId);

  // 2. プロンプト変数置換
  const systemPrompt = promptVersion.systemText;
  const userPrompt = replaceTemplateVariables(promptVersion.userText, {
    suggestionType,
    context: JSON.stringify(context, null, 2),
    stateType: context.stateType || 'UNKNOWN',
    stateScore: String(context.stateScore || 0),
  });

  try {
    // 3. AI生成
    const rawOutput = await callClaudeJson<any>(systemPrompt, userPrompt);

    // 4. バリデーション
    const validated = SuggestionCopySchema.parse(rawOutput);

    // 5. トーン検証
    const violations = checkToneViolations({
      title: validated.title,
      message: validated.message,
    });

    if (violations.length > 0) {
      // 6. Repair試行（1回のみ）
      const repaired = await repairSuggestionCopy(
        validated,
        violations,
        promptVersion
      );

      if (repaired) {
        // Repair成功
        await logAiGeneration({
          userId,
          type: 'SUGGESTION_COPY',
          promptVersionId: promptVersion.id,
          promptKey: 'SUGGESTION_COPY',
          modelName: 'claude-sonnet-4-5-20250929',
          inputJson: { systemPrompt, userPrompt },
          outputJson: repaired,
          validationOk: true,
          violationsJson: violations,
          repairUsed: true,
          fallbackUsed: false,
          latencyMs: Date.now() - startTime,
        });

        return repaired;
      } else {
        // Repair失敗 → Fallback
        const fallback = getFallbackCopy(suggestionType as any);

        await logAiGeneration({
          userId,
          type: 'SUGGESTION_COPY',
          promptVersionId: promptVersion.id,
          promptKey: 'SUGGESTION_COPY',
          modelName: 'claude-sonnet-4-5-20250929',
          inputJson: { systemPrompt, userPrompt },
          outputJson: fallback,
          validationOk: false,
          violationsJson: violations,
          repairUsed: true,
          fallbackUsed: true,
          latencyMs: Date.now() - startTime,
        });

        return fallback;
      }
    }

    // 7. 成功ログ
    await logAiGeneration({
      userId,
      type: 'SUGGESTION_COPY',
      promptVersionId: promptVersion.id,
      promptKey: 'SUGGESTION_COPY',
      modelName: 'claude-sonnet-4-5-20250929',
      inputJson: { systemPrompt, userPrompt },
      outputJson: validated,
      validationOk: true,
      violationsJson: null,
      repairUsed: false,
      fallbackUsed: false,
      latencyMs: Date.now() - startTime,
    });

    return validated;
  } catch (error) {
    // AI生成失敗 → Fallback
    const fallback = getFallbackCopy(suggestionType as any);

    await logAiGeneration({
      userId,
      type: 'SUGGESTION_COPY',
      promptVersionId: promptVersion.id,
      promptKey: 'SUGGESTION_COPY',
      modelName: 'claude-sonnet-4-5-20250929',
      inputJson: { systemPrompt, userPrompt },
      outputJson: fallback,
      validationOk: false,
      violationsJson: null,
      repairUsed: false,
      fallbackUsed: true,
      latencyMs: Date.now() - startTime,
    });

    return fallback;
  }
}

/**
 * トーン違反の修正試行
 *
 * @param original 元の生成結果
 * @param violations トーン違反リスト
 * @param promptVersion PromptVersion
 * @returns 修正された結果（失敗時はnull）
 */
async function repairSuggestionCopy(
  original: { title: string; message: string },
  violations: ToneViolation[],
  promptVersion: any
): Promise<{ title: string; message: string; options?: any[] } | null> {
  try {
    const repairSystemPrompt = generateRepairSystemPrompt(violations);
    const repairUserPrompt = `以下の提案文言を、Paceトーン原則に従って修正してください：

タイトル: ${original.title}
メッセージ: ${original.message}

修正後のJSON形式で出力してください：
{
  "title": "修正後のタイトル",
  "message": "修正後のメッセージ"
}`;

    const repaired = await callClaudeJson<any>(
      repairSystemPrompt,
      repairUserPrompt,
      {
        maxTokens: 512,
        temperature: 0.5,
      }
    );

    // 再検証
    const repairedViolations = checkToneViolations({
      title: repaired.title,
      message: repaired.message,
    });

    if (repairedViolations.length === 0) {
      return SuggestionCopySchema.parse(repaired);
    }

    // Repair後もまだ違反がある場合は失敗
    return null;
  } catch (error) {
    console.error('Repair failed:', error);
    return null;
  }
}

/**
 * AI生成ログ記録
 */
async function logAiGeneration(params: {
  userId: string;
  type: AiGenerationType;
  promptVersionId: string;
  promptKey: PromptKey;
  modelName: string;
  inputJson: any;
  outputJson: any;
  validationOk: boolean;
  violationsJson: ToneViolation[] | null;
  repairUsed: boolean;
  fallbackUsed: boolean;
  latencyMs: number;
  tokenCountIn?: number;
  tokenCountOut?: number;
}): Promise<void> {
  await prisma.aiGenerationLog.create({
    data: {
      userId: params.userId,
      type: params.type,
      promptKey: params.promptKey,
      promptVersionId: params.promptVersionId,
      modelName: params.modelName,
      inputJson: params.inputJson as any,
      outputJson: params.outputJson as any,
      validationOk: params.validationOk,
      violationsJson: params.violationsJson as any,
      repairUsed: params.repairUsed,
      fallbackUsed: params.fallbackUsed,
      latencyMs: params.latencyMs,
      tokenCountIn: params.tokenCountIn,
      tokenCountOut: params.tokenCountOut,
    },
  });
}

/**
 * Task Microstep Draft 生成（Phase 7実装例）
 */
export async function generateTaskMicrostepDraft(
  userId: string,
  taskTitle: string,
  taskDescription?: string
): Promise<Array<{ title: string; effortMin: number; order: number }>> {
  const promptVersion = await resolvePromptVersion(
    'TASK_MICROSTEP_DRAFT',
    userId
  );

  const systemPrompt = promptVersion.systemText;
  const userPrompt = replaceTemplateVariables(promptVersion.userText, {
    taskTitle,
    taskDescription: taskDescription || 'なし',
  });

  try {
    const result = await callClaudeJson<any>(systemPrompt, userPrompt);

    await logAiGeneration({
      userId,
      type: 'TASK_DRAFT',
      promptVersionId: promptVersion.id,
      promptKey: 'TASK_MICROSTEP_DRAFT',
      modelName: 'claude-sonnet-4-5-20250929',
      inputJson: { systemPrompt, userPrompt },
      outputJson: result,
      validationOk: true,
      violationsJson: null,
      repairUsed: false,
      fallbackUsed: false,
      latencyMs: 0,
    });

    return result.microSteps || [];
  } catch (error) {
    // Fallback: 固定の3ステップ
    return [
      { title: `${taskTitle} - 準備`, effortMin: 15, order: 1 },
      { title: `${taskTitle} - 実行`, effortMin: 30, order: 2 },
      { title: `${taskTitle} - 完了`, effortMin: 15, order: 3 },
    ];
  }
}
