import { provisionWorkspaceTenant } from '../auth/authhub.client';

export async function provisionWorkspace(name: string, slug: string): Promise<{ tenantId: string; clientId: string; clientSecret: string }> {
  return provisionWorkspaceTenant(name, slug);
}