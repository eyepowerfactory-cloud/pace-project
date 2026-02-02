// Task アクション

'use server';

import { prisma } from '@/lib/prisma';
import { requireActiveSession } from '@/lib/auth';
import { CreateTaskSchema, UpdateTaskSchema, CompleteTaskSchema, PostponeTaskSchema } from '@/lib/zod';

/**
 * Task作成
 */
export async function createTaskAction(data: {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: number;
  effortMin?: number;
  quarterGoalId?: string;
  plannedWeekStart?: Date;
  plannedDate?: Date;
}) {
  const auth = await requireActiveSession();
  const validated = CreateTaskSchema.parse(data);

  // QuarterGoal所有権確認（指定された場合）
  if (validated.quarterGoalId) {
    const goal = await prisma.quarterGoal.findUnique({
      where: { id: validated.quarterGoalId },
      select: { userId: true },
    });

    if (!goal || goal.userId !== auth.userId) {
      throw new Error('Goal not found or access denied');
    }
  }

  // WeeklyPlan取得または作成（plannedWeekStart指定時）
  let weeklyPlanId: string | undefined;
  if (validated.plannedWeekStart) {
    const weeklyPlan = await prisma.weeklyPlan.upsert({
      where: {
        userId_weekStart: {
          userId: auth.userId,
          weekStart: validated.plannedWeekStart,
        },
      },
      create: {
        userId: auth.userId,
        weekStart: validated.plannedWeekStart,
      },
      update: {},
    });
    weeklyPlanId = weeklyPlan.id;
  }

  // DailyPlan取得または作成（plannedDate指定時）
  let dailyPlanId: string | undefined;
  if (validated.plannedDate) {
    const normalizedDate = new Date(validated.plannedDate);
    normalizedDate.setHours(0, 0, 0, 0);

    const dailyPlan = await prisma.dailyPlan.upsert({
      where: {
        userId_date: {
          userId: auth.userId,
          date: normalizedDate,
        },
      },
      create: {
        userId: auth.userId,
        date: normalizedDate,
      },
      update: {},
    });
    dailyPlanId = dailyPlan.id;
  }

  const task = await prisma.task.create({
    data: {
      userId: auth.userId,
      title: validated.title,
      description: validated.description,
      dueDate: validated.dueDate,
      priority: validated.priority ?? 50,
      effortMin: validated.effortMin,
      quarterGoalId: validated.quarterGoalId,
      weeklyPlanId,
      plannedWeekStart: validated.plannedWeekStart,
      dailyPlanId,
      plannedDate: validated.plannedDate,
      originType: 'USER_CREATED',
    },
  });

  return {
    success: true,
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
    },
  };
}

/**
 * Task更新
 */
export async function updateTaskAction(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    dueDate?: Date;
    priority?: number;
    effortMin?: number;
    quarterGoalId?: string;
    plannedWeekStart?: Date;
    plannedDate?: Date;
  }
) {
  const auth = await requireActiveSession();
  const validated = UpdateTaskSchema.parse(data);

  // 所有権確認
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Task not found or access denied');
  }

  // QuarterGoal所有権確認（指定された場合）
  if (validated.quarterGoalId) {
    const goal = await prisma.quarterGoal.findUnique({
      where: { id: validated.quarterGoalId },
      select: { userId: true },
    });

    if (!goal || goal.userId !== auth.userId) {
      throw new Error('Goal not found or access denied');
    }
  }

  // WeeklyPlan/DailyPlan更新処理
  let weeklyPlanId: string | undefined;
  if (validated.plannedWeekStart) {
    const weeklyPlan = await prisma.weeklyPlan.upsert({
      where: {
        userId_weekStart: {
          userId: auth.userId,
          weekStart: validated.plannedWeekStart,
        },
      },
      create: {
        userId: auth.userId,
        weekStart: validated.plannedWeekStart,
      },
      update: {},
    });
    weeklyPlanId = weeklyPlan.id;
  }

  let dailyPlanId: string | undefined;
  if (validated.plannedDate) {
    const normalizedDate = new Date(validated.plannedDate);
    normalizedDate.setHours(0, 0, 0, 0);

    const dailyPlan = await prisma.dailyPlan.upsert({
      where: {
        userId_date: {
          userId: auth.userId,
          date: normalizedDate,
        },
      },
      create: {
        userId: auth.userId,
        date: normalizedDate,
      },
      update: {},
    });
    dailyPlanId = dailyPlan.id;
  }

  const updateData: any = { ...validated };
  if (weeklyPlanId) updateData.weeklyPlanId = weeklyPlanId;
  if (dailyPlanId) updateData.dailyPlanId = dailyPlanId;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  return {
    success: true,
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      updatedAt: task.updatedAt,
    },
  };
}

/**
 * Task完了
 */
export async function completeTaskAction(
  taskId: string,
  data?: { completedAt?: Date }
) {
  const auth = await requireActiveSession();
  const validated = data ? CompleteTaskSchema.parse(data) : { completedAt: new Date() };

  // 所有権確認
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { userId: true, status: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Task not found or access denied');
  }

  if (existing.status === 'DONE') {
    throw new Error('Task is already completed');
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'DONE',
      completedAt: validated.completedAt,
    },
  });

  return {
    success: true,
    task: {
      id: task.id,
      status: task.status,
      completedAt: task.completedAt,
    },
  };
}

