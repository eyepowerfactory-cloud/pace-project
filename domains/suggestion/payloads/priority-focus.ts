// PRIORITY_FOCUS: 優先度集中提案

import { prisma } from '@/lib/prisma';
import { StateSnapshot } from '@prisma/client';
import { SuggestionDTO, PriorityFocusPayload } from '../types';

/**
 * 優先度集中提案生成
 *
 * 条件:
 * - primaryState が OVERLOAD または PLAN_OVERLOAD
 * - 現在の四半期に複数のGoalが存在
 */
export async function generatePriorityFocusSuggestion(
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

  // 現在の四半期を取得
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let cadence: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  if (month <= 3) cadence = 'Q1';
  else if (month <= 6) cadence = 'Q2';
  else if (month <= 9) cadence = 'Q3';
  else cadence = 'Q4';

  // 今四半期のGoal取得
  const goals = await prisma.quarterGoal.findMany({
    where: {
      userId,
      year,
      cadence,
      isArchived: false,
    },
    include: {
      tasks: {
        where: { status: { notIn: ['DONE', 'CANCELLED'] } },
      },
    },
  });

  if (goals.length < 2) {
    return null;
  }

  // タスク数が多いGoalを推奨
  const sortedGoals = goals.sort((a, b) => b.tasks.length - a.tasks.length);
  const recommendedGoal = sortedGoals[0];
  const otherGoals = sortedGoals.slice(1);

  const payload: PriorityFocusPayload = {
    recommendedGoalId: recommendedGoal.id,
    recommendedGoalTitle: recommendedGoal.title,
    otherGoalIds: otherGoals.map((g) => g.id),
    reason: `${recommendedGoal.tasks.length}個のタスクがあり、最も進行中です`,
  };

  // SuggestionEvent作成
  const event = await prisma.suggestionEvent.create({
    data: {
      userId,
      suggestionType: 'PRIORITY_FOCUS',
      stateType: snapshot.primaryState,
      stateScore: snapshot.primaryConfidence,
      context: 'GOAL_DETAIL',
      payloadJson: payload as any,
      stateSnapshotId: snapshot.id,
      titleText: '1つのゴールに集中してみませんか？',
      messageText: `今四半期は${goals.length}個のゴールがあります。「${recommendedGoal.title}」に集中することで、進めやすくなるかもしれません。`,
      optionsJson: [
        {
          key: 'ACCEPT',
          label: 'このゴールに集中する',
          description: '他のゴールのタスクを一時停止します',
        },
        {
          key: 'KEEP_ALL',
          label: '全て続ける',
        },
      ],
    },
  });

  return {
    eventId: event.id,
    type: 'PRIORITY_FOCUS',
    title: event.titleText!,
    message: event.messageText!,
    options: event.optionsJson as any,
    payload,
    context: event.context,
    stateType: event.stateType ?? undefined,
    stateScore: event.stateScore ?? undefined,
  };
}
