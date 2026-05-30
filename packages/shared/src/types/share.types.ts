export interface ShareLink {
  id: string;
  workspace_id: string;
  token: string;
  link_type: 'asset' | 'collection';
  asset_id?: string | null;
  collection_id?: string | null;
  created_by: string;
  password_hash?: string | null;
  permission: 'view' | 'download';
  is_whatsapp: boolean;
  single_use: boolean;
  access_count: number;
  expires_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalEvent {
  id: string;
  share_link_id: string;
  asset_id: string;
  action: 'approved' | 'revision_requested';
  client_note?: string | null;
  client_ip?: string | null;
  client_ua?: string | null;
  created_at: string;
}
