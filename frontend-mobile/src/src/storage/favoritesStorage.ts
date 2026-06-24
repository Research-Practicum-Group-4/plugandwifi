import AsyncStorage from '@react-native-async-storage/async-storage';

const FAV_KEY = '@plugandwifi/favorites';

export const favoritesStorage = {
  async getIds(): Promise<string[]> {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  },
  async setIds(ids: string[]): Promise<void> {
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(ids));
  },
};
