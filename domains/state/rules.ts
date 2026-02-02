// State Scoring Rules (仕様書準拠)

import { StateSignals } from './signals';

export interface StateScore {
  type: string;
  score: number;
  signals: string[];
}

/**
 * OVERLOAD（タスク過負荷）スコア計算
 *
 * 仕様書のルール:
 * - 期限切れタスク >= 5: +30
 * - 完了率 <= 0.3: +20
 * - 延期3回以上: +15
 * - ストレス >= 8: +20
 */
export function calculateOverloadScore(signals: StateSignals): StateScore {
  let score = 0;
  const triggered: string[] = [];

  if (signals.overdueCount >= 5) {
    score += 30;
    triggered.push('overdue_tasks_high');
  } else if (signals.overdueCount >= 3) {
    score += 15;
    triggered.push('overdue_tasks_medium');
  }

  if (signals.completionRate <= 0.3) {
    score += 20;
    triggered.push('completion_rate_low');
  } else if (signals.completionRate <= 0.5) {
    score += 10;
    triggered.push('completion_rate_medium');
  }

  if (signals.postponeCount7d >= 3) {
    score += 15;
    triggered.push('postpone_frequent');
  }

  if (signals.stress && signals.stress >= 8) {
    score += 20;
    triggered.push('stress_very_high');
  } else if (signals.stress && signals.stress >= 6) {
    score += 10;
    triggered.push('stress_high');
  }

  if (signals.capacity && signals.capacity <= 3) {
    score += 10;
    triggered.push('capacity_low');
  }

  return {
    type: 'OVERLOAD',
    score: Math.max(0, Math.min(100, score)),
    signals: triggered,
  };
}

/**
 * STUCK（停滞）スコア計算
 *
 * 仕様書のルール:
 * - 非アクティブ >= 5日: +30
 * - 非アクティブ >= 3日: +20
 * - 延期3回以上: +15
 * - 自己効力感 <= 3: +20
 */
export function calculateStuckScore(signals: StateSignals): StateScore {
  let score = 0;
  const triggered: string[] = [];

  if (signals.inactiveDays >= 7) {
    score += 40;
    triggered.push('inactive_week');
  } else if (signals.inactiveDays >= 5) {
    score += 30;
    triggered.push('inactive_5days');
  } else if (signals.inactiveDays >= 3) {
    score += 20;
    triggered.push('inactive_3days');
  }

  if (signals.postponeCount7d >= 3) {
    score += 15;
    triggered.push('postpone_frequent');
  }

  if (signals.efficacy && signals.efficacy <= 3) {
    score += 20;
    triggered.push('efficacy_very_low');
  } else if (signals.efficacy && signals.efficacy <= 5) {
    score += 10;
    triggered.push('efficacy_low');
  }

  if (signals.clarity && signals.clarity <= 3) {
    score += 15;
    triggered.push('clarity_low');
  }

  return {
    type: 'STUCK',
    score: Math.max(0, Math.min(100, score)),
    signals: triggered,
  };
}

/**
 * VISION_OVERLOAD（Vision多すぎ）スコア計算
 */
export function calculateVisionOverloadScore(
  signals: StateSignals,
  visionCount: number
): StateScore {
  let score = 0;
  const triggered: string[] = [];

  if (visionCount >= 10) {
    score += 40;
    triggered.push('vision_count_very_high');
  } else if (visionCount >= 6) {
    score += 25;
    triggered.push('vision_count_high');
  }

  if (signals.clarity && signals.clarity <= 4) {
    score += 20;
    triggered.push('clarity_low');
  }

  return {
    type: 'VISION_OVERLOAD',
    score: Math.max(0, Math.min(100, score)),
    signals: triggered,
  };
}

/**
 * PLAN_OVERLOAD（Plan多すぎ）スコア計算
 */
export function calculatePlanOverloadScore(
  signals: StateSignals,
  thisWeekTasks: number
): StateScore {
  let score = 0;
  const triggered: string[] = [];

  if (thisWeekTasks >= 15) {
    score += 35;
    triggered.push('week_tasks_very_high');
  } else if (thisWeekTasks >= 10) {
    score += 20;
    triggered.push('week_tasks_high');
  }

  if (signals.completionRate <= 0.4) {
    score += 20;
    triggered.push('completion_rate_low');
  }

  if (signals.stress && signals.stress >= 7) {
    score += 15;
    triggered.push('stress_high');
  }

  return {
    type: 'PLAN_OVERLOAD',
    score: Math.max(0, Math.min(100, score)),
    signals: triggered,
  };
}

/**
 * AUTONOMY_REACTANCE（提案拒否反応）スコア計算
 */
export function calculateReactanceScore(signals: StateSignals): StateScore {
  let score = 0;
  const triggered: string[] = [];

  if (signals.suggestionRejectRate7d >= 0.7) {
    score += 40;
    triggered.push('reject_rate_very_high');
  } else if (signals.suggestionRejectRate7d >= 0.5) {
    score += 25;
    triggered.push('reject_rate_high');
  }

  if (signals.annoyance && signals.annoyance >= 7) {
    score += 30;
    triggered.push('annoyance_high');
  } else if (signals.annoyance && signals.annoyance >= 5) {
    score += 15;
    triggered.push('annoyance_medium');
  }

  return {
    type: 'AUTONOMY_REACTANCE',
    score: Math.max(0, Math.min(100, score)),
    signals: triggered,
  };
}

/**
 * LOW_MOTIVATION（モチベーション低下）スコア計算
 */
export function calculateLowMotivationScore(signals: StateSignals): StateScore {
  let score = 0;
  const triggered: string[] = [];

  if (signals.motivation && signals.motivation <= 3) {
    score += 40;
    triggered.push('motivation_very_low');
  } else if (signals.motivation && signals.motivation <= 5) {
    score += 20;
    triggered.push('motivation_low');
  }

  if (signals.inactiveDays >= 5) {
    score += 20;
    triggered.push('inactive_5days');
  }

  if (signals.completionRate <= 0.3) {
    score += 15;
    triggered.push('completion_rate_low');
  }

  return {
    type: 'LOW_MOTIVATION',
    score: Math.max(0, Math.min(100, score)),
    signals: triggered,
  };
}

/**
 * LOW_SELF_EFFICACY（自己効力感低下）スコア計算
 */
export function calculateLowEfficacyScore(signals: StateSignals): StateScore {
  let score = 0;
  const triggered: string[] = [];

  if (signals.efficacy && signals.efficacy <= 3) {
    score += 40;
    triggered.push('efficacy_very_low');
  } else if (signals.efficacy && signals.efficacy <= 5) {
    score += 20;
    triggered.push('efficacy_low');
  }

  if (signals.postponeCount7d >= 3) {
    score += 20;
    triggered.push('postpone_frequent');
  }

  if (signals.completionRate <= 0.3) {
    score += 15;
    triggered.push('completion_rate_low');
  }

  return {
    type: 'LOW_SELF_EFFICACY',
    score: Math.max(0, Math.min(100, score)),
    signals: triggered,
  };
}
