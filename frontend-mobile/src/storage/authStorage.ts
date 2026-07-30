import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const TOKEN_KEY = '@plugandwifi/token';
const REFRESH_KEY = '@plugandwifi/refresh_token';
const USER_KEY = '@plugandwifi/user';
const KEYCHAIN_SERVICE = 'xyz.plugandwifi.session';
const KEYCHAIN_ACCOUNT = 'session';

type SessionSecrets = { token: string | null; refreshToken: string | null };

function removeLegacySession(): Promise<void[]> {
  return Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_KEY),
  ]);
}

async function readSecureSession(): Promise<SessionSecrets | null> {
  try {
    const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    if (!credentials) return null;
    const value = JSON.parse(credentials.password) as Partial<SessionSecrets>;
    const token = typeof value.token === 'string' ? value.token : null;
    const refreshToken = typeof value.refreshToken === 'string' ? value.refreshToken : null;
    if (!token && !refreshToken) return null;
    return { token, refreshToken };
  } catch {
    return null;
  }
}

async function writeSecureSession(session: SessionSecrets): Promise<void> {
  await Keychain.setGenericPassword(KEYCHAIN_ACCOUNT, JSON.stringify(session), {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function readSession(): Promise<SessionSecrets> {
  const secure = await readSecureSession();
  if (secure) return secure;

  // One-time migration for sessions created by older App versions.
  const [token, refreshToken] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(REFRESH_KEY),
  ]);
  const legacy = { token, refreshToken };
  if (token || refreshToken) {
    await writeSecureSession(legacy);
    await removeLegacySession();
  }
  return legacy;
}

export const authStorage = {
  async getToken(): Promise<string | null> { return (await readSession()).token; },
  async setToken(token: string): Promise<void> {
    const session = await readSession();
    await writeSecureSession({ ...session, token });
  },
  async getRefreshToken(): Promise<string | null> { return (await readSession()).refreshToken; },
  async setRefreshToken(refreshToken: string): Promise<void> {
    const session = await readSession();
    await writeSecureSession({ ...session, refreshToken });
  },
  async setSession(token: string, refreshToken: string): Promise<void> {
    await writeSecureSession({ token, refreshToken });
    await removeLegacySession();
  },
  async getUser(): Promise<string | null> { return AsyncStorage.getItem(USER_KEY); },
  async setUser(user: string): Promise<void> { await AsyncStorage.setItem(USER_KEY, user); },
  async clear(): Promise<void> {
    await Promise.all([
      Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE }),
      removeLegacySession(),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  },
};
