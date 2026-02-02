// Suggestion Generator - 提案生成のメイン処理

import { StateSnapshot } from '@prisma/client';
import { SuggestionDTO } from './types';
import { generatePlanReduceSuggestion } from './payloads/plan-reduce';
import { generateTaskMicrostepSuggestion } from './payloads/task-microstep';
import { generatePriorityFocusSuggestion } from './payloads/priority-focus';
import { generateMotivationRemindSuggestion } from './payloads/motivation-remind';
import { generateResumeSupportSuggestion } from './payloads/resume-support';

/**
 * 提案生成のメイン関数
 *
 * StateSnapshotに基づいて、適切な提案を生成
 * 優先度順に試行し、最初に生成できた提案を返す
 */
export async function generateSuggestions(
  userId: string,
  snapshot: StateSnapshot,
  limit: number = 3
): Promise<SuggestionDTO[]> {
  const suggestions: SuggestionDTO[] = [];

  // 生成関数のリスト（優先度順）
  const generators = [
    // 高優先度: 負荷軽減
    generatePlanReduceSuggestion,
    generateTaskMicrostepSuggestion,
    generatePriorityFocusSuggestion,

    // 中優先度: モチベーション
    generateMotivationRemindSuggestion,
    generateResumeSupportSuggestion,

    // 低優先度: AI生成支援（Phase 7で実装）
    // generateVisionCreateAssistSuggestion,
    // generateVisionToQuarterSuggestion,
    // generateGoalToTaskSuggestion,
  ];

  for (const generator of generators) {
    if (suggestions.length >= limit) break;

    try {
      const suggestion = await generator(userId, snapshot);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    } catch (error) {
      console.error('Suggestion generation error:', error);
      // エラーは無視して次の生成関数を試す
    }
  }

  return suggestions;
}

/**
 * 単一の提案を生成（デバッグ・テスト用）
 */
export async function generateSingleSuggestion(
  userId: string,
  snapshot: StateSnapshot,
  type: 'PLAN_REDUCE' | 'TASK_MICROSTEP' | 'PRIORITY_FOCUS' | 'MOTIVATION_REMIND' | 'RESUME_SUPPORT'
): Promise<SuggestionDTO | null> {
  const generatorMap = {
    PLAN_REDUCE: generatePlanReduceSuggestion,
    TASK_MICROSTEP: generateTaskMicrostepSuggestion,
    PRIORITY_FOCUS: generatePriorityFocusSuggestion,
    MOTIVATION_REMIND: generateMotivationRemindSuggestion,
    RESUME_SUPPORT: generateResumeSupportSuggestion,
  };

  const generator = generatorMap[type];
  return generator ? await generator(userId, snapshot) : null;
}
