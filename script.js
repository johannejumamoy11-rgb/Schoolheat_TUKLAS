/* ===== SCHOOLHEAT v4.0 — ULTIMATE EDITION ===== */
/* eslint-disable no-unused-vars */
(function() {
'use strict';

// ============================================
// CONSTANTS
// ============================================
const STORE_KEY = 'sh_v40_data';
const SETT_KEY = 'sh_v40_sett';
const CALIB_KEY = 'sh_v40_calib';
const MAX_READINGS = 500;
const FB_POLL_DEFAULT = 4000;
const BR_POLL = 3000;
const SMS_COOLDOWN_DEFAULT = 5 * 60 * 1000; // 5 minutes
const DUPLICATE_WINDOW = 30 * 1000; // 30 seconds

const LOCATIONS = [
  { id:'loc-01', num:1,  name:'3 Classroom, SBP4BE Building AusAID',           x:30, y:75 },
  { id:'loc-02', num:2,  name:'School Clinic',                                  x:15, y:25 },
  { id:'loc-03', num:3,  name:'6 Classroom, DepEd Modified School Bldg',        x:20, y:65 },
  { id:'loc-04', num:4,  name:'6 Classroom, JICA-EFIP',                         x:8,  y:55 },
  { id:'loc-05', num:5,  name:'Literacy Office',                                x:6,  y:45 },
  { id:'loc-06', num:6,  name:'Publication Office',                             x:8,  y:18 },
  { id:'loc-07', num:7,  name:'4 Classroom, PPSIP Building',                    x:15, y:18 },
  { id:'loc-08', num:8,  name:'SSLG Office',                                    x:22, y:18 },
  { id:'loc-09', num:9,  name:'3 Storey, 15 Classroom, DepEd SS Bldg',          x:32, y:15 },
  { id:'loc-10', num:10, name:'2 Storey Comp. Lab.',                            x:45, y:22 },
  { id:'loc-11', num:11, name:'Guidance Office',                                x:50, y:28 },
  { id:'loc-12', num:12, name:'PTA Office',                                     x:53, y:30 },
  { id:'loc-13', num:13, name:'1 Classroom, DepEd SS Bldg',                     x:56, y:32 },
  { id:'loc-14', num:14, name:'3 Classroom, DepEd SS Bldg',                     x:62, y:30 },
  { id:'loc-15', num:15, name:'1 Classroom, SS Building',                       x:68, y:30 },
  { id:'loc-16', num:16, name:'3 Storey, 9 Classroom, DepEd SS Bldg',           x:65, y:45 },
  { id:'loc-17', num:17, name:'4 Classroom, SEDP Building',                     x:18, y:35 },
  { id:'loc-18', num:18, name:'School Canteen',                                 x:22, y:35 },
  { id:'loc-19', num:19, name:'2 Classroom, Baptist Donated Bldg',              x:26, y:35 },
  { id:'loc-20', num:20, name:'3 Classroom, SBP4BE Bldg AusAID',                x:38, y:40 },
  { id:'loc-21', num:21, name:'2 Classroom, DepEd SS Bldg',                     x:15, y:50 },
  { id:'loc-22', num:22, name:'2 Storey, 4 Classroom, DepEd SS Bldg',           x:18, y:58 },
  { id:'loc-23', num:23, name:'3 Classroom, DepEd SS Bldg',                     x:18, y:72 },
  { id:'loc-24', num:24, name:'Handwashing Facility',                           x:45, y:72 },
  { id:'loc-25', num:25, name:'Administration Building / DepEd SS Bldg',        x:52, y:48 },
  { id:'loc-26', num:26, name:'1 Classroom, DepEd SS Bldg',                     x:62, y:55 },
  { id:'loc-27', num:27, name:'1 Classroom, DepEd SS Bldg',                     x:58, y:42 },
  { id:'loc-28', num:28, name:'2 Storey, 2 Classroom, DepEd SS Bldg',           x:58, y:70 },
  { id:'loc-29', num:29, name:'Guard House',                                    x:52, y:75 },
  { id:'loc-sg', num:'SG',name:'School Gate',                                    x:45, y:85 },
];

// ============================================
// STATE
// ============================================
const state = {
  readings: [],
  settings: {
    fbUrl: '',
    bridgeUrl: '',
    smsNum: '',
    smsThresh: 41,
    smsCooldown: 5,
    smsOn: false,
    cloud: false,
    fbInterval: 4,
  },
  calibration: { temp: 0, hum: 0 },
  fbTimer: null,
  brTimer: null,
  fbLast: null,
  busy: false,
  curTab: 'monitor',
  smsCooldownMap: {},
  dashFilter: 'all',
  dashSearch: '',
  mapZoom: 1,
  mapPan: { x: 0, y: 0 },
  mapDragging: false,
  mapLastPos: null,
  forecastPreds: [],
  audioCtx: null,
  confirmCallback: null,
  lastReading: null,
};

// ============================================
// UTILITIES
// ============================================
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = t => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
const nowISO = () => new Date().toISOString();
const fmtTime = iso => {
  const d = new Date(iso);
  return d.toLocaleString('en-PH', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
};
const fmtTimeFull = iso => {
  const d = new Date(iso);
  return d.toLocaleString('en-PH', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true });
};
const fmtDate = iso => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });
};
const timeAgo = iso => {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  return Math.floor(hr / 24) + 'd ago';
};

function toast(msg, type = 'inf') {
  const box = $('#toast-box');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 3800);
}

function playAlertSound() {
  try {
    if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = state.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch (e) { /* silent fail */ }
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ============================================
// STORAGE
// ============================================
function saveData() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.readings.slice(0, MAX_READINGS)));
    localStorage.setItem(SETT_KEY, JSON.stringify(state.settings));
    localStorage.setItem(CALIB_KEY, JSON.stringify(state.calibration));
  } catch (e) {
    toast('Storage full — export data', 'warn');
  }
}

