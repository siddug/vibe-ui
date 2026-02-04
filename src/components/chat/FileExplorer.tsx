'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { listDirectory, type FileEntry } from '@/lib/api';
import { Button, Spinner } from '@/components/ui';

interface Column {
  path: string;
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  selectedEntry: string | null; // name of the selected entry in this column
}

interface FileExplorerProps {
  initialPath: string;
  mode: 'select-directory' | 'browse';
  onSelect?: (path: string) => void;
  onCancel?: () => void;
}

export function FileExplorer({ initialPath, mode, onSelect, onCancel }: FileExplorerProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'file' | 'directory' | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadDirectory = useCallback(async (path: string): Promise<{ entries: FileEntry[]; resolvedPath: string } | null> => {
    try {
      const result = await listDirectory(path);
      return { entries: result.entries, resolvedPath: result.path };
    } catch {
      return null;
    }
  }, []);

  // Load initial directory
  useEffect(() => {
    const init = async () => {
      const pathToLoad = initialPath || '~';
      setColumns([{ path: pathToLoad, entries: [], loading: true, error: null, selectedEntry: null }]);

      const result = await loadDirectory(pathToLoad);
      if (result) {
        setColumns([{ path: result.resolvedPath, entries: result.entries, loading: false, error: null, selectedEntry: null }]);
      } else {
        // Fallback to home if initial path fails
        const fallback = await loadDirectory('~');
        if (fallback) {
          setColumns([{ path: fallback.resolvedPath, entries: fallback.entries, loading: false, error: null, selectedEntry: null }]);
        } else {
          setColumns([{ path: pathToLoad, entries: [], loading: false, error: 'Failed to load directory', selectedEntry: null }]);
        }
      }
    };
    init();
  }, [initialPath, loadDirectory]);

  // Auto-scroll right when new columns are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [columns.length]);

  const handleEntryClick = async (columnIndex: number, entry: FileEntry) => {
    // Update selection in this column and remove columns to the right
    setColumns((prev) => {
      const updated = prev.slice(0, columnIndex + 1);
      updated[columnIndex] = { ...updated[columnIndex], selectedEntry: entry.name };
      return updated;
    });

    setSelectedPath(entry.path);
    setSelectedType(entry.type);

    if (entry.type === 'directory') {
      // Add a loading column for the directory contents
      setColumns((prev) => {
        const updated = prev.slice(0, columnIndex + 1);
        updated[columnIndex] = { ...updated[columnIndex], selectedEntry: entry.name };
        return [...updated, { path: entry.path, entries: [], loading: true, error: null, selectedEntry: null }];
      });

      const result = await loadDirectory(entry.path);
      setColumns((prev) => {
        // Only update if this column is still the last one (user hasn't clicked elsewhere)
        if (prev.length < columnIndex + 2) return prev;
        const updated = [...prev];
        const targetIdx = columnIndex + 1;
        if (updated[targetIdx]?.path === entry.path) {
          updated[targetIdx] = result
            ? { path: result.resolvedPath, entries: result.entries, loading: false, error: null, selectedEntry: null }
            : { path: entry.path, entries: [], loading: false, error: 'Failed to load', selectedEntry: null };
        }
        return updated;
      });
    }
  };

  const canSelect = mode === 'select-directory' ? selectedType === 'directory' : selectedPath !== null;

  return (
    <div className={`flex flex-col ${mode === 'browse' ? 'h-full' : 'h-[480px]'}`}>
      {/* Path bar */}
      <div className="px-4 py-2 border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] flex items-center gap-2 min-h-[40px]">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="text-sm text-gray-600 dark:text-gray-300 truncate font-mono">
          {selectedPath || columns[0]?.path || '~'}
        </span>
      </div>

      {/* Columns container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-50 dark:bg-gray-900"
      >
        <div className="flex h-full min-w-max">
          {columns.map((column, idx) => (
            <div
              key={`${column.path}-${idx}`}
              className="w-56 h-full flex flex-col border-r border-[var(--card-border)] shrink-0"
            >
              {column.loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Spinner className="h-5 w-5 text-blue-500" />
                </div>
              ) : column.error ? (
                <div className="flex-1 flex items-center justify-center p-3">
                  <span className="text-xs text-red-500">{column.error}</span>
                </div>
              ) : column.entries.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-3">
                  <span className="text-xs text-gray-400">Empty folder</span>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {column.entries.map((entry) => {
                    const isSelected = column.selectedEntry === entry.name;
                    return (
                      <button
                        key={entry.name}
                        onClick={() => handleEntryClick(idx, entry)}
                        className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-sm cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-500 text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--text-primary)]'
                        }`}
                      >
                        {entry.type === 'directory' ? (
                          <svg className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-blue-500'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                          </svg>
                        ) : (
                          <svg className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        )}
                        <span className="truncate">{entry.name}</span>
                        {entry.type === 'directory' && (
                          <svg className={`w-3 h-3 ml-auto shrink-0 ${isSelected ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer - only shown in select modes */}
      {mode === 'select-directory' && (
        <div className="px-4 py-3 border-t border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!canSelect}
            onClick={() => selectedPath && onSelect?.(selectedPath)}
          >
            Select Directory
          </Button>
        </div>
      )}
    </div>
  );
}
