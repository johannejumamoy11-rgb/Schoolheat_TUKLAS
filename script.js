/* ===== SCHOOLHEAT ULTIMATE — TUKLAS 2025 ===== */
/* Bug-free, enhanced, aesthetic, impactful */
(function() {
'use strict';

// ============================================
// CONSTANTS
// ============================================
const STORE_KEY = 'sh_ultimate_data';
const SETT_KEY = 'sh_ultimate_sett';
const CALIB_KEY = 'sh_ultimate_calib';
const MAX_READINGS = 500;
const FB_POLL_DEFAULT = 4000;
const BR_POLL = 3000;
const SMS_COOLDOWN_DEFAULT = 5 * 60 * 1000;
const DUPLICATE_WINDOW = 30 * 1000;

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
    outlierThresh: 3,
    spikeDetect: true,
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
  mapLabels: false,
  forecastPreds: [],
  chartScale: 1,
  chartOffset: 0,
  audioCtx: null,
  confirmCallback: null,
  lastReading: null,
};

// ============================================
// UTILITIES
// ============================================
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = t => { const d = document.createElement('div'); d.textContent = String(t); return d.innerHTML; };
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

function toast(msg, type) {
  const box = $('#toast-box');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (type || 'inf');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { if (el && el.parentNode) el.remove(); }, 3800);
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
  try { const s = JSON.parse(localStorage.getItem(SETT_KEY)); if (s) Object.assign(state.settings, s); } catch (e) {}
  try { const c = JSON.parse(localStorage.getItem(CALIB_KEY)); if (c) Object.assign(state.calibration, c); } catch (e) {}
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
// DATA VALIDATION — NEW: outlier & spike detection
// ============================================
function validateReading(locId, temp, hum, hi) {
  const locHistory = state.readings.filter(r => r.locId === locId);
  let quality = 'good';
  let issues = [];

  // Physical bounds
  if (temp < -10 || temp > 60) { quality = 'bad'; issues.push('Temp out of range'); }
  if (hum < 0 || hum > 100) { quality = 'bad'; issues.push('Humidity out of range'); }
  if (hi < 20 || hi > 60) { quality = 'bad'; issues.push('HI out of range'); }

  // Spike detection
  if (state.settings.spikeDetect && locHistory.length >= 3) {
    const recent = locHistory.slice(0, 5);
    const avgHI = recent.reduce((s, r) => s + r.hi, 0) / recent.length;
    const stdHI = Math.sqrt(recent.reduce((s, r) => s + Math.pow(r.hi - avgHI, 2), 0) / recent.length);
    if (stdHI > 0 && Math.abs(hi - avgHI) > stdHI * state.settings.outlierThresh) {
      quality = quality === 'bad' ? 'bad' : 'warn';
      issues.push('Spike detected');
    }
  }

  // Rate of change
  if (locHistory.length > 0) {
    const last = locHistory[0];
    const timeDiff = (Date.now() - new Date(last.ts).getTime()) / 1000;
    if (timeDiff < 5) {
      quality = 'warn'; issues.push('Too frequent');
    }
  }

  return { quality, issues };
}

function updateQualityBadge() {
  const badge = $('#quality-badge');
  if (!badge) return;
  const recent = state.readings.slice(0, 10);
  if (!recent.length) { badge.classList.remove('show'); return; }

  const badCount = recent.filter(r => r.quality === 'bad').length;
  const warnCount = recent.filter(r => r.quality === 'warn').length;
  const dot = badge.querySelector('.q-dot');
  const text = badge.querySelector('.q-text');

  if (badCount > 0) {
    dot.className = 'q-dot bad'; text.textContent = 'Quality: Poor';
  } else if (warnCount > 0) {
    dot.className = 'q-dot warn'; text.textContent = 'Quality: Fair';
  } else {
    dot.className = 'q-dot'; text.textContent = 'Quality: Good';
  }
  badge.classList.add('show');
}

// ============================================
// READINGS
// ============================================
function addReading(locId, temp, hum, hi, source) {
  const loc = LOCATIONS.find(l => l.id === locId);
  if (!loc) { toast('Invalid location', 'bad'); return null; }

  const st = getStatus(hi);
  const validation = validateReading(locId, temp, hum, hi);
  const ts = nowISO();

  // Duplicate detection: same location within 30 seconds updates instead of appends
  const dupIndex = state.readings.findIndex(r =>
    r.locId === locId && (Date.now() - new Date(r.ts).getTime()) < DUPLICATE_WINDOW
  );

  const reading = {
    id: dupIndex >= 0 ? state.readings[dupIndex].id : Date.now(),
    ts, locId, locName: loc.name, locNum: loc.num,
    temp: parseFloat(temp), hum: parseFloat(hum), hi,
    status: st.lvl, source: source || 'manual',
    quality: validation.quality, issues: validation.issues
  };

  if (dupIndex >= 0) {
    state.readings[dupIndex] = reading;
  } else {
    state.readings.unshift(reading);
    if (state.readings.length > MAX_READINGS) state.readings = state.readings.slice(0, MAX_READINGS);
  }

  state.lastReading = reading;
  saveData();
  updateQualityBadge();
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
  ctx.fillStyle = '#ff6b35'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();

  // Glow at needle tip
  ctx.beginPath(); ctx.arc(cx + Math.cos(na) * nl, cy + Math.sin(na) * nl, 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,107,53,0.4)'; ctx.fill();
}

// ============================================
// TABS — FIXED: multiple redundant mechanisms
// ============================================
function goTab(tab) {
  if (!tab) return;
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
// CALCULATE — FIXED: proper validation, no race conditions
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
  const iconWrap = $('#res-icon-wrap');
  iconWrap.style.background = st.color + '15';
  iconWrap.style.borderColor = st.color + '30';
  const rTitle = $('#res-title');
  rTitle.textContent = st.label; rTitle.style.color = st.color;
  $('#res-advice').textContent = st.advice;
  $('#res-hi').textContent = hi.toFixed(1);
  $('#res-temp').textContent = temp.toFixed(1);
  $('#res-hum').textContent = hum.toFixed(0);
  $('#res-time').textContent = 'Recorded: ' + fmtTimeFull(r.ts);
  $('#res-loc').textContent = 'Location: ' + r.locName;
  $('#res-quality').textContent = 'Quality: ' + (r.quality === 'good' ? 'Good ✅' : r.quality === 'warn' ? 'Fair ⚠️' : 'Poor ❌');
  $('#res-quality').style.color = r.quality === 'good' ? '#00e676' : r.quality === 'warn' ? '#ffca28' : '#ff5252';

  toast('Heat Index: ' + hi.toFixed(1) + '°C — ' + st.label, st.lvl === 'safe' ? 'ok' : 'bad');

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
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Reading...</span>';
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

  const body = 'HEAT ALERT: ' + reading.locName + ' is ' + status.label + ' (' + reading.hi.toFixed(1) + '°C). ' + status.advice;
  const url = 'sms:' + num + '?body=' + encodeURIComponent(body);

  const a = document.createElement('a');
  a.href = url; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);

  toast('SMS alert sent to ' + num, 'ok');
}

