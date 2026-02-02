// Experiment（A/Bテスト）アクション

'use server';

import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/auth';
import {
  assignExperiment,
  getExperimentAssignments,
} from '@/services/experiments/assigner';

/**
 * 実験作成
 */
export async function createExperimentAction(data: {
  key: string;
  name: string;
  description?: string;
}) {
  await requireAdminRole();

  const experiment = await prisma.experiment.create({
    data: {
      key: data.key,
      name: data.name,
      description: data.description,
      status: 'DRAFT',
    },
  });

  return { success: true, experiment };
}

/**
 * Variant追加
 */
export async function addExperimentVariantAction(
  experimentId: string,
  data: {
    key: string;
    name: string;
    weight: number;
    configJson?: any;
  }
) {
  await requireAdminRole();

  const variant = await prisma.experimentVariant.create({
    data: {
      experimentId,
      key: data.key,
      name: data.name,
      weight: data.weight,
      configJson: data.configJson as any,
    },
  });

  return { success: true, variant };
}

/**
 * 実験開始
 */
export async function startExperimentAction(experimentId: string) {
  await requireAdminRole();

  // Variant検証（合計weightが100であること）
  const variants = await prisma.experimentVariant.findMany({
    where: { experimentId },
  });

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight !== 100) {
    throw new Error(
      `Total weight must be 100, but got ${totalWeight}`
    );
  }

  const experiment = await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  // 監査ログ
  const auth = await requireAdminRole();
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: auth.userId,
      action: 'CREATE_EXPERIMENT',
      targetType: 'EXPERIMENT',
      targetId: experimentId,
      detailsJson: { action: 'START' },
    },
  });

  return { success: true, experiment };
}

/**
 * 実験停止
 */
export async function pauseExperimentAction(experimentId: string) {
  await requireAdminRole();

  const experiment = await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      status: 'PAUSED',
    },
  });

  // 監査ログ
  const auth = await requireAdminRole();
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: auth.userId,
      action: 'PAUSE_EXPERIMENT',
      targetType: 'EXPERIMENT',
      targetId: experimentId,
    },
  });

  return { success: true, experiment };
}

/**
 * 実験完了
 */
export async function completeExperimentAction(experimentId: string) {
  await requireAdminRole();

  const experiment = await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      status: 'COMPLETED',
      endedAt: new Date(),
    },
  });

  return { success: true, experiment };
}

/**
 * 実験一覧取得
 */
export async function listExperimentsAction() {
  await requireAdminRole();

  const experiments = await prisma.experiment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      variants: true,
      _count: {
        select: { assignments: true },
      },
    },
  });

  return {
    experiments: experiments.map((e) => ({
      id: e.id,
      key: e.key,
      name: e.name,
      status: e.status,
      variants: e.variants,
      assignmentCount: e._count.assignments,
      startedAt: e.startedAt,
      endedAt: e.endedAt,
      createdAt: e.createdAt,
    })),
  };
}

/**
 * 実験詳細取得
 */
export async function getExperimentAction(experimentKey: string) {
  await requireAdminRole();

  const result = await getExperimentAssignments(experimentKey);

  return result;
}

/**
 * ユーザーへの実験割り当て（手動）
 */
export async function assignUserToExperimentAction(
  userId: string,
  experimentKey: string
) {
  await requireAdminRole();

  const variantKey = await assignExperiment(userId, experimentKey);

  return { success: true, variantKey };
}
