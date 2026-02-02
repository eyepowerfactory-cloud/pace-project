// Zodバリデーションスキーマ

import { z } from 'zod';

// ============================================================================
// Auth
// ============================================================================

export const SignUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(100).optional(),
});

export const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// Vision
// ============================================================================

export const CreateVisionSchema = z.object({
  horizon: z.enum(['ONE_YEAR', 'THREE_YEARS', 'FIVE_YEARS']),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(1000).optional(),
  whyNote: z.string().max(500).optional(),
  tags: z.array(z.string()).max(5).optional(),
});

export const UpdateVisionSchema = CreateVisionSchema.partial();

// ============================================================================
// Quarter Goals
// ============================================================================

export const CreateQuarterGoalSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  cadence: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
  title: z.string().min(1).max(200),
  theme: z.string().max(500).optional(),
  framework: z.enum(['NONE', 'OKR', 'SMART', 'WOOP']).default('NONE'),
  frameworkJson: z.record(z.string(), z.any()).optional(),
  visionCardId: z.string().optional(),
});

export const UpdateQuarterGoalSchema = CreateQuarterGoalSchema.partial().omit({
  year: true,
  cadence: true,
});

// ============================================================================
// Tasks
// ============================================================================

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
  priority: z.number().int().min(0).max(100).default(50),
  effortMin: z.number().int().positive().optional(),
  quarterGoalId: z.string().optional(),
  plannedWeekStart: z.coerce.date().optional(),
  plannedDate: z.coerce.date().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export const CompleteTaskSchema = z.object({
  completedAt: z.coerce.date().default(() => new Date()),
});

export const PostponeTaskSchema = z.object({
  newPlannedDate: z.coerce.date().optional(),
  newPlannedWeekStart: z.coerce.date().optional(),
});

// ============================================================================
// State & Suggestions
// ============================================================================

export const SelfReportSchema = z.object({
  capacity: z.number().int().min(0).max(10).optional(),
  stress: z.number().int().min(0).max(10).optional(),
  clarity: z.number().int().min(0).max(10).optional(),
  efficacy: z.number().int().min(0).max(10).optional(),
  motivation: z.number().int().min(0).max(10).optional(),
  annoyance: z.number().int().min(0).max(10).optional(),
});

export const RecordSuggestionResponseSchema = z.object({
  response: z.enum(['ACCEPTED', 'DISMISSED', 'POSTPONED', 'IGNORED_TIMEOUT']),
  responsePayload: z.record(z.string(), z.any()).optional(),
});

// ============================================================================
// AI Generation
// ============================================================================

export const SuggestionCopySchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  options: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      description: z.string().optional(),
    })
  ),
});

// ============================================================================
// Admin
// ============================================================================

export const SuspendUserSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const UpdateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});