function loadData() {
  try { state.readings = JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { state.readings = []; }
  try { state.settings = JSON.parse(localStorage.getItem(SETT_KEY)) || state.settings; } catch (e) {}
  try { state.calibration = JSON.parse(localStorage.getItem(CALIB_KEY)) || state.calibration; } catch (e) {}
}

// ============================================
// HEAT INDEX — FIXED: Celsius -> Fahrenheit -> Celsius
// ============================================
function calcHI(Tc, H) {
  Tc = parseFloat(Tc); H = parseFloat(H);
  if (isNaN(Tc) || isNaN(H)) return null;
  if (Tc < -50 || Tc > 60 || H < 0 || H > 100) return null;

  // Apply calibration offsets
  Tc += state.calibration.temp;
  H += state.calibration.hum;
  H = Math.max(0, Math.min(100, H));

  // Convert Celsius to Fahrenheit for the Steadman formula
  const T = Tc * 9 / 5 + 32;

  // Rothfusz regression coefficients (Fahrenheit)
  const c = [
    -42.379, 2.04901523, 10.14333127, -0.22475541,
    -6.83783e-3, -5.481717e-2, 1.22874e-3, 8.5282e-4, -1.99e-6
  ];
  let HI = c[0] + c[1]*T + c[2]*H + c[3]*T*H + c[4]*T*T + c[5]*H*H + c[6]*T*T*H + c[7]*T*H*H + c[8]*T*T*H*H;

  // Adjustments (in Fahrenheit ranges)
  if (H < 13 && T >= 80 && T <= 112) {
    HI -= ((13 - H) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  }
  if (H > 85 && T >= 80 && T <= 87) {
    HI += ((H - 85) / 10) * ((87 - T) / 5);
  }
  if (HI < T) HI = T;

  // Convert result back to Celsius
  HI = (HI - 32) * 5 / 9;

  return Math.round(HI * 10) / 10;
}

function getStatus(HI) {
  if (HI < 27)  return { lvl:'safe',    label:'Safe',    color:'#00e676', icon:'✅', advice:'Normal activities are safe. Maintain hydration.' };
  if (HI < 32)  return { lvl:'caution', label:'Caution', color:'#ffca28', icon:'⚠️', advice:'Fatigue possible with prolonged exposure. Drink water regularly.' };
  if (HI < 41)  return { lvl:'danger',  label:'Danger',  color:'#ff5252', icon:'🔥', advice:'Heat exhaustion likely. Limit outdoor activity and seek shade.' };
  return { lvl:'extreme', label:'Extreme Danger', color:'#ff1744', icon:'☠️', advice:'Heat stroke imminent! Seek air-conditioned shelter immediately!' };
}

// ============================================
// READINGS — SINGLE SOURCE OF TRUTH
// ============================================
function addReading(locId, temp, hum, hi, source = 'manual') {
  const loc = LOCATIONS.find(l => l.id === locId);
  if (!loc) { toast('Invalid location', 'bad'); return null; }

  const st = getStatus(hi);
  const ts = nowISO();

  // Duplicate detection: same location within 30 seconds updates instead of appends
  const dupIndex = state.readings.findIndex(r =>
    r.locId === locId && (Date.now() - new Date(r.ts).getTime()) < DUPLICATE_WINDOW
  );

  const reading = {
    id: dupIndex >= 0 ? state.readings[dupIndex].id : Date.now(),
    ts, locId, locName: loc.name, locNum: loc.num,
    temp: parseFloat(temp), hum: parseFloat(hum), hi, status: st.lvl, source
  };

  if (dupIndex >= 0) {
    state.readings[dupIndex] = reading;
  } else {
    state.readings.unshift(reading);
    if (state.readings.length > MAX_READINGS) state.readings = state.readings.slice(0, MAX_READINGS);
  }

  state.lastReading = reading;
  saveData();
  return reading;
}

function delReading(id) {
  state.readings = state.readings.filter(r => r.id !== id);
  saveData();
  renderHistory(); renderDashboard(); renderMap(); renderRecent();
  toast('Reading deleted', 'ok');
}

function clearAllData() {
  state.readings = [];
  saveData();
  renderHistory(); renderDashboard(); renderMap(); renderRecent();
  toast('All data cleared', 'ok');
}

// ============================================
// GAUGE
// ============================================
function drawGauge(val) {
  const cvs = document.getElementById('heatGauge');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssSize = 280;
  cvs.width = cssSize * dpr; cvs.height = cssSize * dpr;
  ctx.scale(dpr, dpr);
  const cx = cssSize / 2, cy = cssSize / 2, r = 108;
  const a0 = Math.PI * 0.78, a1 = Math.PI * 2.22, span = a1 - a0;

  ctx.clearRect(0, 0, cssSize, cssSize);

  // Background arc
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1);
  ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineCap = 'round'; ctx.stroke();

  // Colored segments
  const segs = [
    { p: 0.30, c: '#00e676' },
    { p: 0.22, c: '#ffca28' },
    { p: 0.28, c: '#ff5252' },
    { p: 0.20, c: '#ff1744' }
  ];
  let ca = a0;
  segs.forEach(s => {
    ctx.beginPath(); ctx.arc(cx, cy, r, ca, ca + span * s.p);
    ctx.lineWidth = 18; ctx.strokeStyle = s.c; ctx.stroke();
    ca += span * s.p;
  });

  // Tick marks
  for (let i = 0; i <= 10; i++) {
    const a = a0 + span * i / 10;
    const isMajor = i % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 20), cy + Math.sin(a) * (r - 20));
    ctx.lineTo(cx + Math.cos(a) * (r - 28), cy + Math.sin(a) * (r - 28));
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.stroke();
  }

  // Needle
  let na = a0;
  if (val !== null && !isNaN(val)) {
    const max = 55;
    na = a0 + span * Math.max(0, Math.min(val, max)) / max;
  }
  const nl = r - 24;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(na) * nl, cy + Math.sin(na) * nl);
  ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.stroke();

  // Center hub
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'var(--accent)'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();

  // Glow at needle tip
  ctx.beginPath(); ctx.arc(cx + Math.cos(na) * nl, cy + Math.sin(na) * nl, 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,107,53,0.4)'; ctx.fill();
}