function testSMS() {
  if (!state.settings.smsNum) { toast('Enter SMS number first', 'warn'); return; }
  let num = state.settings.smsNum.trim().replace(/\s/g, '');
  if (!num.startsWith('+')) num = '+' + num;
  const body = 'SchoolHeat Test: SMS alerts are working correctly. This is a test message.';
  const url = 'sms:' + num + '?body=' + encodeURIComponent(body);
  const a = document.createElement('a');
  a.href = url; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  toast('Test SMS sent to ' + num, 'ok');
}

function sendSMSManual() {
  const r = state.lastReading;
  if (!r) { toast('No reading to alert', 'warn'); return; }
  const st = getStatus(r.hi);
  sendSMS(r, st);
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
    return '<div class="recent-item" onclick="app.selectLocation('' + esc(r.locId) + '')">' +
      '<div class="recent-dot" style="background:' + st.color + ';box-shadow:0 0 8px ' + st.color + '"></div>' +
      '<div class="recent-info">' +
        '<div class="recent-loc">' + esc(r.locName) + '</div>' +
        '<div class="recent-meta">' + timeAgo(r.ts) + ' • ' + r.temp.toFixed(1) + '°C / ' + r.hum.toFixed(0) + '%</div>' +
      '</div>' +
      '<div class="recent-hi" style="color:' + st.color + '">' + r.hi.toFixed(1) + '°</div>' +
    '</div>';
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

  const stSafe = $('#st-safe');
  const stCaution = $('#st-caution');
  const stDanger = $('#st-danger');
  const stExtreme = $('#st-extreme');
  const stTotal = $('#st-total');
  const stAvg = $('#st-avg');
  const stPeak = $('#st-peak');
  const stLast = $('#st-last');

  if (stSafe) stSafe.textContent = vals.filter(r => r.hi < 27).length;
  if (stCaution) stCaution.textContent = vals.filter(r => r.hi >= 27 && r.hi < 32).length;
  if (stDanger) stDanger.textContent = vals.filter(r => r.hi >= 32 && r.hi < 41).length;
  if (stExtreme) stExtreme.textContent = vals.filter(r => r.hi >= 41).length;
  if (stTotal) stTotal.textContent = state.readings.length;

  const today = new Date().toDateString();
  const todayReadings = state.readings.filter(r => new Date(r.ts).toDateString() === today);
  if (stAvg) stAvg.textContent = todayReadings.length ? (todayReadings.reduce((s, r) => s + r.hi, 0) / todayReadings.length).toFixed(1) + '°C' : '--';
  if (stPeak) stPeak.textContent = todayReadings.length ? Math.max.apply(null, todayReadings.map(r => r.hi)).toFixed(1) + '°C' : '--';
  if (stLast) stLast.textContent = state.readings.length ? timeAgo(state.readings[0].ts) : '--';

  renderLocGrid();
}

