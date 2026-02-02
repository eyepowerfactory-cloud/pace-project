// RESUME_SUPPORT: 再開支援提案

import { prisma } from '@/lib/prisma';
import { StateSnapshot } from '@prisma/client';
import { SuggestionDTO, ResumeSupportPayload } from '../types';

/**
 * 再開支援提案生成
 *
 * 条件:
 * - primaryState が STUCK
 * - 非アクティブ日数が5日以上
 */
export async function generateResumeSupportSuggestion(
  userId: string,
  snapshot: StateSnapshot
): Promise<SuggestionDTO | null> {
  // 条件チェック
  if (snapshot.primaryState !== 'STUCK') {
    return null;
  }

  // 最終タスク操作日時を取得
  const lastTask = await prisma.task.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });

  if (!lastTask) {
    return null;
  }

  const now = new Date();
  const inactiveDays = Math.floor(
    (now.getTime() - lastTask.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (inactiveDays < 5) {
    return null;
  }

  // 簡単なタスク（優先度高、effortMin小）を推奨
  const easyTasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ['TODO', 'IN_PROGRESS'] },
      effortMin: { lte: 30 }, // 30分以内
    },
    orderBy: [{ priority: 'desc' }, { effortMin: 'asc' }],
    take: 3,
  });

  const suggestedTasks = easyTasks.map((t) => ({
    taskId: t.id,
    title: t.title,
    reason: t.effortMin
      ? `${t.effortMin}分程度で完了できそうです`
      : '短時間で完了できそうです',
  }));

  const payload: ResumeSupportPayload = {
    inactiveDays,
    lastActivityDate: lastTask.updatedAt.toISOString(),
    suggestedTasks,
  };

  // SuggestionEvent作成
  const event = await prisma.suggestionEvent.create({
    data: {
      userId,
      suggestionType: 'RESUME_SUPPORT',
      stateType: snapshot.primaryState,
      stateScore: snapshot.primaryConfidence,
      context: 'HOME',
      payloadJson: payload as any,
      stateSnapshotId: snapshot.id,
      titleText: '小さな一歩から再開してみませんか？',
      messageText: `${inactiveDays}日ぶりですね。まずは短時間で終わるタスクから始めてみるのはいかがでしょうか。`,
      optionsJson: [
        {
          key: 'ACCEPT',
          label: 'これから始める',
          description: '推奨タスクを今日の予定に追加します',
        },
        {
          key: 'LATER',
          label: '後で考える',
        },
      ],
    },
  });

  return {
    eventId: event.id,
    type: 'RESUME_SUPPORT',
    title: event.titleText!,
    message: event.messageText!,
    options: event.optionsJson as any,
    payload,
    context: event.context,
    stateType: event.stateType ?? undefined,
    stateScore: event.stateScore ?? undefined,
  };
}
