// MOTIVATION_REMIND: Why note思い出し提案

import { prisma } from '@/lib/prisma';
import { StateSnapshot } from '@prisma/client';
import { SuggestionDTO, MotivationRemindPayload } from '../types';

/**
 * Why note思い出し提案生成
 *
 * 条件:
 * - primaryState が LOW_MOTIVATION または STUCK
 * - whyNoteを持つVisionが存在
 */
export async function generateMotivationRemindSuggestion(
  userId: string,
  snapshot: StateSnapshot
): Promise<SuggestionDTO | null> {
  // 条件チェック
  if (
    snapshot.primaryState !== 'LOW_MOTIVATION' &&
    snapshot.primaryState !== 'STUCK'
  ) {
    return null;
  }

  // whyNoteを持つVisionを取得
  const vision = await prisma.visionCard.findFirst({
    where: {
      userId,
      isArchived: false,
      whyNote: { not: null },
    },
    include: {
      quarterGoals: {
        where: { isArchived: false },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!vision || !vision.whyNote) {
    return null;
  }

  const payload: MotivationRemindPayload = {
    visionId: vision.id,
    visionTitle: vision.title,
    whyNote: vision.whyNote,
    relatedGoals: vision.quarterGoals,
  };

  // SuggestionEvent作成
  const event = await prisma.suggestionEvent.create({
    data: {
      userId,
      suggestionType: 'MOTIVATION_REMIND',
      stateType: snapshot.primaryState,
      stateScore: snapshot.primaryConfidence,
      context: 'VISION_BOARD',
      payloadJson: payload as any,
      stateSnapshotId: snapshot.id,
      titleText: '目指している理由を思い出してみませんか？',
      messageText: `「${vision.title}」について、こんな想いがありました：\n\n「${vision.whyNote}」`,
      optionsJson: [
        {
          key: 'ACKNOWLEDGE',
          label: '思い出しました',
        },
        {
          key: 'UPDATE_WHY',
          label: '更新する',
          description: 'Why noteを見直します',
        },
      ],
    },
  });

  return {
    eventId: event.id,
    type: 'MOTIVATION_REMIND',
    title: event.titleText!,
    message: event.messageText!,
    options: event.optionsJson as any,
    payload,
    context: event.context,
    stateType: event.stateType ?? undefined,
    stateScore: event.stateScore ?? undefined,
  };
}
