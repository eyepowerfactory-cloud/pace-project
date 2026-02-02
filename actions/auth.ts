// 認証アクション

'use server';

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth/session';
import { requireActiveSession } from '@/lib/auth';
import { SignUpSchema, SignInSchema } from '@/lib/zod';
import { AuthError } from '@/lib/auth/errors';

const SALT_ROUNDS = 10;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * ユーザー登録
 */
export async function signUpAction(data: {
  email: string;
  password: string;
  displayName?: string;
}) {
  const validated = SignUpSchema.parse(data);

  // メールアドレス重複チェック
  const existing = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (existing) {
    throw new Error('Email already registered');
  }

  // パスワードハッシュ化
  const passwordHash = await bcrypt.hash(validated.password, SALT_ROUNDS);

  // ユーザー作成
  const user = await prisma.user.create({
    data: {
      email: validated.email,
      passwordHash,
      displayName: validated.displayName,
      role: 'USER',
      status: 'ACTIVE',
      sessionVersion: 1,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
    },
  });

  // セッショントークン生成
  const token = createSessionToken({
    userId: user.id,
    role: user.role,
    sv: 1,
  });

  // Cookie設定
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return {
    success: true,
    user,
  };
}

/**
 * ログイン
 */
export async function signInAction(data: { email: string; password: string }) {
  const validated = SignInSchema.parse(data);

  // ユーザー取得
  const user = await prisma.user.findUnique({
    where: { email: validated.email },
    select: {
      id: true,
      email: true,
      displayName: true,
      passwordHash: true,
      role: true,
      status: true,
      sessionVersion: true,
    },
  });

  if (!user) {
    throw new AuthError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
  }

  // パスワード検証
  const isValid = await bcrypt.compare(validated.password, user.passwordHash);

  if (!isValid) {
    throw new AuthError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
  }

  // アカウント停止チェック
  if (user.status === 'SUSPENDED') {
    throw new AuthError('ACCOUNT_SUSPENDED', 403, 'Account is suspended');
  }

  // セッショントークン生成
  const token = createSessionToken({
    userId: user.id,
    role: user.role,
    sv: user.sessionVersion,
  });

  // Cookie設定
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  };
}

/**
 * ログアウト
 */
export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('session');

  return { success: true };
}

/**
 * 現在のユーザー情報取得
 */
export async function getCurrentUserAction() {
  const auth = await requireActiveSession();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return user;
}
