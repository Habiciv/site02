import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(__dirname, 'public');
const databaseFile = path.join(__dirname, 'data', 'users.json');

function loadEnv() {
  const envFile = path.join(__dirname, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)=(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}
loadEnv();

const ownerEmail = String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
const initialOwnerPassword = String(process.env.INITIAL_OWNER_PASSWORD || '');
const syncApiKey = String(process.env.SYNC_API_KEY || '');
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = String(process.env.SESSION_SECRET || (isProduction ? '' : 'dev-change-this-secret'));

if (isProduction) {
  if (!ownerEmail || !initialOwnerPassword || sessionSecret.length < 32) {
    console.error('Defina OWNER_EMAIL, INITIAL_OWNER_PASSWORD e SESSION_SECRET (mínimo 32 caracteres).');
    process.exit(1);
  }
  if (!syncApiKey) {
    console.warn('SYNC_API_KEY não definida; sincronização do Discord ficará desativada.');
  }
}

const roleLabels = {
  owner: 'Proprietário',
  leader: 'Líder',
  trainer: 'Treinador',
  student: 'Aluno',
  member: 'Membro'
};
const roles = Object.keys(roleLabels);

const defaultPromotion = () => ({
  title: 'Promoção RNG',
  description: 'Compartilhe esta oportunidade com a comunidade.',
  code: '',
  active: false,
  updatedAt: null,
  updatedBy: null
});

function database() {
  if (!fs.existsSync(databaseFile)) {
    fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
    fs.writeFileSync(
      databaseFile,
      JSON.stringify({ users: [], settings: { promotion: defaultPromotion() } }, null, 2)
    );
  }
  const data = JSON.parse(fs.readFileSync(databaseFile, 'utf8'));
  if (!Array.isArray(data.users)) data.users = [];
  if (!data.settings || typeof data.settings !== 'object') data.settings = {};
  if (!data.settings.promotion || typeof data.settings.promotion !== 'object') {
    data.settings.promotion = defaultPromotion();
  }
  return data;
}

function save(data) {
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
  fs.writeFileSync(databaseFile, JSON.stringify(data, null, 2));
}

function publicUser(user) {
  const { passwordHash, passwordSalt, ...safe } = user;
  return safe;
}

function hash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password, user) {
  const candidate = Buffer.from(hash(password, user.passwordSalt), 'hex');
  const actual = Buffer.from(user.passwordHash, 'hex');
  return candidate.length === actual.length && crypto.timingSafeEqual(candidate, actual);
}

function ensureOwner() {
  if (!ownerEmail) return;
  const data = database();

  for (const user of data.users) {
    if (!roles.includes(user.role)) user.role = 'member';
    if (user.email === ownerEmail) user.role = 'owner';
  }

  let owner = data.users.find(user => user.email === ownerEmail);
  if (!owner) {
    if (!initialOwnerPassword) return;
    const passwordSalt = crypto.randomBytes(16).toString('hex');
    owner = {
      id: crypto.randomUUID(),
      name: 'Proprietário RNG',
      email: ownerEmail,
      passwordSalt,
      passwordHash: hash(initialOwnerPassword, passwordSalt),
      role: 'owner',
      approved: true,
      createdAt: new Date().toISOString(),
      discordId: null,
      discordUsername: null,
      joinedAt: null,
      lastSyncAt: null
    };
    data.users.push(owner);
  }
  owner.role = 'owner';
  owner.approved = true;
  save(data);
}

function enforceRolePolicy() {
  const data = database();
  for (const user of data.users) {
    if (!roles.includes(user.role)) user.role = 'member';
    if (ownerEmail && user.email === ownerEmail) user.role = 'owner';
    else if (user.role === 'owner') user.role = 'member';
  }
  save(data);
}

const sessions = new Map();

function sessionFor(user) {
  const token = crypto.createHmac('sha256', sessionSecret)
    .update(`${user.id}:${crypto.randomUUID()}`)
    .digest('hex');
  sessions.set(token, { userId: user.id, createdAt: Date.now() });
  return token;
}

function getToken(request) {
  return request.headers.authorization?.replace(/^Bearer\s+/i, '');
}

function currentUser(request) {
  const token = getToken(request);
  const session = token ? sessions.get(token) : null;
  if (!session) return null;
  const user = database().users.find(item => item.id === session.userId);
  return user || null;
}

function body(request) {
  return new Promise((resolve, reject) => {
    let text = '';
    request.on('data', chunk => {
      text += chunk;
      if (text.length > 100000) request.destroy();
    });
    request.on('end', () => {
      try { resolve(text ? JSON.parse(text) : {}); }
      catch { reject(new Error('Dados inválidos.')); }
    });
    request.on('error', reject);
  });
}