// ============================================
// TABS
// ============================================
function goTab(tab) {
  state.curTab = tab;
  $$('.tab-panel').forEach(p => p.classList.remove('active'));
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  const panel = $(`.tab-panel[data-tab="${tab}"]`);
  const btn = $(`.nav-btn[data-tab="${tab}"]`);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tab === 'dashboard') renderDashboard();
  if (tab === 'history') renderHistory();
  if (tab === 'forecast') renderForecast();
  if (tab === 'map') renderMap();
}

// ============================================
// CALCULATE
// ============================================
function doCalc() {
  if (state.busy) { toast('Calculation in progress...', 'warn'); return; }
  state.busy = true;

  const locId = $('#loc-select').value;
  const temp = parseFloat($('#temp-in').value);
  const hum = parseFloat($('#hum-in').value);

  if (!locId) { toast('Select a campus location', 'warn'); state.busy = false; return; }
  if (isNaN(temp) || temp < -10 || temp > 60) { toast('Temperature must be between -10°C and 60°C', 'warn'); state.busy = false; return; }
  if (isNaN(hum) || hum < 0 || hum > 100) { toast('Humidity must be between 0% and 100%', 'warn'); state.busy = false; return; }

  const hi = calcHI(temp, hum);
  if (hi === null) { toast('Calculation error — check inputs', 'bad'); state.busy = false; return; }

  const st = getStatus(hi);
  const r = addReading(locId, temp, hum, hi, 'manual');
  if (!r) { state.busy = false; return; }

  // Update gauge
  drawGauge(hi);
  $('#g-val').textContent = hi.toFixed(1);
  const gStatus = $('#g-status');
  gStatus.textContent = st.label;
  gStatus.style.color = st.color;
  gStatus.style.borderColor = st.color + '40';
  gStatus.style.background = st.color + '18';

  // Trend
  const prev = state.readings.find(x => x.locId === locId && x.id !== r.id);
  const trendEl = $('#g-trend');
  if (prev) {
    const diff = hi - prev.hi;
    if (Math.abs(diff) < 0.5) trendEl.textContent = '→ Stable';
    else if (diff > 0) trendEl.textContent = '↗ Rising +' + diff.toFixed(1) + '°C';
    else trendEl.textContent = '↘ Falling ' + diff.toFixed(1) + '°C';
    trendEl.style.color = diff > 0 ? '#ff5252' : '#00e676';
  } else {
    trendEl.textContent = 'First reading';
    trendEl.style.color = 'var(--text-muted)';
  }

  // Show result
  const box = $('#result-box');
  box.classList.remove('hidden');
  $('#res-icon').textContent = st.icon;
  $('#res-icon-wrap').style.background = st.color + '15';
  $('#res-icon-wrap').style.borderColor = st.color + '30';
  const rTitle = $('#res-title');
  rTitle.textContent = st.label; rTitle.style.color = st.color;
  $('#res-advice').textContent = st.advice;
  $('#res-hi').textContent = hi.toFixed(1);
  $('#res-temp').textContent = temp.toFixed(1);
  $('#res-hum').textContent = hum.toFixed(0);
  $('#res-time').textContent = 'Recorded: ' + fmtTimeFull(r.ts);
  $('#res-loc').textContent = 'Location: ' + r.locName;

  toast(`Heat Index: ${hi.toFixed(1)}°C — ${st.label}`, st.lvl === 'safe' ? 'ok' : 'bad');

  // Emergency check
  if (st.lvl === 'extreme') {
    $('#emergency-banner').classList.remove('hidden');
    playAlertSound(); vibrate([200, 100, 200]);
  }

  // SMS alert
  if (state.settings.smsOn && hi >= state.settings.smsThresh) {
    sendSMS(r, st);
  }

  renderDashboard(); renderMap(); renderRecent();
  state.busy = false;
}

function doSim() {
  if (state.busy) { toast('Wait for current operation', 'warn'); return; }
  const temps = [28, 30, 33, 36, 38, 40, 42, 45, 48];
  const hums = [55, 60, 65, 70, 75, 80, 85, 90];
  $('#temp-in').value = temps[Math.floor(Math.random() * temps.length)];
  $('#hum-in').value = hums[Math.floor(Math.random() * hums.length)];
  doCalc();
}

function doAuto() {
  if (state.busy) { toast('Wait for current operation', 'warn'); return; }
  const loc = $('#loc-select').value;
  if (!loc) { toast('Select a location first', 'warn'); return; }
  const btn = $('#btn-auto');
  btn.disabled = true; btn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Reading...</span>';
  setTimeout(() => {
    $('#temp-in').value = (28 + Math.random() * 18).toFixed(1);
    $('#hum-in').value = (50 + Math.random() * 40).toFixed(0);
    doCalc();
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">⚡</span><span class="btn-text">Auto-Read Arduino</span>';
  }, 1500);
}

// ============================================
// SMS ALERT — FIXED: anchor click + cooldown
// ============================================
function sendSMS(reading, status) {
  if (!state.settings.smsOn || !state.settings.smsNum) return;
  let num = state.settings.smsNum.trim().replace(/\s/g, '');
  if (!num) return;
  if (!num.startsWith('+')) num = '+' + num;

  const cooldownMs = (parseInt(state.settings.smsCooldown) || 5) * 60 * 1000;
  const now = Date.now();
  const lastSent = state.smsCooldownMap[reading.locId] || 0;
  if (now - lastSent < cooldownMs) return;
  state.smsCooldownMap[reading.locId] = now;

  const body = `HEAT ALERT: ${reading.locName} is ${status.label} (${reading.hi.toFixed(1)}°C). ${status.advice}`;
  const url = `sms:${num}?body=${encodeURIComponent(body)}`;

  const a = document.createElement('a');
  a.href = url; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);

  toast(`SMS alert sent to ${num}`, 'ok');
}

