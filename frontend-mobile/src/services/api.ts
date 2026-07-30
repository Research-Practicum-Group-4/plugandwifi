export const BASE_URL = 'https://api.plugandwifi.xyz';

// ---- token refresh plumbing ----
let _refreshPromise: Promise<string> | null = null;
let _onRefreshNeeded: (() => Promise<string>) | null = null;
const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly kind: 'http' | 'timeout' = 'http',
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

export function setRefreshHandler(handler: (() => Promise<string>) | null) {
  _onRefreshNeeded = handler;
}

async function tryRefreshToken(): Promise<string | null> {
  if (!_onRefreshNeeded) return null;
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = _onRefreshNeeded().finally(() => { _refreshPromise = null; });
  try { return await _refreshPromise; } catch { return null; }
}

async function headersWithAuth(token?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(path: string, init: RequestInit, token?: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: await headersWithAuth(token),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out', 'timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  let data: any; try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) {
    const detail = typeof data?.detail === 'string'
      ? data.detail
      : `Request failed (${response.status})`;
    throw new ApiError(response.status, detail);
  }
  return data as T;
}

async function requestWithRefresh<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  const response = await request(path, init, token);
  if (response.status === 401 && token) {
    const newToken = await tryRefreshToken();
    if (newToken) return parseResponse<T>(await request(path, init, newToken));
  }
  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  return requestWithRefresh<T>(path, { method: 'POST', body: JSON.stringify(body) }, token);
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  return requestWithRefresh<T>(path, { method: 'GET' }, token);
}

export async function apiDelete<T>(path: string, token?: string): Promise<T> {
  return requestWithRefresh<T>(path, { method: 'DELETE' }, token);
}

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  return requestWithRefresh<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token);
}
