const state = {
  user: null,
  route: 'inicio'
};

const roleNames = {
  owner: 'Proprietário',
  leader: 'Líder',
  trainer: 'Treinador',
  student: 'Aluno',
  member: 'Membro'
};

const $ = selector => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

window.escapeHtml = escapeHtml;

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 3200);
}

async function loadSession() {
  const cached = RNGStore.getUser();

  if (cached && RNGStore.getToken()) {
    state.user = cached;
    renderChrome();

    try {
      const result = await RNGStore.api('/api/auth/me');
      state.user = result.user;
      RNGStore.setUser(state.user);
    } catch {
      RNGStore.clear();
      state.user = null;
    }
  }

  renderChrome();
}

function renderChrome() {
  const user = state.user;

  $('#auth-button').textContent = user ? 'Sair' : 'Entrar / Cadastrar';

  $('#mini-profile').innerHTML = user
    ? `<strong>${escapeHtml(user.name)}</strong>
       <span>${escapeHtml(user.email)}</span>
       <span class="role">${escapeHtml(roleNames[user.role] || user.role)}</span>`
    : `<div class="empty">Nenhum usuário conectado.</div>`;

  const items = [
    ['inicio', 'Início'],
    ['treinamentos', 'Treinamentos'],
    ['promocoes', 'Promoções'],
    ['loja', 'Loja']
  ];

  if (user && ['owner', 'leader', 'trainer'].includes(user.role)) {
    items.push(['gerenciamento', 'Gerenciamento']);
  }

  $('#nav').innerHTML = items.map(([id, label]) => `
    <button class="${state.route === id ? 'active' : ''}" data-route="${id}">
      ${label}
    </button>
  `).join('');

  document.querySelectorAll('[data-route]').forEach(button => {
    button.addEventListener('click', () => navigate(button.dataset.route));
  });
}

function navigate(route) {
  state.route = route;
  renderChrome();

  if (route === 'inicio') renderHome();
  else if (route === 'treinamentos') renderTraining();
  else if (route === 'promocoes') RNGPromotion.render();
  else if (route === 'loja') renderStore();
  else if (route === 'gerenciamento') renderManagement();
}

function renderHome() {
  const user = state.user;

  $('#content').innerHTML = `
    <section class="hero">
      <span class="kicker">RNG · CENTRO DE COMANDO</span>
      <h1>Organização, treinamento e comunidade em um só lugar.</h1>
      <p class="lead">
        ${user
          ? `Bem-vindo de volta, <strong>${escapeHtml(user.name)}</strong>. Use o menu para acessar as áreas disponíveis para o seu cargo.`
          : 'Crie sua conta para acessar as áreas de aluno e acompanhar as atividades da comunidade.'}
      </p>
      <div class="actions">
        ${
          user
            ? `<button class="button button-primary" data-action="go-training">Ver treinamentos</button>
               <button class="button button-outline" data-action="go-profile">Meu perfil</button>`
            : `<button class="button button-primary" data-action="login">Entrar / Cadastrar</button>
               <a class="button button-outline" href="https://discord.gg/AGRcNJF9q" target="_blank" rel="noreferrer">Entrar no Discord</a>`
        }
      </div>
    </section>

    <div class="grid">
      <article class="card">
        <h3>Acesso por cadastro</h3>
        <p>Novos usuários entram como Aluno. Os cargos administrativos são definidos pela equipe.</p>
      </article>
      <article class="card">
        <h3>Treinamentos</h3>
        <p>Materiais organizados para integração, conduta e preparação da comunidade.</p>
      </article>
      <article class="card">
        <h3>Administração</h3>
        <p>Proprietário, Líderes e Treinadores possuem ferramentas de gerenciamento.</p>
      </article>
    </div>

    <div class="stats">
      <div class="stat"><strong>${user ? roleNames[user.role] : 'Visitante'}</strong><span>Seu acesso</span></div>
      <div class="stat"><strong>RNG</strong><span>Centro de comando</span></div>
      <div class="stat"><strong>Discord</strong><span>Comunidade oficial</span></div>
    </div>
  `;

  $('[data-action="login"]')?.addEventListener('click', openAuth);
  $('[data-action="go-training"]')?.addEventListener('click', () => navigate('treinamentos'));
  $('[data-action="go-profile"]')?.addEventListener('click', openProfile);
}

function renderTraining() {
  if (!state.user) return openAuth();
  $('#content').innerHTML = RNGTraining.render();
}

