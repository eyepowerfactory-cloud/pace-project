// Suggestion アクション

'use server';

import { prisma } from '@/lib/prisma';
import { requireActiveSession } from '@/lib/auth';
import { RecordSuggestionResponseSchema } from '@/lib/zod';
import { generateSuggestions } from '@/domains/suggestion/generator';
import { applySuggestion } from '@/domains/suggestion/appliers';
import { computeStateSnapshot } from '@/domains/state/calculator';

/**
 * 提案取得
 *
 * 最新のStateSnapshotに基づいて提案を生成
 */
export async function getSuggestionsAction(params?: {
  limit?: number;
  forceCompute?: boolean;
}) {
  const auth = await requireActiveSession();

  // StateSnapshotが新しければそれを使用、古ければ再計算
  let snapshot = await prisma.stateSnapshot.findFirst({
    where: { userId: auth.userId },
    orderBy: { createdAt: 'desc' },
  });

  const shouldCompute =
    params?.forceCompute ||
    !snapshot ||
    new Date().getTime() - snapshot.createdAt.getTime() > 24 * 60 * 60 * 1000; // 24時間以上古い

  if (shouldCompute) {
    snapshot = await computeStateSnapshot(auth.userId);
  }

  if (!snapshot) {
    return { suggestions: [] };
  }

  // 提案生成
  const suggestions = await generateSuggestions(
    auth.userId,
    snapshot,
    params?.limit || 3
  );

  return {
    suggestions,
    snapshot: {
      id: snapshot.id,
      primaryState: snapshot.primaryState,
      primaryConfidence: snapshot.primaryConfidence,
      createdAt: snapshot.createdAt,
    },
  };
}

/**
 * 提案詳細取得
 */
export async function getSuggestionAction(eventId: string) {
  const auth = await requireActiveSession();

  const event = await prisma.suggestionEvent.findUnique({
    where: { id: eventId },
    include: {
      stateSnapshot: true,
    },
  });

  if (!event || event.userId !== auth.userId) {
    throw new Error('Suggestion not found or access denied');
  }

  return {
    suggestion: {
      eventId: event.id,
      type: event.suggestionType,
      title: event.titleText,
      message: event.messageText,
      options: event.optionsJson,
      payload: event.payloadJson,
      response: event.response,
      respondedAt: event.respondedAt,
      createdAt: event.createdAt,
    },
  };
}

/**
 * 提案応答記録
 */
export async function recordSuggestionResponseAction(
  eventId: string,
  data: {
    response: 'ACCEPTED' | 'DISMISSED' | 'POSTPONED' | 'IGNORED_TIMEOUT';
    responsePayload?: any;
  }
) {
  const auth = await requireActiveSession();
  const validated = RecordSuggestionResponseSchema.parse(data);

  // 所有権確認
  const event = await prisma.suggestionEvent.findUnique({
    where: { id: eventId },
    select: { userId: true, response: true },
  });

  if (!event || event.userId !== auth.userId) {
    throw new Error('Suggestion not found or access denied');
  }

  if (event.response) {
    throw new Error('Suggestion already responded');
  }

  // 応答記録
  await prisma.suggestionEvent.update({
    where: { id: eventId },
    data: {
      response: validated.response,
      responsePayload: validated.responsePayload as any,
      respondedAt: new Date(),
    },
  });

  return { success: true };
}

/**
 * 提案適用（ACCEPTED時のアクション実行）
 */
export async function applySuggestionAction(
  eventId: string,
  acceptPayload?: any
) {
  const auth = await requireActiveSession();

  // 所有権確認
  const event = await prisma.suggestionEvent.findUnique({
    where: { id: eventId },
    select: { userId: true, response: true },
  });

  if (!event || event.userId !== auth.userId) {
    throw new Error('Suggestion not found or access denied');
  }

  // 提案適用
  const result = await applySuggestion(eventId, auth.userId, acceptPayload);

  return result;
}

/**
 * 提案履歴取得
 */
export async function getSuggestionHistoryAction(params?: {
  limit?: number;
  includeIgnored?: boolean;
}) {
  const auth = await requireActiveSession();

  const where: any = {
    userId: auth.userId,
  };

  if (!params?.includeIgnored) {
    where.response = { not: 'IGNORED_TIMEOUT' };
  }

  const history = await prisma.suggestionEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params?.limit || 20,
    select: {
      id: true,
      suggestionType: true,
      titleText: true,
      response: true,
      respondedAt: true,
      createdAt: true,
    },
  });

  return { history };
}

/**
 * 提案統計取得
 */
export async function getSuggestionStatsAction() {
  const auth = await requireActiveSession();

  const [total, accepted, dismissed, postponed, ignored] = await Promise.all([
    prisma.suggestionEvent.count({
      where: { userId: auth.userId },
    }),
    prisma.suggestionEvent.count({
      where: { userId: auth.userId, response: 'ACCEPTED' },
    }),
    prisma.suggestionEvent.count({
      where: { userId: auth.userId, response: 'DISMISSED' },
    }),
    prisma.suggestionEvent.count({
      where: { userId: auth.userId, response: 'POSTPONED' },
    }),
    prisma.suggestionEvent.count({
      where: { userId: auth.userId, response: 'IGNORED_TIMEOUT' },
    }),
  ]);

  return {
    stats: {
      total,
      accepted,
      dismissed,
      postponed,
      ignored,
      acceptanceRate: total > 0 ? accepted / total : 0,
      dismissalRate: total > 0 ? dismissed / total : 0,
    },
  };
}
