// Suggestion 型定義

import { SuggestionType, SuggestionContext, StateType } from '@prisma/client';

/**
 * 提案DTO（ユーザーに表示）
 */
export interface SuggestionDTO {
  eventId: string;
  type: SuggestionType;
  title: string;
  message: string;
  options: SuggestionOption[];
  payload: any; // Type別のペイロード
  context?: SuggestionContext;
  stateType?: StateType;
  stateScore?: number;
}

/**
 * 提案オプション（ボタン）
 */
export interface SuggestionOption {
  key: string;
  label: string;
  description?: string;
}

/**
 * 提案生成結果
 */
export interface SuggestionGenerationResult {
  suggestion: SuggestionDTO | null;
  reason?: string; // 生成しなかった理由
}

/**
 * PLAN_REDUCE ペイロード
 */
export interface PlanReducePayload {
  targetWeekStart: string; // ISO date
  candidates: Array<{
    taskId: string;
    reason: string;
    suggestedAction: 'DEFER_TO_NEXT_WEEK' | 'REMOVE';
  }>;
  recommendedKeepCount: number;
}

/**
 * TASK_MICROSTEP ペイロード
 */
export interface TaskMicrostepPayload {
  originalTaskId: string;
  originalTitle: string;
  microSteps: Array<{
    title: string;
    effortMin: number;
    order: number;
  }>;
}

/**
 * PRIORITY_FOCUS ペイロード
 */
export interface PriorityFocusPayload {
  recommendedGoalId: string;
  recommendedGoalTitle: string;
  otherGoalIds: string[];
  reason: string;
}

/**
 * GOAL_REFRAME ペイロード
 */
export interface GoalReframePayload {
  goalId: string;
  currentTitle: string;
  suggestedChanges: Array<{
    field: 'title' | 'theme' | 'framework';
    currentValue: string;
    suggestedValue: string;
    reason: string;
  }>;
}

/**
 * MOTIVATION_REMIND ペイロード
 */
export interface MotivationRemindPayload {
  visionId: string;
  visionTitle: string;
  whyNote: string;
  relatedGoals: Array<{
    id: string;
    title: string;
  }>;
}

/**
 * AUTONOMY_ADJUST ペイロード
 */
export interface AutonomyAdjustPayload {
  currentFrequency: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedFrequency: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

/**
 * RESUME_SUPPORT ペイロード
 */
export interface ResumeSupportPayload {
  inactiveDays: number;
  lastActivityDate: string;
  suggestedTasks: Array<{
    taskId: string;
    title: string;
    reason: string;
  }>;
}

/**
 * VISION_CREATE_ASSIST ペイロード
 */
export interface VisionCreateAssistPayload {
  suggestedHorizon: 'ONE_YEAR' | 'THREE_YEARS' | 'FIVE_YEARS';
  draftTitle: string;
  draftDescription: string;
  promptQuestions: string[];
}

/**
 * VISION_TO_QUARTER_TRANSLATE ペイロード
 */
export interface VisionToQuarterPayload {
  visionId: string;
  visionTitle: string;
  suggestedQuarterGoals: Array<{
    year: number;
    cadence: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    title: string;
    theme: string;
  }>;
}

/**
 * GOAL_TO_TASK_DRAFT ペイロード
 */
export interface GoalToTaskPayload {
  goalId: string;
  goalTitle: string;
  suggestedTasks: Array<{
    title: string;
    description: string;
    priority: number;
    effortMin: number;
  }>;
}
