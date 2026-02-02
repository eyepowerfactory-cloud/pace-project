// PromptVersion管理アクション

'use server';

import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/auth';
import { PromptKey } from '@prisma/client';
import {
  createPromptVersion,
  activatePromptVersion,
} from '@/services/ai/prompt-resolver';

/**
 * PromptVersion作成
 */
export async function createPromptVersionAction(data: {
  templateKey: PromptKey;
  version: number;
  variant?: string;
  systemText: string;
  userText: string;
  notes?: string;
}) {
  const auth = await requireAdminRole();

  const promptVersion = await createPromptVersion({
    templateKey: data.templateKey,
    version: data.version,
    variant: data.variant,
    systemText: data.systemText,
    userText: data.userText,
    createdBy: auth.userId,
    notes: data.notes,
  });

  // 監査ログ
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: auth.userId,
      action: 'UPDATE_PROMPT_VERSION',
      targetType: 'PROMPT_VERSION',
      targetId: promptVersion.id,
      detailsJson: {
        action: 'CREATE',
        templateKey: data.templateKey,
        version: data.version,
      },
    },
  });

  return { success: true, promptVersion };
}

/**
 * PromptVersionアクティブ化
 */
export async function activatePromptVersionAction(promptVersionId: string) {
  const auth = await requireAdminRole();

  await activatePromptVersion(promptVersionId);

  // 監査ログ
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: auth.userId,
      action: 'UPDATE_PROMPT_VERSION',
      targetType: 'PROMPT_VERSION',
      targetId: promptVersionId,
      detailsJson: { action: 'ACTIVATE' },
    },
  });

  return { success: true };
}

/**
 * PromptVersion一覧取得
 */
export async function listPromptVersionsAction(params?: {
  templateKey?: PromptKey;
  variant?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}) {
  await requireAdminRole();

  const where: any = {};
  if (params?.templateKey) {
    where.template = { key: params.templateKey };
  }
  if (params?.variant) {
    where.variant = params.variant;
  }
  if (params?.status) {
    where.status = params.status;
  }

  const versions = await prisma.promptVersion.findMany({
    where,
    include: {
      template: true,
    },
    orderBy: [
      { template: { key: 'asc' } },
      { variant: 'asc' },
      { version: 'desc' },
    ],
  });

  return {
    versions: versions.map((v) => ({
      id: v.id,
      templateKey: v.template.key,
      version: v.version,
      variant: v.variant,
      status: v.status,
      hash: v.hash,
      notes: v.notes,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
      activatedAt: v.activatedAt,
    })),
  };
}

/**
 * PromptVersion詳細取得
 */
export async function getPromptVersionAction(promptVersionId: string) {
  await requireAdminRole();

  const version = await prisma.promptVersion.findUniqueOrThrow({
    where: { id: promptVersionId },
    include: {
      template: true,
    },
  });

  return {
    version: {
      id: version.id,
      templateKey: version.template.key,
      templateName: version.template.name,
      version: version.version,
      variant: version.variant,
      status: version.status,
      systemText: version.systemText,
      userText: version.userText,
      hash: version.hash,
      notes: version.notes,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      activatedAt: version.activatedAt,
    },
  };
}

/**
 * AI生成ログ取得
 */
export async function getAiGenerationLogsAction(params?: {
  userId?: string;
  type?: string;
  promptKey?: string;
  limit?: number;
}) {
  await requireAdminRole();

  const where: any = {};
  if (params?.userId) where.userId = params.userId;
  if (params?.type) where.type = params.type;
  if (params?.promptKey) where.promptKey = params.promptKey;

  const logs = await prisma.aiGenerationLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params?.limit || 50,
    include: {
      promptVersion: {
        select: {
          version: true,
          variant: true,
        },
      },
    },
  });

  return {
    logs: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      type: log.type,
      promptKey: log.promptKey,
      promptVersion: log.promptVersion,
      modelName: log.modelName,
      validationOk: log.validationOk,
      repairUsed: log.repairUsed,
      fallbackUsed: log.fallbackUsed,
      latencyMs: log.latencyMs,
      createdAt: log.createdAt,
    })),
  };
}

/**
 * AI生成統計取得
 */
export async function getAiGenerationStatsAction() {
  await requireAdminRole();

  const [total, validationOk, repairUsed, fallbackUsed] = await Promise.all([
    prisma.aiGenerationLog.count(),
    prisma.aiGenerationLog.count({ where: { validationOk: true } }),
    prisma.aiGenerationLog.count({ where: { repairUsed: true } }),
    prisma.aiGenerationLog.count({ where: { fallbackUsed: true } }),
  ]);

  // 平均レイテンシ
  const avgLatency = await prisma.aiGenerationLog.aggregate({
    _avg: { latencyMs: true },
  });

  return {
    stats: {
      total,
      validationOk,
      repairUsed,
      fallbackUsed,
      successRate: total > 0 ? validationOk / total : 0,
      repairRate: total > 0 ? repairUsed / total : 0,
      fallbackRate: total > 0 ? fallbackUsed / total : 0,
      avgLatencyMs: avgLatency._avg.latencyMs || 0,
    },
  };
}
