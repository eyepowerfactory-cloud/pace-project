-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VisionHorizon" AS ENUM ('ONE_YEAR', 'THREE_YEARS', 'FIVE_YEARS');

-- CreateEnum
CREATE TYPE "QuarterCadence" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- CreateEnum
CREATE TYPE "GoalFramework" AS ENUM ('NONE', 'OKR', 'SMART', 'WOOP');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskOriginType" AS ENUM ('USER_CREATED', 'GENERATED_FROM_SUGGESTION', 'GENERATED_FROM_GOAL');

-- CreateEnum
CREATE TYPE "StateType" AS ENUM ('OVERLOAD', 'STUCK', 'VISION_OVERLOAD', 'PLAN_OVERLOAD', 'AUTONOMY_REACTANCE', 'LOW_MOTIVATION', 'LOW_SELF_EFFICACY');

-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('PLAN_REDUCE', 'TASK_MICROSTEP', 'PRIORITY_FOCUS', 'GOAL_REFRAME', 'MOTIVATION_REMIND', 'AUTONOMY_ADJUST', 'RESUME_SUPPORT', 'VISION_CREATE_ASSIST', 'VISION_TO_QUARTER_TRANSLATE', 'GOAL_TO_TASK_DRAFT');

-- CreateEnum
CREATE TYPE "SuggestionResponse" AS ENUM ('ACCEPTED', 'DISMISSED', 'POSTPONED', 'IGNORED_TIMEOUT');

-- CreateEnum
CREATE TYPE "SuggestionContext" AS ENUM ('HOME', 'TASK_LIST', 'GOAL_DETAIL', 'VISION_BOARD');

-- CreateEnum
CREATE TYPE "PromptKey" AS ENUM ('SUGGESTION_COPY', 'TASK_MICROSTEP_DRAFT', 'GOAL_TO_TASK_DRAFT', 'VISION_TO_QUARTER_DRAFT');

-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AiGenerationType" AS ENUM ('SUGGESTION_COPY', 'TASK_DRAFT', 'GOAL_DRAFT', 'QUARTER_DRAFT');

-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('SUSPEND_USER', 'UNSUSPEND_USER', 'FORCE_LOGOUT', 'UPDATE_USER_ROLE', 'DELETE_USER', 'UPDATE_PROMPT_VERSION', 'CREATE_EXPERIMENT', 'PAUSE_EXPERIMENT');

