// WeeklyPlan & DailyPlan アクション

'use server';

import { prisma } from '@/lib/prisma';
import { requireActiveSession } from '@/lib/auth';
import { z } from 'zod';

// ============================================================================
// WeeklyPlan
// ============================================================================

const CreateWeeklyPlanSchema = z.object({
  weekStart: z.coerce.date(),
  theme: z.string().max(200).optional(),
});

const UpdateWeeklyPlanSchema = z.object({
  theme: z.string().max(200).optional(),
  reflectionNote: z.string().max(1000).optional(),
});

/**
 * WeeklyPlan作成・取得（存在しなければ作成）
 */
export async function getOrCreateWeeklyPlanAction(data: {
  weekStart: Date;
  theme?: string;
}) {
  const auth = await requireActiveSession();
  const validated = CreateWeeklyPlanSchema.parse(data);

  // 既存確認
  const existing = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStart: {
        userId: auth.userId,
        weekStart: validated.weekStart,
      },
    },
    include: {
      tasks: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (existing) {
    return { success: true, plan: existing };
  }

  // 新規作成
  const plan = await prisma.weeklyPlan.create({
    data: {
      userId: auth.userId,
      weekStart: validated.weekStart,
      theme: validated.theme,
    },
    include: {
      tasks: true,
    },
  });

  return { success: true, plan };
}

/**
 * WeeklyPlan更新
 */
export async function updateWeeklyPlanAction(
  planId: string,
  data: {
    theme?: string;
    reflectionNote?: string;
  }
) {
  const auth = await requireActiveSession();
  const validated = UpdateWeeklyPlanSchema.parse(data);

  // 所有権確認
  const existing = await prisma.weeklyPlan.findUnique({
    where: { id: planId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Plan not found or access denied');
  }

  const plan = await prisma.weeklyPlan.update({
    where: { id: planId },
    data: validated,
  });

  return { success: true, plan };
}

/**
 * WeeklyPlan一覧取得
 */
export async function listWeeklyPlansAction(params?: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const auth = await requireActiveSession();

  const where: any = {
    userId: auth.userId,
  };

  if (params?.startDate || params?.endDate) {
    where.weekStart = {};
    if (params.startDate) where.weekStart.gte = params.startDate;
    if (params.endDate) where.weekStart.lte = params.endDate;
  }

  const plans = await prisma.weeklyPlan.findMany({
    where,
    orderBy: { weekStart: 'desc' },
    take: params?.limit || 12,
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
  });

  return { plans };
}

/**
 * 今週のWeeklyPlan取得
 */
export async function getCurrentWeeklyPlanAction() {
  const auth = await requireActiveSession();

  const now = new Date();
  const weekStart = getWeekStart(now);

  return getOrCreateWeeklyPlanAction({ weekStart });
}

/**
 * WeeklyPlan取得（存在しない場合はnull）
 */
export async function getWeeklyPlanAction(data: { weekStart: Date }) {
  const auth = await requireActiveSession();
  const validated = CreateWeeklyPlanSchema.parse(data);

  const plan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStart: {
        userId: auth.userId,
        weekStart: validated.weekStart,
      },
    },
  });

  return { plan };
}

/**
 * WeeklyPlan upsert（作成または更新）
 */
export async function upsertWeeklyPlanAction(data: {
  weekStart: Date;
  intention?: string | null;
  reflectionNote?: string | null;
  effortMinutesPlanned?: number | null;
}) {
  const auth = await requireActiveSession();
  const weekStart = new Date(data.weekStart);
  weekStart.setHours(0, 0, 0, 0);

  const plan = await prisma.weeklyPlan.upsert({
    where: {
      userId_weekStart: {
        userId: auth.userId,
        weekStart,
      },
    },
    create: {
      userId: auth.userId,
      weekStart,
      theme: data.intention,
      reflectionNote: data.reflectionNote,
    },
    update: {
      theme: data.intention,
      reflectionNote: data.reflectionNote,
    },
  });

  return { success: true, plan };
}

// ============================================================================
// DailyPlan
// ============================================================================

