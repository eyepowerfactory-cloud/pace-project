'use client';

import { useEffect, useState } from 'react';
import {
  listQuarterGoalsAction,
  createQuarterGoalAction,
  updateQuarterGoalAction,
  deleteQuarterGoalAction,
} from '@/actions/goals';

interface QuarterGoal {
  id: string;
  title: string;
  theme: string | null;
  framework: string;
  frameworkJson: any;
  year: number;
  cadence: string;
  isArchived: boolean;
  createdAt: Date;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<QuarterGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<QuarterGoal | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    theme: '',
    framework: 'OKR' as 'OKR' | 'SMART' | 'NONE',
    year: new Date().getFullYear(),
    cadence: `Q${Math.floor((new Date().getMonth() / 3)) + 1}` as 'Q1' | 'Q2' | 'Q3' | 'Q4',
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await listQuarterGoalsAction({ limit: 100 });
      setGoals(result.goals as QuarterGoal[]);
    } catch (err: any) {
      setError(err.message || '目標の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingGoal) {
        await updateQuarterGoalAction(editingGoal.id, {
          title: formData.title,
          theme: formData.theme || null,
        });
      } else {
        await createQuarterGoalAction({
          title: formData.title,
          theme: formData.theme || null,
          framework: formData.framework,
          year: formData.year,
          cadence: formData.cadence,
        });
      }

      setFormData({
        title: '',
        theme: '',
        framework: 'OKR',
        year: new Date().getFullYear(),
        cadence: `Q${Math.floor((new Date().getMonth() / 3)) + 1}` as 'Q1' | 'Q2' | 'Q3' | 'Q4',
      });
      setShowCreateForm(false);
      setEditingGoal(null);
      await loadGoals();
    } catch (err: any) {
      setError(err.message || '目標の保存に失敗しました');
    }
  };

  const handleEdit = (goal: QuarterGoal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      theme: goal.theme || '',
      framework: goal.framework as 'OKR' | 'SMART' | 'NONE',
      year: goal.year,
      cadence: goal.cadence as 'Q1' | 'Q2' | 'Q3' | 'Q4',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm('この目標を削除しますか？')) return;

    try {
      await deleteQuarterGoalAction(goalId);
      await loadGoals();
    } catch (err: any) {
      setError(err.message || '目標の削除に失敗しました');
    }
  };

  const getFrameworkLabel = (framework: string) => {
    const labels: Record<string, string> = {
      OKR: 'OKR',
      SMART: 'SMART',
      NONE: '自由形式',
    };
    return labels[framework] || framework;
  };

  const calculateProgress = (goal: QuarterGoal) => {
    if (goal.framework === 'OKR' && goal.frameworkJson?.keyResults) {
      const krs = goal.frameworkJson.keyResults;
      const totalProgress = krs.reduce((sum: number, kr: any) => {
        return sum + ((kr.current / kr.target) * 100);
      }, 0);
      return Math.round(totalProgress / krs.length);
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center glass-card p-12 rounded-3xl">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-6 text-gray-700 font-medium text-lg">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="icon-wrapper w-16 h-16 text-3xl">
            📅
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">四半期目標</h1>
            <p className="text-gray-600 text-base mt-2">
              3ヶ月単位で達成したい目標を設定しましょう
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingGoal(null);
            setFormData({
              title: '',
              theme: '',
              framework: 'OKR',
              year: new Date().getFullYear(),
              cadence: `Q${Math.floor((new Date().getMonth() / 3)) + 1}` as 'Q1' | 'Q2' | 'Q3' | 'Q4',
            });
          }}
          className="btn-gradient"
        >
          <span>✨ 新しい目標</span>
        </button>
      </div>

      {error && (
        <div className="glass-card p-6 rounded-2xl border-2 border-red-300 bg-red-50/80 animate-scale-in">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* 目標作成/編集フォーム */}
      {showCreateForm && (
        <div className="glass-card rounded-3xl p-8 animate-scale-in">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">{editingGoal ? '✏️' : '✨'}</span>
            <h2 className="text-2xl font-bold text-gradient">
              {editingGoal ? '目標編集' : '新しい目標'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                placeholder="例: マーケティング基盤を構築する"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                テーマ/カテゴリ
              </label>
              <input
                type="text"
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="例: プロダクト開発、集客、転職準備"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                フレームワーク
              </label>
              <select
                value={formData.framework}
                onChange={(e) =>
                  setFormData({ ...formData, framework: e.target.value as 'OKR' | 'SMART' | 'NONE' })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={!!editingGoal}
              >
                <option value="OKR">OKR</option>
                <option value="SMART">SMART</option>
                <option value="NONE">自由形式</option>
              </select>
            </div>

            {!editingGoal && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    年
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2030"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    四半期 (Q)
                  </label>
                  <select
                    value={formData.cadence}
                    onChange={(e) =>
                      setFormData({ ...formData, cadence: e.target.value as 'Q1' | 'Q2' | 'Q3' | 'Q4' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="Q1">Q1 (1-3月)</option>
                    <option value="Q2">Q2 (4-6月)</option>
                    <option value="Q3">Q3 (7-9月)</option>
                    <option value="Q4">Q4 (10-12月)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {editingGoal ? '更新' : '作成'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingGoal(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 目標一覧 */}
      {goals.length > 0 ? (
        <div className="space-y-5">
          {goals.map((goal, idx) => (
            <div
              key={goal.id}
              className="glass-card rounded-3xl p-8 hover-lift animate-fade-in"
              style={{animationDelay: `${idx * 0.1}s`}}
            >
              <div className="flex items-start gap-6 mb-6">
                <div className="icon-wrapper flex-shrink-0">
                  {goal.framework === 'OKR' ? '🎯' :
                   goal.framework === 'SMART' ? '💡' : '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{goal.title}</h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="badge bg-indigo-100 text-indigo-800">
                          {getFrameworkLabel(goal.framework)}
                        </span>
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <span>📅</span>
                          {goal.year}年 {goal.cadence}
                        </span>
                        {goal.theme && (
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <span>🏷️</span>
                            {goal.theme}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(goal)}
                        className="glass-card px-4 py-2 rounded-xl text-sm font-medium text-blue-700 hover:text-blue-900 border-0"
                      >
                        <span className="mr-1">✏️</span>
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="glass-card px-4 py-2 rounded-xl text-sm font-medium text-red-700 hover:text-red-900 border-0"
                      >
                        <span className="mr-1">🗑️</span>
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 進捗バー */}
              {goal.framework === 'OKR' && (
                <div className="mt-6 pt-6 border-t border-gray-200/50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <span>📈</span>
                      進捗状況
                    </span>
                    <span className="text-lg font-bold text-indigo-600">{calculateProgress(goal)}%</span>
                  </div>
                  <div className="progress-bar h-3">
                    <div
                      className="progress-fill"
                      style={{ width: `${calculateProgress(goal)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="text-6xl mb-4 animate-float">📅</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            まだ目標がありません
          </h3>
          <p className="text-gray-600 text-lg leading-relaxed max-w-md mx-auto">
            今期（3ヶ月）で達成したい目標を設定してみましょう。<br />
            OKRやSMART形式で、具体的な目標を立てることができます。
          </p>
        </div>
      )}
    </div>
  );
}