function send(response, status, value, headers = {}) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  });
  response.end(value === undefined ? '' : JSON.stringify(value));
}

function sendText(response, status, text, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(status, { 'content-type': contentType });
  response.end(text);
}

function canManage(actor) {
  return ['owner', 'leader', 'trainer'].includes(actor?.role);
}

function editableRoles(actor, target) {
  if (!canManage(actor) || !target || target.role === 'owner' || actor.id === target.id) return [];
  return ['member', 'student', 'trainer', 'leader'];
}

function managementUser(request, response) {
  const user = currentUser(request);
  if (!canManage(user)) {
    send(response, 403, { error: 'Apenas Proprietário, Líderes e Treinadores podem acessar este gerenciamento.' });
    return null;
  }
  return user;
}

function syncAuthorized(request) {
  return Boolean(syncApiKey) && request.headers['x-rng-sync-key'] === syncApiKey;
}

function staticFile(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(publicDirectory, relative);
  if (!file.startsWith(publicDirectory) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return sendText(response, 404, 'Página não encontrada.');
  }

  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml'
  };
  response.writeHead(200, {
    'content-type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': pathname === '/' ? 'no-cache' : 'public, max-age=3600'
  });
  fs.createReadStream(file).pipe(response);
}

function findUserByDiscord(data, discordId) {
  return data.users.find(user => user.discordId === discordId);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://local');
    const pathname = url.pathname;

    if (request.method === 'GET' && pathname === '/api/health') {
      return send(response, 200, { ok: true, name: 'RNG Centro de Comando' });
    }

    if (request.method === 'POST' && pathname === '/api/auth/register') {
      const { name = '', email = '', password = '' } = await body(request);
      const cleanName = String(name).trim();
      const cleanEmail = String(email).trim().toLowerCase();
      const cleanPassword = String(password);

      if (cleanName.length < 2 || cleanName.length > 80 ||
          !/^\S+@\S+\.\S+$/.test(cleanEmail) ||
          cleanPassword.length < 8) {
        return send(response, 400, { error: 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.' });
      }

      const data = database();
      if (data.users.some(user => user.email === cleanEmail)) {
        return send(response, 409, { error: 'Este e-mail já possui cadastro.' });
      }

      const passwordSalt = crypto.randomBytes(16).toString('hex');
      const user = {
        id: crypto.randomUUID(),
        name: cleanName,
        email: cleanEmail,
        passwordSalt,
        passwordHash: hash(cleanPassword, passwordSalt),
        role: 'student',
        approved: true,
        createdAt: new Date().toISOString(),
        discordId: null,
        discordUsername: null,
        joinedAt: null,
        lastSyncAt: null
      };

      data.users.push(user);
      save(data);
      return send(response, 201, { token: sessionFor(user), user: publicUser(user) });
    }

    if (request.method === 'POST' && pathname === '/api/auth/login') {
      const { email = '', password = '' } = await body(request);
      const cleanEmail = String(email).trim().toLowerCase();
      const user = database().users.find(item => item.email === cleanEmail);

      if (!user || !verifyPassword(String(password), user)) {
        return send(response, 401, { error: 'E-mail ou senha incorretos.' });
      }

      return send(response, 200, { token: sessionFor(user), user: publicUser(user) });
    }

    if (request.method === 'GET' && pathname === '/api/auth/me') {
      const user = currentUser(request);
      return user
        ? send(response, 200, { user: publicUser(user) })
        : send(response, 401, { error: 'Sessão inválida.' });
    }

    if (request.method === 'POST' && pathname === '/api/auth/logout') {
      const token = getToken(request);
      if (token) sessions.delete(token);
      response.writeHead(204);
      return response.end();
    }

    if (request.method === 'GET' && pathname === '/api/promotion') {
      const viewer = currentUser(request);
      if (!viewer) return send(response, 401, { error: 'Faça login para ver as divulgações.' });
      return send(response, 200, { promotion: database().settings.promotion });
    }

    if (request.method === 'GET' && pathname === '/api/management/users') {
      const actor = managementUser(request, response);
      if (!actor) return;
      const data = database();
      const users = data.users
        .filter(target => editableRoles(actor, target).length)
        .map(target => ({ ...publicUser(target), allowedRoles: editableRoles(actor, target) }));
      return send(response, 200, { users, roleLabels, total: data.users.length });
    }

    const roleMatch = pathname.match(/^\/api\/management\/users\/([^/]+)\/role$/);
    if (request.method === 'PATCH' && roleMatch) {
      const actor = managementUser(request, response);
      if (!actor) return;

      const { role } = await body(request);
      const data = database();
      const target = data.users.find(item => item.id === roleMatch[1]);

      if (!target) return send(response, 404, { error: 'Usuário não encontrado.' });
      if (!editableRoles(actor, target).includes(role)) {
        return send(response, 403, { error: 'Seu cargo não tem permissão para alterar este usuário.' });
      }

      target.role = role;
      save(data);
      return send(response, 200, { user: publicUser(target) });
    }

    if (request.method === 'GET' && pathname === '/api/settings/promotion') {
      const actor = managementUser(request, response);
      if (!actor) return;
      return send(response, 200, { promotion: database().settings.promotion });
    }

    if (request.method === 'PUT' && pathname === '/api/settings/promotion') {
      const actor = managementUser(request, response);
      if (!actor) return;

      const { title = '', description = '', code = '', active = false } = await body(request);
      const promotion = {
        title: String(title).trim().slice(0, 80),
        description: String(description).trim().slice(0, 300),
        code: String(code).trim().slice(0, 80),
        active: Boolean(active),
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      };

      if (!promotion.title) return send(response, 400, { error: 'Informe um título para a promoção.' });

      const data = database();
      data.settings.promotion = promotion;
      save(data);
      return send(response, 200, { promotion });
    }

    // Discord -> site synchronization
    if (request.method === 'POST' && pathname === '/api/sync/member') {
      if (!syncAuthorized(request)) return send(response, 401, { error: 'Chave de sincronização inválida.' });

      const payload = await body(request);
      const discordId = String(payload.discordId || '').trim();
      if (!discordId) return send(response, 400, { error: 'discordId é obrigatório.' });

      const data = database();
      let user = findUserByDiscord(data, discordId);

      if (!user && payload.email) {
        user = data.users.find(item => item.email === String(payload.email).trim().toLowerCase());
      }

      const discordRoles = Array.isArray(payload.roles) ? payload.roles.map(x => String(x).toLowerCase()) : [];
      const discordRoleMap = [
        { role: 'owner', names: ['proprietário', 'proprietario', 'owner'] },
        { role: 'leader', names: ['líder', 'lider', 'leader'] },
        { role: 'trainer', names: ['treinador', 'trainer'] },
        { role: 'student', names: ['aluno', 'student'] },
        { role: 'member', names: ['membro', 'member'] }
      ];
      const detectedRole = discordRoleMap.find(item => discordRoles.some(name => item.names.includes(name)))?.role || 'member';

      if (!user) {
        user = {
          id: crypto.randomUUID(),
          name: String(payload.username || 'Membro Discord').slice(0, 80),
          email: `discord-${discordId}@local.invalid`,
          passwordSalt: crypto.randomBytes(16).toString('hex'),
          passwordHash: '',
          role: detectedRole,
          approved: true,
          createdAt: new Date().toISOString(),
          discordId,
          discordUsername: String(payload.username || '').slice(0, 100),
          joinedAt: payload.joinedAt || null,
          lastSyncAt: new Date().toISOString()
        };
        user.passwordHash = hash(crypto.randomUUID(), user.passwordSalt);
        data.users.push(user);
      } else {
        user.discordId = discordId;
        user.discordUsername = String(payload.username || user.discordUsername || '').slice(0, 100);
        user.joinedAt = payload.joinedAt || user.joinedAt || null;
        user.lastSyncAt = new Date().toISOString();
        if (user.email !== ownerEmail && detectedRole !== 'member') user.role = detectedRole;
      }

      save(data);
      return send(response, 200, { ok: true, user: publicUser(user) });
    }

    if (request.method === 'POST' && pathname === '/api/sync/penalty') {
      if (!syncAuthorized(request)) return send(response, 401, { error: 'Chave de sincronização inválida.' });

      const payload = await body(request);
      const data = database();
      const user = findUserByDiscord(data, String(payload.discordId || ''));
      if (user) {
        user.penalty = { type: 'ban', updatedAt: new Date().toISOString() };
        save(data);
      }
      return send(response, 200, { ok: true });
    }

    if (request.method === 'GET') return staticFile(request, response);
    return send(response, 404, { error: 'Rota não encontrada.' });
  } catch (error) {
    console.error(error);
    return send(response, 500, { error: 'Erro interno do servidor.' });
  }
});

ensureOwner();
enforceRolePolicy();

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`RNG Centro de Comando pronto na porta ${port}`));
