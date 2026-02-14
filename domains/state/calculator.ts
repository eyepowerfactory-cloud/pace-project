// State Snapshot Calculator

import { prisma } from '@/lib/prisma';
import { StateSnapshot } from '@prisma/client';
import { extractSignals, extractVisionSignals, extractPlanSignals } from './signals';
import {
  calculateOverloadScore,
  calculateStuckScore,
  calculateVisionOverloadScore,
  calculatePlanOverloadScore,
  calculateReactanceScore,
  calculateLowMotivationScore,
  calculateLowEfficacyScore,
  StateScore,
} from './rules';

/**
 * StateSnapshot計算エンジン
 *
 * 1. シグナル抽出
 * 2. 各状態のスコア計算
 * 3. primaryState決定（最大スコア）
 * 4. DB保存
 */
export async function computeStateSnapshot(
  userId: string,
  windowDays: number = 7,
  selfReportJson?: any
): Promise<StateSnapshot> {
  // 1. シグナル抽出
  const signals = await extractSignals(userId, windowDays);

  // 自己申告データをマージ
  if (selfReportJson) {
    Object.assign(signals, selfReportJson);
  }

  // Vision/Plan関連シグナル
  const visionSignals = await extractVisionSignals(userId);
  const planSignals = await extractPlanSignals(userId);

  // 2. 各状態のスコア計算
  const scores: Record<string, StateScore> = {
    OVERLOAD: calculateOverloadScore(signals),
    STUCK: calculateStuckScore(signals),
    VISION_OVERLOAD: calculateVisionOverloadScore(
      signals,
      visionSignals.visionCount
    ),
    PLAN_OVERLOAD: calculatePlanOverloadScore(
      signals,
      planSignals.thisWeekTasks
    ),
    AUTONOMY_REACTANCE: calculateReactanceScore(signals),
    LOW_MOTIVATION: calculateLowMotivationScore(signals),
    LOW_SELF_EFFICACY: calculateLowEfficacyScore(signals),
  };

  // 3. primaryState決定（最大スコア）
  const sorted = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
  const [primaryType, primaryData] = sorted[0];

  // スコアが低すぎる場合（< 20）は「問題なし」とみなす
  const effectiveScore = primaryData.score < 20 ? 0 : primaryData.score;
  const effectiveSignals = effectiveScore === 0 ? [] : primaryData.signals;

  // 全スコアが低い場合はNORMAL状態とする
  const finalPrimaryState = effectiveScore === 0 ? 'NORMAL' : primaryType;

  // 4. DB保存
  const snapshot = await prisma.stateSnapshot.create({
    data: {
      userId,
      windowDays,
      scoresJson: scores as any,
      primaryState: finalPrimaryState as any,
      primaryConfidence: effectiveScore,
      topSignalsJson: effectiveSignals as any,
      selfReportJson: selfReportJson as any || null,
    },
  });

  return snapshot;
}

/**
 * 最新のStateSnapshot取得
 */
export async function getLatestStateSnapshot(
  userId: string
): Promise<StateSnapshot | null> {
  return prisma.stateSnapshot.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * StateSnapshot履歴取得
 */
export async function getStateSnapshotHistory(
  userId: string,
  limit: number = 30
): Promise<StateSnapshot[]> {
  return prisma.stateSnapshot.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
