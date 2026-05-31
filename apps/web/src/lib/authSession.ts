const AUTH_SESSION_KEY = 'vaultkit:auth:session';

// We intentionally store only non-sensitive session metadata client-side when using HTTP-only cookies.
// Tokens themselves live in HttpOnly cookies and are not accessible to JS in production.

export interface StoredAuthSession {
  clientId: string;
  issuedAt: number;
}

function getApiBaseUrl(): string {
  const env = import.meta as ImportMeta & { env: { VITE_API_BASE_URL?: string } };
  return env.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';
}

function readSessionValue(): StoredAuthSession | null {
  const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;
    if (typeof parsed.clientId !== 'string') return null;

    return {
      clientId: parsed.clientId,
      issuedAt: typeof parsed.issuedAt === 'number' ? parsed.issuedAt : Date.now()
    };
  } catch {
    return null;
  }
}

export function getAuthSession(): StoredAuthSession | null {
  return readSessionValue();
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}

export function saveAuthSession(clientId: string): StoredAuthSession {
  const issuedAt = Date.now();
  const session: StoredAuthSession = {
    clientId,
    issuedAt
  };
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function refreshAuthSession(): Promise<StoredAuthSession | null> {
  const session = readSessionValue();
  if (!session?.clientId) return session;

  // Ask server to refresh tokens. Server reads HttpOnly refresh cookie.
  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: session.clientId })
  });

  const payload = (await response.json()) as { success?: boolean; data?: { clientId?: string }; error?: { message?: string } };
  if (!response.ok || !payload.success) {
    clearAuthSession();
    throw new Error(payload.error?.message ?? 'Unable to refresh the VaultKit session.');
  }

  // Update stored clientId if provided
  const newClientId = payload.data?.clientId ?? session.clientId;
  return saveAuthSession(newClientId);
}
