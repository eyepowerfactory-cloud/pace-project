// 認証ガード - sessionVersion方式の中核

import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { verifySessionToken } from './auth/session';
import { AuthError } from './auth/errors';

export interface AuthContext {
  userId: string;
  role: string;
}

/**
 * アクティブセッション必須ガード
 *
 * sessionVersion検証を含む完全な認証チェック
 * - JWT検証
 * - sessionVersion一致確認（最重要）
 * - アカウント停止チェック
 */
export async function requireActiveSession(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) {
    throw new AuthError('SESSION_INVALID', 401, 'No session token');
  }

  // 1. JWT検証
  const session = verifySessionToken(token);

  // 2. ユーザー情報取得
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      role: true,
      status: true,
      sessionVersion: true,
    },
  });

  if (!user) {
    throw new AuthError('SESSION_INVALID', 401, 'User not found');
  }

  // 3. sessionVersion チェック（最重要）
  if (user.sessionVersion !== session.sessionVersion) {
    throw new AuthError('SESSION_INVALID', 401, 'Session has been invalidated');
  }

  // 4. アカウント停止チェック
  if (user.status === 'SUSPENDED') {
    throw new AuthError('ACCOUNT_SUSPENDED', 403, 'Account is suspended');
  }

  return {
    userId: user.id,
    role: user.role,
  };
}

/**
 * 管理者権限必須ガード
 */
export async function requireAdminRole(): Promise<AuthContext> {
  const auth = await requireActiveSession();

  if (auth.role !== 'ADMIN') {
    throw new AuthError('INSUFFICIENT_PERMISSIONS', 403, 'Admin role required');
  }

  return auth;
}

/**
 * オプショナルセッション取得
 *
 * 認証が無効でもエラーを投げない
 */
export async function getOptionalSession(): Promise<AuthContext | null> {
  try {
    return await requireActiveSession();
  } catch {
    return null;
  }
}
