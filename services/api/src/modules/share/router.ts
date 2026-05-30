import db from '../../db/client';
import { share_links } from '../../db/schema';
import crypto from 'crypto';
import { authMiddleware } from '../../middleware/auth.middleware';

export async function shareRoutes(app: any) {
  app.post('/share', async (request: any, reply: any) => {
    const user = await authMiddleware(request, reply);
    if (!user) return;
    const { workspace_id, asset_id, collection_id, permission = 'view', single_use = false, expires_at } = request.body ?? {};
    const token = crypto.randomBytes(16).toString('hex');
    const [row] = await db.insert(share_links).values({
      workspace_id,
      token,
      link_type: asset_id ? 'asset' : 'collection',
      asset_id: asset_id ?? null,
      collection_id: collection_id ?? null,
      created_by: user.sub,
      permission,
      single_use,
      expires_at: expires_at ? new Date(expires_at) : null
    }).returning();

    reply.code(201).send({ success: true, data: { id: row.id, token: row.token, url: `${process.env.PUBLIC_URL ?? 'https://vaultkit.app'}/s/${row.token}` } });
  });

  app.get('/s/:token', async (request: any, reply: any) => {
    const token = request.params.token;
    const rows = await db.select().from(share_links).where(share_links.token.equals(token));
    reply.send({ success: true, data: rows[0] ?? null });
  });

  app.post('/s/:token/action', async (request: any, reply: any) => {
    const token = request.params.token;
    // Record approval/interaction events in downstream table (not implemented yet)
    reply.send({ success: true, data: { message: 'Action recorded' } });
  });

  app.delete('/share/:id', async (request: any, reply: any) => {
    const id = request.params.id;
    await db.update(share_links).set({ revoked_at: new Date() }).where(share_links.id.equals(id)).run();
    reply.send({ success: true, data: { revoked: true } });
  });
}