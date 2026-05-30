import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authMiddleware, requireRole, requireScope } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { createWorkspace, getWorkspace } from './workspace.service';
import { inviteMember, changeMemberRole, removeMember } from './members.service';

const createWorkspaceSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  password: z.string().min(6)
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer'])
});

const updateMemberSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer'])
});

export async function workspaceRoutes(app: FastifyInstance) {
  // POST /workspaces (Public registration)
  app.post('/workspaces', {
    preHandler: [validateBody(createWorkspaceSchema)]
  }, async (request: FastifyRequest<{ Body: z.infer<typeof createWorkspaceSchema> }>, reply: FastifyReply) => {
    const { name, slug, email, password } = request.body;

    try {
      const result = await createWorkspace({ name, slug, email, password });
      reply.status(201).send({
        success: true,
        data: result
      });
    } catch (err: any) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: err.message || 'Workspace creation failed',
          status: 400
        }
      });
    }
  });

  // GET /workspaces/:id
  app.get('/workspaces/:id', {
    preHandler: [authMiddleware, requireScope('files:read')]
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    // Verify requesting user is scoped to this workspace
    if (request.auth?.workspace.id !== id) {
      reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSION',
          message: 'Access denied: not scoped to requested workspace',
          status: 403
        }
      });
      return;
    }

    try {
      const workspace = await getWorkspace(id);
      if (!workspace) {
        reply.status(404).send({
          success: false,
          error: { code: 'RESOURCE_NOT_FOUND', message: 'Workspace not found', status: 404 }
        });
        return;
      }

      reply.status(200).send({
        success: true,
        data: workspace
      });
    } catch (err: any) {
      reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to fetch workspace details', status: 500 }
      });
    }
  });

  // POST /workspaces/:id/members/invite
  app.post('/workspaces/:id/members/invite', {
    preHandler: [authMiddleware, requireScope('workspace:manage'), requireRole('admin'), validateBody(inviteMemberSchema)]
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof inviteMemberSchema> }>, reply: FastifyReply) => {
    const { id: workspaceId } = request.params;
    const { email, role } = request.body;
    const adminId = request.auth!.member.id;

    if (request.auth?.workspace.id !== workspaceId) {
      reply.status(403).send({
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSION', message: 'Not authorized for this workspace', status: 403 }
      });
      return;
    }

    try {
      const member = await inviteMember({
        workspaceId,
        email,
        role,
        invitedBy: adminId
      });

      reply.status(200).send({
        success: true,
        data: member
      });
    } catch (err: any) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'INVITE_FAILED',
          message: err.message || 'Failed to invite member',
          status: 400
        }
      });
    }
  });

  // PATCH /workspaces/:id/members/:memberId
  app.patch('/workspaces/:id/members/:memberId', {
    preHandler: [authMiddleware, requireScope('workspace:manage'), requireRole('admin'), validateBody(updateMemberSchema)]
  }, async (request: FastifyRequest<{ Params: { id: string; memberId: string }; Body: z.infer<typeof updateMemberSchema> }>, reply: FastifyReply) => {
    const { id: workspaceId, memberId } = request.params;
    const { role } = request.body;

    if (request.auth?.workspace.id !== workspaceId) {
      reply.status(403).send({
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSION', message: 'Not authorized for this workspace', status: 403 }
      });
      return;
    }

    try {
      const member = await changeMemberRole({
        workspaceId,
        memberId,
        newRole: role
      });

      reply.status(200).send({
        success: true,
        data: member
      });
    } catch (err: any) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: err.message || 'Failed to update member role',
          status: 400
        }
      });
    }
  });

  // DELETE /workspaces/:id/members/:memberId
  app.delete('/workspaces/:id/members/:memberId', {
    preHandler: [authMiddleware, requireScope('workspace:manage'), requireRole('admin')]
  }, async (request: FastifyRequest<{ Params: { id: string; memberId: string } }>, reply: FastifyReply) => {
    const { id: workspaceId, memberId } = request.params;

    if (request.auth?.workspace.id !== workspaceId) {
      reply.status(403).send({
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSION', message: 'Not authorized for this workspace', status: 403 }
      });
      return;
    }

    try {
      const member = await removeMember({
        workspaceId,
        memberId
      });

      reply.status(200).send({
        success: true,
        data: member
      });
    } catch (err: any) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: err.message || 'Failed to remove member',
          status: 400
        }
      });
    }
  });
}