'use client';

import { useEffect, useState } from 'react';
import {
  listVisionsAction,
  createVisionAction,
  updateVisionAction,
  deleteVisionAction,
} from '@/actions/vision';

interface VisionCard {
  id: string;
  horizon: string;
  title: string;
  description: string | null;
  whyNote: string | null;
  isArchived: boolean;
  createdAt: Date;
}

export default function VisionsPage() {
  const [visions, setVisions] = useState<VisionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVision, setEditingVision] = useState<VisionCard | null>(null);

  const [formData, setFormData] = useState({
    horizon: 'ONE_YEAR' as 'ONE_YEAR' | 'THREE_YEARS' | 'FIVE_YEARS',
    title: '',
    description: '',
    whyNote: '',
  });

  useEffect(() => {
    loadVisions();
  }, []);

  const loadVisions = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await listVisionsAction();
      setVisions(result.visions as VisionCard[]);
    } catch (err: any) {
      setError(err.message || 'ビジョンの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingVision) {
        await updateVisionAction(editingVision.id, {
          title: formData.title,
          description: formData.description || null,
          whyNote: formData.whyNote || null,
        });
      } else {
        await createVisionAction({
          horizon: formData.horizon,
          title: formData.title,
          description: formData.description || null,
          whyNote: formData.whyNote || null,
        });
      }

      setFormData({ horizon: 'ONE_YEAR', title: '', description: '', whyNote: '' });
      setShowCreateForm(false);
      setEditingVision(null);
      await loadVisions();
    } catch (err: any) {
      setError(err.message || 'ビジョンの保存に失敗しました');
    }
  };

  const handleEdit = (vision: VisionCard) => {
    setEditingVision(vision);
    setFormData({
      horizon: vision.horizon as 'ONE_YEAR' | 'THREE_YEARS' | 'FIVE_YEARS',
      title: vision.title || '',
      description: vision.description || '',
      whyNote: vision.whyNote || '',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (visionId: string) => {
    if (!confirm('このビジョンを削除しますか？')) return;

    try {
      await deleteVisionAction(visionId);
      await loadVisions();
    } catch (err: any) {
      setError(err.message || 'ビジョンの削除に失敗しました');
    }
  };

  const getHorizonLabel = (horizon: string) => {
    const labels: Record<string, string> = {
      ONE_YEAR: '🌱 1年後',
      THREE_YEARS: '🌳 3年後',
      FIVE_YEARS: '🌲 5年後',
    };
    return labels[horizon] || horizon;
  };

  const getHorizonColor = (horizon: string) => {
    const colors: Record<string, string> = {
      ONE_YEAR: 'bg-green-100 text-green-800',
      THREE_YEARS: 'bg-blue-100 text-blue-800',
      FIVE_YEARS: 'bg-purple-100 text-purple-800',
    };
    return colors[horizon] || 'bg-gray-100 text-gray-800';
  };

  // horizonごとにグループ化
  const groupedVisions = {
    ONE_YEAR: visions.filter((v) => v.horizon === 'ONE_YEAR' && !v.isArchived),
    THREE_YEARS: visions.filter((v) => v.horizon === 'THREE_YEARS' && !v.isArchived),
    FIVE_YEARS: visions.filter((v) => v.horizon === 'FIVE_YEARS' && !v.isArchived),
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
            🎯
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">ビジョン管理</h1>
            <p className="text-gray-600 text-base mt-2">
              1年、3年、5年後のビジョンを描いてみましょう
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingVision(null);
            setFormData({ horizon: 'ONE_YEAR', title: '', description: '', whyNote: '' });
          }}
          className="btn-gradient"
        >
          <span>✨ 新しいビジョン</span>
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

      {/* ビジョン作成/編集フォーム */}
      {showCreateForm && (
        <div className="glass-card rounded-3xl p-8 animate-scale-in">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">{editingVision ? '✏️' : '✨'}</span>
            <h2 className="text-2xl font-bold text-gradient">
              {editingVision ? 'ビジョン編集' : '新しいビジョン'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingVision && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  期間
                </label>
                <select
                  value={formData.horizon}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      horizon: e.target.value as 'ONE_YEAR' | 'THREE_YEARS' | 'FIVE_YEARS',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="ONE_YEAR">🌱 1年後</option>
                  <option value="THREE_YEARS">🌳 3年後</option>
                  <option value="FIVE_YEARS">🌲 5年後</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タイトル *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="例: 新規事業を立ち上げる"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
                placeholder="どのような状態になっていたいですか？"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                なぜこれが大切なのか？ ❤️
              </label>
              <textarea
                value={formData.whyNote}
                onChange={(e) => setFormData({ ...formData, whyNote: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
                placeholder="このビジョンがあなたにとって大切な理由は？"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {editingVision ? '更新' : '作成'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingVision(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ビジョン一覧 */}
      <div className="space-y-6">
        {['ONE_YEAR', 'THREE_YEARS', 'FIVE_YEARS'].map((horizon, horizonIdx) => {
          const horizonVisions = groupedVisions[horizon as keyof typeof groupedVisions];
          const horizonIcon = horizon === 'ONE_YEAR' ? '🌱' : horizon === 'THREE_YEARS' ? '🌳' : '🌲';
          const horizonGradient = horizon === 'ONE_YEAR'
            ? 'from-green-400 to-emerald-500'
            : horizon === 'THREE_YEARS'
            ? 'from-blue-400 to-cyan-500'
            : 'from-purple-400 to-pink-500';

          return (
            <div
              key={horizon}
              className="glass-card rounded-3xl p-8 animate-fade-in"
              style={{animationDelay: `${horizonIdx * 0.15}s`}}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`icon-wrapper bg-gradient-to-br ${horizonGradient}`}>
                  {horizonIcon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {getHorizonLabel(horizon)}
                </h3>
              </div>

              {horizonVisions.length > 0 ? (
                <div className="space-y-4">
                  {horizonVisions.map((vision, idx) => (
                    <div
                      key={vision.id}
                      className="glass-card rounded-2xl p-6 border-2 border-transparent hover:border-indigo-300 transition-all hover-lift"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-xl font-bold text-gray-900 flex-1">{vision.title}</h4>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(vision)}
                            className="glass-card px-3 py-2 rounded-xl text-sm font-medium text-blue-700 hover:text-blue-900 border-0"
                          >
                            <span className="mr-1">✏️</span>
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(vision.id)}
                            className="glass-card px-3 py-2 rounded-xl text-sm font-medium text-red-700 hover:text-red-900 border-0"
                          >
                            <span className="mr-1">🗑️</span>
                            削除
                          </button>
                        </div>
                      </div>

                      {vision.description && (
                        <p className="text-gray-700 leading-relaxed mb-3">{vision.description}</p>
                      )}

                      {vision.whyNote && (
                        <div className="mt-4 pt-4 border-t border-gray-200/50">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">❤️</span>
                            <p className="text-sm font-bold text-gray-700">なぜ大切か</p>
                          </div>
                          <p className="text-gray-700 leading-relaxed pl-7">{vision.whyNote}</p>
                        </div>
                      )}

                      <p className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                        <span>🕐</span>
                        作成日: {new Date(vision.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg">まだビジョンが設定されていません</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {visions.length === 0 && (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="text-6xl mb-4 animate-float">🎯</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            まだビジョンがありません
          </h3>
          <p className="text-gray-600 text-lg leading-relaxed max-w-md mx-auto">
            未来の自分をイメージしてみましょう。<br />
            1年後、3年後、5年後のあなたは、どうなっていたいですか？
          </p>
        </div>
      )}
    </div>
  );
}
