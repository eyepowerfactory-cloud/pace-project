// State関連アクション

'use server';

import { requireActiveSession } from '@/lib/auth';
import { SelfReportSchema } from '@/lib/zod';
import { computeStateSnapshot, getLatestStateSnapshot, getStateSnapshotHistory } from '@/domains/state/calculator';

/**
 * StateSnapshot計算・保存
 */
export async function computeStateSnapshotAction(data?: {
  windowDays?: number;
  selfReport?: any;
}) {
  const auth = await requireActiveSession();

  const windowDays = data?.windowDays || 7;
  const selfReportJson = data?.selfReport
    ? SelfReportSchema.parse(data.selfReport)
    : undefined;

  const snapshot = await computeStateSnapshot(
    auth.userId,
    windowDays,
    selfReportJson
  );

  return {
    success: true,
    snapshot: {
      id: snapshot.id,
      primaryState: snapshot.primaryState,
      primaryConfidence: snapshot.primaryConfidence,
      topSignals: snapshot.topSignalsJson,
      createdAt: snapshot.createdAt,
    },
  };
}

/**
 * 最新StateSnapshot取得
 */
export async function getLatestStateSnapshotAction() {
  const auth = await requireActiveSession();
  const snapshot = await getLatestStateSnapshot(auth.userId);

  if (!snapshot) {
    return { snapshot: null };
  }

  return {
    snapshot: {
      id: snapshot.id,
      primaryState: snapshot.primaryState,
      primaryConfidence: snapshot.primaryConfidence,
      topSignals: snapshot.topSignalsJson,
      scores: snapshot.scoresJson,
      createdAt: snapshot.createdAt,
    },
  };
}

/**
 * StateSnapshot履歴取得
 */
export async function getStateSnapshotHistoryAction(limit?: number) {
  const auth = await requireActiveSession();
  const history = await getStateSnapshotHistory(auth.userId, limit);

  return {
    history: history.map((s) => ({
      id: s.id,
      primaryState: s.primaryState,
      primaryConfidence: s.primaryConfidence,
      createdAt: s.createdAt,
    })),
  };
}
