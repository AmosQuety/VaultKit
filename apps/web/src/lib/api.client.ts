import { refreshAuthSession, clearAuthSession } from './authSession';

function getApiBaseUrl(): string {
  const env = import.meta as ImportMeta & { env: { VITE_API_BASE_URL?: string } };
  return env.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';
}

export type ApiRequestInit = RequestInit & { retry?: boolean };

async function withAuthRetry(input: RequestInfo, init?: ApiRequestInit): Promise<Response> {
  const url = typeof input === 'string' && input.startsWith('/') ? `${getApiBaseUrl()}${input}` : (input as string);

  // Use cookies for auth; include credentials so HttpOnly cookies are sent
  const headers = new Headers(init?.headers ?? undefined);
  const res = await fetch(url, { ...init, headers, credentials: 'include' });

  if (res.status !== 401) return res;

  // Try refresh once if we haven't already retried
  if (init?.retry) {
    // Already retried -- sign out and error
    clearAuthSession();
    return res;
  }

  try {
    await refreshAuthSession();
  } catch (err) {
    clearAuthSession();
    return res;
  }

  // Retry original request; cookies have been rotated by refresh
  return fetch(url, { ...init, headers: new Headers(init?.headers ?? undefined), credentials: 'include', retry: true } as unknown as RequestInit);
}

export async function apiFetchJson<T = any>(input: RequestInfo, init?: ApiRequestInit): Promise<T> {
  const res = await withAuthRetry(input, init);
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error?.message ?? `Request failed: ${res.status}`);
  }
  return payload.data as T;
}

export async function apiFetch(input: RequestInfo, init?: ApiRequestInit): Promise<Response> {
  return withAuthRetry(input, init);
}

export default { apiFetch, apiFetchJson };