-- CreateEnum
CREATE TYPE "AuditTargetType" AS ENUM ('USER', 'PROMPT_VERSION', 'EXPERIMENT', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "horizon" "VisionHorizon" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "whyNote" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visionCardId" TEXT,
    "year" INTEGER NOT NULL,
    "cadence" "QuarterCadence" NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT,
    "framework" "GoalFramework" NOT NULL DEFAULT 'NONE',
    "frameworkJson" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "theme" TEXT,
    "reflectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "morningNote" TEXT,
    "eveningNote" TEXT,
    "energyLevel" SMALLINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" SMALLINT NOT NULL DEFAULT 50,
    "effortMin" INTEGER,
    "quarterGoalId" TEXT,
    "weeklyPlanId" TEXT,
    "plannedWeekStart" TIMESTAMP(3),
    "dailyPlanId" TEXT,
    "plannedDate" DATE,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "originType" "TaskOriginType" NOT NULL DEFAULT 'USER_CREATED',
    "originId" TEXT,
    "postponeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "windowDays" INTEGER NOT NULL DEFAULT 7,
    "scoresJson" JSONB NOT NULL,
    "primaryState" "StateType" NOT NULL,
    "primaryConfidence" SMALLINT NOT NULL,
    "topSignalsJson" JSONB NOT NULL,
    "selfReportJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "suggestionType" "SuggestionType" NOT NULL,
    "stateType" "StateType",
    "stateScore" SMALLINT,
    "context" "SuggestionContext" NOT NULL DEFAULT 'HOME',
    "payloadJson" JSONB NOT NULL,
    "titleText" TEXT,
    "messageText" TEXT,
    "optionsJson" JSONB,
    "response" "SuggestionResponse",
    "responsePayload" JSONB,
    "respondedAt" TIMESTAMP(3),
    "experimentKey" TEXT,
    "variantKey" TEXT,
    "stateSnapshotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuggestionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "key" "PromptKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'default',
    "status" "PromptStatus" NOT NULL DEFAULT 'DRAFT',
    "systemText" TEXT NOT NULL,
    "userText" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentVariant" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" SMALLINT NOT NULL DEFAULT 50,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGenerationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AiGenerationType" NOT NULL,
    "promptKey" "PromptKey" NOT NULL,
    "promptVersionId" TEXT,
    "modelName" TEXT NOT NULL,
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB NOT NULL,
    "validationOk" BOOLEAN NOT NULL DEFAULT false,
    "violationsJson" JSONB,
    "repairUsed" BOOLEAN NOT NULL DEFAULT false,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "latencyMs" INTEGER,
    "tokenCountIn" INTEGER,
    "tokenCountOut" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" "AdminAction" NOT NULL,
    "targetType" "AuditTargetType" NOT NULL,
    "targetId" TEXT,
    "detailsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "VisionCard_userId_horizon_idx" ON "VisionCard"("userId", "horizon");

-- CreateIndex
CREATE INDEX "VisionCard_userId_isArchived_idx" ON "VisionCard"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "QuarterGoal_userId_isArchived_idx" ON "QuarterGoal"("userId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterGoal_userId_year_cadence_key" ON "QuarterGoal"("userId", "year", "cadence");

-- CreateIndex
CREATE INDEX "WeeklyPlan_userId_weekStart_idx" ON "WeeklyPlan"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlan_userId_weekStart_key" ON "WeeklyPlan"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "DailyPlan_userId_date_idx" ON "DailyPlan"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPlan_userId_date_key" ON "DailyPlan"("userId", "date");

-- CreateIndex
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");

-- CreateIndex
CREATE INDEX "Task_userId_plannedWeekStart_idx" ON "Task"("userId", "plannedWeekStart");

-- CreateIndex
CREATE INDEX "Task_userId_plannedDate_idx" ON "Task"("userId", "plannedDate");

-- CreateIndex
CREATE INDEX "Task_quarterGoalId_idx" ON "Task"("quarterGoalId");

-- CreateIndex
CREATE INDEX "StateSnapshot_userId_createdAt_idx" ON "StateSnapshot"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SuggestionEvent_userId_createdAt_idx" ON "SuggestionEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SuggestionEvent_userId_response_idx" ON "SuggestionEvent"("userId", "response");

-- CreateIndex
CREATE INDEX "SuggestionEvent_suggestionType_idx" ON "SuggestionEvent"("suggestionType");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_key_key" ON "PromptTemplate"("key");

-- CreateIndex
CREATE INDEX "PromptTemplate_key_idx" ON "PromptTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_hash_key" ON "PromptVersion"("hash");

-- CreateIndex
CREATE INDEX "PromptVersion_templateId_status_idx" ON "PromptVersion"("templateId", "status");

-- CreateIndex
CREATE INDEX "PromptVersion_hash_idx" ON "PromptVersion"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_templateId_version_variant_key" ON "PromptVersion"("templateId", "version", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_key_key" ON "Experiment"("key");

-- CreateIndex
CREATE INDEX "Experiment_key_idx" ON "Experiment"("key");

-- CreateIndex
CREATE INDEX "Experiment_status_idx" ON "Experiment"("status");

-- CreateIndex
CREATE INDEX "ExperimentVariant_experimentId_idx" ON "ExperimentVariant"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentVariant_experimentId_key_key" ON "ExperimentVariant"("experimentId", "key");

-- CreateIndex
CREATE INDEX "ExperimentAssignment_userId_idx" ON "ExperimentAssignment"("userId");

-- CreateIndex
CREATE INDEX "ExperimentAssignment_experimentId_variantKey_idx" ON "ExperimentAssignment"("experimentId", "variantKey");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentAssignment_userId_experimentId_key" ON "ExperimentAssignment"("userId", "experimentId");

-- CreateIndex
CREATE INDEX "AiGenerationLog_userId_createdAt_idx" ON "AiGenerationLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiGenerationLog_type_idx" ON "AiGenerationLog"("type");

-- CreateIndex
CREATE INDEX "AiGenerationLog_promptKey_idx" ON "AiGenerationLog"("promptKey");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_createdAt_idx" ON "AdminAuditLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- AddForeignKey
ALTER TABLE "VisionCard" ADD CONSTRAINT "VisionCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterGoal" ADD CONSTRAINT "QuarterGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterGoal" ADD CONSTRAINT "QuarterGoal_visionCardId_fkey" FOREIGN KEY ("visionCardId") REFERENCES "VisionCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_quarterGoalId_fkey" FOREIGN KEY ("quarterGoalId") REFERENCES "QuarterGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "WeeklyPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_dailyPlanId_fkey" FOREIGN KEY ("dailyPlanId") REFERENCES "DailyPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateSnapshot" ADD CONSTRAINT "StateSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionEvent" ADD CONSTRAINT "SuggestionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionEvent" ADD CONSTRAINT "SuggestionEvent_stateSnapshotId_fkey" FOREIGN KEY ("stateSnapshotId") REFERENCES "StateSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentAssignment" ADD CONSTRAINT "ExperimentAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentAssignment" ADD CONSTRAINT "ExperimentAssignment_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationLog" ADD CONSTRAINT "AiGenerationLog_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
