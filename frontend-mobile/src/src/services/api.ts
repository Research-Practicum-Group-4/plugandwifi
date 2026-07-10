export const BASE_URL = 'https://api.plugandwifi.xyz';

async function headersWithAuth(token?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const h = await headersWithAuth(token);
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST', headers: h, body: JSON.stringify(body),
  });
  let data: any;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data?.detail || `Request failed (${response.status})`);
  return data as T;
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const h = await headersWithAuth(token);
  const response = await fetch(`${BASE_URL}${path}`, { method: 'GET', headers: h });
  let data: any; try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data?.detail || `Request failed (${response.status})`);
  return data as T;
}

export async function apiDelete<T>(path: string, token?: string): Promise<T> {
  const h = await headersWithAuth(token);
  const response = await fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers: h });
  let data: any; try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data?.detail || `Request failed (${response.status})`);
  return data as T;
}
