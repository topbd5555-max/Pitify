const app = document.getElementById('app');
const state = { user: null, workouts: [], stats: null, history: [], filter: 'All' };

/* ---------------- BACKGROUND EFFECTS ---------------- */
function initBackgroundEffects() {
  // Rain drops
  const rainLayer = document.getElementById('rain-layer');
  if (rainLayer && !rainLayer.dataset.init) {
    rainLayer.dataset.init = '1';
    for (let i = 0; i < 70; i++) {
      const drop = document.createElement('div');
      drop.className = 'raindrop';
      drop.style.left = Math.random() * 100 + '%';
      drop.style.animationDelay = (Math.random() * 2) + 's';
      drop.style.animationDuration = (0.6 + Math.random() * 0.8) + 's';
      drop.style.opacity = (0.15 + Math.random() * 0.45).toFixed(2);
      rainLayer.appendChild(drop);
    }
  }

  // Fireflies (jonaki poka)
  const ffLayer = document.getElementById('fireflies-layer');
  if (ffLayer && !ffLayer.dataset.init) {
    ffLayer.dataset.init = '1';
    for (let i = 0; i < 22; i++) {
      const f = document.createElement('div');
      f.className = 'firefly';
      f.style.left = Math.random() * 100 + '%';
      f.style.top = Math.random() * 100 + '%';
      f.style.animationDelay = (Math.random() * 6) + 's';
      f.style.animationDuration = (5 + Math.random() * 7) + 's';
      const size = 3 + Math.random() * 3;
      f.style.width = size + 'px';
      f.style.height = size + 'px';
      ffLayer.appendChild(f);
    }
  }
}