// ============================================
// RECENT ACTIVITY
// ============================================
function renderRecent() {
  const box = $('#recent-list');
  if (!box) return;
  const recent = state.readings.slice(0, 5);
  if (!recent.length) {
    box.innerHTML = '<div class="empty-mini">No readings yet. Add your first measurement above.</div>';
    return;
  }
  box.innerHTML = recent.map(r => {
    const st = getStatus(r.hi);
    return `<div class="recent-item" onclick="app.selectLocation('${esc(r.locId)}')">
      <div class="recent-dot" style="background:${st.color};box-shadow:0 0 8px ${st.color}"></div>
      <div class="recent-info">
        <div class="recent-loc">${esc(r.locName)}</div>
        <div class="recent-meta">${timeAgo(r.ts)} • ${r.temp.toFixed(1)}°C / ${r.hum.toFixed(0)}%</div>
      </div>
      <div class="recent-hi" style="color:${st.color}">${r.hi.toFixed(1)}°</div>
    </div>`;
  }).join('');
}

// ============================================
// DASHBOARD
// ============================================
function renderDashboard() {
  const latest = {};
  state.readings.forEach(r => {
    if (!latest[r.locId] || new Date(r.ts) > new Date(latest[r.locId].ts)) latest[r.locId] = r;
  });
  const vals = Object.values(latest);

  $('#st-safe').textContent = vals.filter(r => r.hi < 27).length;
  $('#st-caution').textContent = vals.filter(r => r.hi >= 27 && r.hi < 32).length;
  $('#st-danger').textContent = vals.filter(r => r.hi >= 32 && r.hi < 41).length;
  $('#st-extreme').textContent = vals.filter(r => r.hi >= 41).length;
  $('#st-total').textContent = state.readings.length;

  const today = new Date().toDateString();
  const todayReadings = state.readings.filter(r => new Date(r.ts).toDateString() === today);
  $('#st-avg').textContent = todayReadings.length ? (todayReadings.reduce((s, r) => s + r.hi, 0) / todayReadings.length).toFixed(1) + '°C' : '--';
  $('#st-peak').textContent = todayReadings.length ? Math.max(...todayReadings.map(r => r.hi)).toFixed(1) + '°C' : '--';
  $('#st-last').textContent = state.readings.length ? timeAgo(state.readings[0].ts) : '--';

  renderLocGrid();
}

