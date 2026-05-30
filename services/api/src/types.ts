export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    cursor?: string | null;
    hasMore?: boolean;
    total?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    status: number;
  };
}

export type Role = 'admin' | 'editor' | 'viewer';

export interface AuthContext {
  sub: string;
  email: string;
  tenantId: string;
  clientId: string;
  scope: string[];
}