/* ---------------- INIT ---------------- */
async function init() {
  initBackgroundEffects();

  if (API.token) {
    try {
      state.user = await API.me();
    } catch {
      API.setToken(null);
    }
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  window.addEventListener('hashchange', router);
  router();
}

function go(path) {
  location.hash = path;
}

function router() {
  const path = (location.hash.slice(1) || '/home').split('?')[0];
  const parts = path.split('/').filter(Boolean);
  const route = parts[0] || 'home';
  const param = parts[1];

  if (!state.user && route !== 'login') return go('/login');
  if (state.user && route === 'login') return go('/home');

  switch (route) {
    case 'login':    renderLogin(); break;
    case 'home':     renderHome(); break;
    case 'workouts': renderWorkouts(); break;
    case 'workout':  renderWorkoutDetail(param); break;
    case 'progress': renderProgress(); break;
    case 'profile':  renderProfile(); break;
    default:         go('/home');
  }
  window.scrollTo(0, 0);
}

/* ---------------- HELPERS ---------------- */
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function nav(active) {
  const items = [
    { id: 'home',     label: 'Home',     path: '/home',     icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>' },
    { id: 'workouts', label: 'Workouts', path: '/workouts', icon: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>' },
    { id: 'progress', label: 'Progress', path: '/progress', icon: '<path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 5-6"/>' },
    { id: 'profile',  label: 'Profile',  path: '/profile',  icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' },
  ];
  return `<nav class="nav">${items
    .map(
      (i) => `
    <a class="nav-item ${active === i.id ? 'active' : ''}" href="#${i.path}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${i.icon}</svg>
      <span>${i.label}</span>
    </a>`
    )
    .join('')}</nav>`;
}

const initials = (n) =>
  n.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();

// Theme colors based on workout category
const CATEGORY_THEME = {
  'Full Body': 'theme-orange',
  'Abs': 'theme-pink',
  'Chest': 'theme-yellow',
  'Legs': 'theme-green',
  'Arms': 'theme-red',
  'Cardio': 'theme-cyan',
  'Stretching': 'theme-purple',
  'HIIT': 'theme-red',
};

function themeFor(w) {
  return CATEGORY_THEME[w.category] || 'theme-green';
}

/* ---------------- LOGIN ---------------- */
function renderLogin() {
  app.innerHTML = `
    <div class="auth">
      <div class="auth-logo">PIT<span>IFY</span></div>
      <p class="auth-sub">Your pocket personal trainer</p>

      <div class="tabs">
        <button class="tab active" data-tab="login">Login</button>
        <button class="tab" data-tab="register">Sign Up</button>
      </div>

      <form class="auth-form" id="authForm">
        <input class="input hidden" name="name" placeholder="Your name" autocomplete="name" />
        <input class="input" name="email" type="email" placeholder="Email" autocomplete="email" required />
        <input class="input" name="password" type="password" placeholder="Password (min 6 chars)" autocomplete="current-password" required />
        <button class="btn-primary" type="submit" id="submitBtn">Continue</button>
      </form>
      <p class="err" id="err"></p>
    </div>`;

  let mode = 'login';
  const form = document.getElementById('authForm');
  const nameInput = form.querySelector('[name="name"]');
  const errEl = document.getElementById('err');
  const btn = document.getElementById('submitBtn');

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.onclick = () => {
      mode = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
      nameInput.classList.toggle('hidden', mode === 'login');
      nameInput.required = mode === 'register';
      btn.textContent = mode === 'login' ? 'Continue' : 'Create Account';
      errEl.textContent = '';
    };
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Please wait...';
    const fd = new FormData(form);
    try {
      const payload = {
        email: fd.get('email').trim(),
        password: fd.get('password'),
        ...(mode === 'register' ? { name: fd.get('name').trim() } : {}),
      };
      const res = mode === 'login' ? await API.login(payload) : await API.register(payload);
      API.setToken(res.token);
      state.user = res.user;
      toast(mode === 'login' ? 'Welcome back! 💪' : 'Account created! 🎉');
      go('/home');
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false;
      btn.textContent = mode === 'login' ? 'Continue' : 'Create Account';
    }
  };
}

/* ---------------- HOME ---------------- */
async function renderHome() {
  app.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div>Loading...</div>`;

  try {
    const [workouts, stats] = await Promise.all([API.workouts(), API.stats()]);
    state.workouts = workouts;
    state.stats = stats;

    const featured = workouts.slice(0, 6);
    const first = state.user.name.split(' ')[0];

    app.innerHTML = `
      <div class="header">
        <div>
          <div class="greet">Welcome back 👋</div>
          <div class="greet-name">${esc(first)}</div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" aria-label="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
          </button>
          <div class="avatar">${initials(state.user.name)}</div>
        </div>
      </div>

      <div class="stats">
        <div class="neon-card theme-orange stat stat-hero">
          <div class="stat-icon">🔥</div>
          <div class="stat-value">${stats.total_workouts}</div>
          <div class="stat-label">Workouts</div>
        </div>
        <div class="neon-card theme-green stat stat-hero">
          <div class="stat-icon">⏱</div>
          <div class="stat-value">${stats.total_minutes}</div>
          <div class="stat-label">Minutes</div>
        </div>
        <div class="neon-card theme-purple stat stat-hero">
          <div class="stat-icon">📅</div>
          <div class="stat-value">${stats.streak}</div>
          <div class="stat-label">Day Streak</div>
        </div>
      </div>

      <div class="neon-card theme-green hero">
        <div class="hero-content">
          <div class="hero-label">YOUR FITNESS JOURNEY</div>
          <h2>Ready to <span class="accent-text">sweat?</span></h2>
          <p>Pick a workout and start burning calories now.</p>
          <button class="hero-btn" onclick="location.hash='/workouts'">
            Browse Workouts <span class="arrow">→</span>
          </button>
        </div>
        <div class="hero-visual">
          <div class="hero-dumbbell">🏋️</div>
        </div>
        <div class="hero-crown">👑<div class="hero-motto">DISCIPLINE<br/>BUILDS<br/>FREEDOM</div></div>
      </div>

      <div class="section-title">
        <span>🔥 Popular</span>
        <a href="#/workouts">See all →</a>
      </div>
      <div class="cards-grid">
        ${featured.map(cardHTML).join('')}
      </div>
      ${nav('home')}`;
  } catch (e) {
    app.innerHTML = `<div class="empty"><div class="empty-emoji">😵</div>${esc(e.message)}</div>`;
  }
}

function cardHTML(w) {
  const theme = themeFor(w);
  return `
    <a class="neon-card workout-card ${theme}" href="#/workout/${w.id}">
      <div class="wc-thumb">${w.thumbnail || '💪'}</div>
      <div class="wc-body">
        <div class="wc-title">${esc(w.title)}</div>
        <div class="wc-meta">
          <span class="pill ${w.level.toLowerCase()}">${w.level}</span>
          <span class="wc-dot">·</span>
          <span>⏱ ${w.duration} min</span>
        </div>
        <div class="wc-footer">
          <span class="wc-cal">🔥 ${w.calories} cal</span>
          <span class="wc-arrow">›</span>
        </div>
      </div>
    </a>`;
}

/* ---------------- WORKOUTS LIST ---------------- */
async function renderWorkouts() {
  app.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div>Loading...</div>`;
  try {
    state.workouts = await API.workouts();
    const cats = ['All', ...new Set(state.workouts.map((w) => w.category))];

    app.innerHTML = `
      <div class="header">
        <div class="greet-name">Workouts</div>
        <div class="avatar">${initials(state.user.name)}</div>
      </div>

      <div class="filters">
        ${cats
          .map(
            (c) =>
              `<button class="chip ${state.filter === c ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`
          )
          .join('')}
      </div>

      <div class="cards-grid" id="list"></div>
      ${nav('workouts')}`;

    const paint = () => {
      const list =
        state.filter === 'All'
          ? state.workouts
          : state.workouts.filter((w) => w.category === state.filter);
      document.getElementById('list').innerHTML = list.length
        ? list.map(cardHTML).join('')
        : `<div class="empty" style="grid-column:1/-1"><div class="empty-emoji">🔍</div>No workouts found</div>`;
    };

    document.querySelectorAll('.chip').forEach((chip) => {
      chip.onclick = () => {
        state.filter = chip.dataset.cat;
        document.querySelectorAll('.chip').forEach((c) =>
          c.classList.toggle('active', c === chip)
        );
        paint();
      };
    });
    paint();
  } catch (e) {
    app.innerHTML = `<div class="empty"><div class="empty-emoji">😵</div>${esc(e.message)}</div>`;
  }
}

/* ---------------- WORKOUT DETAIL ---------------- */
async function renderWorkoutDetail(id) {
  app.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div>Loading...</div>`;
  try {
    const w = await API.workout(id);
    const theme = themeFor(w);

    app.innerHTML = `
      <div class="header">
        <button class="player-close" onclick="history.back()">‹</button>
      </div>

      <div class="detail-hero">
        <div class="detail-emoji">${w.thumbnail || '💪'}</div>
        <div class="detail-title">${esc(w.title)}</div>
        <div class="detail-meta">
          <span class="pill ${w.level.toLowerCase()}">${w.level}</span>
          <span>⏱ ${w.duration} min</span>
          <span>🔥 ${w.calories} cal</span>
        </div>
      </div>

      <button class="btn-primary neon-card ${theme}" id="startBtn" style="width:100%;border-radius:16px;padding:18px">
        ▶ Start Workout
      </button>

      <div class="section-title" style="margin-top:32px">
        <span>Exercises (${w.exercises.length})</span>
      </div>
      <div class="ex-list">
        ${w.exercises
          .map(
            (ex, i) => `
          <div class="ex-item">
            <div class="ex-num">${i + 1}</div>
            <div class="ex-name">${esc(ex.name)}</div>
            <div class="ex-time">${ex.seconds}s</div>
          </div>`
          )
          .join('')}
      </div>

      ${nav('workouts')}`;

    document.getElementById('startBtn').onclick = () => startPlayer(w);
  } catch (e) {
    app.innerHTML = `<div class="empty"><div class="empty-emoji">😵</div>${esc(e.message)}</div>`;
  }
}

/* ---------------- PLAYER ---------------- */
function startPlayer(w) {
  const steps = [];
  w.exercises.forEach((ex) => {
    steps.push({ type: 'work', name: ex.name, seconds: ex.seconds });
    if (ex.rest > 0) steps.push({ type: 'rest', name: 'Rest', seconds: ex.rest });
  });

  let idx = 0;
  let remaining = steps[0].seconds;
  let paused = false;
  let tick = null;
  let elapsedBefore = 0;

  const el = document.createElement('div');
  el.className = 'player';
  document.body.appendChild(el);

  const totalSeconds = steps.reduce((a, s) => a + s.seconds, 0);

  function paint() {
    const s = steps[idx];
    const done = elapsedBefore + (s.seconds - remaining);
    const pct = (done / totalSeconds) * 100;
    const next = steps[idx + 1];

    const isRest = s.type === 'rest';
    const videoName = isRest ? null : s.name.toLowerCase().replace(/\s+/g, '-');
    const videoPath = videoName ? `/videos/${videoName}.mp4` : null;

    const bgHTML = isRest
      ? `<div class="player-bg-rest"><div class="rest-emoji">😌</div></div>`
      : `
        <video class="player-bg-blur" src="${videoPath}" autoplay loop muted playsinline preload="auto"></video>
        <video class="player-bg-main" src="${videoPath}" autoplay loop muted playsinline preload="auto"
          onerror="this.style.display='none'; this.parentElement.querySelector('.player-bg-blur').style.display='none'; this.parentElement.querySelector('.player-bg-fallback').style.display='flex';"></video>
        <div class="player-bg-fallback" style="display:none;"><div class="video-fallback">💪</div></div>
      `;

    el.innerHTML = `
      <div class="player-bg-wrap">${bgHTML}</div>

      <div class="player-overlay">
        <div class="player-top">
          <div class="player-title">${esc(w.title)}</div>
          <button class="player-close" id="closeBtn">✕</button>
        </div>

        <div class="player-progress">
          <div class="player-progress-fill" style="width:${pct}%"></div>
        </div>

        <div class="player-spacer"></div>

        <div class="player-info">
          <div class="player-phase ${isRest ? 'rest' : ''}">
            ${isRest ? 'REST' : `EXERCISE ${steps.slice(0, idx + 1).filter((x) => x.type === 'work').length}`}
          </div>
          <div class="player-exercise">${esc(s.name)}</div>
          <div class="player-timer">${remaining}</div>
          ${
            next
              ? `<div class="player-next">Next: ${esc(next.name)} · ${next.seconds}s</div>`
              : `<div class="player-next">Last one! 🔥</div>`
          }
        </div>

        <div class="player-controls">
          <button class="pbtn" id="prevBtn">⏮</button>
          <button class="pbtn main" id="toggleBtn">${paused ? '▶' : '❚❚'}</button>
          <button class="pbtn" id="skipBtn">⏭</button>
        </div>
      </div>`;

    el.querySelector('#closeBtn').onclick = () => {
      if (confirm('Quit workout?')) {
        clearInterval(tick);
        el.remove();
      }
    };
    el.querySelector('#toggleBtn').onclick = () => {
      paused = !paused;
      paint();
    };
    el.querySelector('#skipBtn').onclick = () => nextStep();
    el.querySelector('#prevBtn').onclick = () => {
      if (idx === 0) return;
      idx--;
      remaining = steps[idx].seconds;
      elapsedBefore = steps.slice(0, idx).reduce((a, s) => a + s.seconds, 0);
      paint();
    };
  }

  function nextStep() {
    elapsedBefore += steps[idx].seconds;
    idx++;
    if (idx >= steps.length) return finish();
    remaining = steps[idx].seconds;
    paint();
  }

  async function finish() {
    clearInterval(tick);
    el.innerHTML = `
      <div class="player-bg-rest">
        <div class="finish-emoji">🎉</div>
      </div>
      <div class="player-overlay" style="justify-content:center;align-items:center">
        <div class="finish-title">Workout Complete!</div>
        <div class="finish-sub">${w.duration} min · ${w.calories} calories burned</div>
      </div>`;
    try {
      await API.saveSession({
        workout_id: w.id,
        duration: w.duration,
        calories: w.calories,
      });
    } catch {}
    setTimeout(() => {
      el.remove();
      toast('Great job! 💪');
      go('/progress');
    }, 2000);
  }

  tick = setInterval(() => {
    if (paused) return;
    remaining--;
    if (remaining <= 0) return nextStep();

    const timer = el.querySelector('.player-timer');
    if (timer) timer.textContent = remaining;

    const fill = el.querySelector('.player-progress-fill');
    if (fill) {
      const s = steps[idx];
      const done = elapsedBefore + (s.seconds - remaining);
      fill.style.width = (done / totalSeconds) * 100 + '%';
    }
  }, 1000);

  paint();
}

/* ---------------- PROGRESS ---------------- */
async function renderProgress() {
  app.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div>Loading...</div>`;
  try {
    const [stats, history] = await Promise.all([API.stats(), API.history()]);
    state.stats = stats;
    state.history = history;

    app.innerHTML = `
      <div class="header">
        <div class="greet-name">Progress</div>
        <div class="avatar">${initials(state.user.name)}</div>
      </div>

      <div class="stats">
        <div class="neon-card theme-orange stat stat-hero">
          <div class="stat-icon">🔥</div>
          <div class="stat-value">${stats.total_workouts}</div>
          <div class="stat-label">Workouts</div>
        </div>
        <div class="neon-card theme-green stat stat-hero">
          <div class="stat-icon">⏱</div>
          <div class="stat-value">${stats.total_minutes}</div>
          <div class="stat-label">Minutes</div>
        </div>
        <div class="neon-card theme-purple stat stat-hero">
          <div class="stat-icon">⚡</div>
          <div class="stat-value">${stats.total_calories}</div>
          <div class="stat-label">Calories</div>
        </div>
      </div>

      <div class="neon-card theme-green" style="padding:20px;margin-bottom:20px">
        <div style="font-size:13px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Current Streak</div>
        <div style="font-size:32px;font-weight:900;color:var(--accent)">🔥 ${stats.streak} day${stats.streak === 1 ? '' : 's'}</div>
      </div>

      <div class="section-title"><span>Recent Activity</span></div>
      <div class="history-list">
        ${
          history.length
            ? history
                .map(
                  (h) => `
          <div class="neon-card theme-cyan history-item">
            <div>
              <div style="font-weight:600;font-size:14px">${esc(h.thumbnail || '💪')} ${esc(h.title)}</div>
              <div class="history-date">${new Date(h.completed_at + 'Z').toLocaleString()}</div>
            </div>
            <div style="text-align:right;font-size:12px;color:var(--muted)">
              <div>${h.duration} min</div>
              <div>🔥 ${h.calories}</div>
            </div>
          </div>`
                )
                .join('')
            : `<div class="empty" style="grid-column:1/-1"><div class="empty-emoji">🏃</div>No workouts yet.<br>Start your first one!</div>`
        }
      </div>

      ${nav('progress')}`;
  } catch (e) {
    app.innerHTML = `<div class="empty"><div class="empty-emoji">😵</div>${esc(e.message)}</div>`;
  }
}

/* ---------------- PROFILE ---------------- */
function renderProfile() {
  app.innerHTML = `
    <div class="header">
      <div class="greet-name">Profile</div>
    </div>

    <div class="profile-card">
      <div class="avatar profile-avatar">${initials(state.user.name)}</div>
      <div class="profile-name">${esc(state.user.name)}</div>
      <div class="profile-email">${esc(state.user.email)}</div>
    </div>

    <div class="neon-card theme-yellow" style="padding:18px;margin-bottom:20px">
      <div style="display:flex;gap:14px;align-items:center">
        <div style="font-size:28px">📅</div>
        <div>
          <div style="font-weight:700;font-size:15px">Member since</div>
          <div style="color:var(--muted);font-size:13px;margin-top:4px">${
            state.user.created_at
              ? new Date(state.user.created_at + 'Z').toLocaleDateString()
              : 'Today'
          }</div>
        </div>
      </div>
    </div>

    <button class="logout" id="logoutBtn">Log Out</button>
    ${nav('profile')}`;

  document.getElementById('logoutBtn').onclick = () => {
    API.setToken(null);
    state.user = null;
    go('/login');
  };
}

init();