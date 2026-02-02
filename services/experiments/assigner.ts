// A/Bテスト割り当て（決定論的バケット）

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

/**
 * 決定論的バケット計算
 *
 * 同じuserIdとexperimentKeyの組み合わせは常に同じバケットになる
 *
 * @param userId ユーザーID
 * @param experimentKey 実験キー
 * @returns 0-99のバケット番号
 */
export function calculateBucket(
  userId: string,
  experimentKey: string
): number {
  const input = `${userId}:${experimentKey}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex');

  // ハッシュの最初の8文字を16進数として解釈
  const hashValue = parseInt(hash.slice(0, 8), 16);

  // 0-99の範囲に正規化
  return hashValue % 100;
}

/**
 * 実験割り当て
 *
 * @param userId ユーザーID
 * @param experimentKey 実験キー
 * @returns 割り当てられたvariantKey
 */
export async function assignExperiment(
  userId: string,
  experimentKey: string
): Promise<string> {
  // 既存の割り当てチェック
  const existing = await prisma.experimentAssignment.findUnique({
    where: {
      userId_experimentId: {
        userId,
        experimentId: experimentKey,
      },
    },
  });

  if (existing) {
    return existing.variantKey;
  }

  // 実験取得
  const experiment = await prisma.experiment.findUnique({
    where: { key: experimentKey },
    include: { variants: true },
  });

  if (!experiment || experiment.status !== 'RUNNING') {
    return 'control'; // 実験が存在しないか停止中の場合はcontrol
  }

  // バケット計算
  const bucket = calculateBucket(userId, experimentKey);

  // 重み付き選択
  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      // 割り当て記録
      await prisma.experimentAssignment.create({
        data: {
          userId,
          experimentId: experiment.id,
          variantKey: variant.key,
        },
      });

      return variant.key;
    }
  }

  // フォールバック（合計が100に満たない場合）
  return 'control';
}

/**
 * ユーザーの実験割り当て取得
 *
 * @param userId ユーザーID
 * @param experimentKey 実験キー
 * @returns 割り当てられたvariantKey（未割り当ての場合はnull）
 */
export async function getUserExperimentVariant(
  userId: string,
  experimentKey: string
): Promise<string | null> {
  const assignment = await prisma.experimentAssignment.findUnique({
    where: {
      userId_experimentId: {
        userId,
        experimentId: experimentKey,
      },
    },
  });

  return assignment?.variantKey ?? null;
}

/**
 * 実験の全割り当て取得
 *
 * @param experimentKey 実験キー
 * @returns 割り当て一覧
 */
export async function getExperimentAssignments(experimentKey: string) {
  const experiment = await prisma.experiment.findUnique({
    where: { key: experimentKey },
    include: {
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      },
      variants: true,
    },
  });

  if (!experiment) {
    throw new Error('Experiment not found');
  }

  // Variant別の集計
  const variantCounts = experiment.variants.reduce(
    (acc, variant) => {
      acc[variant.key] = {
        count: 0,
        weight: variant.weight,
      };
      return acc;
    },
    {} as Record<string, { count: number; weight: number }>
  );

  for (const assignment of experiment.assignments) {
    if (variantCounts[assignment.variantKey]) {
      variantCounts[assignment.variantKey].count++;
    }
  }

  return {
    experiment: {
      key: experiment.key,
      name: experiment.name,
      status: experiment.status,
    },
    assignments: experiment.assignments.map((a) => ({
      userId: a.userId,
      userEmail: a.user.email,
      variantKey: a.variantKey,
      assignedAt: a.assignedAt,
    })),
    summary: variantCounts,
  };
}
