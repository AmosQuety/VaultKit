import crypto from 'crypto';
import { config } from '../../config';

export interface AuthHubTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

export function createPkcePair(): PkcePair {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  return { codeVerifier, codeChallenge };
}

export function buildAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod?: 'S256';
}): string {
  const url = new URL('/api/v1/oauth/authorize', config.authhubBaseUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('scope', input.scope);
  url.searchParams.set('state', input.state);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', input.codeChallengeMethod ?? 'S256');
  return url.toString();
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<AuthHubTokenResponse> {
  const params: Record<string, string> = {
    grant_type: 'authorization_code',
    code: input.code,
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier
  };

  if (input.clientSecret) {
    params.client_secret = input.clientSecret;
  }

  const body = new URLSearchParams(params);

  const response = await fetch(new URL('/api/v1/oauth/token', config.authhubBaseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`AuthHub token exchange failed with status ${response.status}: ${errorText}`);
  }

  return (await response.json()) as AuthHubTokenResponse;
}

export async function refreshAccessToken(input: {
  refreshToken: string;
  clientId: string;
  clientSecret?: string;
}): Promise<AuthHubTokenResponse> {
  const params: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: input.refreshToken,
    client_id: input.clientId
  };

  if (input.clientSecret) {
    params.client_secret = input.clientSecret;
  }

  const body = new URLSearchParams(params);

  const response = await fetch(new URL('/api/v1/oauth/token', config.authhubBaseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`AuthHub refresh failed with status ${response.status}: ${errorText}`);
  }

  return (await response.json()) as AuthHubTokenResponse;
}

export async function provisionWorkspaceTenant(name: string, slug: string): Promise<{ tenantId: string; clientId: string; clientSecret: string | null }> {
  const developerToken = config.authhubDeveloperAccessToken || config.authhubAdminToken;
  if (!developerToken) {
    throw new Error('AUTHHUB_DEVELOPER_ACCESS_TOKEN (or AUTHHUB_ADMIN_TOKEN) must be set');
  }

  const response = await fetch(new URL('/api/v1/developer/clients', config.authhubBaseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${developerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `${name} — VaultKit`,
      redirectUris: [`${config.webAppUrl}/auth/callback`],
      isConfidential: false
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`AuthHub client provisioning failed with status ${response.status}: ${errText}`);
  }

  const body = (await response.json()) as {
    client?: { clientId?: string; clientSecret?: string | null };
    tenant?: { id?: string; clientId?: string };
  };

  const clientId = body.client?.clientId;
  const tenantId = body.tenant?.id ?? body.tenant?.clientId;

  if (!clientId || !tenantId) {
    throw new Error('AuthHub developer client response did not include tenant/client identifiers');
  }

  return {
    tenantId,
    clientId,
    clientSecret: body.client?.clientSecret ?? null
  };
}

export async function registerWorkspaceUser(input: {
  clientId: string;
  email: string;
  password: string;
  name?: string;
}): Promise<any> {
  const response = await fetch(new URL('/api/v1/auth/register', config.authhubBaseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      client_id: input.clientId,
      ...(input.name ? { name: input.name } : {})
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`AuthHub user registration failed with status ${response.status}: ${errText}`);
  }

  return await response.json();
}