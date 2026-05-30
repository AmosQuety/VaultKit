export type UserRole = 'admin' | 'editor' | 'viewer';

export type AuthScope =
  | 'openid'
  | 'profile'
  | 'email'
  | 'files:read'
  | 'files:upload'
  | 'files:delete'
  | 'workspace:manage'
  | 'billing:manage';

export interface TokenPayload {
  sub: string;
  email: string;
  tenant_id: string;
  client_id: string;
  scope: string; // space-separated string of scopes
  iat: number;
  exp: number;
}

export interface AuthContext {
  userId: string;
  email: string;
  scopes: AuthScope[];
  workspace: {
    id: string;
    name: string;
    slug: string;
    authhub_tenant_id: string;
    authhub_client_id: string;
    storage_used_bytes: number;
    storage_quota_bytes: number;
    plan: string;
    logo_url?: string | null;
  };
  member: {
    id: string;
    role: UserRole;
    display_name?: string | null;
    avatar_url?: string | null;
  };
}

export interface AuthHubClientConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface ProvisionTenantResponse {
  tenant_id: string;
  client_id: string;
  client_secret: string;
}
