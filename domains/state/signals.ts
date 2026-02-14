// State Signals 抽出

import { prisma } from '@/lib/prisma';

export interface StateSignals {
  // タスク関連
  completionRate: number;      // done / planned
  overdueCount: number;
  postponeCount7d: number;
  inactiveDays: number;
  suggestionRejectRate7d: number;

  // 自己申告（任意）
  capacity?: number;  // 0-10
  stress?: number;
  clarity?: number;
  efficacy?: number;
  motivation?: number;
  annoyance?: number;
}

/**
 * シグナル抽出
 *
 * DBクエリで各種メトリクスを計算
 */
export async function extractSignals(
  userId: string,
  windowDays: number = 7
): Promise<StateSignals> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - windowDays);

  // 1. タスク完了率（窓期間内）
  const tasksInWindow = await prisma.task.count({
    where: {
      userId,
      createdAt: { gte: windowStart },
    },
  });

  const completedInWindow = await prisma.task.count({
    where: {
      userId,
      createdAt: { gte: windowStart },
      status: 'DONE',
    },
  });

  const completionRate = tasksInWindow > 0 ? completedInWindow / tasksInWindow : 1.0;

  // 2. 期限切れタスク数
  const overdueCount = await prisma.task.count({
    where: {
      userId,
      status: { in: ['TODO', 'IN_PROGRESS'] },
      dueDate: { lt: now },
    },
  });

  // 3. 延期回数（窓期間内）
  const tasksWithPostpone = await prisma.task.findMany({
    where: {
      userId,
      updatedAt: { gte: windowStart },
      postponeCount: { gt: 0 },
    },
    select: { postponeCount: true },
  });

  const postponeCount7d = tasksWithPostpone.reduce(
    (sum, t) => sum + t.postponeCount,
    0
  );

  // 4. 非アクティブ日数（最終タスク操作からの日数）
  const lastTaskActivity = await prisma.task.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });

  // 新規ユーザー（タスクが0件）の場合は0日として扱う
  const inactiveDays = lastTaskActivity
    ? Math.floor((now.getTime() - lastTaskActivity.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // 5. 提案拒否率（窓期間内）
  const suggestionsInWindow = await prisma.suggestionEvent.count({
    where: {
      userId,
      createdAt: { gte: windowStart },
      response: { not: null },
    },
  });

  const dismissedSuggestions = await prisma.suggestionEvent.count({
    where: {
      userId,
      createdAt: { gte: windowStart },
      response: { in: ['DISMISSED', 'IGNORED_TIMEOUT'] },
    },
  });

  const suggestionRejectRate7d =
    suggestionsInWindow > 0 ? dismissedSuggestions / suggestionsInWindow : 0;

  return {
    completionRate,
    overdueCount,
    postponeCount7d,
    inactiveDays,
    suggestionRejectRate7d,
  };
}

/**
 * Vision関連シグナル
 */
export async function extractVisionSignals(userId: string) {
  const visionCount = await prisma.visionCard.count({
    where: { userId, isArchived: false },
  });

  const visionWithoutGoals = await prisma.visionCard.count({
    where: {
      userId,
      isArchived: false,
      quarterGoals: { none: {} },
    },
  });

  return {
    visionCount,
    visionWithoutGoals,
  };
}

/**
 * Plan関連シグナル
 */
export async function extractPlanSignals(userId: string) {
  const now = new Date();
  const weekStart = getWeekStart(now);

  // 今週のタスク数
  const thisWeekTasks = await prisma.task.count({
    where: {
      userId,
      plannedWeekStart: weekStart,
      status: { not: 'DONE' },
    },
  });

  // 今四半期のGoal数
  const currentQuarter = getCurrentQuarter();
  const quarterGoals = await prisma.quarterGoal.count({
    where: {
      userId,
      year: currentQuarter.year,
      cadence: currentQuarter.cadence,
      isArchived: false,
    },
  });

  return {
    thisWeekTasks,
    quarterGoals,
  };
}

/**
 * 週の開始日（月曜日）を取得
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日
  return new Date(d.setDate(diff));
}

/**
 * 現在の四半期を取得
 */
function getCurrentQuarter(): { year: number; cadence: 'Q1' | 'Q2' | 'Q3' | 'Q4' } {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  let cadence: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  if (month <= 3) cadence = 'Q1';
  else if (month <= 6) cadence = 'Q2';
  else if (month <= 9) cadence = 'Q3';
  else cadence = 'Q4';

  return { year, cadence };
}
