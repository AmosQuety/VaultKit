export interface Workspace {
  id: string;
  name: string;
  slug: string;
  authhub_tenant_id: string;
  authhub_client_id: string;
  storage_used_bytes: number;
  storage_quota_bytes: number;
  plan: 'free' | 'pro' | 'agency' | string;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  email: string;
  password: string;
  authhub_tenant_id: string;
  authhub_client_id: string;
  authhub_client_secret: string;
}
