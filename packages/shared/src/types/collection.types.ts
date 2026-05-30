export interface Collection {
  id: string;
  workspace_id: string;
  parent_id?: string | null;
  name: string;
  path: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
