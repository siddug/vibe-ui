'use client';

import { type ReactNode } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import { Sidebar } from './Sidebar';
import { KanbanView } from './KanbanView';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isCollapsed, toggle } = useSidebar();
  const { viewMode } = useViewMode();

  // If kanban mode, render the KanbanView instead of the sidebar layout
  if (viewMode === 'kanban') {
    return <KanbanView />;
  }

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
      {/* On mobile, hide content when sidebar is expanded (too little real estate) */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {!isCollapsed && (
          <div className="md:hidden flex-1 flex items-center justify-center bg-[var(--bg-primary)] p-6">
            <div className="text-center text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              <p className="text-sm">Collapse the sidebar to view session details</p>
            </div>
          </div>
        )}
        <div className={`flex-1 overflow-hidden flex flex-col min-w-0 ${!isCollapsed ? 'hidden md:flex' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
