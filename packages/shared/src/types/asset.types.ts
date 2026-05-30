export interface Asset {
  id: string;
  workspace_id: string;
  collection_id?: string | null;
  name: string;
  description?: string | null;
  file_type?: string | null;
  extension?: string | null;
  size_bytes: number;
  content_hash: string;
  storage_key: string;
  version_number: number;
  status: 'processing' | 'ready' | 'processing_failed' | string;
  approval_status: 'pending' | 'approved' | 'revision_requested' | string;
  blur_hash?: string | null;
  uploaded_by: string;
  last_accessed_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
