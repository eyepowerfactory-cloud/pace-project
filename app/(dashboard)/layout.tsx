'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOutAction } from '@/actions/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const navigation = [
    { name: 'ダッシュボード', href: '/dashboard', icon: '📊' },
    { name: 'タスク', href: '/tasks', icon: '✓' },
    { name: '計画', href: '/plans', icon: '📝' },
    { name: 'ビジョン', href: '/visions', icon: '🎯' },
    { name: '四半期目標', href: '/goals', icon: '📅' },
  ];

  const handleLogout = async () => {
    await signOutAction();
    router.push('/login');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 border-0 rounded-none mb-4 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="icon-wrapper w-12 h-12 text-2xl">
                🚀
              </div>
              <h1 className="text-3xl font-bold text-gradient">Pace</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/profile')}
                className="glass-card px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-indigo-600 border-0"
              >
                <span className="mr-2">👤</span>
                プロフィール
              </button>
              <button
                onClick={handleLogout}
                className="glass-card px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-red-600 border-0"
              >
                <span className="mr-2">🚪</span>
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="glass-card rounded-2xl p-2 animate-slide-in">
          <div className="flex space-x-2 overflow-x-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-white/50 hover:text-indigo-600'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute -bottom-32 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
      </div>
    </div>
  );
}