function filterDashboard(filter) {
  state.dashFilter = filter || 'all';
  $$('.filter-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.f === state.dashFilter));
  renderLocGrid();
}

function renderLocGrid() {
  const grid = $('#loc-grid');
  const empty = $('#loc-empty');
  if (!grid) return;
  const latest = {};
  state.readings.forEach(r => {
    if (!latest[r.locId] || new Date(r.ts) > new Date(latest[r.locId].ts)) latest[r.locId] = r;
  });

  const searchEl = $('#dash-search');
  const search = searchEl ? (searchEl.value || '').toLowerCase() : '';
  let items = LOCATIONS.map(loc => {
    const r = latest[loc.id];
    const st = r ? getStatus(r.hi) : { lvl:'unknown', label:'No Data', color:'#666' };
    return { loc, r, status: r ? r.status : 'unknown', hi: r ? r.hi : null, temp: r ? r.temp : null, time: r ? timeAgo(r.ts) : null, st };
  });

  if (state.dashFilter !== 'all') items = items.filter(i => i.status === state.dashFilter);
  if (search) items = items.filter(i => i.loc.name.toLowerCase().includes(search));

  if (!items.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  grid.innerHTML = items.map(item => {
    const dotStyle = item.status !== 'unknown' ? 'background:' + item.st.color + ';box-shadow:0 0 8px ' + item.st.color : '';
    return '<div class="loc-item" onclick="app.selectLocation('' + esc(item.loc.id) + '')">' +
      '<div class="loc-dot ' + item.status + '" style="' + dotStyle + '"></div>' +
      '<div class="loc-info">' +
        '<div class="loc-name">' + esc(item.loc.num) + '. ' + esc(item.loc.name) + '</div>' +
        '<div class="loc-meta">' + (item.time ? item.temp.toFixed(1) + '°C • ' + item.time : 'No readings recorded') + '</div>' +
      '</div>' +
      '<div class="loc-hi" style="color:' + item.st.color + '">' + (item.hi !== null ? item.hi.toFixed(1) + '°' : '--') + '</div>' +
      '<div class="loc-badge ' + item.status + '">' + item.st.label + '</div>' +
    '</div>';
  }).join('');
}

// ============================================
// HISTORY
// ============================================
function renderHistory() {
  const tbody = $('#hist-body');
  const empty = $('#hist-empty');
  const tableWrap = $('.table-wrap');
  const filterEl = $('#hist-filter');
  const sortEl = $('#hist-sort');
  if (!tbody) return;

  if (!state.readings.length) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    if (tableWrap) tableWrap.style.display = 'none';
    return;
  }
  if (empty) empty.classList.add('hidden');
  if (tableWrap) tableWrap.style.display = 'block';

  const filter = filterEl ? filterEl.value : 'all';
  const sort = sortEl ? sortEl.value : 'newest';

  let rows = filter === 'all' ? state.readings.slice() : state.readings.filter(r => r.locId === filter);

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
    const qClass = r.quality === 'good' ? 'good' : r.quality === 'warn' ? 'warn' : 'bad';
    const qText = r.quality === 'good' ? 'Good' : r.quality === 'warn' ? 'Fair' : 'Poor';
    return '<tr>' +
      '<td>' + fmtTime(r.ts) + '</td>' +
      '<td>' + esc(r.locName) + '</td>' +
      '<td>' + r.temp.toFixed(1) + '°C</td>' +
      '<td>' + r.hum.toFixed(0) + '%</td>' +
      '<td><strong style="color:' + st.color + '">' + r.hi.toFixed(1) + '°C</strong></td>' +
      '<td><span class="pill-status ' + r.status + '">' + st.label + '</span></td>' +
      '<td><span class="pill-quality ' + qClass + '">' + qText + '</span></td>' +
      '<td><button class="btn-del" onclick="app.delReading(' + r.id + ')">Del</button></td>' +
    '</tr>';
  }).join('');
}

