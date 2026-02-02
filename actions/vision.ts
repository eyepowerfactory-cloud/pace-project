// VisionCard アクション

'use server';

import { prisma } from '@/lib/prisma';
import { requireActiveSession } from '@/lib/auth';
import { CreateVisionSchema, UpdateVisionSchema } from '@/lib/zod';

/**
 * VisionCard作成
 */
export async function createVisionAction(data: {
  horizon: 'ONE_YEAR' | 'THREE_YEARS' | 'FIVE_YEARS';
  title: string;
  description?: string;
  whyNote?: string;
  tags?: string[];
}) {
  const auth = await requireActiveSession();
  const validated = CreateVisionSchema.parse(data);

  const vision = await prisma.visionCard.create({
    data: {
      userId: auth.userId,
      horizon: validated.horizon,
      title: validated.title,
      description: validated.description,
      whyNote: validated.whyNote,
      tags: validated.tags || [],
    },
  });

  return {
    success: true,
    vision: {
      id: vision.id,
      horizon: vision.horizon,
      title: vision.title,
      description: vision.description,
      whyNote: vision.whyNote,
      tags: vision.tags,
      createdAt: vision.createdAt,
    },
  };
}

/**
 * VisionCard更新
 */
export async function updateVisionAction(
  visionId: string,
  data: {
    title?: string;
    description?: string;
    whyNote?: string;
    tags?: string[];
  }
) {
  const auth = await requireActiveSession();
  const validated = UpdateVisionSchema.parse(data);

  // 所有権確認
  const existing = await prisma.visionCard.findUnique({
    where: { id: visionId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Vision not found or access denied');
  }

  const vision = await prisma.visionCard.update({
    where: { id: visionId },
    data: validated,
  });

  return {
    success: true,
    vision: {
      id: vision.id,
      title: vision.title,
      description: vision.description,
      whyNote: vision.whyNote,
      tags: vision.tags,
      updatedAt: vision.updatedAt,
    },
  };
}

/**
 * VisionCard削除（アーカイブ）
 */
export async function archiveVisionAction(visionId: string) {
  const auth = await requireActiveSession();

  // 所有権確認
  const existing = await prisma.visionCard.findUnique({
    where: { id: visionId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Vision not found or access denied');
  }

  await prisma.visionCard.update({
    where: { id: visionId },
    data: { isArchived: true },
  });

  return { success: true };
}

/**
 * VisionCard完全削除
 */
export async function deleteVisionAction(visionId: string) {
  const auth = await requireActiveSession();

  // 所有権確認
  const existing = await prisma.visionCard.findUnique({
    where: { id: visionId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Vision not found or access denied');
  }

  await prisma.visionCard.delete({
    where: { id: visionId },
  });

  return { success: true };
}

/**
 * VisionCard一覧取得
 */
export async function listVisionsAction(params?: {
  horizon?: 'ONE_YEAR' | 'THREE_YEARS' | 'FIVE_YEARS';
  includeArchived?: boolean;
}) {
  const auth = await requireActiveSession();

  const where: any = {
    userId: auth.userId,
  };

  if (params?.horizon) {
    where.horizon = params.horizon;
  }

  if (!params?.includeArchived) {
    where.isArchived = false;
  }

  const visions = await prisma.visionCard.findMany({
    where,
    orderBy: [{ isArchived: 'asc' }, { createdAt: 'desc' }],
    include: {
      quarterGoals: {
        where: { isArchived: false },
        select: {
          id: true,
          title: true,
          year: true,
          cadence: true,
        },
      },
    },
  });

  return {
    visions: visions.map((v) => ({
      id: v.id,
      horizon: v.horizon,
      title: v.title,
      description: v.description,
      whyNote: v.whyNote,
      tags: v.tags,
      isArchived: v.isArchived,
      quarterGoals: v.quarterGoals,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    })),
  };
}

/**
 * VisionCard詳細取得
 */
export async function getVisionAction(visionId: string) {
  const auth = await requireActiveSession();

  const vision = await prisma.visionCard.findUnique({
    where: { id: visionId },
    include: {
      quarterGoals: {
        where: { isArchived: false },
        orderBy: [{ year: 'desc' }, { cadence: 'desc' }],
        include: {
          tasks: {
            where: { status: { not: 'CANCELLED' } },
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!vision || vision.userId !== auth.userId) {
    throw new Error('Vision not found or access denied');
  }

  return {
    vision: {
      id: vision.id,
      horizon: vision.horizon,
      title: vision.title,
      description: vision.description,
      whyNote: vision.whyNote,
      tags: vision.tags,
      isArchived: vision.isArchived,
      quarterGoals: vision.quarterGoals,
      createdAt: vision.createdAt,
      updatedAt: vision.updatedAt,
    },
  };
}
