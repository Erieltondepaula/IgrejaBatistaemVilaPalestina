// Hook para gerenciar logs do sistema
import { useState, useCallback } from 'react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
  action?: string;
}

const MAX_LOGS = 100; // Mantém apenas os últimos 100 logs

export const useLogger = () => {
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    // Carrega logs do localStorage
    const savedLogs = localStorage.getItem('system-logs');
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs) as LogEntry[];
        return parsed.map((log) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  const addLog = useCallback((
    level: LogEntry['level'],
    message: string,
    details?: string,
    action?: string
  ) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      details,
      action
    };

    setLogs(prevLogs => {
      const updatedLogs = [newLog, ...prevLogs].slice(0, MAX_LOGS);
      // Salva no localStorage
      localStorage.setItem('system-logs', JSON.stringify(updatedLogs));
      return updatedLogs;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem('system-logs');
  }, []);

  const info = useCallback((message: string, details?: string, action?: string) => {
    addLog('info', message, details, action);
  }, [addLog]);

  const success = useCallback((message: string, details?: string, action?: string) => {
    addLog('success', message, details, action);
  }, [addLog]);

  const warning = useCallback((message: string, details?: string, action?: string) => {
    addLog('warning', message, details, action);
  }, [addLog]);

  const error = useCallback((message: string, details?: string, action?: string) => {
    addLog('error', message, details, action);
  }, [addLog]);

  return {
    logs,
    clearLogs,
    info,
    success,
    warning,
    error
  };
};
