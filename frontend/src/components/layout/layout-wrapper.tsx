'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { apiService } from '@/lib/api-service';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [barName, setBarName] = useState('Bar Book');
  const [username, setUsername] = useState<string | null>(null);

  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = apiService.getAuthToken();
      if (!token && !isAuthPage) {
        window.location.href = '/login';
      } else {
        setIsAuthorized(true);
        setUsername(apiService.getUsername());
        if (!isAuthPage) {
          apiService.getSettings().then(s => {
            if (s.bar_name) setBarName(s.bar_name);
          }).catch(() => {});
        }
      }
    }
  }, [pathname, isAuthPage]);

  const handleLogout = () => {
    apiService.logout();
  };

  // Prevent flashing authenticated layout to unauthenticated users
  if (!isAuthorized && !isAuthPage) {
    return <div className="min-h-screen bg-cream flex items-center justify-center animate-pulse text-primary/50">Loading...</div>;
  }

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/balance')) return 'Balance Day';
    if (path.startsWith('/stock')) return 'Add Stock';
    if (path.startsWith('/products')) return 'Products';
    if (path.startsWith('/reports')) return 'Reports';
    if (path.startsWith('/users')) return 'Users';
    if (path.startsWith('/settings')) return 'Settings';
    return '';
  };

  return (
    <>
      {!isAuthPage && <Sidebar />}
      <div className={`flex-1 flex flex-col min-h-screen ${isAuthPage ? '' : 'md:pl-64'}`}>
        {!isAuthPage && (
          <header className="bg-white border-b border-primary/10 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
            <h1 className="text-xl font-bold tracking-tight text-primary md:hidden">
              {getPageTitle(pathname || '/')}
            </h1>
            <div className="hidden md:block">
              <h2 className="text-xl font-black tracking-tight text-primary">{getPageTitle(pathname || '/')}</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-primary/60 hidden sm:inline">
                User: <span className="text-primary font-bold">{username}</span>
              </span>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 px-4 py-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-lg transition-colors font-bold text-sm"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                LOGOUT
              </button>
            </div>
          </header>
        )}
        <main className={`flex-1 max-w-6xl w-full mx-auto px-2 py-2 sm:px-4 sm:py-4 ${isAuthPage ? '' : 'pb-16 md:pb-4'}`}>
          {children}
        </main>
      </div>
    </>
  );
}