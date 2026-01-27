'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSessions, type Session, type SessionStatus } from '@/lib/api';

const PAGE_SIZE = 10;
const STATUSES: SessionStatus[] = ['triage', 'in_progress', 'approval', 'completed', 'failed'];

interface ColumnState {
  sessions: Session[];
  offset: number;
  hasMore: boolean;
  loading: boolean;
  initialLoading: boolean;
}

type ColumnsState = Record<SessionStatus, ColumnState>;

const initialColumnState: ColumnState = {
  sessions: [],
  offset: 0,
  hasMore: true,
  loading: false,
  initialLoading: true,
};

const initialState: ColumnsState = {
  triage: { ...initialColumnState },
  in_progress: { ...initialColumnState },
  approval: { ...initialColumnState },
  completed: { ...initialColumnState },
  failed: { ...initialColumnState },
};

export interface UsePaginatedSessionsResult {
  columns: ColumnsState;
  loadMore: (status: SessionStatus) => Promise<void>;
  refresh: () => Promise<void>;
  smartRefresh: () => Promise<void>;
  updateSessionOptimistically: (sessionId: string, updates: Partial<Session>) => void;
  moveSessionOptimistically: (sessionId: string, fromStatus: SessionStatus, toStatus: SessionStatus) => void;
}

