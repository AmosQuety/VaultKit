const assert = require('node:assert/strict');
const test = require('node:test');
const Fastify = require('fastify');

const { authRoutes } = require('../src/modules/auth/router');
const { createWorkspace } = require('../src/modules/workspaces/workspace.service');
const { config } = require('../src/config');
const db = require('../src/db/client').default;
const { workspaces, workspace_members } = require('../src/db/schema');
const redis = require('../src/lib/redis').default;
const authhubClient = require('../src/modules/auth/authhub.client');

const originalDbTransaction = db.transaction;
const originalDbSelect = db.select;
const originalRedisSet = redis.set;
const originalRedisGet = redis.get;
const originalRedisDel = redis.del;
const originalRegisterWorkspaceUser = authhubClient.registerWorkspaceUser;
const originalExchangeAuthorizationCode = authhubClient.exchangeAuthorizationCode;

test.afterEach(() => {
  db.transaction = originalDbTransaction;
  db.select = originalDbSelect;
  redis.set = originalRedisSet;
  redis.get = originalRedisGet;
  redis.del = originalRedisDel;
  authhubClient.registerWorkspaceUser = originalRegisterWorkspaceUser;
  authhubClient.exchangeAuthorizationCode = originalExchangeAuthorizationCode;
});

test('createWorkspace stores supplied AuthHub credentials and omits the secret from the response', async () => {
  const input = {
    name: 'E2E Test',
    slug: 'e2e-test',
    email: 'e2e+1@example.com',
    password: 'P@ssw0rd1',
    authhub_tenant_id: 'fad9d6f0-d268-4241-b79e-0c2e44271b42',
    authhub_client_id: 'g_5QVxggyF',
    authhub_client_secret: 'a3a878f0-a666-4b98-b965-09ed6a38b4ca'
  };

  let capturedWorkspaceInsertRow = null;
  let capturedMemberInsertRow = null;
  let capturedRegisterInput = null;

  db.transaction = async (callback) => {
    const tx = {
      insert: (table) => ({
        values: (row) => ({
          returning: async () => {
            const now = new Date().toISOString();

            if (table === workspaces) {
              capturedWorkspaceInsertRow = row;
              return [{
                id: 'workspace-1',
                name: row.name,
                slug: row.slug,
                authhub_tenant_id: row.authhub_tenant_id,
                authhub_client_id: row.authhub_client_id,
                authhub_client_secret: row.authhub_client_secret,
                storage_used_bytes: 0,
                storage_quota_bytes: 2147483648,
                plan: 'free',
                logo_url: null,
                created_at: now,
                updated_at: now,
                deleted_at: null
              }];
            }

            if (table === workspace_members) {
              capturedMemberInsertRow = row;
              return [{
                workspace_id: row.workspace_id,
                authhub_user_id: row.authhub_user_id,
                email: row.email,
                display_name: row.display_name,
                role: row.role,
                joined_at: row.joined_at
              }];
            }

            throw new Error('Unexpected table passed to insert');
          }
        })
      })
    };

    return callback(tx);
  };

  authhubClient.registerWorkspaceUser = async (workspaceUserInput) => {
    capturedRegisterInput = workspaceUserInput;
    return { id: 'authhub-user-1' };
  };

  const result = await createWorkspace(input);

  assert.deepEqual(capturedWorkspaceInsertRow, {
    name: input.name,
    slug: input.slug,
    authhub_tenant_id: input.authhub_tenant_id,
    authhub_client_id: input.authhub_client_id,
    authhub_client_secret: input.authhub_client_secret,
    storage_used_bytes: 0,
    storage_quota_bytes: 2147483648,
    plan: 'free'
  });
  assert.deepEqual(capturedMemberInsertRow, {
    workspace_id: 'workspace-1',
    authhub_user_id: 'authhub-user-1',
    email: input.email,
    display_name: 'e2e+1',
    role: 'admin',
    joined_at: capturedMemberInsertRow.joined_at
  });
  assert.deepEqual(capturedRegisterInput, {
    clientId: input.authhub_client_id,
    email: input.email,
    password: input.password,
    name: input.name
  });
  assert.equal(result.workspace.authhub_client_id, input.authhub_client_id);
  assert.equal(result.workspace.authhub_client_secret, undefined);
  assert.equal(result.member.authhub_user_id, 'authhub-user-1');
});

