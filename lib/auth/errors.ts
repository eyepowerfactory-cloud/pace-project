// 認証エラー定義

export type AuthErrorCode =
  | 'SESSION_INVALID'
  | 'SESSION_EXPIRED'
  | 'ACCOUNT_SUSPENDED'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'INVALID_CREDENTIALS';

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    public statusCode: number,
    message?: string
  ) {
    super(message || code);
    this.name = 'AuthError';
  }
}