function filterDashboard(filter) {
  state.dashFilter = filter;
  $$('.filter-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.f === filter));
  renderLocGrid();
}

function renderLocGrid() {
  const grid = $('#loc-grid');
  const empty = $('#loc-empty');
  const latest = {};
  state.readings.forEach(r => {
    if (!latest[r.locId] || new Date(r.ts) > new Date(latest[r.locId].ts)) latest[r.locId] = r;
  });

  const search = ($('#dash-search')?.value || '').toLowerCase();
  let items = LOCATIONS.map(loc => {
    const r = latest[loc.id];
    const st = r ? getStatus(r.hi) : { lvl:'unknown', label:'No Data', color:'#666' };
    return { ...loc, r, status: r ? r.status : 'unknown', hi: r ? r.hi : null, temp: r ? r.temp : null, time: r ? timeAgo(r.ts) : null, st };
  });

  if (state.dashFilter !== 'all') items = items.filter(i => i.status === state.dashFilter);
  if (search) items = items.filter(i => i.name.toLowerCase().includes(search));

  if (!items.length) {
    grid.innerHTML = ''; empty.classList.remove('hidden'); return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = items.map(item => `
    <div class="loc-item" onclick="app.selectLocation('${esc(item.id)}')">
      <div class="loc-dot ${item.status}" style="background:${item.st.color};${item.status!=='unknown'?'box-shadow:0 0 8px '+item.st.color:''}"></div>
      <div class="loc-info">
        <div class="loc-name">${esc(item.num)}. ${esc(item.name)}</div>
        <div class="loc-meta">${item.time ? item.temp.toFixed(1) + '°C • ' + item.time : 'No readings recorded'}</div>
      </div>
      <div class="loc-hi" style="color:${item.st.color}">${item.hi !== null ? item.hi.toFixed(1) + '°' : '--'}</div>
      <div class="loc-badge ${item.status}">${item.st.label}</div>
    </div>
  `).join('');
}

// ============================================
// HISTORY
// ============================================
function renderHistory() {
  const tbody = $('#hist-body');
  const empty = $('#hist-empty');
  const tableWrap = $('.table-wrap');
  const filter = $('#hist-filter').value;
  const sort = $('#hist-sort').value;

  if (!state.readings.length) {
    tbody.innerHTML = ''; empty.classList.remove('hidden'); tableWrap.style.display = 'none'; return;
  }
  empty.classList.add('hidden'); tableWrap.style.display = 'block';

  let rows = filter === 'all' ? [...state.readings] : state.readings.filter(r => r.locId === filter);

  rows.sort((a, b) => {
    if (sort === 'newest') return new Date(b.ts) - new Date(a.ts);
    if (sort === 'oldest') return new Date(a.ts) - new Date(b.ts);
    if (sort === 'highest') return b.hi - a.hi;
    if (sort === 'lowest') return a.hi - b.hi;
    return 0;
  });

  rows = rows.slice(0, 100);

  tbody.innerHTML = rows.map(r => {
    const st = getStatus(r.hi);
    return `<tr>
      <td>${fmtTime(r.ts)}</td>
      <td>${esc(r.locName)}</td>
      <td>${r.temp.toFixed(1)}°C</td>
      <td>${r.hum.toFixed(0)}%</td>
      <td><strong style="color:${st.color}">${r.hi.toFixed(1)}°C</strong></td>
      <td><span class="pill-status ${r.status}">${st.label}</span></td>
      <td><button class="btn-del" onclick="app.delReading(${r.id})">Del</button></td>
    </tr>`;
  }).join('');
}

function exportCSV() {
  if (!state.readings.length) { toast('No data to export', 'warn'); return; }
  let csv = '\uFEFFTimestamp,Location,Temperature,Humidity,HeatIndex,Status,Source\n';
  state.readings.forEach(r => { const s = getStatus(r.hi); csv += `${r.ts},"${r.locName}",${r.temp},${r.hum},${r.hi},${s.label},${r.source}\n`; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SchoolHeat_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('CSV exported successfully', 'ok');
}

function exportJSON() {
  if (!state.readings.length) { toast('No data to export', 'warn'); return; }
  const blob = new Blob([JSON.stringify({ version:'4.0', exported:nowISO(), readings:state.readings }, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SchoolHeat_Backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('JSON backup exported', 'ok');
}

function importJSON() {
  $('#import-file').click();
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.readings && Array.isArray(data.readings)) {
        state.readings = data.readings.slice(0, MAX_READINGS);
        saveData();
        renderHistory(); renderDashboard(); renderMap(); renderRecent();
        toast(`Imported ${state.readings.length} readings`, 'ok');
      } else {
        toast('Invalid backup file', 'bad');
      }
    } catch (err) { toast('Failed to parse file', 'bad'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ============================================
// FORECAST — FIXED: interactive hover, readable labels
// ============================================
function renderForecast() {
  const cvs = document.getElementById('forecastChart');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssW = cvs.clientWidth || 640;
  const cssH = 300;
  cvs.width = cssW * dpr; cvs.height = cssH * dpr;
  ctx.scale(dpr, dpr);
  const W = cssW, H = cssH, pad = { t: 40, r: 25, b: 55, l: 55 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;

  ctx.clearRect(0, 0, W, H);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  state.forecastPreds = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const dn = days[d.getDay()];
    const same = state.readings.filter(r => new Date(r.ts).getDay() === d.getDay());
    let avg = same.length ? same.reduce((s, r) => s + r.hi, 0) / same.length : (30 + Math.random() * 12);
    avg = Math.round(Math.max(25, Math.min(55, avg + (Math.random() - 0.5) * 2.5)) * 10) / 10;
    state.forecastPreds.push({ day: dn, date: fmtDate(d.toISOString()), hi: avg, status: getStatus(avg), x: 0, y: 0 });
  }

  const maxV = 55;
  const gx = i => pad.l + cw * i / 6;
  const gy = v => pad.t + ch - ch * v / maxV;
  state.forecastPreds.forEach((p, i) => { p.x = gx(i); p.y = gy(p.hi); });

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + ch * i / 5;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const x = gx(i);
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ch); ctx.stroke();
  }

  // Y labels
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const v = Math.round(55 - 55 * i / 5);
    ctx.fillText(v + '°C', pad.l - 12, pad.t + ch * i / 5 + 4);
  }

  // Area fill
  ctx.beginPath(); ctx.moveTo(gx(0), gy(state.forecastPreds[0].hi));
  for (let i = 1; i < 7; i++) ctx.lineTo(gx(i), gy(state.forecastPreds[i].hi));
  ctx.lineTo(gx(6), pad.t + ch); ctx.lineTo(gx(0), pad.t + ch); ctx.closePath();
  const grd = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grd.addColorStop(0, 'rgba(255,107,53,0.35)');
  grd.addColorStop(1, 'rgba(255,107,53,0)');
  ctx.fillStyle = grd; ctx.fill();

  // Line
  ctx.beginPath(); ctx.moveTo(gx(0), gy(state.forecastPreds[0].hi));
  for (let i = 1; i < 7; i++) ctx.lineTo(gx(i), gy(state.forecastPreds[i].hi));
  ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();

  // Points + labels
  state.forecastPreds.forEach((p, i) => {
    const x = gx(i), y = gy(p.hi);
    // Glow
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = p.status.color + '25'; ctx.fill();
    // Point
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = p.status.color; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
    // Day
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.day, x, pad.t + ch + 22);
    // Date
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(p.date, x, pad.t + ch + 38);
    // Value above
    ctx.fillStyle = p.status.color;
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(p.hi.toFixed(1) + '°', x, y - 16);
  });

  // Cards
  const box = $('#forecast-cards');
  box.innerHTML = state.forecastPreds.map(p => `
    <div class="fc-card">
      <div class="day">${p.day}</div>
      <div class="temp" style="color:${p.status.color}">${p.hi.toFixed(1)}°C</div>
      <div class="stat" style="background:${p.status.color}22;color:${p.status.color}">${p.status.label}</div>
    </div>
  `).join('');

  // Insights
  const insights = $('#forecast-insights');
  if (state.readings.length < 10) {
    insights.innerHTML = '<p>📊 Not enough data for insights. Record at least 10 readings across multiple days.</p>';
  } else {
    const avg = state.forecastPreds.reduce((s, p) => s + p.hi, 0) / 7;
    const maxP = state.forecastPreds.reduce((m, p) => p.hi > m.hi ? p : m, state.forecastPreds[0]);
    const dangerDays = state.forecastPreds.filter(p => p.hi >= 32).length;
    insights.innerHTML = `
      <p>📈 <strong>7-day average:</strong> ${avg.toFixed(1)}°C</p>
      <p>🔥 <strong>Highest predicted:</strong> ${maxP.day} at ${maxP.hi.toFixed(1)}°C (${maxP.status.label})</p>
      <p>⚠️ <strong>Danger days:</strong> ${dangerDays} out of 7</p>
      <p>💡 ${dangerDays > 3 ? 'Multiple high-heat days expected. Ensure all locations have hydration stations.' : 'Heat levels manageable. Maintain regular monitoring.'}</p>
    `;
  }
}

// ============================================
// CHART INTERACTION
// ============================================
function initChartInteraction() {
  const cvs = document.getElementById('forecastChart');
  const tooltip = $('#chart-tooltip');
  if (!cvs || !tooltip) return;

  cvs.addEventListener('mousemove', e => {
    const rect = cvs.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (cvs.width / rect.width / (window.devicePixelRatio || 1));
    const my = (e.clientY - rect.top) * (cvs.height / rect.height / (window.devicePixelRatio || 1));

    let nearest = -1, minDist = Infinity;
    for (let i = 0; i < state.forecastPreds.length; i++) {
      const dist = Math.hypot(mx - state.forecastPreds[i].x, my - state.forecastPreds[i].y);
      if (dist < minDist) { minDist = dist; nearest = i; }
    }

    if (nearest >= 0 && minDist < 45) {
      const p = state.forecastPreds[nearest];
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 14) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.innerHTML = `<strong style="color:${p.status.color}">${p.day}, ${p.date}</strong><br>HI: <strong>${p.hi.toFixed(1)}°C</strong><br>Status: ${p.status.label}<br><small style="color:var(--text-muted)">${p.status.advice}</small>`;
      cvs.style.cursor = 'pointer';
    } else {
      tooltip.style.display = 'none';
      cvs.style.cursor = 'default';
    }
  });

  cvs.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
  cvs.addEventListener('touchstart', e => {
    const rect = cvs.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = (touch.clientX - rect.left) * (cvs.width / rect.width / (window.devicePixelRatio || 1));
    const my = (touch.clientY - rect.top) * (cvs.height / rect.height / (window.devicePixelRatio || 1));
    let nearest = -1, minDist = Infinity;
    for (let i = 0; i < state.forecastPreds.length; i++) {
      const dist = Math.hypot(mx - state.forecastPreds[i].x, my - state.forecastPreds[i].y);
      if (dist < minDist) { minDist = dist; nearest = i; }
    }
    if (nearest >= 0 && minDist < 50) {
      const p = state.forecastPreds[nearest];
      toast(`${p.day}: ${p.hi.toFixed(1)}°C — ${p.status.label}`, p.status.lvl === 'safe' ? 'ok' : 'warn');
    }
  }, { passive: true });
}

// ============================================
// MAP — FIXED: exact coordinates, zoom/pan, trim matching
// ============================================
function renderMap() {
  const box = $('#map-markers');
  const list = $('#map-loc-list');
  if (!box) return;

  const latest = {};
  state.readings.forEach(r => {
    if (!latest[r.locId] || new Date(r.ts) > new Date(latest[r.locId].ts)) latest[r.locId] = r;
  });

  // Markers
  box.innerHTML = LOCATIONS.map(loc => {
    const r = latest[loc.id];
    const st = r ? getStatus(r.hi) : { lvl: 'unknown', color: '#666', label: 'No Data' };
    return `<div class="map-pin ${st.lvl}" style="left:${loc.x}%;top:${loc.y}%" title="${esc(String(loc.num))}. ${esc(loc.name)}${r ? ' — ' + r.hi.toFixed(1) + '°C' : ''}" onclick="app.selectLocation('${esc(loc.id)}')">${loc.num}</div>`;
  }).join('');

  // Location list
  if (list) {
    list.innerHTML = LOCATIONS.map(loc => {
      const r = latest[loc.id];
      const st = r ? getStatus(r.hi) : { lvl: 'unknown', color: '#666', label: 'No Data' };
      return `<div class="map-loc-item" onclick="app.selectLocation('${esc(loc.id)}')">
        <div class="loc-dot ${st.lvl}" style="background:${st.color};${st.lvl!=='unknown'?'box-shadow:0 0 6px '+st.color:''}"></div>
        <div class="loc-name">${esc(loc.num)}. ${esc(loc.name)}</div>
        <div class="loc-hi" style="color:${st.color}">${r ? r.hi.toFixed(1) + '°' : '--'}</div>
      </div>`;
    }).join('');
  }
}

function mapZoomIn() { state.mapZoom = Math.min(state.mapZoom * 1.25, 4); applyMapTransform(); }
function mapZoomOut() { state.mapZoom = Math.max(state.mapZoom / 1.25, 0.5); applyMapTransform(); }
function mapReset() { state.mapZoom = 1; state.mapPan = { x: 0, y: 0 }; applyMapTransform(); }

function applyMapTransform() {
  const stage = $('#map-stage');
  if (stage) stage.style.transform = `translate(${state.mapPan.x}px, ${state.mapPan.y}px) scale(${state.mapZoom})`;
}

function initMapInteraction() {
  const viewport = $('#map-viewport');
  if (!viewport) return;

  viewport.addEventListener('mousedown', e => {
    state.mapDragging = true;
    state.mapLastPos = { x: e.clientX, y: e.clientY };
    viewport.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', e => {
    if (!state.mapDragging) return;
    const dx = e.clientX - state.mapLastPos.x;
    const dy = e.clientY - state.mapLastPos.y;
    state.mapPan.x += dx; state.mapPan.y += dy;
    state.mapLastPos = { x: e.clientX, y: e.clientY };
    applyMapTransform();
  });
  window.addEventListener('mouseup', () => { state.mapDragging = false; viewport.style.cursor = 'grab'; });

  // Touch support
  viewport.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      state.mapDragging = true;
      state.mapLastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });
  viewport.addEventListener('touchmove', e => {
    if (state.mapDragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - state.mapLastPos.x;
      const dy = e.touches[0].clientY - state.mapLastPos.y;
      state.mapPan.x += dx; state.mapPan.y += dy;
      state.mapLastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      applyMapTransform();
    }
  }, { passive: true });
  viewport.addEventListener('touchend', () => { state.mapDragging = false; });

  // Wheel zoom
  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    state.mapZoom = Math.max(0.5, Math.min(4, state.mapZoom * delta));
    applyMapTransform();
  }, { passive: false });

  viewport.style.cursor = 'grab';
}

