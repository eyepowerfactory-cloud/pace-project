// Suggestion Applier - 提案適用のメイン処理

import { prisma } from '@/lib/prisma';
import { SuggestionType } from '@prisma/client';
import {
  PlanReducePayload,
  TaskMicrostepPayload,
  PriorityFocusPayload,
  MotivationRemindPayload,
  ResumeSupportPayload,
} from '../types';

/**
 * 提案適用のメイン関数
 *
 * SuggestionEventを受け入れて、実際のデータ変更を実行
 */
export async function applySuggestion(
  eventId: string,
  userId: string,
  acceptPayload?: any
): Promise<{ success: boolean; message?: string }> {
  // SuggestionEvent取得
  const event = await prisma.suggestionEvent.findUnique({
    where: { id: eventId },
  });

  if (!event || event.userId !== userId) {
    throw new Error('Suggestion not found or access denied');
  }

  if (event.response) {
    throw new Error('Suggestion already responded');
  }

  // Type別のApplier呼び出し（Strategy Pattern）
  const appliers: Record<
    SuggestionType,
    (payload: any, acceptPayload?: any) => Promise<void>
  > = {
    PLAN_REDUCE: applyPlanReduce,
    TASK_MICROSTEP: applyTaskMicrostep,
    PRIORITY_FOCUS: applyPriorityFocus,
    GOAL_REFRAME: applyGoalReframe,
    MOTIVATION_REMIND: applyMotivationRemind,
    AUTONOMY_ADJUST: applyAutonomyAdjust,
    RESUME_SUPPORT: applyResumeSupport,
    VISION_CREATE_ASSIST: applyVisionCreateAssist,
    VISION_TO_QUARTER_TRANSLATE: applyVisionToQuarter,
    GOAL_TO_TASK_DRAFT: applyGoalToTask,
  };

  const applier = appliers[event.suggestionType];
  if (!applier) {
    throw new Error(`Applier not implemented: ${event.suggestionType}`);
  }

  try {
    await applier(event.payloadJson, acceptPayload);

    // 応答記録
    await prisma.suggestionEvent.update({
      where: { id: eventId },
      data: {
        response: 'ACCEPTED',
        responsePayload: acceptPayload,
        respondedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to apply suggestion:', error);
    throw error;
  }
}

/**
 * PLAN_REDUCE: タスクを来週に移動
 */
async function applyPlanReduce(
  payload: PlanReducePayload,
  acceptPayload?: any
) {
  const taskIds =
    acceptPayload?.selectedTaskIds ||
    payload.candidates.map((c) => c.taskId);

  const nextWeek = new Date(payload.targetWeekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // WeeklyPlan作成（upsert）
  const weeklyPlan = await prisma.weeklyPlan.upsert({
    where: {
      userId_weekStart: {
        userId: (
          await prisma.task.findUniqueOrThrow({
            where: { id: taskIds[0] },
            select: { userId: true },
          })
        ).userId,
        weekStart: nextWeek,
      },
    },
    create: {
      userId: (
        await prisma.task.findUniqueOrThrow({
          where: { id: taskIds[0] },
          select: { userId: true },
        })
      ).userId,
      weekStart: nextWeek,
    },
    update: {},
  });

  // タスクを来週に移動
  await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: {
      plannedWeekStart: nextWeek,
      weeklyPlanId: weeklyPlan.id,
    },
  });
}

/**
 * TASK_MICROSTEP: マイクロステップに分解
 */
async function applyTaskMicrostep(
  payload: TaskMicrostepPayload,
  _acceptPayload?: any
) {
  const originalTask = await prisma.task.findUniqueOrThrow({
    where: { id: payload.originalTaskId },
  });

  // 元のタスクをキャンセル
  await prisma.task.update({
    where: { id: payload.originalTaskId },
    data: { status: 'CANCELLED' },
  });

  // マイクロステップを作成
  await prisma.$transaction(
    payload.microSteps.map((step) =>
      prisma.task.create({
        data: {
          userId: originalTask.userId,
          title: step.title,
          effortMin: step.effortMin,
          priority: originalTask.priority,
          quarterGoalId: originalTask.quarterGoalId,
          plannedWeekStart: originalTask.plannedWeekStart,
          weeklyPlanId: originalTask.weeklyPlanId,
          plannedDate: originalTask.plannedDate,
          dailyPlanId: originalTask.dailyPlanId,
          originType: 'GENERATED_FROM_SUGGESTION',
          originId: payload.originalTaskId,
        },
      })
    )
  );
}

/**
 * PRIORITY_FOCUS: 1つのGoalに集中（他のGoalのタスクを一時停止）
 */
async function applyPriorityFocus(
  payload: PriorityFocusPayload,
  _acceptPayload?: any
) {
  // 他のGoalのタスクの計画を解除
  await prisma.task.updateMany({
    where: {
      quarterGoalId: { in: payload.otherGoalIds },
      status: { notIn: ['DONE', 'CANCELLED'] },
    },
    data: {
      plannedWeekStart: null,
      weeklyPlanId: null,
      plannedDate: null,
      dailyPlanId: null,
    },
  });
}

/**
 * GOAL_REFRAME: Goal見直し（Phase 7で実装）
 */
async function applyGoalReframe(_payload: any, _acceptPayload?: any) {
  // Phase 7で実装
  throw new Error('Not implemented yet');
}

/**
 * MOTIVATION_REMIND: Why note表示（データ変更なし）
 */
async function applyMotivationRemind(
  _payload: MotivationRemindPayload,
  _acceptPayload?: any
) {
  // データ変更なし（表示のみ）
}

/**
 * AUTONOMY_ADJUST: 提案頻度調整（Phase 7で実装）
 */
async function applyAutonomyAdjust(_payload: any, _acceptPayload?: any) {
  // Phase 7でユーザー設定として実装
  throw new Error('Not implemented yet');
}

/**
 * RESUME_SUPPORT: 推奨タスクを今日の予定に追加
 */
async function applyResumeSupport(
  payload: ResumeSupportPayload,
  _acceptPayload?: any
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskIds = payload.suggestedTasks.map((t) => t.taskId);

  if (taskIds.length === 0) return;

  // DailyPlan作成（upsert）
  const dailyPlan = await prisma.dailyPlan.upsert({
    where: {
      userId_date: {
        userId: (
          await prisma.task.findUniqueOrThrow({
            where: { id: taskIds[0] },
            select: { userId: true },
          })
        ).userId,
        date: today,
      },
    },
    create: {
      userId: (
        await prisma.task.findUniqueOrThrow({
          where: { id: taskIds[0] },
          select: { userId: true },
        })
      ).userId,
      date: today,
    },
    update: {},
  });

  // タスクを今日の予定に追加
  await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: {
      plannedDate: today,
      dailyPlanId: dailyPlan.id,
    },
  });
}

/**
 * VISION_CREATE_ASSIST: Vision作成支援（Phase 7で実装）
 */
async function applyVisionCreateAssist(_payload: any, _acceptPayload?: any) {
  // Phase 7でAI生成と連携
  throw new Error('Not implemented yet');
}

/**
 * VISION_TO_QUARTER_TRANSLATE: Vision→Quarter翻訳（Phase 7で実装）
 */
async function applyVisionToQuarter(_payload: any, _acceptPayload?: any) {
  // Phase 7でAI生成と連携
  throw new Error('Not implemented yet');
}

/**
 * GOAL_TO_TASK_DRAFT: Goal→Task生成（Phase 7で実装）
 */
async function applyGoalToTask(_payload: any, _acceptPayload?: any) {
  // Phase 7でAI生成と連携
  throw new Error('Not implemented yet');
}
