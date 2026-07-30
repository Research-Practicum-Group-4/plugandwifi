import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { favoritesStorage } from '../storage/favoritesStorage';
import { apiDelete, apiGet, apiPost } from '../services/api';

type Ctx = {
  ids: Set<string>;
  toggle: (id: string, token?: string) => void;
  isFav: (id: string) => boolean;
  syncFromServer: (token: string) => Promise<void>;
};

const C = createContext<Ctx>({ ids: new Set(), toggle: () => {}, isFav: () => false, syncFromServer: async () => {} });

export function FavoriteProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    favoritesStorage.getIds().then(arr => setIds(new Set(arr)));
  }, []);

  const syncFromServer = useCallback(async (token: string) => {
    try {
      const data = await apiGet<{ favorites: Array<{ venue_id: string }> }>('/api/favorites/me', token);
      const serverIds = new Set(data.favorites?.map(f => f.venue_id) || []);
      setIds(serverIds);
      favoritesStorage.setIds(Array.from(serverIds));
    } catch {}
  }, []);

  const toggle = useCallback((id: string, token?: string) => {
    const wasFavorite = ids.has(id);
    const optimisticIds = new Set(ids);
    if (wasFavorite) optimisticIds.delete(id); else optimisticIds.add(id);
    setIds(optimisticIds);
    void favoritesStorage.setIds(Array.from(optimisticIds));
    if (!token) return;

    const request = wasFavorite
      ? apiDelete(`/api/favorites/${id}`, token)
      : apiPost(`/api/favorites/${id}`, {}, token);
    request.catch(() => {
      setIds(current => {
        // Do not undo a newer tap while this request was in flight.
        if (current.has(id) !== !wasFavorite) return current;
        const restored = new Set(current);
        if (wasFavorite) restored.add(id); else restored.delete(id);
        void favoritesStorage.setIds(Array.from(restored));
        return restored;
      });
    });
  }, [ids]);

  const isFav = useCallback((id: string) => ids.has(id), [ids]);

  return <C.Provider value={{ ids, toggle, isFav, syncFromServer }}>{children}</C.Provider>;
}

export function useFavorites() { return useContext(C); }
