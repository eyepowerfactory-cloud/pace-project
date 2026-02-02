// Fallback文言（AI生成失敗時）

import { SuggestionType } from '@prisma/client';

/**
 * Type別のFallback文言
 *
 * AI生成とRepairが両方失敗した場合に使用
 */
export const FALLBACK_COPY: Record<
  SuggestionType,
  {
    title: string;
    message: string;
  }
> = {
  PLAN_REDUCE: {
    title: 'タスクを整理してみませんか？',
    message:
      '今週のタスクが多いようです。いくつかを来週に回すことで、進めやすくなるかもしれません。',
  },

  TASK_MICROSTEP: {
    title: '小さなステップに分けてみませんか？',
    message:
      'このタスクを小さなステップに分けることで、始めやすくなる可能性があります。',
  },

  PRIORITY_FOCUS: {
    title: '1つに集中してみませんか？',
    message:
      '複数のゴールがあるようです。1つに集中することで、進めやすくなるかもしれません。',
  },

  GOAL_REFRAME: {
    title: 'ゴールを見直してみませんか？',
    message:
      'ゴールを少し調整することで、進めやすくなる可能性があります。',
  },

  MOTIVATION_REMIND: {
    title: '目指している理由を思い出してみませんか？',
    message:
      'なぜこれを目指しているのか、改めて確認することができます。',
  },

  AUTONOMY_ADJUST: {
    title: '提案の頻度を調整できます',
    message:
      '提案の頻度を変更することができます。ご自身のペースに合わせて調整してみませんか？',
  },

  RESUME_SUPPORT: {
    title: '小さな一歩から始めてみませんか？',
    message:
      'しばらくぶりですね。短時間で終わるタスクから始めてみるのはいかがでしょうか。',
  },

  VISION_CREATE_ASSIST: {
    title: 'Visionを作成してみませんか？',
    message:
      '目指したい方向を言葉にすることで、次のステップが見えてくるかもしれません。',
  },

  VISION_TO_QUARTER_TRANSLATE: {
    title: 'Visionから四半期ゴールを作成してみませんか？',
    message:
      'Visionを具体的な四半期ゴールに落とし込むことができます。',
  },

  GOAL_TO_TASK_DRAFT: {
    title: 'ゴールからタスクを作成してみませんか？',
    message:
      'ゴールを具体的なタスクに分解することで、次に何をするか明確になるかもしれません。',
  },
};

/**
 * Fallback文言取得
 */
export function getFallbackCopy(type: SuggestionType): {
  title: string;
  message: string;
} {
  return FALLBACK_COPY[type];
}