/**
 * Task延期
 */
export async function postponeTaskAction(
  taskId: string,
  data?: {
    newPlannedDate?: Date;
    newPlannedWeekStart?: Date;
  }
) {
  const auth = await requireActiveSession();
  const validated = data ? PostponeTaskSchema.parse(data) : {};

  // 所有権確認
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { userId: true, status: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Task not found or access denied');
  }

  if (existing.status === 'DONE' || existing.status === 'CANCELLED') {
    throw new Error('Cannot postpone completed or cancelled task');
  }

  // WeeklyPlan/DailyPlan更新処理
  let weeklyPlanId: string | undefined;
  if (validated.newPlannedWeekStart) {
    const weeklyPlan = await prisma.weeklyPlan.upsert({
      where: {
        userId_weekStart: {
          userId: auth.userId,
          weekStart: validated.newPlannedWeekStart,
        },
      },
      create: {
        userId: auth.userId,
        weekStart: validated.newPlannedWeekStart,
      },
      update: {},
    });
    weeklyPlanId = weeklyPlan.id;
  }

  let dailyPlanId: string | undefined;
  if (validated.newPlannedDate) {
    const normalizedDate = new Date(validated.newPlannedDate);
    normalizedDate.setHours(0, 0, 0, 0);

    const dailyPlan = await prisma.dailyPlan.upsert({
      where: {
        userId_date: {
          userId: auth.userId,
          date: normalizedDate,
        },
      },
      create: {
        userId: auth.userId,
        date: normalizedDate,
      },
      update: {},
    });
    dailyPlanId = dailyPlan.id;
  }

  const updateData: any = {
    postponeCount: { increment: 1 },
  };

  if (weeklyPlanId) {
    updateData.weeklyPlanId = weeklyPlanId;
    updateData.plannedWeekStart = validated.newPlannedWeekStart;
  }

  if (dailyPlanId) {
    updateData.dailyPlanId = dailyPlanId;
    updateData.plannedDate = validated.newPlannedDate;
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  return {
    success: true,
    task: {
      id: task.id,
      postponeCount: task.postponeCount,
      plannedWeekStart: task.plannedWeekStart,
      plannedDate: task.plannedDate,
    },
  };
}

/**
 * Task削除（キャンセル）
 */
export async function cancelTaskAction(taskId: string) {
  const auth = await requireActiveSession();

  // 所有権確認
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Task not found or access denied');
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'CANCELLED' },
  });

  return { success: true };
}

/**
 * Task完全削除
 */
export async function deleteTaskAction(taskId: string) {
  const auth = await requireActiveSession();

  // 所有権確認
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Task not found or access denied');
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  return { success: true };
}

/**
 * Task一覧取得
 */
export async function listTasksAction(params?: {
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  quarterGoalId?: string;
  plannedWeekStart?: Date;
  plannedDate?: Date;
  includeCompleted?: boolean;
  limit?: number;
}) {
  const auth = await requireActiveSession();

  const where: any = {
    userId: auth.userId,
  };

  if (params?.status) {
    where.status = params.status;
  }

  if (!params?.includeCompleted) {
    where.status = { notIn: ['DONE', 'CANCELLED'] };
  }

  if (params?.quarterGoalId) {
    where.quarterGoalId = params.quarterGoalId;
  }

  if (params?.plannedWeekStart) {
    where.plannedWeekStart = params.plannedWeekStart;
  }

  if (params?.plannedDate) {
    where.plannedDate = params.plannedDate;
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    take: params?.limit || 100,
    include: {
      quarterGoal: {
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
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      effortMin: t.effortMin,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
      postponeCount: t.postponeCount,
      quarterGoal: t.quarterGoal,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  };
}

/**
 * Task詳細取得
 */
export async function getTaskAction(taskId: string) {
  const auth = await requireActiveSession();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      quarterGoal: {
        include: {
          visionCard: true,
        },
      },
      weeklyPlan: true,
      dailyPlan: true,
    },
  });

  if (!task || task.userId !== auth.userId) {
    throw new Error('Task not found or access denied');
  }

  return { task };
}

/**
 * 今日のタスク取得
 */
export async function getTodayTasksAction() {
  const auth = await requireActiveSession();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = await prisma.task.findMany({
    where: {
      userId: auth.userId,
      plannedDate: today,
      status: { notIn: ['DONE', 'CANCELLED'] },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: {
      quarterGoal: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return { tasks };
}

/**
 * 今週のタスク取得
 */
export async function getWeekTasksAction() {
  const auth = await requireActiveSession();

  const now = new Date();
  const weekStart = getWeekStart(now);

  const tasks = await prisma.task.findMany({
    where: {
      userId: auth.userId,
      plannedWeekStart: weekStart,
      status: { notIn: ['DONE', 'CANCELLED'] },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: {
      quarterGoal: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return { tasks };
}

/**
 * 期限切れタスク取得
 */
export async function getOverdueTasksAction() {
  const auth = await requireActiveSession();

  const now = new Date();

  const tasks = await prisma.task.findMany({
    where: {
      userId: auth.userId,
      status: { in: ['TODO', 'IN_PROGRESS'] },
      dueDate: { lt: now },
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    include: {
      quarterGoal: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return { tasks };
}

// ============================================================================
// ユーティリティ
// ============================================================================

/**
 * 週の開始日（月曜日）を取得
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}
