'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLatestStateSnapshotAction } from '@/actions/state';
import { getSuggestionsAction, recordSuggestionResponseAction, applySuggestionAction } from '@/actions/suggestions';

type StateType = 'NORMAL' | 'OVERLOAD' | 'STUCK' | 'VISION_OVERLOAD' | 'PLAN_OVERLOAD' |
  'AUTONOMY_REACTANCE' | 'LOW_MOTIVATION' | 'LOW_SELF_EFFICACY';

interface Snapshot {
  id: string;
  primaryState: StateType;
  primaryConfidence: number;
  topSignals: string[];
  createdAt: Date;
}

interface Suggestion {
  eventId: string;
  type: string;
  titleText: string;
  messageText: string;
  options: Array<{ key: string; label: string }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (forceRecompute = false) => {
    try {
      setLoading(true);
      setError('');

      // 提案を取得（forceComputeオプション付き）
      const suggestionsResult = await getSuggestionsAction({
        limit: 3,
        forceCompute: forceRecompute
      });
      setSuggestions(suggestionsResult.suggestions as any);

      // 最新の状態を取得
      if (suggestionsResult.snapshot) {
        setSnapshot(suggestionsResult.snapshot as any);
      }

      // 新規ユーザー判定
      if (suggestionsResult.userStats) {
        setIsNewUser(suggestionsResult.userStats.isNewUser);
      }
    } catch (err: any) {
      if (err.message?.includes('SESSION_INVALID')) {
        router.push('/login');
        return;
      }
      setError(err.message || 'データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionResponse = async (
    eventId: string,
    optionKey: string,
    responsePayload?: any
  ) => {
    try {
      setError('');

      // 応答を記録
      await recordSuggestionResponseAction(eventId, {
        response: optionKey === 'ACCEPT' || optionKey === 'ACCEPTED' ? 'ACCEPTED' : 'DISMISSED',
        responsePayload,
      });

      // ACCEPTの場合は適用
      if (optionKey === 'ACCEPT' || optionKey === 'ACCEPTED') {
        await applySuggestionAction(eventId, responsePayload);
      }

      // データを再読み込み
      await loadData(false);

      // 成功メッセージ（オプション）
      alert('提案を処理しました');
    } catch (err: any) {
      setError(err.message || '提案の処理に失敗しました');
    }
  };

  const getStateColor = (state: StateType | null) => {
    if (!state) return 'bg-gray-100 text-gray-800';

    const colors: Record<StateType, string> = {
      NORMAL: 'bg-green-100 text-green-800',
      OVERLOAD: 'bg-red-100 text-red-800',
      STUCK: 'bg-yellow-100 text-yellow-800',
      VISION_OVERLOAD: 'bg-orange-100 text-orange-800',
      PLAN_OVERLOAD: 'bg-pink-100 text-pink-800',
      AUTONOMY_REACTANCE: 'bg-purple-100 text-purple-800',
      LOW_MOTIVATION: 'bg-blue-100 text-blue-800',
      LOW_SELF_EFFICACY: 'bg-indigo-100 text-indigo-800',
    };

    return colors[state] || 'bg-gray-100 text-gray-800';
  };

  const getStateLabel = (state: StateType | null) => {
    if (!state) return '状態不明';

    const labels: Record<StateType, string> = {
      NORMAL: '順調',
      OVERLOAD: '負荷過多',
      STUCK: '停滞中',
      VISION_OVERLOAD: 'ビジョン過多',
      PLAN_OVERLOAD: '計画過多',
      AUTONOMY_REACTANCE: '自律性への抵抗',
      LOW_MOTIVATION: 'モチベーション低下',
      LOW_SELF_EFFICACY: '効力感低下',
    };

    return labels[state] || state;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card p-12 rounded-3xl">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-6 text-gray-700 font-medium text-lg">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        {error && (
          <div className="glass-card p-6 rounded-2xl border-2 border-red-300 bg-red-50/80 animate-scale-in">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* 現在の状態 */}
        <section className="animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">📊</span>
            <h2 className="text-2xl font-bold text-gradient">
              現在の状態
            </h2>
          </div>

          {snapshot ? (
            <div className="glass-card rounded-3xl p-8 hover-lift">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <span
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-lg ${getStateColor(
                        snapshot.primaryState
                      )}`}
                    >
                      <span className="text-2xl">
                        {snapshot.primaryState === 'NORMAL' ? '✨' :
                         snapshot.primaryState === 'OVERLOAD' ? '🔥' :
                         snapshot.primaryState === 'STUCK' ? '⏸️' :
                         snapshot.primaryState === 'VISION_OVERLOAD' ? '🌊' :
                         snapshot.primaryState === 'PLAN_OVERLOAD' ? '📚' :
                         snapshot.primaryState === 'LOW_MOTIVATION' ? '💤' :
                         snapshot.primaryState === 'LOW_SELF_EFFICACY' ? '🤔' : '✨'}
                      </span>
                      {getStateLabel(snapshot.primaryState)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600">信頼度:</span>
                    <div className="flex-1 progress-bar max-w-xs">
                      <div
                        className="progress-fill"
                        style={{ width: `${snapshot.primaryConfidence}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-indigo-600">{snapshot.primaryConfidence}%</span>
                  </div>
                </div>
                <button
                  onClick={() => loadData(true)}
                  disabled={loading}
                  className="btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>🔄 更新</span>
                </button>
              </div>

              {snapshot.topSignals && snapshot.topSignals.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200/50">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <span>🎯</span>
                    主要シグナル
                  </h3>
                  <ul className="space-y-3">
                    {snapshot.topSignals.map((signal, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-gray-700 glass-card p-3 rounded-xl border-0">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span className="font-medium">{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-6 text-xs text-gray-500 flex items-center gap-2">
                <span>🕐</span>
                最終更新: {new Date(snapshot.createdAt).toLocaleString('ja-JP')}
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-12 text-center">
              <div className="text-6xl mb-4 animate-float">📊</div>
              <p className="text-gray-600 text-lg font-medium">
                状態データがありません。アクティビティを記録すると状態が推定されます。
              </p>
            </div>
          )}
        </section>

        {/* 提案 */}
        <section className="animate-fade-in" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">💡</span>
            <h2 className="text-2xl font-bold text-gradient">
              AIからの提案
            </h2>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-5">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={suggestion.eventId}
                  className="glass-card rounded-3xl p-8 hover-lift animate-scale-in"
                  style={{animationDelay: `${idx * 0.1}s`}}
                >
                  <div className="flex items-start gap-6 mb-6">
                    <div className="icon-wrapper flex-shrink-0">
                      {suggestion.type === 'PLAN_REDUCE' ? '✂️' :
                       suggestion.type === 'TASK_MICROSTEP' ? '🔬' :
                       suggestion.type === 'PRIORITY_FOCUS' ? '🎯' :
                       suggestion.type === 'GOAL_REFRAME' ? '🔄' :
                       suggestion.type === 'MOTIVATION_REMIND' ? '❤️' :
                       suggestion.type === 'RESUME_SUPPORT' ? '▶️' : '💡'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">
                          {suggestion.titleText}
                        </h3>
                        <span className="badge badge-gradient flex-shrink-0">
                          {suggestion.type}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed text-base">{suggestion.messageText}</p>
                    </div>
                  </div>

                  {suggestion.options && suggestion.options.length > 0 && (
                    <div className="flex gap-3 flex-wrap">
                      {suggestion.options.map((option) => (
                        <button
                          key={option.key}
                          onClick={() => handleSuggestionResponse(suggestion.eventId, option.key)}
                          disabled={loading}
                          className="btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : isNewUser ? (
            <div className="glass-card rounded-3xl p-12 text-center max-w-3xl mx-auto">
              <div className="text-6xl mb-6 animate-float">👋</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                はじめまして！Paceへようこそ
              </h3>
              <div className="space-y-4 text-left text-gray-700 leading-relaxed text-lg">
                <p>
                  私はPace、あなたの目標達成を伴走するパートナーです。
                </p>
                <p>
                  このシステムは、あなたに「〜すべき」「〜しなさい」と命令することはありません。
                  代わりに、あなたの状況を見守りながら、必要に応じて提案をさせていただきます。
                </p>
                <p className="font-medium text-indigo-600">
                  あなたをサポートできたら嬉しいです。
                </p>
                <p>
                  よろしければ、あなたのことについて少し教えていただけますか？
                </p>
              </div>
              <div className="mt-10 space-y-3">
                <button
                  onClick={() => router.push('/visions')}
                  className="btn-gradient w-full sm:w-auto"
                >
                  <span>✨ ビジョンを作成する</span>
                </button>
                <button
                  onClick={() => router.push('/goals')}
                  className="btn-gradient w-full sm:w-auto ml-0 sm:ml-3 mt-3 sm:mt-0"
                >
                  <span>🎯 目標を設定する</span>
                </button>
                <button
                  onClick={() => router.push('/tasks')}
                  className="btn-gradient w-full sm:w-auto ml-0 sm:ml-3 mt-3 sm:mt-0"
                >
                  <span>📝 タスクを追加する</span>
                </button>
              </div>
              <p className="mt-8 text-sm text-gray-500">
                まずは小さく始めてみませんか？<br />
                あなたのペースで、あなたのやり方で。
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-12 text-center">
              <div className="text-6xl mb-4 animate-float">✨</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                すべて順調です！
              </h3>
              <p className="text-gray-600 text-lg">
                現在、提案はありません。素晴らしいペースで進んでいます。
              </p>
            </div>
          )}
        </section>
    </div>
  );
}