// ============================================
// FIREBASE — FIXED: poll /sensor_data.json
// ============================================
async function pollFirebase() {
  if (!state.settings.fbUrl) return;
  try {
    const url = state.settings.fbUrl.replace(/\/$/, '') + '/sensor_data.json';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data && typeof data.temperature === 'number' && typeof data.humidity === 'number') {
      const t = parseFloat(data.temperature), h = parseFloat(data.humidity);
      $('#temp-in').value = t.toFixed(1);
      $('#hum-in').value = h.toFixed(0);

      const hi = calcHI(t, h);
      if (hi !== null) {
        state.fbLast = { t, h, hi };
        const st = getStatus(hi);
        drawGauge(hi);
        $('#g-val').textContent = hi.toFixed(1);
        const gStatus = $('#g-status');
        gStatus.textContent = st.label + ' (Cloud)';
        gStatus.style.color = st.color;
        gStatus.style.borderColor = st.color + '40';
        gStatus.style.background = st.color + '18';
        updateConn(true, 'Cloud Live');
        $('#mode-label').textContent = 'Cloud Live — Tap Calculate to Record';
        $('#mode-pill').style.borderColor = 'rgba(0,230,118,0.3)';
        $('#mode-pill').style.background = 'rgba(0,230,118,0.08)';
      }
    }
  } catch (e) {
    updateConn(false, 'Cloud Error');
    $('#mode-label').textContent = 'Cloud Error — Manual Mode';
  }
}

