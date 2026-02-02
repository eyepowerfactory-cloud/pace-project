'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminListUsersAction,
  adminSuspendUserAction,
  adminUnsuspendUserAction,
  adminForceLogoutUserAction,
} from '@/actions/admin';
import { getCurrentUserAction } from '@/actions/auth';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  sessionVersion: number;
  createdAt: Date;
}

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUserAction();

      if (user.role !== 'ADMIN') {
        alert('管理者権限が必要です');
        router.push('/dashboard');
        return;
      }

      setCurrentUser(user);
      await loadUsers();
    } catch (err: any) {
      setError('アクセス権限がありません');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setError('');
      const result = await adminListUsersAction({ limit: 100 });
      setUsers(result.users as User[]);
    } catch (err: any) {
      setError(err.message || 'ユーザーの読み込みに失敗しました');
    }
  };

  const handleSuspend = async (userId: string) => {
    if (!confirm('このユーザーを停止しますか？')) return;

    try {
      setActionLoading(userId);
      await adminSuspendUserAction(userId, { reason: '管理者による停止' });
      await loadUsers();
      alert('ユーザーを停止しました');
    } catch (err: any) {
      setError(err.message || 'ユーザーの停止に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnsuspend = async (userId: string) => {
    try {
      setActionLoading(userId);
      await adminUnsuspendUserAction(userId);
      await loadUsers();
      alert('ユーザーの停止を解除しました');
    } catch (err: any) {
      setError(err.message || 'ユーザーの停止解除に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceLogout = async (userId: string) => {
    if (!confirm('このユーザーを強制ログアウトしますか？')) return;

    try {
      setActionLoading(userId);
      await adminForceLogoutUserAction(userId);
      await loadUsers();
      alert('ユーザーを強制ログアウトしました');
    } catch (err: any) {
      setError(err.message || '強制ログアウトに失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      SUSPENDED: 'bg-red-100 text-red-800',
      DELETED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-800',
      USER: 'bg-blue-100 text-blue-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">管理者画面</h1>
        <p className="text-gray-600 text-sm">
          ユーザー管理とシステム操作
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">総ユーザー数</div>
          <div className="text-2xl font-bold text-gray-900">{users.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">アクティブ</div>
          <div className="text-2xl font-bold text-green-600">
            {users.filter((u) => u.status === 'ACTIVE').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">停止中</div>
          <div className="text-2xl font-bold text-red-600">
            {users.filter((u) => u.status === 'SUSPENDED').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">管理者</div>
          <div className="text-2xl font-bold text-purple-600">
            {users.filter((u) => u.role === 'ADMIN').length}
          </div>
        </div>
      </div>

      {/* ユーザー一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ロール
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                セッション
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登録日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.displayName}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      user.status
                    )}`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  v{user.sessionVersion}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {currentUser && user.id !== currentUser.id && (
                    <div className="flex gap-2">
                      {user.status === 'ACTIVE' ? (
                        <>
                          <button
                            onClick={() => handleSuspend(user.id)}
                            disabled={actionLoading === user.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            停止
                          </button>
                          <button
                            onClick={() => handleForceLogout(user.id)}
                            disabled={actionLoading === user.id}
                            className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                          >
                            強制ログアウト
                          </button>
                        </>
                      ) : user.status === 'SUSPENDED' ? (
                        <button
                          onClick={() => handleUnsuspend(user.id)}
                          disabled={actionLoading === user.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          停止解除
                        </button>
                      ) : null}
                    </div>
                  )}
                  {currentUser && user.id === currentUser.id && (
                    <span className="text-gray-400">（自分）</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 説明 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          管理者機能について
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>停止:</strong> ユーザーのアクセスを完全にブロックします（ログイン不可）
          </li>
          <li>
            <strong>強制ログアウト:</strong>{' '}
            sessionVersionをインクリメントし、全てのセッションを無効化します
          </li>
          <li>
            <strong>停止解除:</strong> 停止されたユーザーを再度アクティブにします
          </li>
        </ul>
      </div>
    </div>
  );
}
