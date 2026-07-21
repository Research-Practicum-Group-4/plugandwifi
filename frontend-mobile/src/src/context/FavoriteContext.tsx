import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { favoritesStorage } from '../storage/favoritesStorage';

type Ctx = {
  ids: Set<string>;
  toggle: (id: string) => void;
  isFav: (id: string) => boolean;
};

const C = createContext<Ctx>({ ids: new Set(), toggle: () => {}, isFav: () => false });

export function FavoriteProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    favoritesStorage.getIds().then(arr => setIds(new Set(arr)));
  }, []);

  const toggle = useCallback((id: string) => {
    setIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      favoritesStorage.setIds(Array.from(next));
      return next;
    });
  }, []);

  const isFav = useCallback((id: string) => ids.has(id), [ids]);

  return <C.Provider value={{ ids, toggle, isFav }}>{children}</C.Provider>;
}

export function useFavorites() { return useContext(C); }
