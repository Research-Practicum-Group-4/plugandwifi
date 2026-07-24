import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../../services/api";
import { useAuth } from "./AuthContext";

interface FavoritesContextType {
  favoriteVenueIds: string[];
  loading: boolean;
  isFavorite: (venueId: string) => boolean;
  addFavorite: (venueId: string) => Promise<void>;
  removeFavorite: (venueId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshFavorites = async () => {
    if (!isAuthenticated) {
      setFavoriteVenueIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.getMyFavorites();
      setFavoriteVenueIds(response.venue_ids);
    } catch (error) {
      console.error("Failed to load favorites:", error);
      setFavoriteVenueIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void refreshFavorites();
  }, [authLoading, isAuthenticated]);

  const addFavorite = async (venueId: string) => {
    await api.addFavorite(venueId);
    setFavoriteVenueIds((prev) => (prev.includes(venueId) ? prev : [...prev, venueId]));
  };

  const removeFavorite = async (venueId: string) => {
    await api.removeFavorite(venueId);
    setFavoriteVenueIds((prev) => prev.filter((id) => id !== venueId));
  };

  const value: FavoritesContextType = {
    favoriteVenueIds,
    loading,
    isFavorite: (venueId: string) => favoriteVenueIds.includes(venueId),
    addFavorite,
    removeFavorite,
    refreshFavorites,
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