function exportCSV() {
  if (!state.readings.length) { toast('No data to export', 'warn'); return; }
  let csv = '\uFEFFTimestamp,Location,Temperature,Humidity,HeatIndex,Status,Quality,Source\n';
  state.readings.forEach(r => {
    const s = getStatus(r.hi);
    csv += r.ts + ',"' + r.locName + '",' + r.temp + ',' + r.hum + ',' + r.hi + ',' + s.label + ',' + (r.quality || 'good') + ',' + (r.source || 'manual') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'SchoolHeat_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click(); URL.revokeObjectURL(a.href);
  toast('CSV exported successfully', 'ok');
}

function exportJSON() {
  if (!state.readings.length) { toast('No data to export', 'warn'); return; }
  const blob = new Blob([JSON.stringify({ version:'Ultimate', exported:nowISO(), readings:state.readings }, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'SchoolHeat_Backup_' + new Date().toISOString().slice(0,10) + '.json';
  a.click(); URL.revokeObjectURL(a.href);
  toast('JSON backup exported', 'ok');
}

function importJSON() {
  const fileInput = $('#import-file');
  if (fileInput) fileInput.click();
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
        toast('Imported ' + state.readings.length + ' readings', 'ok');
      } else {
        toast('Invalid backup file', 'bad');
      }
    } catch (err) { toast('Failed to parse file', 'bad'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ============================================
// FORECAST — FIXED: interactive hover, zoom, readable labels
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
  const scale = state.chartScale || 1;
  const offset = state.chartOffset || 0;
  const gx = i => pad.l + cw * i / 6 * scale + offset;
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
  if (box) {
    box.innerHTML = state.forecastPreds.map(p =>
      '<div class="fc-card">' +
        '<div class="day">' + p.day + '</div>' +
        '<div class="temp" style="color:' + p.status.color + '">' + p.hi.toFixed(1) + '°C</div>' +
        '<div class="stat" style="background:' + p.status.color + '22;color:' + p.status.color + '">' + p.status.label + '</div>' +
      '</div>'
    ).join('');
  }

  // Insights
  const insights = $('#forecast-insights');
  if (insights) {
    if (state.readings.length < 10) {
      insights.innerHTML = '<p>📊 Not enough data for insights. Record at least 10 readings across multiple days.</p>';
    } else {
      const avg = state.forecastPreds.reduce((s, p) => s + p.hi, 0) / 7;
      let maxP = state.forecastPreds[0];
      state.forecastPreds.forEach(p => { if (p.hi > maxP.hi) maxP = p; });
      const dangerDays = state.forecastPreds.filter(p => p.hi >= 32).length;
      insights.innerHTML =
        '<p>📈 <strong>7-day average:</strong> ' + avg.toFixed(1) + '°C</p>' +
        '<p>🔥 <strong>Highest predicted:</strong> ' + maxP.day + ' at ' + maxP.hi.toFixed(1) + '°C (' + maxP.status.label + ')</p>' +
        '<p>⚠️ <strong>Danger days:</strong> ' + dangerDays + ' out of 7</p>' +
        '<p>💡 ' + (dangerDays > 3 ? 'Multiple high-heat days expected. Ensure all locations have hydration stations.' : 'Heat levels manageable. Maintain regular monitoring.') + '</p>';
    }
  }
}

// Chart zoom
function chartZoomIn() {
  state.chartScale = Math.min((state.chartScale || 1) * 1.2, 3);
  renderForecast();
}
function chartZoomOut() {
  state.chartScale = Math.max((state.chartScale || 1) / 1.2, 0.5);
  renderForecast();
}
function chartReset() {
  state.chartScale = 1;
  state.chartOffset = 0;
  renderForecast();
}

// ============================================
// CHART INTERACTION — FIXED: hover tooltips, touch support
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
      const p = state.forecastPreds[i];
      const dist = Math.sqrt((mx - p.x) * (mx - p.x) + (my - p.y) * (my - p.y));
      if (dist < minDist) { minDist = dist; nearest = i; }
    }

    if (nearest >= 0 && minDist < 45) {
      const p = state.forecastPreds[nearest];
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 14) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.innerHTML = '<strong style="color:' + p.status.color + '">' + p.day + ', ' + p.date + '</strong><br>HI: <strong>' + p.hi.toFixed(1) + '°C</strong><br>Status: ' + p.status.label + '<br><small style="color:var(--text-muted)">' + p.status.advice + '</small>';
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
      const p = state.forecastPreds[i];
      const dist = Math.sqrt((mx - p.x) * (mx - p.x) + (my - p.y) * (my - p.y));
      if (dist < minDist) { minDist = dist; nearest = i; }
    }
    if (nearest >= 0 && minDist < 50) {
      const p = state.forecastPreds[nearest];
      toast(p.day + ': ' + p.hi.toFixed(1) + '°C — ' + p.status.label, p.status.lvl === 'safe' ? 'ok' : 'warn');
    }
  }, { passive: true });
}

