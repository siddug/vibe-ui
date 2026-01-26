'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import {
  updateSessionStatus,
  type Session,
  type SessionStatus,
} from '@/lib/api';
import { usePaginatedSessions } from '@/hooks/usePaginatedSessions';
import { Spinner, Button, StatusBadge, ProviderBadge } from '@/components/ui';
import { SessionCreateModal } from '@/components/session/SessionCreateModal';
import { SessionDetailModal } from '@/components/session/SessionDetailModal';

const COLUMNS: { status: SessionStatus; title: string; color: string }[] = [
  { status: 'triage', title: 'Triage', color: 'border-yellow-500' },
  { status: 'in_progress', title: 'In Progress', color: 'border-blue-500' },
  { status: 'completed', title: 'Completed', color: 'border-green-500' },
  { status: 'failed', title: 'Failed', color: 'border-red-500' },
];

export function KanbanView() {
  const { theme, toggleTheme } = useTheme();
  const { toggleViewMode } = useViewMode();
  const { columns, loadMore, refresh, moveSessionOptimistically } = usePaginatedSessions();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Drag state
  const [draggedSession, setDraggedSession] = useState<Session | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<SessionStatus | null>(null);

  // Polling for updates
  useEffect(() => {
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleDragStart = (e: React.DragEvent, session: Session) => {
    setDraggedSession(session);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: SessionStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: SessionStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedSession || draggedSession.status === newStatus) {
      setDraggedSession(null);
      return;
    }

    const oldStatus = draggedSession.status;

    // Optimistically update UI
    moveSessionOptimistically(draggedSession.id, oldStatus, newStatus);

    try {
      await updateSessionStatus(draggedSession.id, { status: newStatus });
    } catch (err) {
      console.error('Failed to update session status:', err);
      // Revert on error by refreshing
      refresh();
    }

    setDraggedSession(null);
  };

  const handleDragEnd = () => {
    setDraggedSession(null);
    setDragOverColumn(null);
  };

  // Check if any column is still in initial loading
  const isInitialLoading = Object.values(columns).some((col) => col.initialLoading);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="flex-shrink-0 bg-[var(--card-bg)] border-b border-[var(--card-border)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Toggle to Sidebar View */}
            <button
              onClick={toggleViewMode}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Switch to sidebar view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold">Kanban Board</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            {/* Settings Link */}
            <Link
              href="/settings"
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto p-4">
        {isInitialLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner className="h-8 w-8 text-blue-600" />
          </div>
        ) : (
          <div className="flex gap-4 h-full min-w-max min-h-full">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.status}
                status={column.status}
                title={column.title}
                color={column.color}
                sessions={columns[column.status].sessions}
                hasMore={columns[column.status].hasMore}
                loading={columns[column.status].loading}
                onLoadMore={() => loadMore(column.status)}
                onDragOver={(e) => handleDragOver(e, column.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.status)}
                isDragOver={dragOverColumn === column.status}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onCardClick={setSelectedSessionId}
                draggedSessionId={draggedSession?.id ?? null}
                onCreateClick={() => setCreateModalOpen(true)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <SessionCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={refresh}
      />

      {/* Detail Modal */}
      {selectedSessionId && (
        <SessionDetailModal
          sessionId={selectedSessionId}
          open={!!selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}

// Kanban Column Component
interface KanbanColumnProps {
  status: SessionStatus;
  title: string;
  color: string;
  sessions: Session[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, session: Session) => void;
  onDragEnd: () => void;
  onCardClick: (sessionId: string) => void;
  draggedSessionId: string | null;
  onCreateClick: () => void;
}

function KanbanColumn({
  status,
  title,
  color,
  sessions,
  hasMore,
  loading,
  onLoadMore,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver,
  onDragStart,
  onDragEnd,
  onCardClick,
  draggedSessionId,
  onCreateClick,
}: KanbanColumnProps) {
  return (
    <div
      className={`flex flex-col w-80 h-full bg-[var(--card-bg)] rounded-lg border-t-4 ${color} ${
        isDragOver ? 'ring-2 ring-blue-500' : ''
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--card-border)]">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{title}</h2>
          <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded-full">
            {sessions.length}{hasMore ? '+' : ''}
          </span>
        </div>
        {status === 'triage' && (
          <Button size="sm" onClick={onCreateClick}>
            + New
          </Button>
        )}
      </div>

      {/* Column Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onDragStart={(e) => onDragStart(e, session)}
            onDragEnd={onDragEnd}
            onClick={() => onCardClick(session.id)}
            isDragging={draggedSessionId === session.id}
          />
        ))}
        {sessions.length === 0 && !loading && (
          <div className="text-center text-gray-500 text-sm py-8">
            No sessions
          </div>
        )}
        {/* Scroll Sentinel for infinite scroll */}
        <ScrollSentinel
          onIntersect={onLoadMore}
          hasMore={hasMore}
          loading={loading}
        />
        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center py-2">
            <Spinner className="h-5 w-5 text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}

// Scroll Sentinel Component - triggers load more when visible
interface ScrollSentinelProps {
  onIntersect: () => void;
  hasMore: boolean;
  loading: boolean;
}

function ScrollSentinel({ onIntersect, hasMore, loading }: ScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onIntersectRef = useRef(onIntersect);

  // Keep callback ref updated
  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onIntersectRef.current();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  if (!hasMore) return null;

  return <div ref={sentinelRef} className="h-4" />;
}

// Session Card Component
interface SessionCardProps {
  session: Session;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
  isDragging: boolean;
}

function SessionCard({ session, onDragStart, onDragEnd, onClick, isDragging }: SessionCardProps) {
  const displayName = session.sessionName || `Session ${session.id.slice(0, 8)}`;
  const timeAgo = getTimeAgo(new Date(session.updatedAt));

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        p-3 rounded-lg border border-[var(--card-border)] bg-white dark:bg-gray-800
        cursor-pointer hover:shadow-md transition-shadow
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-sm truncate flex-1">{displayName}</h3>
        <ProviderBadge provider={session.connectorType} />
      </div>
      <div className="text-xs text-gray-500 mb-2 truncate font-mono">
        {session.workDir}
      </div>
      <div className="flex items-center justify-between">
        <StatusBadge status={session.status} />
        <span className="text-xs text-gray-400">{timeAgo}</span>
      </div>
    </div>
  );
}

// Helper function to get relative time
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
