// PLAN_REDUCE: タスク削減提案

import { prisma } from '@/lib/prisma';
import { StateSnapshot } from '@prisma/client';
import { SuggestionDTO, PlanReducePayload } from '../types';
import { generateSuggestionCopy } from '@/services/ai/generator';

/**
 * タスク削減提案生成
 *
 * 条件:
 * - 今週のタスクが10個以上
 * - primaryState が OVERLOAD または PLAN_OVERLOAD
 */
export async function generatePlanReduceSuggestion(
  userId: string,
  snapshot: StateSnapshot
): Promise<SuggestionDTO | null> {
  // 条件チェック
  if (
    snapshot.primaryState !== 'OVERLOAD' &&
    snapshot.primaryState !== 'PLAN_OVERLOAD'
  ) {
    return null;
  }

  // 今週のタスク取得
  const weekStart = getWeekStart(new Date());
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      plannedWeekStart: weekStart,
      status: { notIn: ['DONE', 'CANCELLED'] },
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });

  if (tasks.length < 10) {
    return null;
  }

  // 優先度の低いタスクを候補に
  const lowPriorityCount = Math.floor(tasks.length / 3); // 1/3を候補に
  const candidates = tasks.slice(0, lowPriorityCount).map((t) => ({
    taskId: t.id,
    reason: t.priority < 30 ? 'low_priority' : 'reduce_load',
    suggestedAction: 'DEFER_TO_NEXT_WEEK' as const,
  }));

  const recommendedKeepCount = tasks.length - candidates.length;

  const payload: PlanReducePayload = {
    targetWeekStart: weekStart.toISOString(),
    candidates,
    recommendedKeepCount,
  };

  // AI生成文言（Phase 7）
  const copy = await generateSuggestionCopy(userId, 'PLAN_REDUCE', {
    stateType: snapshot.primaryState,
    stateScore: snapshot.primaryConfidence,
    taskCount: tasks.length,
    candidatesCount: candidates.length,
    recommendedKeepCount,
  });

  // SuggestionEvent作成
  const event = await prisma.suggestionEvent.create({
    data: {
      userId,
      suggestionType: 'PLAN_REDUCE',
      stateType: snapshot.primaryState,
      stateScore: snapshot.primaryConfidence,
      context: 'HOME',
      payloadJson: payload as any,
      stateSnapshotId: snapshot.id,
      titleText: copy.title,
      messageText: copy.message,
      optionsJson: copy.options || [
        { key: 'ACCEPT', label: '来週に回す', description: '選択したタスクを来週に移動します' },
        { key: 'KEEP_AS_IS', label: 'このままで大丈夫', description: '今週のままにします' },
      ],
    },
  });

  return {
    eventId: event.id,
    type: 'PLAN_REDUCE',
    title: event.titleText!,
    message: event.messageText!,
    options: event.optionsJson as any,
    payload,
    context: event.context,
    stateType: event.stateType ?? undefined,
    stateScore: event.stateScore ?? undefined,
  };
}

/**
 * 週の開始日（月曜日）を取得
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}