const CreateDailyPlanSchema = z.object({
  date: z.coerce.date(),
  morningNote: z.string().max(500).optional(),
  energyLevel: z.number().int().min(1).max(5).optional(),
});

const UpdateDailyPlanSchema = z.object({
  morningNote: z.string().max(500).optional(),
  eveningNote: z.string().max(500).optional(),
  energyLevel: z.number().int().min(1).max(5).optional(),
});

/**
 * DailyPlan作成・取得（存在しなければ作成）
 */
export async function getOrCreateDailyPlanAction(data: {
  date: Date;
  morningNote?: string;
  energyLevel?: number;
}) {
  const auth = await requireActiveSession();
  const validated = CreateDailyPlanSchema.parse(data);

  // 日付のみに正規化（時刻を00:00:00に）
  const normalizedDate = new Date(validated.date);
  normalizedDate.setHours(0, 0, 0, 0);

  // 既存確認
  const existing = await prisma.dailyPlan.findUnique({
    where: {
      userId_date: {
        userId: auth.userId,
        date: normalizedDate,
      },
    },
    include: {
      tasks: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (existing) {
    return { success: true, plan: existing };
  }

  // 新規作成
  const plan = await prisma.dailyPlan.create({
    data: {
      userId: auth.userId,
      date: normalizedDate,
      morningNote: validated.morningNote,
      energyLevel: validated.energyLevel,
    },
    include: {
      tasks: true,
    },
  });

  return { success: true, plan };
}

/**
 * DailyPlan更新
 */
export async function updateDailyPlanAction(
  planId: string,
  data: {
    morningNote?: string;
    eveningNote?: string;
    energyLevel?: number;
  }
) {
  const auth = await requireActiveSession();
  const validated = UpdateDailyPlanSchema.parse(data);

  // 所有権確認
  const existing = await prisma.dailyPlan.findUnique({
    where: { id: planId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== auth.userId) {
    throw new Error('Plan not found or access denied');
  }

  const plan = await prisma.dailyPlan.update({
    where: { id: planId },
    data: validated,
  });

  return { success: true, plan };
}

/**
 * DailyPlan一覧取得
 */
export async function listDailyPlansAction(params?: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const auth = await requireActiveSession();

  const where: any = {
    userId: auth.userId,
  };

  if (params?.startDate || params?.endDate) {
    where.date = {};
    if (params.startDate) where.date.gte = params.startDate;
    if (params.endDate) where.date.lte = params.endDate;
  }

  const plans = await prisma.dailyPlan.findMany({
    where,
    orderBy: { date: 'desc' },
    take: params?.limit || 30,
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
  });

  return { plans };
}

/**
 * 今日のDailyPlan取得
 */
export async function getTodayDailyPlanAction() {
  const auth = await requireActiveSession();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return getOrCreateDailyPlanAction({ date: today });
}

/**
 * DailyPlan取得（存在しない場合はnull）
 */
export async function getDailyPlanAction(data: { date: Date }) {
  const auth = await requireActiveSession();
  const validated = CreateDailyPlanSchema.parse(data);

  const normalizedDate = new Date(validated.date);
  normalizedDate.setHours(0, 0, 0, 0);

  const plan = await prisma.dailyPlan.findUnique({
    where: {
      userId_date: {
        userId: auth.userId,
        date: normalizedDate,
      },
    },
  });

  return { plan };
}

/**
 * DailyPlan upsert（作成または更新）
 */
export async function upsertDailyPlanAction(data: {
  date: Date;
  intention?: string | null;
  reflectionNote?: string | null;
  effortMinutesPlanned?: number | null;
}) {
  const auth = await requireActiveSession();
  const normalizedDate = new Date(data.date);
  normalizedDate.setHours(0, 0, 0, 0);

  const plan = await prisma.dailyPlan.upsert({
    where: {
      userId_date: {
        userId: auth.userId,
        date: normalizedDate,
      },
    },
    create: {
      userId: auth.userId,
      date: normalizedDate,
      morningNote: data.intention,
      eveningNote: data.reflectionNote,
    },
    update: {
      morningNote: data.intention,
      eveningNote: data.reflectionNote,
    },
  });

  return { success: true, plan };
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