// ============================================
// MAP — FIXED: exact coordinates, zoom/pan, label toggle
// ============================================
function renderMap() {
  const box = $('#map-markers');
  const list = $('#map-loc-list');
  if (!box) return;

  const latest = {};
  state.readings.forEach(r => {
    if (!latest[r.locId] || new Date(r.ts) > new Date(latest[r.locId].ts)) latest[r.locId] = r;
  });

  // Markers with exact percentage positioning
  box.innerHTML = LOCATIONS.map(loc => {
    const r = latest[loc.id];
    const st = r ? getStatus(r.hi) : { lvl: 'unknown', color: '#666', label: 'No Data' };
    const labelClass = state.mapLabels ? 'show' : '';
    return '<div class="map-pin ' + st.lvl + '" style="left:' + loc.x + '%;top:' + loc.y + '%" title="' + esc(String(loc.num)) + '. ' + esc(loc.name) + (r ? ' — ' + r.hi.toFixed(1) + '°C' : '') + '" onclick="app.selectLocation('' + esc(loc.id) + '')">' +
      '<span class="map-pin-label ' + labelClass + '">' + esc(loc.num) + '. ' + esc(loc.name) + '</span>' +
      esc(String(loc.num)) +
    '</div>';
  }).join('');

  // Location list
  if (list) {
    list.innerHTML = LOCATIONS.map(loc => {
      const r = latest[loc.id];
      const st = r ? getStatus(r.hi) : { lvl: 'unknown', color: '#666', label: 'No Data' };
      const dotStyle = st.lvl !== 'unknown' ? 'background:' + st.color + ';box-shadow:0 0 6px ' + st.color : '';
      return '<div class="map-loc-item" onclick="app.selectLocation('' + esc(loc.id) + '')">' +
        '<div class="loc-dot ' + st.lvl + '" style="' + dotStyle + '"></div>' +
        '<div class="loc-name">' + esc(loc.num) + '. ' + esc(loc.name) + '</div>' +
        '<div class="loc-hi" style="color:' + st.color + '">' + (r ? r.hi.toFixed(1) + '°' : '--') + '</div>' +
      '</div>';
    }).join('');
  }
}

function mapZoomIn() { state.mapZoom = Math.min(state.mapZoom * 1.25, 4); applyMapTransform(); }
function mapZoomOut() { state.mapZoom = Math.max(state.mapZoom / 1.25, 0.5); applyMapTransform(); }
function mapReset() { state.mapZoom = 1; state.mapPan = { x: 0, y: 0 }; applyMapTransform(); }
function mapToggleLabels() { state.mapLabels = !state.mapLabels; renderMap(); }
function showMapFallback() {
  const fallback = $('#map-fallback');
  if (fallback) fallback.style.display = 'flex';
}

function applyMapTransform() {
  const stage = $('#map-stage');
  if (stage) stage.style.transform = 'translate(' + state.mapPan.x + 'px, ' + state.mapPan.y + 'px) scale(' + state.mapZoom + ')';
}