test('GET /auth/login redirects with a PKCE challenge', async () => {
  db.select = () => ({
    from: () => ({
      where: () => ({
        limit: async () => [{
          id: 'workspace-1',
          name: 'E2E Test',
          slug: 'e2e-test',
          authhub_tenant_id: 'fad9d6f0-d268-4241-b79e-0c2e44271b42',
          authhub_client_id: 'g_5QVxggyF',
          storage_used_bytes: 0,
          storage_quota_bytes: 2147483648,
          plan: 'free',
          logo_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        }]
      })
    })
  });

  redis.set = async () => 'OK';

  const app = Fastify({ logger: false });
  await authRoutes(app);

  const response = await app.inject({
    method: 'GET',
    url: '/auth/login?workspace=e2e-test'
  });

  assert.equal(response.statusCode, 302);
  const location = response.headers.location;
  assert.equal(typeof location, 'string');
  assert.match(location, /code_challenge=/);
  assert.match(location, /code_challenge_method=S256/);
  assert.match(location, /client_id=g_5QVxggyF/);

  await app.close();
});

test('GET /auth/callback exchanges the code, sets cookies, and clears PKCE state', async () => {
  const state = 'state-123';
  const codeVerifier = 'verifier-123';
  const stateKey = `csrf:${state}`;
  let capturedExchangeInput = null;
  let capturedDeletedKey = null;

  db.select = () => ({
    from: () => ({
      where: () => ({
        limit: async () => [{
          id: 'workspace-1',
          name: 'E2E Test',
          slug: 'e2e-test',
          authhub_tenant_id: 'fad9d6f0-d268-4241-b79e-0c2e44271b42',
          authhub_client_id: 'g_5QVxggyF',
          storage_used_bytes: 0,
          storage_quota_bytes: 2147483648,
          plan: 'free',
          logo_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        }]
      })
    })
  });

  redis.get = async (key) => {
    assert.equal(key, stateKey);
    return JSON.stringify({ workspaceId: 'workspace-1', codeVerifier });
  };

  redis.del = async (key) => {
    capturedDeletedKey = key;
    return 1;
  };

  authhubClient.exchangeAuthorizationCode = async (input) => {
    capturedExchangeInput = input;
    return {
      access_token: 'access-token-1',
      refresh_token: 'refresh-token-1',
      id_token: 'id-token-1',
      token_type: 'Bearer',
      expires_in: 3600
    };
  };

  const app = Fastify({ logger: false });
  await authRoutes(app);

  const response = await app.inject({
    method: 'GET',
    url: '/auth/callback?code=auth-code-1&state=' + state
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(capturedExchangeInput, {
    code: 'auth-code-1',
    clientId: 'g_5QVxggyF',
    redirectUri: `${config.webAppUrl}/auth/callback`,
    codeVerifier
  });
  assert.equal(capturedDeletedKey, stateKey);

  const cookies = response.headers['set-cookie'];
  assert.ok(Array.isArray(cookies));
  assert.match(cookies.join('; '), /vaultkit_access=access-token-1/);
  assert.match(cookies.join('; '), /vaultkit_refresh=refresh-token-1/);
  assert.match(cookies.join('; '), /HttpOnly/);

  const payload = response.json();
  assert.equal(payload.success, true);
  assert.equal(payload.data.clientId, 'g_5QVxggyF');
  assert.equal(payload.data.idToken, 'id-token-1');

  await app.close();
});