function renderStore() {
  if (!state.user) return openAuth();

  $('#content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Loja RNG</h2>
          <p>Espaço reservado para produtos e benefícios da comunidade.</p>
        </div>
      </div>

      <div class="grid">
        <article class="card">
          <h3>Kit RNG</h3>
          <p>Espaço para cadastrar o primeiro item da loja.</p>
          <button class="button button-outline" disabled>Em breve</button>
        </article>
        <article class="card">
          <h3>Benefícios</h3>
          <p>Adicione aqui recompensas, itens ou vantagens para membros.</p>
          <button class="button button-outline" disabled>Em breve</button>
        </article>
        <article class="card">
          <h3>Novidades</h3>
          <p>Esta área está pronta para receber novos produtos.</p>
          <button class="button button-outline" disabled>Em breve</button>
        </article>
      </div>
    </div>
  `;
}

async function renderManagement() {
  if (!state.user || !['owner', 'leader', 'trainer'].includes(state.user.role)) {
    return navigate('inicio');
  }

  $('#content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Gerenciamento</h2>
          <p>Altere cargos dos usuários de acordo com suas permissões.</p>
        </div>
      </div>
      <div id="management-users" class="empty-state">Carregando usuários...</div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Configurar promoção</h2>
          <p>Controle a divulgação que aparece para os usuários.</p>
        </div>
      </div>
      <div id="promotion-admin">Carregando...</div>
    </div>
  `;

  await loadUsers();
  await loadPromotionAdmin();
}

async function loadUsers() {
  const target = $('#management-users');

  try {
    const { users } = await RNGStore.api('/api/management/users');

    if (!users.length) {
      target.innerHTML = '<div class="empty-state">Nenhum usuário editável encontrado.</div>';
      return;
    }

    target.className = 'table-wrap';
    target.innerHTML = `
      <table>
        <thead>
          <tr><th>Nome</th><th>E-mail</th><th>Cargo</th><th>Ação</th></tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr>
              <td>${escapeHtml(user.name)}</td>
              <td>${escapeHtml(user.email)}</td>
              <td>${escapeHtml(roleNames[user.role] || user.role)}</td>
              <td>
                <select data-user-role="${user.id}">
                  ${user.allowedRoles.map(role => `
                    <option value="${role}" ${role === user.role ? 'selected' : ''}>
                      ${escapeHtml(roleNames[role] || role)}
                    </option>
                  `).join('')}
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    target.querySelectorAll('[data-user-role]').forEach(select => {
      select.addEventListener('change', async event => {
        try {
          await RNGStore.api(`/api/management/users/${event.target.dataset.userRole}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role: event.target.value })
          });
          toast('Cargo atualizado com sucesso.');
          await loadUsers();
        } catch (error) {
          toast(error.message);
          await loadUsers();
        }
      });
    });
  } catch (error) {
    target.innerHTML = `<div class="empty-state error">${escapeHtml(error.message)}</div>`;
  }
}

async function loadPromotionAdmin() {
  const target = $('#promotion-admin');

  try {
    const { promotion } = await RNGStore.api('/api/settings/promotion');

    target.innerHTML = `
      <form id="promotion-form" class="form-grid">
        <div class="field">
          <label for="promotion-title">Título</label>
          <input id="promotion-title" value="${escapeHtml(promotion.title)}" maxlength="80" required>
        </div>
        <div class="field">
          <label for="promotion-code">Código</label>
          <input id="promotion-code" value="${escapeHtml(promotion.code || '')}" maxlength="80">
        </div>
        <div class="field full">
          <label for="promotion-description">Descrição</label>
          <textarea id="promotion-description" maxlength="300">${escapeHtml(promotion.description || '')}</textarea>
        </div>
        <div class="field">
          <label><input id="promotion-active" type="checkbox" ${promotion.active ? 'checked' : ''}> Promoção ativa</label>
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit">Salvar promoção</button>
        </div>
      </form>
    `;

    $('#promotion-form').addEventListener('submit', async event => {
      event.preventDefault();

      try {
        await RNGStore.api('/api/settings/promotion', {
          method: 'PUT',
          body: JSON.stringify({
            title: $('#promotion-title').value,
            code: $('#promotion-code').value,
            description: $('#promotion-description').value,
            active: $('#promotion-active').checked
          })
        });

        toast('Promoção salva.');
      } catch (error) {
        toast(error.message);
      }
    });
  } catch (error) {
    target.innerHTML = `<div class="empty-state error">${escapeHtml(error.message)}</div>`;
  }
}

