'use client';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api-service';

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const date = searchParams?.get('date') || new Date().toISOString().slice(0, 10);
  const [role, setRole] = useState<string | null>(null);
  const [barName, setBarName] = useState('Bar Book');

  useEffect(() => {
    setRole(apiService.getRole());
    apiService.getSettings().then(settings => {
      if (settings.bar_name) {
        setBarName(settings.bar_name);
      }
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    apiService.logout();
  };

  const navItems = [
    {
      label: 'Dashboard',
      href: `/?date=${date}`,
      active: pathname === '/',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: 'Balance Day',
      href: `/balance?date=${date}`,
      active: pathname === '/balance' || pathname.startsWith('/balance/'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Add stock',
      href: `/stock?date=${date}`,
      active: pathname === '/stock' || pathname.startsWith('/stock/'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
    },
    {
      label: 'Products',
      href: '/products',
      active: pathname === '/products' || pathname.startsWith('/products/'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      label: 'Reports',
      href: `/reports?date=${date}`,
      active: pathname === '/reports' || pathname.startsWith('/reports/'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: 'Users',
      href: `/users?date=${date}`,
      active: pathname === '/users' || pathname.startsWith('/users/'),
      adminOnly: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ].filter(item => !item.adminOnly || role === 'admin');

  const settingsItem = {
    label: 'Settings',
    href: `/settings?date=${date}`,
    active: pathname === '/settings' || pathname.startsWith('/settings/'),
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-primary text-cream min-h-screen fixed left-0 top-0 z-40 border-r border-[#4A2E1B]/30 shadow-lg">
        <div className="p-6 border-b border-[#4A2E1B]/40">
          <Link href={`/?date=${date}`} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-primary text-lg shadow-md">
              B
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">{barName}</span>
              <span className="text-xs text-accent font-semibold uppercase tracking-wider">Manager</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                item.active
                  ? 'bg-accent text-primary font-bold shadow-md'
                  : 'text-cream/80 hover:bg-primary-light hover:text-white'
              }`}
            >
              {item.active && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-r-md" />
              )}
              <div className="flex items-center gap-3">
                <span className={item.active ? 'text-primary' : 'text-accent group-hover:text-accent-light'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.active && (
                <svg className="w-5 h-5 text-primary opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#4A2E1B]/40">
          {(!settingsItem.adminOnly || role === 'admin') && (
            <Link
              href={settingsItem.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden mb-2 ${
                settingsItem.active
                  ? 'bg-accent text-primary font-bold shadow-md'
                  : 'text-cream/80 hover:bg-primary-light hover:text-white'
              }`}
            >
              {settingsItem.active && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-r-md" />
              )}
              <div className="flex items-center gap-3">
                <span className={settingsItem.active ? 'text-primary' : 'text-accent group-hover:text-accent-light'}>
                  {settingsItem.icon}
                </span>
                <span>{settingsItem.label}</span>
              </div>
            </Link>
          )}
          <div className="text-center">
            <span className="text-xs text-cream/40 block">{barName}</span>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-primary text-cream border-t border-[#4A2E1B]/30 z-50 flex justify-around items-center py-2 px-1 shadow-2xl backdrop-blur-md">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 mx-0.5 rounded-lg transition-all duration-200 relative ${
              item.active ? 'bg-accent/20 text-accent font-bold scale-105' : 'text-cream/70 hover:text-white'
            }`}
          >
            {item.active && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-accent rounded-b-md" />
            )}
            <span className={item.active ? 'text-accent' : 'text-cream/60'}>
              {item.icon}
            </span>
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </Link>
        ))}
        {(!settingsItem.adminOnly || role === 'admin') && (
          <Link
            href={settingsItem.href}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 mx-0.5 rounded-lg transition-all duration-200 relative ${
              settingsItem.active ? 'bg-accent/20 text-accent font-bold scale-105' : 'text-cream/70 hover:text-white'
            }`}
          >
            {settingsItem.active && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-accent rounded-b-md" />
            )}
            <span className={settingsItem.active ? 'text-accent' : 'text-cream/60'}>
              {settingsItem.icon}
            </span>
            <span className="text-[10px] mt-1 font-medium">{settingsItem.label}</span>
          </Link>
        )}
      </nav>
    </>
  );
}
