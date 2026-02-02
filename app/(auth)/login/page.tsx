'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInAction } from '@/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick login buttons for test users
  const quickLogin = async (userEmail: string) => {
    setLoading(true);
    setError('');
    try {
      await signInAction({ email: userEmail, password: 'test123456' });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInAction({ email, password });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="glass-card p-10 rounded-3xl max-w-md w-full mx-4 animate-scale-in">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="icon-wrapper w-16 h-16 text-3xl">
            🚀
          </div>
          <h1 className="text-4xl font-bold text-gradient">
            Pace
          </h1>
        </div>
        <p className="text-center text-gray-600 mb-8 text-lg font-medium">
          伴走型目標管理アプリ
        </p>

        {error && (
          <div className="mb-6 glass-card p-4 rounded-2xl border-2 border-red-300 bg-red-50/80 animate-scale-in">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📧 メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🔒 パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gradient disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            <span>{loading ? '🔄 ログイン中...' : '🚀 ログイン'}</span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200/50">
          <p className="text-sm font-bold text-gray-700 mb-4 text-center flex items-center justify-center gap-2">
            <span>👥</span>
            テストユーザーでログイン
          </p>
          <div className="space-y-3">
            <button
              onClick={() => quickLogin('alice@pace.local')}
              disabled={loading}
              className="w-full glass-card px-4 py-3 rounded-xl font-semibold text-red-700 hover:bg-red-50 transition-all border-2 border-transparent hover:border-red-300 disabled:opacity-50"
            >
              <span className="mr-2">🔥</span>
              Alice (OVERLOAD状態)
            </button>
            <button
              onClick={() => quickLogin('bob@pace.local')}
              disabled={loading}
              className="w-full glass-card px-4 py-3 rounded-xl font-semibold text-yellow-700 hover:bg-yellow-50 transition-all border-2 border-transparent hover:border-yellow-300 disabled:opacity-50"
            >
              <span className="mr-2">⏸️</span>
              Bob (STUCK状態)
            </button>
            <button
              onClick={() => quickLogin('carol@pace.local')}
              disabled={loading}
              className="w-full glass-card px-4 py-3 rounded-xl font-semibold text-green-700 hover:bg-green-50 transition-all border-2 border-transparent hover:border-green-300 disabled:opacity-50"
            >
              <span className="mr-2">✨</span>
              Carol (バランス良好)
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="text-gradient font-bold hover:opacity-80 transition-opacity">
              サインアップ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