function openProfile() {
  const user = state.user;
  if (!user) return openAuth();

  $('#modal-content').innerHTML = `
    <span class="kicker">PERFIL</span>
    <h2>${escapeHtml(user.name)}</h2>
    <p class="muted">${escapeHtml(user.email)}</p>
    <p><span class="role">${escapeHtml(roleNames[user.role] || user.role)}</span></p>
    <div class="actions">
      <button id="profile-close" class="button button-outline" type="button">Fechar</button>
      <button id="profile-logout" class="button button-danger" type="button">Sair</button>
    </div>
  `;

  showModal();

  $('#profile-close').addEventListener('click', closeModal);
  $('#profile-logout').addEventListener('click', logout);
}

function openAuth() {
  $('#modal-content').innerHTML = `
    <div class="tabs">
      <button id="tab-login" class="active" type="button">Entrar</button>
      <button id="tab-register" type="button">Cadastrar</button>
    </div>
    <div id="auth-form"></div>
  `;

  const renderLogin = () => {
    $('#tab-login').classList.add('active');
    $('#tab-register').classList.remove('active');

    $('#auth-form').innerHTML = `
      <h2>Entrar</h2>
      <p class="muted">Acesse seu Centro de Comando.</p>
      <form id="login-form" class="form-grid">
        <div class="field full">
          <label>E-mail</label>
          <input id="login-email" type="email" required autocomplete="email">
        </div>
        <div class="field full">
          <label>Senha</label>
          <input id="login-password" type="password" required autocomplete="current-password">
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit">Entrar</button>
        </div>
      </form>
    `;

    $('#login-form').addEventListener('submit', login);
  };

  const renderRegister = () => {
    $('#tab-login').classList.remove('active');
    $('#tab-register').classList.add('active');

    $('#auth-form').innerHTML = `
      <h2>Criar conta</h2>
      <p class="muted">Novos cadastros entram como Aluno.</p>
      <form id="register-form" class="form-grid">
        <div class="field full">
          <label>Nome</label>
          <input id="register-name" required minlength="2" autocomplete="name">
        </div>
        <div class="field full">
          <label>E-mail</label>
          <input id="register-email" type="email" required autocomplete="email">
        </div>
        <div class="field full">
          <label>Senha</label>
          <input id="register-password" type="password" required minlength="8" autocomplete="new-password">
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit">Cadastrar</button>
        </div>
      </form>
    `;

    $('#register-form').addEventListener('submit', register);
  };

  $('#tab-login').addEventListener('click', renderLogin);
  $('#tab-register').addEventListener('click', renderRegister);

  renderLogin();
  showModal();
}

async function login(event) {
  event.preventDefault();

  try {
    const result = await RNGStore.api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#login-email').value,
        password: $('#login-password').value
      })
    });

    RNGStore.setToken(result.token);
    RNGStore.setUser(result.user);
    state.user = result.user;

    closeModal();
    renderChrome();
    navigate('inicio');
    toast('Login realizado com sucesso.');
  } catch (error) {
    toast(error.message);
  }
}

async function register(event) {
  event.preventDefault();

  try {
    const result = await RNGStore.api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: $('#register-name').value,
        email: $('#register-email').value,
        password: $('#register-password').value
      })
    });

    RNGStore.setToken(result.token);
    RNGStore.setUser(result.user);
    state.user = result.user;

    closeModal();
    renderChrome();
    navigate('inicio');
    toast('Cadastro realizado. Você entrou como Aluno.');
  } catch (error) {
    toast(error.message);
  }
}

async function logout() {
  try {
    await RNGStore.api('/api/auth/logout', { method: 'POST' });
  } catch {}

  RNGStore.clear();
  state.user = null;
  closeModal();
  renderChrome();
  navigate('inicio');
  toast('Você saiu da conta.');
}

function showModal() {
  const modal = $('#modal');
  if (!modal.open) modal.showModal();
}

function closeModal() {
  const modal = $('#modal');
  if (modal.open) modal.close();
}

$('#auth-button').addEventListener('click', () => {
  if (state.user) logout();
  else openAuth();
});

$('#modal').addEventListener('click', event => {
  if (event.target === $('#modal')) closeModal();
});

window.addEventListener('hashchange', () => {
  const route = location.hash.replace('#', '') || 'inicio';
  navigate(['inicio', 'treinamentos', 'promocoes', 'loja', 'gerenciamento'].includes(route) ? route : 'inicio');
});

loadSession().then(() => {
  const route = location.hash.replace('#', '') || 'inicio';
  navigate(['inicio', 'treinamentos', 'promocoes', 'loja', 'gerenciamento'].includes(route) ? route : 'inicio');
});
