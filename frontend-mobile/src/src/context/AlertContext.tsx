import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALERT_KEY = '@plugandwifi/alerts';

type Ctx = {
  alerts: Record<string, boolean>;
  toggleAlert: (id: string) => void;
  isAlertOn: (id: string) => boolean;
};

const C = createContext<Ctx>({ alerts: {}, toggleAlert: () => {}, isAlertOn: () => false });

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(ALERT_KEY).then(raw => {
      if (raw) setAlerts(JSON.parse(raw));
    });
  }, []);

  const toggleAlert = useCallback((id: string) => {
    setAlerts(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id]; else next[id] = true;
      AsyncStorage.setItem(ALERT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isAlertOn = useCallback((id: string) => !!alerts[id], [alerts]);

  return <C.Provider value={{ alerts, toggleAlert, isAlertOn }}>{children}</C.Provider>;
}

export function useAlerts() { return useContext(C); }
