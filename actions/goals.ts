// QuarterGoal アクション

'use server';

import { prisma } from '@/lib/prisma';
import { requireActiveSession } from '@/lib/auth';
import { CreateQuarterGoalSchema, UpdateQuarterGoalSchema } from '@/lib/zod';

/**
 * QuarterGoal作成
 */
export async function createQuarterGoalAction(data: {
  year: number;
  cadence: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  title: string;
  theme?: string;
  framework?: 'NONE' | 'OKR' | 'SMART' | 'WOOP';
  frameworkJson?: any;
  visionCardId?: string;
}) {
  const auth = await requireActiveSession();
  const validated = CreateQuarterGoalSchema.parse(data);

  // VisionCard所有権確認（指定された場合）
  if (validated.visionCardId) {
    const vision = await prisma.visionCard.findUnique({
      where: { id: validated.visionCardId },
      select: { userId: true },
    });

    if (!vision || vision.userId !== auth.userId) {
      throw new Error('Vision not found or access denied');
    }
  }

  const goal = await prisma.quarterGoal.create({
    data: {
      userId: auth.userId,
      year: validated.year,
      cadence: validated.cadence,
      title: validated.title,
      theme: validated.theme,
      framework: validated.framework,
      frameworkJson: validated.frameworkJson as any,
      visionCardId: validated.visionCardId,
    },
  });

  return {
    success: true,
    goal: {
      id: goal.id,
      year: goal.year,
      cadence: goal.cadence,
      title: goal.title,
      theme: goal.theme,
      framework: goal.framework,
      frameworkJson: goal.frameworkJson,
      visionCardId: goal.visionCardId,
      createdAt: goal.createdAt,
    },
  };
}

/**
 * QuarterGoal更新
 */
export async function updateQuarterGoalAction(
  goalId: string,
  data: {
    title?: string;
    theme?: string;
    framework?: 'NONE' | 'OKR' | 'SMART' | 'WOOP';
    frameworkJson?: any;
    visionCardId?: string;
  }
) {
  const auth = await requireActiveSession();
  const validated = UpdateQuarterGoalSchema.parse(data);

  // 所有権確認
  const existing = await prisma.quarterGoal.findUnique({
    where: { id: goalId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Goal not found or access denied');
  }

  // VisionCard所有権確認（指定された場合）
  if (validated.visionCardId) {
    const vision = await prisma.visionCard.findUnique({
      where: { id: validated.visionCardId },
      select: { userId: true },
    });

    if (!vision || vision.userId !== auth.userId) {
      throw new Error('Vision not found or access denied');
    }
  }

  const goal = await prisma.quarterGoal.update({
    where: { id: goalId },
    data: {
      ...validated,
      frameworkJson: validated.frameworkJson as any,
    },
  });

  return {
    success: true,
    goal: {
      id: goal.id,
      title: goal.title,
      theme: goal.theme,
      framework: goal.framework,
      frameworkJson: goal.frameworkJson,
      visionCardId: goal.visionCardId,
      updatedAt: goal.updatedAt,
    },
  };
}

/**
 * QuarterGoal削除（アーカイブ）
 */
export async function archiveQuarterGoalAction(goalId: string) {
  const auth = await requireActiveSession();

  // 所有権確認
  const existing = await prisma.quarterGoal.findUnique({
    where: { id: goalId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Goal not found or access denied');
  }

  await prisma.quarterGoal.update({
    where: { id: goalId },
    data: { isArchived: true },
  });

  return { success: true };
}

/**
 * QuarterGoal完全削除
 */
export async function deleteQuarterGoalAction(goalId: string) {
  const auth = await requireActiveSession();

  // 所有権確認
  const existing = await prisma.quarterGoal.findUnique({
    where: { id: goalId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Goal not found or access denied');
  }

  await prisma.quarterGoal.delete({
    where: { id: goalId },
  });

  return { success: true };
}

/**
 * QuarterGoal一覧取得
 */
export async function listQuarterGoalsAction(params?: {
  year?: number;
  cadence?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  visionCardId?: string;
  includeArchived?: boolean;
}) {
  const auth = await requireActiveSession();

  const where: any = {
    userId: auth.userId,
  };

  if (params?.year) {
    where.year = params.year;
  }

  if (params?.cadence) {
    where.cadence = params.cadence;
  }

  if (params?.visionCardId) {
    where.visionCardId = params.visionCardId;
  }

  if (!params?.includeArchived) {
    where.isArchived = false;
  }

  const goals = await prisma.quarterGoal.findMany({
    where,
    orderBy: [{ year: 'desc' }, { cadence: 'desc' }],
    include: {
      visionCard: {
        select: {
          id: true,
          title: true,
          horizon: true,
        },
      },
      tasks: {
        where: { status: { not: 'CANCELLED' } },
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });

  return {
    goals: goals.map((g) => ({
      id: g.id,
      year: g.year,
      cadence: g.cadence,
      title: g.title,
      theme: g.theme,
      framework: g.framework,
      frameworkJson: g.frameworkJson,
      isArchived: g.isArchived,
      visionCard: g.visionCard,
      tasks: g.tasks,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    })),
  };
}

/**
 * QuarterGoal詳細取得
 */
export async function getQuarterGoalAction(goalId: string) {
  const auth = await requireActiveSession();

  const goal = await prisma.quarterGoal.findUnique({
    where: { id: goalId },
    include: {
      visionCard: true,
      tasks: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });

  if (!goal || goal.userId !== auth.userId) {
    throw new Error('Goal not found or access denied');
  }

  return {
    goal: {
      id: goal.id,
      year: goal.year,
      cadence: goal.cadence,
      title: goal.title,
      theme: goal.theme,
      framework: goal.framework,
      frameworkJson: goal.frameworkJson,
      isArchived: goal.isArchived,
      visionCard: goal.visionCard,
      tasks: goal.tasks,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    },
  };
}

/**
 * 現在の四半期のGoal取得
 */
export async function getCurrentQuarterGoalAction() {
  const auth = await requireActiveSession();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  let cadence: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  if (month <= 3) cadence = 'Q1';
  else if (month <= 6) cadence = 'Q2';
  else if (month <= 9) cadence = 'Q3';
  else cadence = 'Q4';

  const goal = await prisma.quarterGoal.findUnique({
    where: {
      userId_year_cadence: {
        userId: auth.userId,
        year,
        cadence,
      },
    },
    include: {
      visionCard: true,
      tasks: {
        where: { status: { not: 'CANCELLED' } },
      },
    },
  });

  return {
    goal: goal
      ? {
          id: goal.id,
          year: goal.year,
          cadence: goal.cadence,
          title: goal.title,
          theme: goal.theme,
          framework: goal.framework,
          frameworkJson: goal.frameworkJson,
          visionCard: goal.visionCard,
          tasks: goal.tasks,
        }
      : null,
  };
}
