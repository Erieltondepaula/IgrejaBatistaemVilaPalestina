// Local do arquivo: src/contexts/useAppContext.ts

import { useContext } from 'react';
import { AppContext, AppContextType } from './AppContext';

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext deve ser usado dentro de um AppProvider');
  }
  return context;
};