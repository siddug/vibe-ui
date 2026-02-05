'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type ViewMode = 'sidebar' | 'kanban';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

interface ViewModeProviderProps {
  children: ReactNode;
}

export function ViewModeProvider({ children }: ViewModeProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Derive view mode from the current URL
  const viewMode: ViewMode = pathname.startsWith('/kanban') ? 'kanban' : 'sidebar';

  const setViewMode = (mode: ViewMode) => {
    if (mode === 'kanban') {
      router.push('/kanban');
    } else {
      router.push('/');
    }
  };

  const toggleViewMode = () => {
    if (viewMode === 'kanban') {
      router.push('/');
    } else {
      router.push('/kanban');
    }
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, toggleViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextType {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
