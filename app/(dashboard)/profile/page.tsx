'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserAction } from '@/actions/auth';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  sessionVersion: number;
  createdAt: Date;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const currentUser = await getCurrentUserAction();
      setUser(currentUser as UserProfile);
    } catch (err: any) {
      setError('プロフィールの読み込みに失敗しました');
      if (err.message?.includes('SESSION_INVALID')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'ADMIN') {
      return (
        <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
          👑 管理者
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
        👤 ユーザー
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string; icon: string }> = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'アクティブ', icon: '✓' },
      SUSPENDED: { bg: 'bg-red-100', text: 'text-red-800', label: '停止中', icon: '⊘' },
      DELETED: { bg: 'bg-gray-100', text: 'text-gray-800', label: '削除済み', icon: '✕' },
    };

    const { bg, text, label, icon } = config[status] || config.ACTIVE;

    return (
      <span className={`px-3 py-1 ${bg} ${text} text-sm font-semibold rounded-full`}>
        {icon} {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error || 'プロフィールを読み込めませんでした'}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">プロフィール</h1>
        <p className="text-gray-600 text-sm">アカウント情報</p>
      </div>

      {/* プロフィールカード */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
          <div className="flex items-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl font-bold text-indigo-600">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="ml-6 text-white">
              <h2 className="text-2xl font-bold">{user.displayName}</h2>
              <p className="text-indigo-100">{user.email}</p>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-6 space-y-6">
          {/* ステータスとロール */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">アカウント情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">ロール</span>
                {getRoleBadge(user.role)}
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">ステータス</span>
                {getStatusBadge(user.status)}
              </div>
            </div>
          </div>

          {/* セッション情報 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">セッション情報</h3>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">セッションバージョン</span>
                <span className="text-sm font-mono font-semibold text-gray-900">
                  v{user.sessionVersion}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                セッションバージョンは、強制ログアウトが実行されるたびにインクリメントされます
              </p>
            </div>
          </div>

          {/* アカウント作成日 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">登録情報</h3>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">アカウント作成日</span>
                <span className="text-sm font-semibold text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* 管理者リンク */}
          {user.role === 'ADMIN' && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => router.push('/admin')}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center"
              >
                👑 管理者画面を開く
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 機能説明 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Paceについて
        </h3>
        <p className="text-sm text-blue-800">
          Paceは、ユーザーの自律性を尊重し、停滞からの再開を支援する「伴走型」目標管理アプリです。
          命令形を使わず、仮説提示と許可形式で、あなたのペースで目標に向かって進めるようサポートします。
        </p>
      </div>
    </div>
  );
}
