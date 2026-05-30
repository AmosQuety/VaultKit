export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  authhub_user_id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role: 'admin' | 'editor' | 'viewer' | string;
  invited_by?: string | null;
  joined_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
