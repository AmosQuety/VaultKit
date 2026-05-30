export interface UploadSession {
  id: string;
  workspace_id: string;
  member_id: string;
  idempotency_key: string;
  filename: string;
  file_type?: string | null;
  total_size_bytes: number;
  chunk_size_bytes: number;
  total_chunks: number;
  uploaded_chunks: number;
  storage_key?: string | null;
  status: 'in_progress' | 'complete' | 'failed' | string;
  collection_id?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}
