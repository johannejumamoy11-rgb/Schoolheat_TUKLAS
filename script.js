/* ===== SCHOOLHEAT ULTIMATE v3.0 ENHANCED — TUKLAS 2026 ===== */

(function() {
'use strict';

// ============================================
// CONFIG & STATE
// ============================================
const CONFIG = {
  firebasePollInterval: 3000,
  localPollInterval: 2000,
  maxHistory: 100,
  demoData: false
};

const STATE = {
  readings: [],
  currentTab: 'monitor',
  cloudMode: false,
  localMode: false,
  firebaseUrl: '',
  localUrl: '',
  isProcessing: false,
  firebaseTimer: null,
  localTimer: null,
  lastFirebaseData: null,
  locations: [
    'Front Gate', 'Quadrangle', 'Covered Walkway',
    'Classroom, SBP4BE Building AusAID', 'School Clinic',
    "Principal's Office", 'Faculty Room', 'Library',
    'Science Lab', 'Computer Lab', 'Canteen', 'Gymnasium',
    'Auditorium', 'TLE Workshop', 'AVR Room',
    'Guidance Office', 'Registrar Office', 'Supply Room',
    'Boys Comfort Room', 'Girls Comfort Room',
    'Open Covered Court', 'Flag Pole Area', 'Parking Area',
    'Garden Area', 'Basketball Court', 'Volleyball Court',
    'Water Station', 'Waiting Shed', 'Perimeter Fence'
  ]
};

// Map coordinates (percentage x, y on campus map image)
const MAP_COORDS = {
  'Front Gate': [50, 92],
  'Quadrangle': [45, 55],
  'Covered Walkway': [40, 45],
  'Classroom, SBP4BE Building AusAID': [35, 35],
  'School Clinic': [60, 40],
  "Principal's Office": [55, 30],
  'Faculty Room': [50, 25],
  'Library': [30, 30],
  'Science Lab': [25, 40],
  'Computer Lab': [20, 35],
  'Canteen': [70, 50],
  'Gymnasium': [75, 35],
  'Auditorium': [65, 25],
  'TLE Workshop': [15, 50],
  'AVR Room': [40, 20],
  'Guidance Office': [45, 15],
  'Registrar Office': [50, 10],
  'Supply Room': [80, 45],
  'Boys Comfort Room': [35, 60],
  'Girls Comfort Room': [40, 60],
  'Open Covered Court': [60, 65],
  'Flag Pole Area': [50, 75],
  'Parking Area': [80, 80],
  'Garden Area': [20, 70],
  'Basketball Court': [70, 70],
  'Volleyball Court': [75, 60],
  'Water Station': [85, 55],
  'Waiting Shed': [15, 85],
  'Perimeter Fence': [90, 90]
};

// ============================================
// DOM REFERENCES
// ============================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ============================================
// HEAT INDEX CALCULATION (Steadman-Rothfusz)
// ============================================
function calculateHeatIndex(T, R) {
  T = parseFloat(T); R = parseFloat(R);
  if (isNaN(T) || isNaN(R)) return null;
  if (T < 0 || T > 60) return null;
  if (R < 0 || R > 100) return null;

  // Convert to Fahrenheit for Steadman equation
  const Tf = T * 9/5 + 32;
  const Rf = R;

  const c = [
    -42.379, 2.04901523, 10.14333127, -0.22475541,
    -6.83783e-3, -5.481717e-2, 1.22874e-3, 8.5282e-4, -1.99e-6
  ];

  let HI = c[0] + c[1]*Tf + c[2]*Rf + c[3]*Tf*Rf +
           c[4]*Tf*Tf + c[5]*Rf*Rf + c[6]*Tf*Tf*Rf +
           c[7]*Tf*Rf*Rf + c[8]*Tf*Tf*Rf*Rf;

  if (Rf < 13 && Tf >= 80 && Tf <= 112) {
    const adj = ((13 - Rf) / 4) * Math.sqrt((17 - Math.abs(Tf - 95)) / 17);
    HI -= adj;
  }
  if (Rf > 85 && Tf >= 80 && Tf <= 87) {
    const adj = ((Rf - 85) / 10) * ((87 - Tf) / 5);
    HI += adj;
  }
  if (HI < Tf) HI = Tf;

  // Convert back to Celsius
  return Math.round(((HI - 32) * 5/9) * 10) / 10;
}

function getHeatStatus(HI) {
  if (HI < 27) return { level: 'safe', label: 'Safe', color: '#10b981', icon: '✅', advice: 'Conditions are comfortable. Normal activities are safe.' };
  if (HI < 32) return { level: 'caution', label: 'Caution', color: '#f59e0b', icon: '⚠️', advice: 'Fatigue possible with prolonged exposure. Stay hydrated and take breaks.' };
  if (HI < 41) return { level: 'danger', label: 'Danger', color: '#f97316', icon: '🔥', advice: 'Heat cramps and heat exhaustion likely. Limit outdoor activities.' };
  return { level: 'extreme', label: 'Extreme Danger', color: '#ef4444', icon: '☠️', advice: 'Heat stroke imminent! Avoid outdoor activities. Seek air conditioning.' };
}

// ============================================
// GAUGE RENDERING
// ============================================
function drawGauge(value) {
  const canvas = document.getElementById('heatGauge');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 280;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2, radius = 110;
  const startAngle = Math.PI * 0.75;
  const endAngle = Math.PI * 2.25;
  const totalAngle = endAngle - startAngle;

  ctx.clearRect(0, 0, size, size);

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.lineWidth = 18;
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Colored segments with glow
  const segments = [
    { pct: 0.30, color: '#10b981' },
    { pct: 0.25, color: '#f59e0b' },
    { pct: 0.30, color: '#f97316' },
    { pct: 0.15, color: '#ef4444' }
  ];

  let currentAngle = startAngle;
  segments.forEach(seg => {
    const segAngle = totalAngle * seg.pct;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, currentAngle, currentAngle + segAngle);
    ctx.lineWidth = 18;
    ctx.strokeStyle = seg.color;
    ctx.lineCap = 'butt';
    ctx.shadowColor = seg.color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    currentAngle += segAngle;
  });

  // Tick marks
  for (let i = 0; i <= 10; i++) {
    const angle = startAngle + (totalAngle * i / 10);
    const isMajor = i % 5 === 0;
    const tickLen = isMajor ? 12 : 6;
    const innerR = radius - 22;
    const outerR = radius - 22 - tickLen;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.stroke();
  }

  // Needle
  let needleAngle;
  if (value === null || isNaN(value)) {
    needleAngle = startAngle;
  } else {
    const maxVal = 55;
    const clamped = Math.max(0, Math.min(value, maxVal));
    needleAngle = startAngle + (totalAngle * clamped / maxVal);
  }

  const needleLen = radius - 30;
  const nx = cx + Math.cos(needleAngle) * needleLen;
  const ny = cy + Math.sin(needleAngle) * needleLen;

  // Needle shadow
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx + 2, ny + 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Needle body
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#ff6b35';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Glow on needle tip
  ctx.beginPath();
  ctx.arc(nx, ny, 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 107, 53, 0.4)';
  ctx.fill();
}

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(tabName) {
  STATE.currentTab = tabName;
  $$('.tab-panel').forEach(p => p.classList.remove('active'));
  $$('.nav-btn').forEach(b => b.classList.remove('active'));

  const panel = $(`#tab-${tabName}`);
  const btn = $(`.nav-btn[data-tab="${tabName}"]`);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');

  if (tabName === 'dashboard') renderDashboard();
  if (tabName === 'history') renderHistory();
  if (tabName === 'prediction') renderPrediction();
  if (tabName === 'map') renderMap();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// TOAST NOTIFICATIONS (Enhanced with SVG icons)
// ============================================
function showToast(message, type = 'info') {
  const container = $('#toast-container');
  if (!container) return;

  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-icon ${type}">${icons[type]}</div><div class="toast-message">${message}</div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px) scale(0.95)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3300);
}

// ============================================
// READING MANAGEMENT
// ============================================
function addReading(location, temp, humidity, heatIndex) {
  const status = getHeatStatus(heatIndex);
  const reading = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    location,
    temp: parseFloat(temp),
    humidity: parseFloat(humidity),
    heatIndex,
    status: status.level
  };

  STATE.readings.unshift(reading);
  if (STATE.readings.length > CONFIG.maxHistory) {
    STATE.readings = STATE.readings.slice(0, CONFIG.maxHistory);
  }

  saveReadings();
  return reading;
}

function deleteReading(id) {
  STATE.readings = STATE.readings.filter(r => r.id !== id);
  saveReadings();
  renderHistory();
  renderDashboard();
  renderMap();
  showToast('Reading deleted', 'success');
}

function saveReadings() {
  try { localStorage.setItem('schoolheat_readings', JSON.stringify(STATE.readings)); } catch(e) {}
}

function loadReadings() {
  try {
    const data = localStorage.getItem('schoolheat_readings');
    if (data) STATE.readings = JSON.parse(data);
  } catch(e) {}
}

function clearAllData() {
  STATE.readings = [];
  saveReadings();
  renderHistory();
  renderDashboard();
  renderMap();
  showToast('All data cleared', 'success');
}

// ============================================
// RENDER FUNCTIONS
// ============================================
function renderDashboard() {
  const safe = STATE.readings.filter(r => r.status === 'safe').length;
  const caution = STATE.readings.filter(r => r.status === 'caution').length;
  const danger = STATE.readings.filter(r => r.status === 'danger' || r.status === 'extreme').length;
  const total = STATE.readings.length;

  animateValue($('#stat-safe'), parseInt($('#stat-safe').textContent) || 0, safe, 600);
  animateValue($('#stat-caution'), parseInt($('#stat-caution').textContent) || 0, caution, 600);
  animateValue($('#stat-danger'), parseInt($('#stat-danger').textContent) || 0, danger, 600);
  animateValue($('#stat-total'), parseInt($('#stat-total').textContent) || 0, total, 600);

  renderLocationsList('all');
}

function animateValue(el, from, to, duration) {
  if (!el || from === to) return;
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderLocationsList(filter) {
  const list = $('#locations-list');
  if (!list) return;

  const latestByLoc = {};
  STATE.readings.forEach(r => {
    if (!latestByLoc[r.location] || new Date(r.timestamp) > new Date(latestByLoc[r.location].timestamp)) {
      latestByLoc[r.location] = r;
    }
  });

  const items = STATE.locations.map(loc => {
    const r = latestByLoc[loc];
    return {
      name: loc,
      reading: r,
      status: r ? r.status : 'unknown',
      heatIndex: r ? r.heatIndex : null,
      temp: r ? r.temp : null,
      time: r ? formatTime(r.timestamp) : null
    };
  });

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  list.innerHTML = filtered.map(item => {
    const status = item.status === 'unknown' ? { level: 'unknown', label: 'No Data' } : getHeatStatus(item.heatIndex);
    return `
      <div class="location-item" data-location="${escapeHtml(item.name)}">
        <div class="location-dot ${item.status}"></div>
        <div class="location-info">
          <div class="location-name">${escapeHtml(item.name)}</div>
          <div class="location-meta">${item.time ? item.temp.toFixed(1) + '°C • ' + item.time : 'No readings yet'}</div>
        </div>
        <div class="location-badge ${item.status}">${status.label}</div>
      </div>
    `;
  }).join('');
}

function renderHistory() {
  const tbody = $('#history-tbody');
  const empty = $('#history-empty');
  if (!tbody) return;

  if (STATE.readings.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = STATE.readings.slice(0, 50).map(r => {
    const status = getHeatStatus(r.heatIndex);
    return `
      <tr>
        <td>${formatTime(r.timestamp)}</td>
        <td>${escapeHtml(r.location)}</td>
        <td>${r.temp.toFixed(1)}°C</td>
        <td>${r.humidity.toFixed(0)}%</td>
        <td><strong style="color:${status.color}">${r.heatIndex.toFixed(1)}°C</strong></td>
        <td><span class="status-pill ${r.status}">${status.label}</span></td>
        <td><button class="btn-delete" data-id="${r.id}">Delete</button></td>
      </tr>
    `;
  }).join('');

  $$('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteReading(parseInt(btn.dataset.id)));
  });
}

function renderPrediction() {
  const canvas = document.getElementById('predictionChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 600 * dpr;
  canvas.height = 300 * dpr;
  ctx.scale(dpr, dpr);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const predictions = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayName = days[date.getDay()];

    const sameDayReadings = STATE.readings.filter(r => {
      const d = new Date(r.timestamp);
      return d.getDay() === date.getDay();
    });

    let avgHI;
    if (sameDayReadings.length > 0) {
      avgHI = sameDayReadings.reduce((s, r) => s + r.heatIndex, 0) / sameDayReadings.length;
    } else {
      avgHI = STATE.readings.length > 0
        ? STATE.readings.reduce((s, r) => s + r.heatIndex, 0) / STATE.readings.length
        : 32 + Math.random() * 8;
    }

    avgHI = Math.round((avgHI + (Math.random() - 0.5) * 3) * 10) / 10;
    avgHI = Math.max(25, Math.min(55, avgHI));

    predictions.push({ day: dayName, fullDate: date.toLocaleDateString(), heatIndex: avgHI, status: getHeatStatus(avgHI) });
  }

  const padding = { top: 40, right: 30, bottom: 50, left: 50 };
  const chartW = 600 - padding.left - padding.right;
  const chartH = 300 - padding.top - padding.bottom;

  ctx.clearRect(0, 0, 600, 300);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartH * i / 5);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();
  }

  // Y-axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '11px Inter';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const val = 55 - (55 * i / 5);
    const y = padding.top + (chartH * i / 5);
    ctx.fillText(val.toFixed(0) + '°C', padding.left - 10, y + 4);
  }

  const maxVal = 55;
  const getX = (i) => padding.left + (chartW * i / 6);
  const getY = (val) => padding.top + chartH - (chartH * val / maxVal);

  // Area fill
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(predictions[0].heatIndex));
  for (let i = 1; i < predictions.length; i++) {
    ctx.lineTo(getX(i), getY(predictions[i].heatIndex));
  }
  ctx.lineTo(getX(6), padding.top + chartH);
  ctx.lineTo(getX(0), padding.top + chartH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
  grad.addColorStop(0, 'rgba(255, 107, 53, 0.25)');
  grad.addColorStop(1, 'rgba(255, 107, 53, 0.0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(predictions[0].heatIndex));
  for (let i = 1; i < predictions.length; i++) {
    ctx.lineTo(getX(i), getY(predictions[i].heatIndex));
  }
  ctx.strokeStyle = '#ff6b35';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#ff6b35';
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Points
  predictions.forEach((p, i) => {
    const x = getX(i);
    const y = getY(p.heatIndex);

    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = p.status.color;
    ctx.shadowColor = p.status.color;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // X labels
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(p.day, x, padding.top + chartH + 20);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px Inter';
    ctx.fillText(p.fullDate, x, padding.top + chartH + 34);
  });

  const cardsContainer = $('#prediction-cards');
  if (cardsContainer) {
    cardsContainer.innerHTML = predictions.map(p => `
      <div class="prediction-card">
        <div class="day">${p.day}</div>
        <div class="temp" style="color:${p.status.color}">${p.heatIndex.toFixed(1)}°C</div>
        <div class="status" style="background:${p.status.color}18;color:${p.status.color}">${p.status.label}</div>
      </div>
    `).join('');
  }
}

// ============================================
// MAP WITH COORDINATE PINS
// ============================================
function renderMap() {
  const pinsContainer = $('#map-pins');
  if (!pinsContainer) return;

  const latestByLoc = {};
  STATE.readings.forEach(r => {
    if (!latestByLoc[r.location] || new Date(r.timestamp) > new Date(latestByLoc[r.location].timestamp)) {
      latestByLoc[r.location] = r;
    }
  });

  pinsContainer.innerHTML = STATE.locations.map(loc => {
    const r = latestByLoc[loc];
    const status = r ? r.status : 'unknown';
    const hi = r ? r.heatIndex.toFixed(1) + '°C' : 'No data';
    const coords = MAP_COORDS[loc] || [50, 50];
    const [x, y] = coords;

    return `
      <div class="map-pin ${status}" style="left:${x}%;top:${y}%">
        <div class="pin-tooltip"><strong>${escapeHtml(loc)}</strong>${hi}</div>
      </div>
    `;
  }).join('');
}

function updateGauge(value, status) {
  drawGauge(value);
  const numEl = $('#gauge-number');
  const statusEl = $('#gauge-status');
  if (numEl) numEl.textContent = value !== null && !isNaN(value) ? value.toFixed(1) : '--';
  if (statusEl) {
    statusEl.textContent = status ? status.label : 'Ready';
    statusEl.style.color = status ? status.color : 'var(--text-dim)';
    statusEl.style.borderColor = status ? status.color + '40' : 'var(--glass-border)';
    statusEl.style.background = status ? status.color + '15' : 'rgba(255,255,255,0.05)';
  }
}

// ============================================
// FIREBASE INTEGRATION
// ============================================
async function fetchFirebaseData() {
  if (!STATE.firebaseUrl) return;
  try {
    const url = STATE.firebaseUrl.replace(/\/$/, '') + '/sensor_data.json';
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();

    if (data && data.temperature !== undefined && data.humidity !== undefined) {
      const temp = parseFloat(data.temperature);
      const humidity = parseFloat(data.humidity);
      const hi = calculateHeatIndex(temp, humidity);

      if (hi !== null) {
        if (STATE.currentTab === 'monitor') {
          const status = getHeatStatus(hi);
          updateGauge(hi, status);
          $('#temp-input').value = temp.toFixed(1);
          $('#humidity-input').value = humidity.toFixed(0);

          const loc = $('#location-select').value;
          if (loc && (!STATE.lastFirebaseData ||
              Math.abs(STATE.lastFirebaseData.temp - temp) > 0.5 ||
              Math.abs(STATE.lastFirebaseData.humidity - humidity) > 2)) {
            addReading(loc, temp, humidity, hi);
            STATE.lastFirebaseData = { temp, humidity };
            showToast(`Updated: ${loc} — ${hi.toFixed(1)}°C`, 'info');
          }
        }
        updateConnectionStatus('online', 'Cloud Live');
      }
    }
  } catch (err) {
    console.error('Firebase error:', err);
    updateConnectionStatus('offline', 'Cloud Error');
  }
}

function startFirebasePolling() {
  if (STATE.firebaseTimer) clearInterval(STATE.firebaseTimer);
  STATE.firebaseTimer = setInterval(fetchFirebaseData, CONFIG.firebasePollInterval);
  fetchFirebaseData();
}

function stopFirebasePolling() {
  if (STATE.firebaseTimer) { clearInterval(STATE.firebaseTimer); STATE.firebaseTimer = null; }
}

// ============================================
// LOCAL BRIDGE INTEGRATION
// ============================================
async function fetchLocalData() {
  if (!STATE.localUrl) return;
  try {
    const response = await fetch(STATE.localUrl + '/data', { method: 'GET', cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();

    if (data.temperature !== undefined && data.humidity !== undefined) {
      const temp = parseFloat(data.temperature);
      const humidity = parseFloat(data.humidity);
      const hi = calculateHeatIndex(temp, humidity);

      if (hi !== null && STATE.currentTab === 'monitor') {
        const status = getHeatStatus(hi);
        updateGauge(hi, status);
        $('#temp-input').value = temp.toFixed(1);
        $('#humidity-input').value = humidity.toFixed(0);
      }
      updateConnectionStatus('online', 'Local Live');
    }
  } catch (err) {
    updateConnectionStatus('offline', 'Local Error');
  }
}

function startLocalPolling() {
  if (STATE.localTimer) clearInterval(STATE.localTimer);
  STATE.localTimer = setInterval(fetchLocalData, CONFIG.localPollInterval);
  fetchLocalData();
}

function stopLocalPolling() {
  if (STATE.localTimer) { clearInterval(STATE.localTimer); STATE.localTimer = null; }
}

function updateConnectionStatus(state, text) {
  const badge = $('#connection-status');
  if (!badge) return;
  badge.className = 'status-badge ' + (state === 'online' ? 'online' : '');
  badge.querySelector('.status-text').textContent = text;
}

// ============================================
// EVENT HANDLERS
// ============================================
function handleCalculate() {
  if (STATE.isProcessing) return;
  STATE.isProcessing = true;

  const location = $('#location-select').value;
  const temp = parseFloat($('#temp-input').value);
  const humidity = parseFloat($('#humidity-input').value);

  if (!location) { showToast('Please select a location', 'warning'); STATE.isProcessing = false; return; }
  if (isNaN(temp) || temp < 0 || temp > 60) { showToast('Temperature must be 0-60°C', 'warning'); STATE.isProcessing = false; return; }
  if (isNaN(humidity) || humidity < 0 || humidity > 100) { showToast('Humidity must be 0-100%', 'warning'); STATE.isProcessing = false; return; }

  const hi = calculateHeatIndex(temp, humidity);
  if (hi === null) { showToast('Calculation error', 'error'); STATE.isProcessing = false; return; }

  const status = getHeatStatus(hi);
  const reading = addReading(location, temp, humidity, hi);

  updateGauge(hi, status);

  const resultPanel = $('#result-panel');
  resultPanel.classList.remove('hidden');
  $('#result-icon').textContent = status.icon;
  $('#result-status').textContent = status.label;
  $('#result-status').style.color = status.color;
  $('#result-advice').textContent = status.advice;
  $('#result-hi').textContent = hi.toFixed(1);
  $('#result-temp').textContent = temp.toFixed(1);
  $('#result-humidity').textContent = humidity.toFixed(0);
  $('#result-time').textContent = 'Recorded: ' + formatTime(reading.timestamp);

  showToast(`Heat Index: ${hi.toFixed(1)}°C — ${status.label}`, status.level === 'safe' ? 'success' : status.level === 'caution' ? 'warning' : 'error');

  STATE.isProcessing = false;
}

function handleAutoRead() {
  const loc = $('#location-select').value;
  if (!loc) { showToast('Please select a location first', 'warning'); return; }

  const overlay = $('#auto-read-overlay');
  const btn = $('#btn-auto-read');

  overlay.classList.remove('hidden');
  btn.disabled = true;

  setTimeout(() => {
    const temp = 28 + Math.random() * 15;
    const humidity = 50 + Math.random() * 40;
    $('#temp-input').value = temp.toFixed(1);
    $('#humidity-input').value = humidity.toFixed(0);

    const hi = calculateHeatIndex(temp, humidity);
    const status = getHeatStatus(hi);
    updateGauge(hi, status);
    addReading(loc, temp, humidity, hi);

    overlay.classList.add('hidden');
    btn.disabled = false;

    showToast(`Auto-read: ${temp.toFixed(1)}°C, ${humidity.toFixed(0)}%`, 'success');
  }, 2000);
}

// ============================================
// SETTINGS
// ============================================
function saveSettings() {
  try {
    localStorage.setItem('schoolheat_settings', JSON.stringify({
      firebaseUrl: STATE.firebaseUrl,
      localUrl: STATE.localUrl,
      cloudMode: STATE.cloudMode,
      alertNumber: $('#alert-number').value,
      alertThreshold: $('#alert-threshold').value,
      alertEnabled: $('#alert-toggle').checked
    }));
  } catch(e) {}
}

function loadSettings() {
  try {
    const data = localStorage.getItem('schoolheat_settings');
    if (!data) return;
    const s = JSON.parse(data);
    STATE.firebaseUrl = s.firebaseUrl || '';
    STATE.localUrl = s.localUrl || '';
    STATE.cloudMode = s.cloudMode || false;

    $('#firebase-url').value = STATE.firebaseUrl;
    $('#local-url').value = STATE.localUrl;
    $('#cloud-toggle').checked = STATE.cloudMode;
    $('#alert-number').value = s.alertNumber || '';
    $('#alert-threshold').value = s.alertThreshold || '41';
    $('#alert-toggle').checked = s.alertEnabled || false;

    if (STATE.cloudMode) {
      $('#cloud-input-group').classList.remove('hidden');
      startFirebasePolling();
    }
  } catch(e) {}
}

// ============================================
// UTILITIES
// ============================================
function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select')) return;
  if (e.key === 'n' || e.key === 'N') { $('#location-select')?.focus(); e.preventDefault(); }
  if (e.key === 'c' || e.key === 'C') { $('#btn-calculate')?.click(); e.preventDefault(); }
  if (e.key === 'd' || e.key === 'D') { $('#btn-auto-read')?.click(); e.preventDefault(); }
  if (e.key === '1') { switchTab('monitor'); }
  if (e.key === '2') { switchTab('dashboard'); }
  if (e.key === '3') { switchTab('history'); }
  if (e.key === '4') { switchTab('prediction'); }
  if (e.key === '5') { switchTab('map'); }
  if (e.key === '6') { switchTab('settings'); }
});

// ============================================
// SERVICE WORKER
// ============================================
function initSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

// ============================================
// INITIALIZATION
// ============================================
function init() {
  loadReadings();
  loadSettings();
  initSW();

  // Draw initial gauge
  drawGauge(null);

  // Tab switching
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Calculate button
  $('#btn-calculate').addEventListener('click', handleCalculate);

  // Auto-read button
  $('#btn-auto-read').addEventListener('click', handleAutoRead);

  // Filter buttons
  $$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLocationsList(btn.dataset.filter);
    });
  });

  // Cloud toggle
  $('#cloud-toggle').addEventListener('change', (e) => {
    STATE.cloudMode = e.target.checked;
    $('#cloud-input-group').classList.toggle('hidden', !STATE.cloudMode);
    if (STATE.cloudMode) {
      if (STATE.firebaseUrl) startFirebasePolling();
    } else {
      stopFirebasePolling();
      updateConnectionStatus('offline', 'Offline');
    }
    saveSettings();
  });

  // Connect cloud
  $('#btn-connect-cloud').addEventListener('click', () => {
    const url = $('#firebase-url').value.trim();
    if (!url) { showToast('Enter Firebase URL', 'warning'); return; }
    STATE.firebaseUrl = url;
    saveSettings();
    startFirebasePolling();
    showToast('Connecting to Firebase...', 'info');
  });

  // Connect local
  $('#btn-connect-local').addEventListener('click', () => {
    const url = $('#local-url').value.trim();
    if (!url) { showToast('Enter server URL', 'warning'); return; }
    STATE.localUrl = url;
    saveSettings();
    startLocalPolling();
    showToast('Connecting to local server...', 'info');
  });

  // Clear data
  $('#btn-clear-data').addEventListener('click', () => {
    if (confirm('Are you sure you want to delete ALL readings?')) {
      clearAllData();
    }
  });

  // Settings inputs auto-save
  $('#alert-number').addEventListener('change', saveSettings);
  $('#alert-threshold').addEventListener('change', saveSettings);
  $('#alert-toggle').addEventListener('change', saveSettings);

  // Remove loading screen
  setTimeout(() => {
    $('#loading-screen').classList.add('hidden');
    $('#app').classList.remove('hidden');
  }, 2200);

  // Initial render
  renderDashboard();
  renderHistory();
  renderMap();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
})();
