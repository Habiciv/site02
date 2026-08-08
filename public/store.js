window.RNGStore = {
  getToken() {
    return localStorage.getItem('rng_token') || '';
  },

  setToken(token) {
    if (token) localStorage.setItem('rng_token', token);
    else localStorage.removeItem('rng_token');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('rng_user') || 'null');
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) localStorage.setItem('rng_user', JSON.stringify(user));
    else localStorage.removeItem('rng_user');
  },

  clear() {
    this.setToken('');
    this.setUser(null);
  },

  async api(url, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');

    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const token = this.getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(url, { ...options, headers });
    const text = await response.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || 'Resposta inválida do servidor.' };
    }

    if (!response.ok) {
      const error = new Error(data.error || `Erro ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return data;
  }
};
