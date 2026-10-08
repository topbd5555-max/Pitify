const API_BASE = '/api';

const API = {
  token: localStorage.getItem('pitify_token') || null,

  setToken(t) {
    this.token = t;
    if (t) localStorage.setItem('pitify_token', t);
    else localStorage.removeItem('pitify_token');
  },

  async req(path, { method = 'GET', body } = {}) {
    const res = await fetch(API_BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  },

  register: (b) => API.req('/auth/register', { method: 'POST', body: b }),
  login: (b) => API.req('/auth/login', { method: 'POST', body: b }),
  me: () => API.req('/auth/me'),
  workouts: (q = '') => API.req('/workouts' + q),
  workout: (id) => API.req('/workouts/' + id),
  saveSession: (b) => API.req('/progress', { method: 'POST', body: b }),
  history: () => API.req('/progress'),
  stats: () => API.req('/progress/stats'),
};