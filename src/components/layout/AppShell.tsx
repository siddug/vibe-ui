'use client';

import { type ReactNode } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isCollapsed, toggle } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div
        className={`
          flex-shrink-0 transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-0' : 'w-[280px]'}
          overflow-hidden
        `}
      >
        <Sidebar />
      </div>

      {/* Expand sidebar button (shown when collapsed) */}
      {isCollapsed && (
        <button
          onClick={toggle}
          className="fixed top-3 left-3 z-20 p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
