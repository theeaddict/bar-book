'use client';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AppState {
  initialized: boolean;
  error: string | null;
}

const AppContext = createContext<AppState>({ initialized: false, error: null });

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({ initialized: false, error: null });

  useEffect(() => {
    setState({ initialized: true, error: null });
  }, []);

  if (!state.initialized) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-primary text-lg font-medium">Loading Bar Book...</p>
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}

export function useAppState() {
  return useContext(AppContext);
}
