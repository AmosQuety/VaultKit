import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { saveToken } from './storage';

const expoCfg = Constants.expoConfig as unknown as { extra?: Record<string, string> } | undefined;
const RAW_API_BASE = expoCfg?.extra?.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';
const SERVER_BASE = RAW_API_BASE.replace(/\/api\/v1\/?$/i, '') || RAW_API_BASE;

/**
 * Start the mobile PKCE auth flow by asking the API server for the authorize URL,
 * opening it in the system browser, and waiting for the app deep-link with code/state.
 * Code verifier remains server-side.
 */
export async function startAuthFlow(workspaceSlug = 'default'): Promise<Record<string, any>> {
  const loginUrl = `${SERVER_BASE}/auth/login?workspace=${encodeURIComponent(workspaceSlug)}`;

  const res = await fetch(loginUrl);
  if (!res.ok) throw new Error(`Failed to get authorize URL: ${res.status}`);

  let authUrl: string | null = null;
  try {
    const bodyUnknown = (await res.json()) as unknown;
    if (typeof bodyUnknown === 'string') {
      authUrl = bodyUnknown;
    } else if (bodyUnknown && typeof bodyUnknown === 'object') {
      const b = bodyUnknown as Record<string, unknown>;
      if (typeof b.url === 'string') authUrl = b.url;
      else if (typeof b.authorize_url === 'string') authUrl = b.authorize_url;
    }
  } catch {
    const text = await res.text();
    authUrl = text || null;
  }

  if (!authUrl) throw new Error('No authorize URL returned from server');

  // Wait for incoming deep link event
  const received = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscription.remove();
      reject(new Error('Auth callback timeout'));
    }, 120000);

    const handler = (event: { url: string }) => {
      clearTimeout(timeout);
      subscription.remove();
      resolve(event.url);
    };

    const subscription = Linking.addEventListener('url', handler as (event: { url: string }) => void);

    // Open the browser / external URL
    Linking.openURL(authUrl).catch(err => {
      clearTimeout(timeout);
      subscription.remove();
      reject(err);
    });
  });

  // Parse returned URL for code & state
  const parsed = new URL(received);
  const code = parsed.searchParams.get('code');
  const state = parsed.searchParams.get('state');
  if (!code || !state) throw new Error('Missing code/state from auth result');

  const callbackRes = await fetch(`${SERVER_BASE}/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
  if (!callbackRes.ok) {
    const text = await callbackRes.text();
    throw new Error(`Callback exchange failed: ${callbackRes.status} ${text}`);
  }

  const tokens = await callbackRes.json();
  if (tokens.access_token) await saveToken('access_token', tokens.access_token);
  if (tokens.refresh_token) await saveToken('refresh_token', tokens.refresh_token);

  return tokens;
}