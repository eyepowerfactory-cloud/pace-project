// 管理者アクション

'use server';

import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/auth';
import { SuspendUserSchema, UpdateUserRoleSchema } from '@/lib/zod';

/**
 * ユーザー停止
 */
export async function adminSuspendUserAction(
  userId: string,
  data: { reason: string }
) {
  const auth = await requireAdminRole();
  const validated = SuspendUserSchema.parse(data);

  // ユーザー停止
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'SUSPENDED',
      suspendedAt: new Date(),
      suspendedReason: validated.reason,
    },
  });

  // 監査ログ記録
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: auth.userId,
      action: 'SUSPEND_USER',
      targetType: 'USER',
      targetId: userId,
      detailsJson: { reason: validated.reason },
    },
  });

  return { success: true };
}

/**
 * ユーザー停止解除
 */
export async function adminUnsuspendUserAction(userId: string) {
  const auth = await requireAdminRole();

  // 停止解除
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'ACTIVE',
      suspendedAt: null,
      suspendedReason: null,
    },
  });

  // 監査ログ記録
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: auth.userId,
      action: 'UNSUSPEND_USER',
      targetType: 'USER',
      targetId: userId,
    },
  });

  return { success: true };
}

/**
 * 強制ログアウト（sessionVersionインクリメント）
 *
 * ユーザーの全セッションを無効化する
 * sessionVersionがインクリメントされるため、既存の全JWTが無効になる
 */
export async function adminForceLogoutUserAction(userId: string) {
  const auth = await requireAdminRole();

  // sessionVersion をインクリメント → 全セッション無効化
  await prisma.user.update({
    where: { id: userId },
    data: {
      sessionVersion: { increment: 1 },
    },
  });

  // 監査ログ記録
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: auth.userId,
      action: 'FORCE_LOGOUT',
      targetType: 'USER',
      targetId: userId,
      detailsJson: {
        message: 'All user sessions invalidated via sessionVersion increment',
      },
    },
  });

  return { success: true };
}

/**
 * ユーザーロール更新
 */
export async function adminUpdateUserRoleAction(
  userId: string,
  data: { role: 'USER' | 'ADMIN' }
) {
  const auth = await requireAdminRole();
  const validated = UpdateUserRoleSchema.parse(data);

  // 自分自身のロール変更は禁止
  if (userId === auth.userId) {
    throw new Error('Cannot change your own role');
  }

  // ロール更新
  await prisma.user.update({
    where: { id: userId },
    data: { role: validated.role },
  });

  // sessionVersion インクリメント（ロール変更は即座に反映）
  await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });

  // 監査ログ記録
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: auth.userId,
      action: 'UPDATE_USER_ROLE',
      targetType: 'USER',
      targetId: userId,
      detailsJson: { newRole: validated.role },
    },
  });

  return { success: true };
}

/**
 * ユーザー削除
 */
export async function adminDeleteUserAction(userId: string) {
  const auth = await requireAdminRole();

  // 自分自身の削除は禁止
  if (userId === auth.userId) {
    throw new Error('Cannot delete your own account');
  }

  // 監査ログ記録（削除前）
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: auth.userId,
      action: 'DELETE_USER',
      targetType: 'USER',
      targetId: userId,
    },
  });

  // ユーザー削除（Cascade削除により関連データも削除）
  await prisma.user.delete({
    where: { id: userId },
  });

  return { success: true };
}

/**
 * ユーザー一覧取得
 */
export async function adminListUsersAction(params?: {
  page?: number;
  limit?: number;
  status?: 'ACTIVE' | 'SUSPENDED';
}) {
  await requireAdminRole();

  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const skip = (page - 1) * limit;

  const where = params?.status ? { status: params.status } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        sessionVersion: true,
        suspendedAt: true,
        suspendedReason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * 監査ログ取得
 */
export async function adminGetAuditLogsAction(params?: {
  page?: number;
  limit?: number;
  action?: string;
  targetType?: string;
}) {
  await requireAdminRole();

  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params?.action) where.action = params.action;
  if (params?.targetType) where.targetType = params.targetType;

  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      include: {
        adminUser: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