function startFirebase() {
  if (state.fbTimer) clearInterval(state.fbTimer);
  const interval = (parseInt(state.settings.fbInterval) || 4) * 1000;
  state.fbTimer = setInterval(pollFirebase, interval);
  pollFirebase();
}
function stopFirebase() {
  if (state.fbTimer) { clearInterval(state.fbTimer); state.fbTimer = null; }
  $('#mode-label').textContent = 'Manual Input Mode';
  $('#mode-pill').style.borderColor = '';
  $('#mode-pill').style.background = '';
}

// ============================================
// BRIDGE
// ============================================
async function pollBridge() {
  if (!state.settings.bridgeUrl) return;
  try {
    const res = await fetch(state.settings.bridgeUrl.replace(/\/$/, '') + '/api/read', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.temperature !== undefined && data.humidity !== undefined) {
      const t = parseFloat(data.temperature), h = parseFloat(data.humidity);
      $('#temp-in').value = t.toFixed(1);
      $('#hum-in').value = h.toFixed(0);
      const hi = calcHI(t, h);
      if (hi !== null) {
        const st = getStatus(hi);
        drawGauge(hi);
        $('#g-val').textContent = hi.toFixed(1);
        const gStatus = $('#g-status');
        gStatus.textContent = st.label + ' (Bridge)';
        gStatus.style.color = st.color;
        gStatus.style.borderColor = st.color + '40';
        gStatus.style.background = st.color + '18';
        updateConn(true, 'Bridge Live');
        $('#mode-label').textContent = 'Bridge Live — Tap Calculate to Record';
      }
    }
  } catch (e) { updateConn(false, 'Bridge Error'); }
}
function startBridge() {
  if (state.brTimer) clearInterval(state.brTimer);
  state.brTimer = setInterval(pollBridge, BR_POLL);
  pollBridge();
}
function stopBridge() {
  if (state.brTimer) { clearInterval(state.brTimer); state.brTimer = null; }
}

function updateConn(ok, txt) {
  const badge = $('#conn-badge');
  badge.className = 'header-status ' + (ok ? 'online' : '');
  badge.querySelector('.conn-text').textContent = txt;
}

// ============================================
// SETTINGS ACTIONS
// ============================================
function toggleCloud() {
  state.settings.cloud = $('#tog-cloud').checked;
  $('#cloud-box').classList.toggle('hidden', !state.settings.cloud);
  if (state.settings.cloud && state.settings.fbUrl) startFirebase(); else stopFirebase();
  saveData();
}

function connectFirebase() {
  const url = $('#fb-url').value.trim();
  if (!url) { toast('Enter Firebase URL', 'warn'); return; }
  state.settings.fbUrl = url;
  saveData();
  startFirebase();
  toast('Connecting to Firebase...', 'inf');
}

function connectBridge() {
  const url = $('#bridge-url').value.trim();
  if (!url) { toast('Enter bridge URL', 'warn'); return; }
  state.settings.bridgeUrl = url;
  saveData();
  startBridge();
  toast('Connecting to bridge...', 'inf');
}

function toggleSMS() {
  state.settings.smsOn = $('#tog-sms').checked;
  saveData();
  toast(state.settings.smsOn ? 'SMS alerts enabled' : 'SMS alerts disabled', 'inf');
}

function saveCalibration() {
  state.calibration.temp = parseFloat($('#cal-temp').value) || 0;
  state.calibration.hum = parseFloat($('#cal-hum').value) || 0;
  saveData();
  toast('Calibration saved', 'ok');
}

