import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@plugandwifi/token';
const REFRESH_KEY = '@plugandwifi/refresh_token';
const USER_KEY = '@plugandwifi/user';

export const authStorage = {
  async getToken(): Promise<string | null> { return AsyncStorage.getItem(TOKEN_KEY); },
  async setToken(token: string): Promise<void> { await AsyncStorage.setItem(TOKEN_KEY, token); },
  async getRefreshToken(): Promise<string | null> { return AsyncStorage.getItem(REFRESH_KEY); },
  async setRefreshToken(token: string): Promise<void> { await AsyncStorage.setItem(REFRESH_KEY, token); },
  async getUser(): Promise<string | null> { return AsyncStorage.getItem(USER_KEY); },
  async setUser(user: string): Promise<void> { await AsyncStorage.setItem(USER_KEY, user); },
  async clear(): Promise<void> { await AsyncStorage.removeMany([TOKEN_KEY, REFRESH_KEY, USER_KEY]); },
};
