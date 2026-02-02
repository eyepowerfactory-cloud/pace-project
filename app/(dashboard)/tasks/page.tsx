'use client';

import { useEffect, useState } from 'react';
import {
  listTasksAction,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  completeTaskAction,
  postponeTaskAction
} from '@/actions/tasks';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  status: string;
  postponeCount: number;
  completedAt: Date | null;
  dueDate: Date | null;
  plannedWeekStart: Date | null;
  createdAt: Date;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // フォームの状態
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 50,
    dueDate: '',
    plannedWeekStart: '',
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await listTasksAction({ limit: 100 });
      setTasks(result.tasks as Task[]);
    } catch (err: any) {
      setError(err.message || 'タスクの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingTask) {
        // 更新
        await updateTaskAction(editingTask.id, {
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
          plannedWeekStart: formData.plannedWeekStart ? new Date(formData.plannedWeekStart) : null,
        });
      } else {
        // 新規作成
        await createTaskAction({
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
          plannedWeekStart: formData.plannedWeekStart ? new Date(formData.plannedWeekStart) : null,
        });
      }

      // フォームをリセット
      setFormData({ title: '', description: '', priority: 50, dueDate: '', plannedWeekStart: '' });
      setShowCreateForm(false);
      setEditingTask(null);
      await loadTasks();
    } catch (err: any) {
      setError(err.message || 'タスクの保存に失敗しました');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      plannedWeekStart: task.plannedWeekStart ? new Date(task.plannedWeekStart).toISOString().split('T')[0] : '',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('このタスクを削除しますか？')) return;

    try {
      await deleteTaskAction(taskId);
      await loadTasks();
    } catch (err: any) {
      setError(err.message || 'タスクの削除に失敗しました');
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      await completeTaskAction(taskId);
      await loadTasks();
    } catch (err: any) {
      setError(err.message || 'タスクの完了に失敗しました');
    }
  };

  const handlePostpone = async (taskId: string) => {
    try {
      await postponeTaskAction(taskId, { reason: 'ユーザーが延期' });
      await loadTasks();
    } catch (err: any) {
      setError(err.message || 'タスクの延期に失敗しました');
    }
  };

  const getStatusColor = (status: string, postponeCount: number) => {
    if (status === 'DONE') return 'bg-green-100 text-green-800';
    if (postponeCount >= 3) return 'bg-red-100 text-red-800';
    if (status === 'IN_PROGRESS') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">タスク管理</h1>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingTask(null);
            setFormData({ title: '', description: '', priority: 50, dueDate: '', plannedWeekStart: '' });
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + 新しいタスク
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* タスク作成/編集フォーム */}
      {showCreateForm && (
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingTask ? 'タスク編集' : '新しいタスク'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  優先度 (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  期限
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  実施予定週
                </label>
                <input
                  type="date"
                  value={formData.plannedWeekStart}
                  onChange={(e) => setFormData({ ...formData, plannedWeekStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {editingTask ? '更新' : '作成'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTask(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* タスク一覧 */}
      {tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        task.status,
                        task.postponeCount
                      )}`}
                    >
                      {task.status === 'DONE' ? '完了' : task.status}
                    </span>
                    {task.postponeCount > 0 && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        延期{task.postponeCount}回
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>優先度: {task.priority}</span>
                    {task.dueDate && (
                      <span>期限: {new Date(task.dueDate).toLocaleDateString('ja-JP')}</span>
                    )}
                    {task.plannedWeekStart && (
                      <span>予定週: {new Date(task.plannedWeekStart).toLocaleDateString('ja-JP')}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {task.status !== 'DONE' && (
                    <>
                      <button
                        onClick={() => handleComplete(task.id)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      >
                        完了
                      </button>
                      <button
                        onClick={() => handlePostpone(task.id)}
                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                      >
                        延期
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleEdit(task)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">タスクがありません。新しいタスクを作成してください。</p>
        </div>
      )}
    </div>
  );
}