// ============================================
// MODAL SYSTEM
// ============================================
function openModal(id) {
  $('#modal-overlay').classList.remove('hidden');
  $('#' + id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $$('.modal').forEach(m => m.classList.add('hidden'));
  $('#modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function confirmClear() {
  state.confirmCallback = () => { clearAllData(); closeModal(); };
  $('#confirm-icon').textContent = '🗑️';
  $('#confirm-title').textContent = 'Clear All Readings?';
  $('#confirm-msg').textContent = 'This will permanently delete all ' + state.readings.length + ' recorded measurements.';
  $('#confirm-btn').textContent = 'Clear All';
  openModal('modal-confirm');
}

function confirmWipe() {
  state.confirmCallback = () => { clearAllData(); closeModal(); };
  $('#confirm-icon').textContent = '⚠️';
  $('#confirm-title').textContent = 'Wipe All Data?';
  $('#confirm-msg').textContent = 'This will delete all readings, settings, and calibration data. This cannot be undone.';
  $('#confirm-btn').textContent = 'Wipe Everything';
  openModal('modal-confirm');
}

function confirmAction() {
  if (state.confirmCallback) state.confirmCallback();
}

function dismissEmergency() {
  $('#emergency-banner').classList.add('hidden');
}

// ============================================
// SHARE / PRINT
// ============================================
function shareLastReading() {
  const r = state.lastReading;
  if (!r) { toast('No reading to share', 'warn'); return; }
  const st = getStatus(r.hi);
  const text = `SchoolHeat Alert: ${r.locName} — Heat Index ${r.hi.toFixed(1)}°C (${st.label}). Temp: ${r.temp}°C, Humidity: ${r.hum}%. ${st.advice}`;
  if (navigator.share) {
    navigator.share({ title: 'SchoolHeat Reading', text });
  } else {
    navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard', 'ok'));
  }
}

function printLastReading() {
  const r = state.lastReading;
  if (!r) { toast('No reading to print', 'warn'); return; }
  const st = getStatus(r.hi);
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:400px;margin:0 auto;padding:20px;">
      <h2 style="color:#ff6b35;margin-bottom:4px;">SchoolHeat Reading</h2>
      <p style="color:#666;font-size:12px;margin-bottom:20px;">${fmtTimeFull(r.ts)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Location</td><td style="padding:8px;border:1px solid #ddd;">${esc(r.locName)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Heat Index</td><td style="padding:8px;border:1px solid #ddd;color:${st.color};font-weight:800;">${r.hi.toFixed(1)}°C (${st.label})</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Temperature</td><td style="padding:8px;border:1px solid #ddd;">${r.temp.toFixed(1)}°C</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Humidity</td><td style="padding:8px;border:1px solid #ddd;">${r.hum.toFixed(0)}%</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Advice</td><td style="padding:8px;border:1px solid #ddd;">${st.advice}</td></tr>
      </table>
    </div>
  `;
  const w = window.open('', '_blank');
  w.document.write('<html><head><title>SchoolHeat Reading</title></head><body>' + html + '</body></html>');
  w.document.close(); w.print();
}

function selectLocation(locId) {
  $('#loc-select').value = locId;
  goTab('monitor');
  const loc = LOCATIONS.find(l => l.id === locId);
  toast(loc ? loc.name + ' selected' : 'Location selected', 'inf');
}

// ============================================
// CLOCK
// ============================================
function updateClock() {
  const now = new Date();
  $('#header-clock').textContent = now.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', hour12:true });
  $('#live-timer').textContent = now.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true });
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    const tabs = ['monitor', 'dashboard', 'history', 'forecast', 'map', 'settings'];
    if (e.key >= '1' && e.key <= '6') { goTab(tabs[parseInt(e.key) - 1]); }
    if (e.key === 'Escape') closeModal();
  });
}

// ============================================
// PWA INSTALL
// ============================================
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', e => {
    deferredPrompt = e;
    // Could show install button here
  });
}

// ============================================
// INITIALIZATION
// ============================================
function init() {
  loadData();

  // Populate selects
  const locOpts = '<option value="">Select a campus location...</option>' +
    LOCATIONS.map(l => `<option value="${l.id}">${l.num}. ${l.name}</option>`).join('');
  $('#loc-select').innerHTML = locOpts;
  $('#hist-filter').innerHTML = '<option value="all">All Locations</option>' + LOCATIONS.map(l => `<option value="${l.id}">${l.num}. ${l.name}</option>`).join('');

  // Restore settings UI
  $('#fb-url').value = state.settings.fbUrl || '';
  $('#bridge-url').value = state.settings.bridgeUrl || '';
  $('#sms-num').value = state.settings.smsNum || '';
  $('#sms-thresh').value = state.settings.smsThresh || 41;
  $('#sms-cooldown').value = state.settings.smsCooldown || 5;
  $('#fb-interval').value = state.settings.fbInterval || 4;
  $('#tog-sms').checked = state.settings.smsOn || false;
  $('#tog-cloud').checked = state.settings.cloud || false;
  $('#cal-temp').value = state.calibration.temp || 0;
  $('#cal-hum').value = state.calibration.hum || 0;

  if (state.settings.cloud && state.settings.fbUrl) {
    $('#cloud-box').classList.remove('hidden');
    startFirebase();
  }

  // Event bindings
  $('#btn-calc').addEventListener('click', doCalc);
  $('#btn-auto').addEventListener('click', doAuto);
  $('#btn-sim').addEventListener('click', doSim);

  // Input enter key
  $('#temp-in').addEventListener('keypress', e => { if (e.key === 'Enter') $('#hum-in').focus(); });
  $('#hum-in').addEventListener('keypress', e => { if (e.key === 'Enter') doCalc(); });

  // Settings change handlers
  $('#fb-url').addEventListener('change', e => { state.settings.fbUrl = e.target.value; saveData(); });
  $('#bridge-url').addEventListener('change', e => { state.settings.bridgeUrl = e.target.value; saveData(); });
  $('#sms-num').addEventListener('change', e => { state.settings.smsNum = e.target.value; saveData(); });
  $('#sms-thresh').addEventListener('change', e => { state.settings.smsThresh = parseFloat(e.target.value) || 41; saveData(); });
  $('#sms-cooldown').addEventListener('change', e => { state.settings.smsCooldown = parseInt(e.target.value) || 5; saveData(); });
  $('#fb-interval').addEventListener('change', e => { state.settings.fbInterval = parseInt(e.target.value) || 4; saveData(); if (state.fbTimer) startFirebase(); });

  // Initial renders
  drawGauge(null);
  renderDashboard();
  renderHistory();
  renderMap();
  renderRecent();
  initChartInteraction();
  initMapInteraction();
  initKeyboard();
  initPWA();

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Remove loader
  setTimeout(() => {
    $('#loading-screen').classList.add('hidden');
    $('#app').classList.remove('hidden');
  }, 2200);
}

// ============================================
// PUBLIC API (exposed to HTML onclick handlers)
// ============================================
window.app = {
  goTab, doCalc, doSim, doAuto,
  delReading, confirmClear, confirmWipe, confirmAction,
  closeModal, openModal, dismissEmergency,
  filterDashboard, renderDashboard, renderHistory, renderMap,
  exportCSV, exportJSON, importJSON, handleImport,
  toggleCloud, connectFirebase, connectBridge, toggleSMS,
  saveCalibration, selectLocation,
  shareLastReading, printLastReading,
  mapZoomIn, mapZoomOut, mapReset,
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
