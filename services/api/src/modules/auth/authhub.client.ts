import { config } from '../../config';

export interface AuthHubTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

export function buildAuthorizeUrl(input: { clientId: string; redirectUri: string; scope: string; state: string }): string {
  const url = new URL('/api/v1/oauth/authorize', config.authhubBaseUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('scope', input.scope);
  url.searchParams.set('state', input.state);
  return url.toString();
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}): Promise<AuthHubTokenResponse> {
  const params: Record<string, string> = {
    grant_type: 'authorization_code',
    code: input.code,
    client_id: input.clientId,
    redirect_uri: input.redirectUri
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

export async function provisionWorkspaceTenant(name: string, slug: string): Promise<{ tenantId: string; clientId: string; clientSecret: string }> {
  // Step 1: Create the tenant
  const tenantRes = await fetch(new URL('/api/v1/admin/tenants', config.authhubBaseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.authhubAdminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, slug })
  });

  if (!tenantRes.ok) {
    const errText = await tenantRes.text().catch(() => '');
    throw new Error(`AuthHub tenant creation failed with status ${tenantRes.status}: ${errText}`);
  }

  const tenantData = (await tenantRes.json()) as { tenant_id: string };
  const tenantId = tenantData.tenant_id;

  // Step 2: Create the OAuth client for this tenant
  const clientRes = await fetch(new URL('/api/v1/admin/clients', config.authhubBaseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.authhubAdminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tenant_id: tenantId,
      name: `${name} — VaultKit`,
      redirect_uris: [`${config.webAppUrl}/auth/callback`],
      grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
      scopes: ['openid', 'profile', 'email', 'files:read', 'files:upload', 'files:delete', 'workspace:manage']
    })
  });

  if (!clientRes.ok) {
    const errText = await clientRes.text().catch(() => '');
    throw new Error(`AuthHub client registration failed with status ${clientRes.status}: ${errText}`);
  }

  const clientData = (await clientRes.json()) as { client_id: string; client_secret: string };

  return {
    tenantId,
    clientId: clientData.client_id,
    clientSecret: clientData.client_secret
  };
}

export async function registerTenantUser(tenantId: string, email: string, password: string): Promise<any> {
  const response = await fetch(new URL(`/api/v1/admin/tenants/${tenantId}/users`, config.authhubBaseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.authhubAdminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`AuthHub tenant user registration failed with status ${response.status}: ${errText}`);
  }

  return await response.json();
}