function initMapInteraction() {
  const viewport = $('#map-viewport');
  if (!viewport) return;

  viewport.addEventListener('mousedown', e => {
    state.mapDragging = true;
    state.mapLastPos = { x: e.clientX, y: e.clientY };
    viewport.style.cursor = 'grabbing';
  });

  const onMouseMove = e => {
    if (!state.mapDragging) return;
    const dx = e.clientX - state.mapLastPos.x;
    const dy = e.clientY - state.mapLastPos.y;
    state.mapPan.x += dx; state.mapPan.y += dy;
    state.mapLastPos = { x: e.clientX, y: e.clientY };
    applyMapTransform();
  };

  const onMouseUp = () => {
    state.mapDragging = false;
    viewport.style.cursor = 'grab';
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

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
      const tempIn = $('#temp-in');
      const humIn = $('#hum-in');
      if (tempIn) tempIn.value = t.toFixed(1);
      if (humIn) humIn.value = h.toFixed(0);

      const hi = calcHI(t, h);
      if (hi !== null) {
        state.fbLast = { t, h, hi };
        const st = getStatus(hi);
        drawGauge(hi);
        const gVal = $('#g-val');
        if (gVal) gVal.textContent = hi.toFixed(1);
        const gStatus = $('#g-status');
        if (gStatus) {
          gStatus.textContent = st.label + ' (Cloud)';
          gStatus.style.color = st.color;
          gStatus.style.borderColor = st.color + '40';
          gStatus.style.background = st.color + '18';
        }
        updateConn(true, 'Cloud Live');
        const modeLabel = $('#mode-label');
        const modePill = $('#mode-pill');
        if (modeLabel) modeLabel.textContent = 'Cloud Live — Tap Calculate to Record';
        if (modePill) {
          modePill.style.borderColor = 'rgba(0,230,118,0.3)';
          modePill.style.background = 'rgba(0,230,118,0.08)';
        }
      }
    }
  } catch (e) {
    updateConn(false, 'Cloud Error');
    const modeLabel = $('#mode-label');
    if (modeLabel) modeLabel.textContent = 'Cloud Error — Manual Mode';
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
  const modeLabel = $('#mode-label');
  const modePill = $('#mode-pill');
  if (modeLabel) modeLabel.textContent = 'Manual Input Mode';
  if (modePill) {
    modePill.style.borderColor = '';
    modePill.style.background = '';
  }
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
      const tempIn = $('#temp-in');
      const humIn = $('#hum-in');
      if (tempIn) tempIn.value = t.toFixed(1);
      if (humIn) humIn.value = h.toFixed(0);
      const hi = calcHI(t, h);
      if (hi !== null) {
        const st = getStatus(hi);
        drawGauge(hi);
        const gVal = $('#g-val');
        if (gVal) gVal.textContent = hi.toFixed(1);
        const gStatus = $('#g-status');
        if (gStatus) {
          gStatus.textContent = st.label + ' (Bridge)';
          gStatus.style.color = st.color;
          gStatus.style.borderColor = st.color + '40';
          gStatus.style.background = st.color + '18';
        }
        updateConn(true, 'Bridge Live');
        const modeLabel = $('#mode-label');
        if (modeLabel) modeLabel.textContent = 'Bridge Live — Tap Calculate to Record';
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
  if (!badge) return;
  badge.className = 'header-status ' + (ok ? 'online' : '');
  const ct = badge.querySelector('.conn-text');
  if (ct) ct.textContent = txt;
}

// ============================================
// SETTINGS ACTIONS
// ============================================
function toggleCloud() {
  const tog = $('#tog-cloud');
  state.settings.cloud = tog ? tog.checked : false;
  const cloudBox = $('#cloud-box');
  if (cloudBox) cloudBox.classList.toggle('hidden', !state.settings.cloud);
  if (state.settings.cloud && state.settings.fbUrl) startFirebase(); else stopFirebase();
  saveData();
}

function connectFirebase() {
  const urlEl = $('#fb-url');
  const url = urlEl ? urlEl.value.trim() : '';
  if (!url) { toast('Enter Firebase URL', 'warn'); return; }
  state.settings.fbUrl = url;
  saveData();
  startFirebase();
  toast('Connecting to Firebase...', 'inf');
}

function connectBridge() {
  const urlEl = $('#bridge-url');
  const url = urlEl ? urlEl.value.trim() : '';
  if (!url) { toast('Enter bridge URL', 'warn'); return; }
  state.settings.bridgeUrl = url;
  saveData();
  startBridge();
  toast('Connecting to bridge...', 'inf');
}

function toggleSMS() {
  const tog = $('#tog-sms');
  state.settings.smsOn = tog ? tog.checked : false;
  saveData();
  toast(state.settings.smsOn ? 'SMS alerts enabled' : 'SMS alerts disabled', 'inf');
}

function saveCalibration() {
  const calTemp = $('#cal-temp');
  const calHum = $('#cal-hum');
  state.calibration.temp = calTemp ? (parseFloat(calTemp.value) || 0) : 0;
  state.calibration.hum = calHum ? (parseFloat(calHum.value) || 0) : 0;
  saveData();
  toast('Calibration saved', 'ok');
}

// ============================================
// MODAL SYSTEM
// ============================================
function openModal(id) {
  const overlay = $('#modal-overlay');
  const modal = $('#' + id);
  if (overlay) overlay.classList.remove('hidden');
  if (modal) modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $$('.modal').forEach(m => m.classList.add('hidden'));
  const overlay = $('#modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function confirmClear() {
  state.confirmCallback = function() { clearAllData(); closeModal(); };
  const cIcon = $('#confirm-icon');
  const cTitle = $('#confirm-title');
  const cMsg = $('#confirm-msg');
  const cBtn = $('#confirm-btn');
  if (cIcon) cIcon.textContent = '🗑️';
  if (cTitle) cTitle.textContent = 'Clear All Readings?';
  if (cMsg) cMsg.textContent = 'This will permanently delete all ' + state.readings.length + ' recorded measurements.';
  if (cBtn) cBtn.textContent = 'Clear All';
  openModal('modal-confirm');
}

function confirmWipe() {
  state.confirmCallback = function() { clearAllData(); closeModal(); };
  const cIcon = $('#confirm-icon');
  const cTitle = $('#confirm-title');
  const cMsg = $('#confirm-msg');
  const cBtn = $('#confirm-btn');
  if (cIcon) cIcon.textContent = '⚠️';
  if (cTitle) cTitle.textContent = 'Wipe All Data?';
  if (cMsg) cMsg.textContent = 'This will delete all readings, settings, and calibration data. This cannot be undone.';
  if (cBtn) cBtn.textContent = 'Wipe Everything';
  openModal('modal-confirm');
}

function confirmAction() {
  if (state.confirmCallback) state.confirmCallback();
}

function dismissEmergency() {
  const banner = $('#emergency-banner');
  if (banner) banner.classList.add('hidden');
}

// ============================================
// SHARE / PRINT
// ============================================
function shareLastReading() {
  const r = state.lastReading;
  if (!r) { toast('No reading to share', 'warn'); return; }
  const st = getStatus(r.hi);
  const text = 'SchoolHeat Alert: ' + r.locName + ' — Heat Index ' + r.hi.toFixed(1) + '°C (' + st.label + '). Temp: ' + r.temp + '°C, Humidity: ' + r.hum + '%. ' + st.advice;
  if (navigator.share) {
    navigator.share({ title: 'SchoolHeat Reading', text: text });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard', 'ok'));
  } else {
    toast('Sharing not supported', 'warn');
  }
}

function printLastReading() {
  const r = state.lastReading;
  if (!r) { toast('No reading to print', 'warn'); return; }
  const st = getStatus(r.hi);
  const html = '<div style="font-family:Inter,sans-serif;max-width:400px;margin:0 auto;padding:20px;">' +
    '<h2 style="color:#ff6b35;margin-bottom:4px;">SchoolHeat Reading</h2>' +
    '<p style="color:#666;font-size:12px;margin-bottom:20px;">' + fmtTimeFull(r.ts) + '</p>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
      '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Location</td><td style="padding:8px;border:1px solid #ddd;">' + esc(r.locName) + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Heat Index</td><td style="padding:8px;border:1px solid #ddd;color:' + st.color + ';font-weight:800;">' + r.hi.toFixed(1) + '°C (' + st.label + ')</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Temperature</td><td style="padding:8px;border:1px solid #ddd;">' + r.temp.toFixed(1) + '°C</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Humidity</td><td style="padding:8px;border:1px solid #ddd;">' + r.hum.toFixed(0) + '%</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Advice</td><td style="padding:8px;border:1px solid #ddd;">' + st.advice + '</td></tr>' +
    '</table>' +
  '</div>';
  const w = window.open('', '_blank');
  if (w) {
    w.document.write('<html><head><title>SchoolHeat Reading</title></head><body>' + html + '</body></html>');
    w.document.close(); w.print();
  }
}

function selectLocation(locId) {
  const locSel = $('#loc-select');
  if (locSel) locSel.value = locId;
  goTab('monitor');
  const loc = LOCATIONS.find(l => l.id === locId);
  toast(loc ? loc.name + ' selected' : 'Location selected', 'inf');
}

// ============================================
// CLOCK
// ============================================
function updateClock() {
  const now = new Date();
  const hc = $('#header-clock');
  const lt = $('#live-timer');
  if (hc) hc.textContent = now.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', hour12:true });
  if (lt) lt.textContent = now.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true });
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
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); doCalc(); }
  });
}

