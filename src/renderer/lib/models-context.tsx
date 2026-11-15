import { createContext, useContext, type ReactNode } from 'react';
import { useModels } from './useModels';

type ModelsValue = ReturnType<typeof useModels>;

const ModelsContext = createContext<ModelsValue | null>(null);

/**
 * One models subscription for the whole app: the sidebar's download card and
 * every screen see the same progress, and downloads keep updating while the
 * user navigates.
 */
export function ModelsProvider({ children }: { children: ReactNode }) {
  const value = useModels();

  return (
    <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
  );
}

export function useModelsContext(): ModelsValue {
  const value = useContext(ModelsContext);
  if (!value) {
    throw new Error('useModelsContext must be used inside ModelsProvider');
  }
  return value;
}
