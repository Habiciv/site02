import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(__dirname, 'public');
const databaseFile = path.join(__dirname, 'data', 'users.json');

const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)=(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const isProduction = process.env.NODE_ENV === 'production';
const ownerEmail = String(process.env.OWNER_EMAIL || (isProduction ? '' : 'owner@rng.local')).trim().toLowerCase();
const initialOwnerPassword = String(process.env.INITIAL_OWNER_PASSWORD || (isProduction ? '' : 'RNG@12345678'));
const sessionSecret = String(process.env.SESSION_SECRET || (isProduction ? '' : 'troque-esta-chave-local-com-32-caracteres-minimo'));

if (isProduction && (!ownerEmail || !initialOwnerPassword || sessionSecret.length < 32)) {
  console.error('Defina OWNER_EMAIL, INITIAL_OWNER_PASSWORD e SESSION_SECRET (SESSION_SECRET com no mínimo 32 caracteres).');
  process.exit(1);
}

const sessions = new Map();

const roleLabels = {
  owner: 'Proprietário',
  leader: 'Líder',
  trainer: 'Treinador',
  student: 'Aluno',
  member: 'Membro'
};

const roles = Object.keys(roleLabels);

function defaultPromotion() {
  return {
    title: 'Promoção RNG',
    description: 'Compartilhe esta oportunidade com a comunidade.',
    code: '',
    active: false,
    updatedAt: null
  };
}

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

function passwordsMatch(password, user) {
  if (!user?.passwordSalt || !user?.passwordHash) return false;
  const actual = Buffer.from(hash(password, user.passwordSalt), 'hex');
  const expected = Buffer.from(user.passwordHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function ensureOwner() {
  const data = database();

  for (const user of data.users) {
    if (user.email !== ownerEmail && user.role === 'owner') user.role = 'member';
    if (!roles.includes(user.role)) user.role = 'member';
  }

  let officialOwner = data.users.find(user => user.email === ownerEmail);

  if (!officialOwner && ownerEmail && initialOwnerPassword) {
    const passwordSalt = crypto.randomBytes(16).toString('hex');

    officialOwner = {
      id: crypto.randomUUID(),
      name: 'Proprietário RNG',
      email: ownerEmail,
      passwordSalt,
      passwordHash: hash(initialOwnerPassword, passwordSalt),
      role: 'owner',
      approved: true,
      createdAt: new Date().toISOString()
    };

    data.users.push(officialOwner);
  }

  if (officialOwner) {
    officialOwner.role = 'owner';
    officialOwner.approved = true;
  }

  save(data);
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
    send(response, 403, {
      error: 'Apenas Proprietário, Líderes e Treinadores podem acessar este gerenciamento.'
    });
    return null;
  }

  return user;
}

function send(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(value));
}

function getToken(request) {
  const header = request.headers.authorization || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

function currentUser(request) {
  const id = sessions.get(getToken(request));
  if (!id) return null;
  return database().users.find(user => user.id === id) || null;
}

function sessionFor(user) {
  const token = crypto
    .createHmac('sha256', sessionSecret)
    .update(`${user.id}:${crypto.randomUUID()}`)
    .digest('hex');

  sessions.set(token, user.id);
  return token;
}

function body(request) {
  return new Promise((resolve, reject) => {
    let text = '';

    request.on('data', chunk => {
      text += chunk;
      if (text.length > 100000) {
        request.destroy();
        reject(new Error('Corpo da requisição muito grande.'));
      }
    });

    request.on('end', () => {
      try {
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new Error('Dados inválidos.'));
      }
    });

    request.on('error', reject);
  });
}

function contentType(file) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  };

  return types[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function staticFile(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(publicDirectory, relative);
  const relativeToPublic = path.relative(publicDirectory, file);

  if (
    relativeToPublic.startsWith('..') ||
    path.isAbsolute(relativeToPublic) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  ) {
    return send(response, 404, { error: 'Página não encontrada.' });
  }

  response.writeHead(200, {
    'content-type': contentType(file),
    'cache-control': isProduction ? 'public, max-age=300' : 'no-cache'
  });

  fs.createReadStream(file).pipe(response);
}

const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://local').pathname;

    if (request.method === 'GET' && pathname === '/health') {
      return send(response, 200, { ok: true, service: 'rng-centro-comando' });
    }

    if (request.method === 'POST' && pathname === '/api/auth/register') {
      const { name = '', email = '', password = '' } = await body(request);
      const cleanName = String(name).trim();
      const cleanEmail = String(email).trim().toLowerCase();
      const cleanPassword = String(password);

      if (
        cleanName.length < 2 ||
        !/^\S+@\S+\.\S+$/.test(cleanEmail) ||
        cleanPassword.length < 8
      ) {
        return send(response, 400, {
          error: 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.'
        });
      }

      if (cleanEmail === ownerEmail) {
        return send(response, 409, {
          error: 'Este e-mail é reservado para o proprietário.'
        });
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
        createdAt: new Date().toISOString()
      };

      data.users.push(user);
      save(data);

      return send(response, 201, {
        token: sessionFor(user),
        user: publicUser(user)
      });
    }

    if (request.method === 'POST' && pathname === '/api/auth/login') {
      const { email = '', password = '' } = await body(request);
      const cleanEmail = String(email).trim().toLowerCase();
      const user = database().users.find(item => item.email === cleanEmail);

      if (!user || !passwordsMatch(String(password), user)) {
        return send(response, 401, { error: 'E-mail ou senha incorretos.' });
      }

      return send(response, 200, {
        token: sessionFor(user),
        user: publicUser(user)
      });
    }

    if (request.method === 'GET' && pathname === '/api/auth/me') {
      const user = currentUser(request);
      return user
        ? send(response, 200, { user: publicUser(user) })
        : send(response, 401, { error: 'Sessão inválida.' });
    }

    if (request.method === 'POST' && pathname === '/api/auth/logout') {
      sessions.delete(getToken(request));
      response.writeHead(204);
      return response.end();
    }

    if (request.method === 'GET' && pathname === '/api/promotion') {
      const viewer = currentUser(request);

      if (!viewer) {
        return send(response, 401, { error: 'Faça login para ver as divulgações.' });
      }

      return send(response, 200, {
        promotion: database().settings.promotion
      });
    }

    if (request.method === 'GET' && pathname === '/api/management/users') {
      const actor = managementUser(request, response);
      if (!actor) return;

      const users = database()
        .users
        .map(publicUser)
        .filter(target => editableRoles(actor, target).length)
        .map(target => ({
          ...target,
          allowedRoles: editableRoles(actor, target)
        }));

      return send(response, 200, { users, roleLabels });
    }

    const roleMatch = pathname.match(/^\/api\/management\/users\/([^/]+)\/role$/);

    if (request.method === 'PATCH' && roleMatch) {
      const actor = managementUser(request, response);
      if (!actor) return;

      const { role } = await body(request);
      const data = database();
      const target = data.users.find(item => item.id === roleMatch[1]);

      if (!target) {
        return send(response, 404, { error: 'Usuário não encontrado.' });
      }

      if (!editableRoles(actor, target).includes(role)) {
        return send(response, 403, {
          error: 'Seu cargo não tem permissão para alterar este usuário.'
        });
      }

      target.role = role;
      save(data);

      return send(response, 200, { user: publicUser(target) });
    }

    if (request.method === 'GET' && pathname === '/api/settings/promotion') {
      const actor = managementUser(request, response);
      if (!actor) return;

      return send(response, 200, {
        promotion: database().settings.promotion
      });
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

      if (!promotion.title) {
        return send(response, 400, { error: 'Informe um título para a promoção.' });
      }

      const data = database();
      data.settings.promotion = promotion;
      save(data);

      return send(response, 200, { promotion });
    }

    if (request.method === 'GET') {
      return staticFile(request, response);
    }

    return send(response, 404, { error: 'Rota não encontrada.' });
  } catch (error) {
    console.error(error);
    return send(response, 500, { error: 'Erro interno do servidor.' });
  }
});

ensureOwner();

const port = Number(process.env.PORT || 3000);

server.listen(port, '0.0.0.0', () => {
  console.log(`RNG Centro de Comando pronto na porta ${port}`);
});
