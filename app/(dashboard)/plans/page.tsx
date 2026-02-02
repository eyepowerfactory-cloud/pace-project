'use client';

import { useEffect, useState } from 'react';
import {
  getWeeklyPlanAction,
  getDailyPlanAction,
  upsertWeeklyPlanAction,
  upsertDailyPlanAction,
} from '@/actions/plans';

interface WeeklyPlan {
  id: string;
  theme: string | null;
  reflectionNote: string | null;
  createdAt: Date;
}

interface DailyPlan {
  id: string;
  morningNote: string | null;
  eveningNote: string | null;
  energyLevel: number | null;
  createdAt: Date;
}

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'daily'>('weekly');
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [weeklyForm, setWeeklyForm] = useState({
    intention: '',
    reflectionNote: '',
  });

  const [dailyForm, setDailyForm] = useState({
    intention: '',
    reflectionNote: '',
  });

  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    loadPlans();
  }, [selectedWeekStart, selectedDate, activeTab]);

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError('');

      if (activeTab === 'weekly') {
        const result = await getWeeklyPlanAction({ weekStart: selectedWeekStart });
        if (result.plan) {
          setWeeklyPlan(result.plan as WeeklyPlan);
          setWeeklyForm({
            intention: result.plan.theme || '',
            reflectionNote: result.plan.reflectionNote || '',
          });
        } else {
          setWeeklyPlan(null);
          setWeeklyForm({ intention: '', reflectionNote: '' });
        }
      } else {
        const result = await getDailyPlanAction({ date: selectedDate });
        if (result.plan) {
          setDailyPlan(result.plan as DailyPlan);
          setDailyForm({
            intention: result.plan.morningNote || '',
            reflectionNote: result.plan.eveningNote || '',
          });
        } else {
          setDailyPlan(null);
          setDailyForm({ intention: '', reflectionNote: '' });
        }
      }
    } catch (err: any) {
      setError(err.message || 'プランの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleWeeklySave = async () => {
    try {
      setSaving(true);
      setError('');

      await upsertWeeklyPlanAction({
        weekStart: selectedWeekStart,
        intention: weeklyForm.intention || null,
        reflectionNote: weeklyForm.reflectionNote || null,
      });

      await loadPlans();
      alert('週次プランを保存しました');
    } catch (err: any) {
      setError(err.message || '週次プランの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDailySave = async () => {
    try {
      setSaving(true);
      setError('');

      await upsertDailyPlanAction({
        date: selectedDate,
        intention: dailyForm.intention || null,
        reflectionNote: dailyForm.reflectionNote || null,
      });

      await loadPlans();
      alert('日次プランを保存しました');
    } catch (err: any) {
      setError(err.message || '日次プランの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeekStart(newDate);
  };

  const changeDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">計画管理</h1>
        <p className="text-gray-600 text-sm">
          週次・日次で意図と振り返りを記録しましょう
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* タブ */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`py-3 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'weekly'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 週次プラン
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`py-3 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'daily'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📝 日次プラン
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      ) : (
        <>
          {/* 週次プラン */}
          {activeTab === 'weekly' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => changeWeek('prev')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ← 前週
                </button>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedWeekStart.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  の週
                </h2>
                <button
                  onClick={() => changeWeek('next')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  次週 →
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    今週のテーマ 💭
                  </label>
                  <textarea
                    value={weeklyForm.intention}
                    onChange={(e) => setWeeklyForm({ ...weeklyForm, intention: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={4}
                    placeholder="今週、何を大切にしたいですか？どんな一週間にしたいですか？"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    振り返り 📖
                  </label>
                  <textarea
                    value={weeklyForm.reflectionNote}
                    onChange={(e) => setWeeklyForm({ ...weeklyForm, reflectionNote: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={4}
                    placeholder="今週はどうでしたか？学びや気づきを記録しましょう"
                  />
                </div>

                <button
                  onClick={handleWeeklySave}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? '保存中...' : '週次プランを保存'}
                </button>
              </div>
            </div>
          )}

          {/* 日次プラン */}
          {activeTab === 'daily' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => changeDay('prev')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ← 前日
                </button>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedDate.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </h2>
                <button
                  onClick={() => changeDay('next')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  翌日 →
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    朝のメモ ☀️
                  </label>
                  <textarea
                    value={dailyForm.intention}
                    onChange={(e) => setDailyForm({ ...dailyForm, intention: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={3}
                    placeholder="今日、何を大切にしたいですか？"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    夕方の振り返り 🌙
                  </label>
                  <textarea
                    value={dailyForm.reflectionNote}
                    onChange={(e) => setDailyForm({ ...dailyForm, reflectionNote: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={3}
                    placeholder="今日はどうでしたか？"
                  />
                </div>

                <button
                  onClick={handleDailySave}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? '保存中...' : '日次プランを保存'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
