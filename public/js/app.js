const app = document.getElementById('app');
const state = { user: null, workouts: [], stats: null, history: [], filter: 'All' };

/* ---------------- INIT ---------------- */
async function init() {
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

    const featured = workouts.slice(0, 4);
    const first = state.user.name.split(' ')[0];

    app.innerHTML = `
      <div class="header">
        <div>
          <div class="greet">Welcome back 👋</div>
          <div class="greet-name">${esc(first)}</div>
        </div>
        <div class="avatar">${initials(state.user.name)}</div>
      </div>

      <div class="stats">
        <div class="stat"><div class="stat-value">${stats.total_workouts}</div><div class="stat-label">Workouts</div></div>
        <div class="stat"><div class="stat-value">${stats.total_minutes}</div><div class="stat-label">Minutes</div></div>
        <div class="stat"><div class="stat-value">${stats.streak}</div><div class="stat-label">Day Streak</div></div>
      </div>

      <div class="hero">
        <h2>Ready to sweat?</h2>
        <p>Pick a workout and start burning calories now.</p>
        <button onclick="location.hash='/workouts'">Browse Workouts</button>
      </div>

      <div class="section-title">Popular <a href="#/workouts">See all</a></div>
      ${featured.map(cardHTML).join('')}
      ${nav('home')}`;
  } catch (e) {
    app.innerHTML = `<div class="empty"><div class="empty-emoji">😵</div>${esc(e.message)}</div>`;
  }
}

function cardHTML(w) {
  return `
    <a class="card" href="#/workout/${w.id}">
      <div class="card-thumb">${w.thumbnail || '💪'}</div>
      <div class="card-body">
        <div class="card-title">${esc(w.title)}</div>
        <div class="card-meta">
          <span class="pill ${w.level.toLowerCase()}">${w.level}</span>
          <span>⏱ ${w.duration} min</span>
          <span>🔥 ${w.calories} cal</span>
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

      <div id="list"></div>
      ${nav('workouts')}`;

    const paint = () => {
      const list =
        state.filter === 'All'
          ? state.workouts
          : state.workouts.filter((w) => w.category === state.filter);
      document.getElementById('list').innerHTML = list.length
        ? list.map(cardHTML).join('')
        : `<div class="empty"><div class="empty-emoji">🔍</div>No workouts found</div>`;
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

      <button class="btn-primary" id="startBtn" style="width:100%">▶ Start Workout</button>

      <div class="section-title" style="margin-top:32px">Exercises (${w.exercises.length})</div>
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

    const mediaHTML = isRest
      ? `<div class="exercise-video rest-video"><div class="rest-emoji">😌</div></div>`
      : `
        <div class="exercise-video">
          <video 
            src="${videoPath}" 
            autoplay 
            loop 
            muted 
            playsinline
            preload="auto"
            onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'video-fallback\\'>💪</div>';">
          </video>
        </div>`;

    el.innerHTML = `
      <div class="player-top">
        <div class="player-title">${esc(w.title)}</div>
        <button class="player-close" id="closeBtn">✕</button>
      </div>

      <div class="player-progress">
        <div class="player-progress-fill" style="width:${pct}%"></div>
      </div>

      <div class="player-video-wrap">
        ${mediaHTML}
      </div>

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
      <div class="player-finish">
        <div class="finish-emoji">🎉</div>
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
        <div class="stat"><div class="stat-value">${stats.total_workouts}</div><div class="stat-label">Workouts</div></div>
        <div class="stat"><div class="stat-value">${stats.total_minutes}</div><div class="stat-label">Minutes</div></div>
        <div class="stat"><div class="stat-value">${stats.total_calories}</div><div class="stat-label">Calories</div></div>
      </div>

      <div class="section-title">🔥 Current Streak: ${stats.streak} day${stats.streak === 1 ? '' : 's'}</div>

      <div class="section-title" style="margin-top:26px">Recent Activity</div>
      ${
        history.length
          ? history
              .map(
                (h) => `
        <div class="history-item">
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
          : `<div class="empty"><div class="empty-emoji">🏃</div>No workouts yet.<br>Start your first one!</div>`
      }

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

    <div style="text-align:center;padding:20px 0 30px">
      <div class="avatar" style="width:84px;height:84px;font-size:32px;margin:0 auto 16px">
        ${initials(state.user.name)}
      </div>
      <div style="font-size:20px;font-weight:800">${esc(state.user.name)}</div>
      <div style="color:var(--muted);font-size:14px;margin-top:6px">${esc(state.user.email)}</div>
    </div>

    <div class="card">
      <div class="card-thumb">📅</div>
      <div class="card-body">
        <div class="card-title">Member since</div>
        <div class="card-meta">${
          state.user.created_at
            ? new Date(state.user.created_at + 'Z').toLocaleDateString()
            : 'Today'
        }</div>
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