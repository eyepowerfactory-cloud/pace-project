// TASK_MICROSTEP: マイクロステップ分解提案

import { prisma } from '@/lib/prisma';
import { StateSnapshot } from '@prisma/client';
import { SuggestionDTO, TaskMicrostepPayload } from '../types';

/**
 * マイクロステップ分解提案生成
 *
 * 条件:
 * - primaryState が STUCK
 * - 延期回数が3回以上のタスクが存在
 */
export async function generateTaskMicrostepSuggestion(
  userId: string,
  snapshot: StateSnapshot
): Promise<SuggestionDTO | null> {
  // 条件チェック
  if (snapshot.primaryState !== 'STUCK') {
    return null;
  }

  // 延期回数が多いタスクを取得
  const stuckTask = await prisma.task.findFirst({
    where: {
      userId,
      status: { in: ['TODO', 'IN_PROGRESS'] },
      postponeCount: { gte: 3 },
    },
    orderBy: [{ postponeCount: 'desc' }, { updatedAt: 'asc' }],
  });

  if (!stuckTask) {
    return null;
  }

  // マイクロステップ生成（Phase 7でAI生成に置き換え）
  const microSteps = [
    {
      title: `${stuckTask.title} - Step 1: 準備`,
      effortMin: 15,
      order: 1,
    },
    {
      title: `${stuckTask.title} - Step 2: 実行`,
      effortMin: 30,
      order: 2,
    },
    {
      title: `${stuckTask.title} - Step 3: 完了`,
      effortMin: 15,
      order: 3,
    },
  ];

  const payload: TaskMicrostepPayload = {
    originalTaskId: stuckTask.id,
    originalTitle: stuckTask.title,
    microSteps,
  };

  // SuggestionEvent作成
  const event = await prisma.suggestionEvent.create({
    data: {
      userId,
      suggestionType: 'TASK_MICROSTEP',
      stateType: snapshot.primaryState,
      stateScore: snapshot.primaryConfidence,
      context: 'TASK_LIST',
      payloadJson: payload as any,
      stateSnapshotId: snapshot.id,
      titleText: 'タスクを小さく分けてみませんか？',
      messageText: `「${stuckTask.title}」は${stuckTask.postponeCount}回延期されています。小さなステップに分けることで、進めやすくなるかもしれません。`,
      optionsJson: [
        {
          key: 'ACCEPT',
          label: '分解する',
          description: '3つのステップに分けます',
        },
        {
          key: 'DISMISS',
          label: '今はしない',
        },
      ],
    },
  });

  return {
    eventId: event.id,
    type: 'TASK_MICROSTEP',
    title: event.titleText!,
    message: event.messageText!,
    options: event.optionsJson as any,
    payload,
    context: event.context,
    stateType: event.stateType ?? undefined,
    stateScore: event.stateScore ?? undefined,
  };
}