export function usePaginatedSessions(): UsePaginatedSessionsResult {
  const [columns, setColumns] = useState<ColumnsState>(initialState);
  const mountedRef = useRef(true);

  // Load initial data for all columns
  useEffect(() => {
    mountedRef.current = true;

    const loadInitial = async () => {
      await Promise.all(
        STATUSES.map(async (status) => {
          try {
            const data = await getSessions({ status, limit: PAGE_SIZE, offset: 0 });
            if (!mountedRef.current) return;

            setColumns((prev) => ({
              ...prev,
              [status]: {
                sessions: data.sessions,
                offset: data.sessions.length,
                hasMore: data.hasMore,
                loading: false,
                initialLoading: false,
              },
            }));
          } catch (err) {
            console.error(`Failed to fetch ${status} sessions:`, err);
            if (!mountedRef.current) return;

            setColumns((prev) => ({
              ...prev,
              [status]: {
                ...prev[status],
                loading: false,
                initialLoading: false,
              },
            }));
          }
        })
      );
    };

    loadInitial();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load more sessions for a specific column
  const loadMore = useCallback(async (status: SessionStatus) => {
    setColumns((prev) => {
      // Don't load if already loading or no more items
      if (prev[status].loading || !prev[status].hasMore) {
        return prev;
      }
      return {
        ...prev,
        [status]: { ...prev[status], loading: true },
      };
    });

    try {
      const currentOffset = columns[status].offset;
      const data = await getSessions({ status, limit: PAGE_SIZE, offset: currentOffset });

      if (!mountedRef.current) return;

      setColumns((prev) => ({
        ...prev,
        [status]: {
          sessions: [...prev[status].sessions, ...data.sessions],
          offset: prev[status].offset + data.sessions.length,
          hasMore: data.hasMore,
          loading: false,
          initialLoading: false,
        },
      }));
    } catch (err) {
      console.error(`Failed to load more ${status} sessions:`, err);
      if (!mountedRef.current) return;

      setColumns((prev) => ({
        ...prev,
        [status]: { ...prev[status], loading: false },
      }));
    }
  }, [columns]);

  // Refresh first page of all columns (used for polling)
  const refresh = useCallback(async () => {
    await Promise.all(
      STATUSES.map(async (status) => {
        try {
          const data = await getSessions({ status, limit: PAGE_SIZE, offset: 0 });
          if (!mountedRef.current) return;

          setColumns((prev) => {
            const existingSessions = prev[status].sessions;
            const newIds = new Set(data.sessions.map((s) => s.id));

            // Merge: new sessions first, then existing sessions not in new batch
            // This keeps new sessions at top while preserving loaded history
            const mergedSessions = [
              ...data.sessions,
              ...existingSessions.filter((s) => !newIds.has(s.id)),
            ];

            // Remove sessions that have moved to different status
            // (they will appear in their new column on that column's refresh)
            const filteredSessions = mergedSessions.filter((s) => s.status === status);

            return {
              ...prev,
              [status]: {
                ...prev[status],
                sessions: filteredSessions,
                // Update hasMore based on whether we have loaded more than first page
                hasMore: data.hasMore || prev[status].offset > PAGE_SIZE,
              },
            };
          });
        } catch (err) {
          console.error(`Failed to refresh ${status} sessions:`, err);
        }
      })
    );
  }, []);

  // Optimized refresh that only updates changed sessions
  const smartRefresh = useCallback(async () => {
    try {
      // Get all sessions across all statuses
      const allSessionsResponse = await getSessions({ limit: 100, offset: 0 });
      const allSessions = allSessionsResponse.sessions;
      
      setColumns((prev) => {
        const newColumns = { ...prev };
        let hasChanges = false;
        
        // Update each column based on current session statuses
        for (const status of STATUSES) {
          const currentSessions = prev[status].sessions;
          const currentSessionIds = new Set(currentSessions.map(s => s.id));
          
          // Find sessions that should be in this column
          const sessionsForStatus = allSessions.filter(s => s.status === status);
          const sessionsForStatusIds = new Set(sessionsForStatus.map(s => s.id));
          
          // Check if there are any changes
          const sessionsToAdd = sessionsForStatus.filter(s => !currentSessionIds.has(s.id));
          const sessionsToRemove = currentSessions.filter(s => !sessionsForStatusIds.has(s.id));
          
          if (sessionsToAdd.length > 0 || sessionsToRemove.length > 0) {
            hasChanges = true;
            
            // Remove sessions that no longer belong here
            const updatedSessions = currentSessions.filter(s => sessionsForStatusIds.has(s.id));
            
            // Add new sessions (at the beginning for newest first)
            const finalSessions = [...sessionsToAdd, ...updatedSessions];
            
            newColumns[status] = {
              ...prev[status],
              sessions: finalSessions,
            };
          }
        }
        
        return hasChanges ? newColumns : prev;
      });
    } catch (err) {
      console.error('Failed to smart refresh sessions:', err);
    }
  }, []);

  // Optimistically update a session (e.g., after name change)
  const updateSessionOptimistically = useCallback(
    (sessionId: string, updates: Partial<Session>) => {
      setColumns((prev) => {
        const newColumns = { ...prev };
        for (const status of STATUSES) {
          const sessions = newColumns[status].sessions;
          const index = sessions.findIndex((s) => s.id === sessionId);
          if (index !== -1) {
            newColumns[status] = {
              ...newColumns[status],
              sessions: [
                ...sessions.slice(0, index),
                { ...sessions[index], ...updates },
                ...sessions.slice(index + 1),
              ],
            };
            break;
          }
        }
        return newColumns;
      });
    },
    []
  );

  // Optimistically move a session between columns (e.g., drag-drop status change)
  const moveSessionOptimistically = useCallback(
    (sessionId: string, fromStatus: SessionStatus, toStatus: SessionStatus) => {
      if (fromStatus === toStatus) return;

      setColumns((prev) => {
        const fromSessions = prev[fromStatus].sessions;
        const sessionIndex = fromSessions.findIndex((s) => s.id === sessionId);

        if (sessionIndex === -1) return prev;

        const session = fromSessions[sessionIndex];
        const updatedSession = { ...session, status: toStatus };

        return {
          ...prev,
          [fromStatus]: {
            ...prev[fromStatus],
            sessions: fromSessions.filter((s) => s.id !== sessionId),
          },
          [toStatus]: {
            ...prev[toStatus],
            // Add to beginning of target column (newest first)
            sessions: [updatedSession, ...prev[toStatus].sessions],
          },
        };
      });
    },
    []
  );

  return {
    columns,
    loadMore,
    refresh,
    smartRefresh,
    updateSessionOptimistically,
    moveSessionOptimistically,
  };
}