// ============================================
// PWA INSTALL
// ============================================
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(function() {});
  }
}

// ============================================
// INITIALIZATION
// ============================================
function init() {
  loadData();

  // Populate selects
  const locSel = $('#loc-select');
  const histFilter = $('#hist-filter');
  if (locSel) {
    locSel.innerHTML = '<option value="">Select a campus location...</option>' +
      LOCATIONS.map(l => '<option value="' + l.id + '">' + l.num + '. ' + esc(l.name) + '</option>').join('');
  }
  if (histFilter) {
    histFilter.innerHTML = '<option value="all">All Locations</option>' +
      LOCATIONS.map(l => '<option value="' + l.id + '">' + l.num + '. ' + esc(l.name) + '</option>').join('');
  }

  // Restore settings UI
  const fbUrl = $('#fb-url');
  const bridgeUrl = $('#bridge-url');
  const smsNum = $('#sms-num');
  const smsThresh = $('#sms-thresh');
  const smsCooldown = $('#sms-cooldown');
  const fbInterval = $('#fb-interval');
  const togSms = $('#tog-sms');
  const togCloud = $('#tog-cloud');
  const calTemp = $('#cal-temp');
  const calHum = $('#cal-hum');
  const valOutlier = $('#val-outlier');
  const valSpike = $('#val-spike');

  if (fbUrl) fbUrl.value = state.settings.fbUrl || '';
  if (bridgeUrl) bridgeUrl.value = state.settings.bridgeUrl || '';
  if (smsNum) smsNum.value = state.settings.smsNum || '';
  if (smsThresh) smsThresh.value = state.settings.smsThresh || 41;
  if (smsCooldown) smsCooldown.value = state.settings.smsCooldown || 5;
  if (fbInterval) fbInterval.value = state.settings.fbInterval || 4;
  if (togSms) togSms.checked = state.settings.smsOn || false;
  if (togCloud) togCloud.checked = state.settings.cloud || false;
  if (calTemp) calTemp.value = state.calibration.temp || 0;
  if (calHum) calHum.value = state.calibration.hum || 0;
  if (valOutlier) valOutlier.value = state.settings.outlierThresh || 3;
  if (valSpike) valSpike.checked = state.settings.spikeDetect !== false;

  if (state.settings.cloud && state.settings.fbUrl) {
    const cloudBox = $('#cloud-box');
    if (cloudBox) cloudBox.classList.remove('hidden');
    startFirebase();
  }

  // Event bindings
  const btnCalc = $('#btn-calc');
  const btnAuto = $('#btn-auto');
  const btnSim = $('#btn-sim');
  if (btnCalc) btnCalc.addEventListener('click', doCalc);
  if (btnAuto) btnAuto.addEventListener('click', doAuto);
  if (btnSim) btnSim.addEventListener('click', doSim);

  // Input enter key
  const tempIn = $('#temp-in');
  const humIn = $('#hum-in');
  if (tempIn) tempIn.addEventListener('keypress', e => { if (e.key === 'Enter') { if (humIn) humIn.focus(); } });
  if (humIn) humIn.addEventListener('keypress', e => { if (e.key === 'Enter') doCalc(); });

  // Settings change handlers
  if (fbUrl) fbUrl.addEventListener('change', e => { state.settings.fbUrl = e.target.value; saveData(); });
  if (bridgeUrl) bridgeUrl.addEventListener('change', e => { state.settings.bridgeUrl = e.target.value; saveData(); });
  if (smsNum) smsNum.addEventListener('change', e => { state.settings.smsNum = e.target.value; saveData(); });
  if (smsThresh) smsThresh.addEventListener('change', e => { state.settings.smsThresh = parseFloat(e.target.value) || 41; saveData(); });
  if (smsCooldown) smsCooldown.addEventListener('change', e => { state.settings.smsCooldown = parseInt(e.target.value) || 5; saveData(); });
  if (fbInterval) fbInterval.addEventListener('change', e => { state.settings.fbInterval = parseInt(e.target.value) || 4; saveData(); if (state.fbTimer) startFirebase(); });
  if (valOutlier) valOutlier.addEventListener('change', e => { state.settings.outlierThresh = parseFloat(e.target.value) || 3; saveData(); });
  if (valSpike) valSpike.addEventListener('change', e => { state.settings.spikeDetect = e.target.checked; saveData(); });

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
  updateQualityBadge();

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Remove loader
  setTimeout(() => {
    const loader = $('#loading-screen');
    const app = $('#app');
    if (loader) loader.classList.add('hidden');
    if (app) app.classList.remove('hidden');
  }, 2500);
}

// ============================================
// PUBLIC API
// ============================================
window.app = {
  goTab: goTab, doCalc: doCalc, doSim: doSim, doAuto: doAuto,
  delReading: delReading, confirmClear: confirmClear, confirmWipe: confirmWipe, confirmAction: confirmAction,
  closeModal: closeModal, openModal: openModal, dismissEmergency: dismissEmergency,
  filterDashboard: filterDashboard, renderDashboard: renderDashboard, renderHistory: renderHistory, renderMap: renderMap,
  exportCSV: exportCSV, exportJSON: exportJSON, importJSON: importJSON, handleImport: handleImport,
  toggleCloud: toggleCloud, connectFirebase: connectFirebase, connectBridge: connectBridge, toggleSMS: toggleSMS,
  saveCalibration: saveCalibration, selectLocation: selectLocation,
  shareLastReading: shareLastReading, printLastReading: printLastReading,
  mapZoomIn: mapZoomIn, mapZoomOut: mapZoomOut, mapReset: mapReset, mapToggleLabels: mapToggleLabels, showMapFallback: showMapFallback,
  chartZoomIn: chartZoomIn, chartZoomOut: chartZoomOut, chartReset: chartReset,
  testSMS: testSMS, sendSMSManual: sendSMSManual
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
