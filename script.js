/* ===== SCHOOLHEAT ULTIMATE v2.0 — TUKLAS 2026 ===== */
/* Optimized, enhanced, aesthetic, impactful */

(function() {
'use strict';

// ============================================
// CONFIG
// ============================================
const STORE_KEY = 'sh_v2_data';
const SETT_KEY = 'sh_v2_settings';
const MAX_READINGS = 500;

const LOCATIONS = [
  'Main Gate','Guard House',"Principal's Office",'Faculty Room','Library',
  'Science Lab','Computer Lab','AVR / Auditorium','Canteen','Clinic',
  "Boys' Comfort Room","Girls' Comfort Room",'Water Station','Parking Area','Flag Pole',
  'Basketball Court','Volleyball Court','Soccer Field','Grandstand','Gymnasium',
  'Building A - Room 1','Building A - Room 2','Building A - Room 3',
  'Building B - Room 1','Building B - Room 2','Building B - Room 3',
  'Building C - Room 1','Building C - Room 2','Building C - Room 3',
  'TLE Workshop'
];

const STATUS_LEVELS = [
  { key:'safe',    label:'Safe',    max:27,  color:'#10b981' },
  { key:'caution', label:'Caution', max:32,  color:'#f59e0b' },
  { key:'danger',  label:'Danger',  max:41,  color:'#f97316' },
  { key:'extreme', label:'Extreme', max:999, color:'#ef4444' }
];

// ============================================
// STATE
// ============================================
const state = {
  readings: [],
  settings: { tempOffset:0, humOffset:0, threshold:32, cooldown:5, smsNumber:'' },
  chart: null,
  chartLoaded: false,
  lastAlert: {}
};

// ============================================
// UTILITIES
// ============================================
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];
const fmtNum = (n, d=1) => (n===null||n===undefined||isNaN(n)) ? '--' : Number(n).toFixed(d);
const fmtTime = (d=new Date()) => d.toLocaleTimeString('en-PH', {hour12:false});
const fmtDateTime = (d) => d.toLocaleString('en-PH', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false});
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

// ============================================
// HEAT INDEX (Steadman-Rothfusz)
// ============================================
function calcHeatIndex(tc, rh) {
  const tf = tc * 9/5 + 32;
  let hi = -42.379 + 2.04901523*tf + 10.14333127*rh
           - 0.22475541*tf*rh - 6.83783e-3*tf*tf
           - 5.481717e-2*rh*rh + 1.22874e-3*tf*tf*rh
           + 8.5282e-4*tf*rh*rh - 1.99e-6*tf*tf*rh*rh;
  if (rh < 13 && tf >= 80 && tf <= 112) {
    const adj = ((13-rh)/4) * Math.sqrt((17-Math.abs(tf-95))/17);
    hi -= adj;
  }
  return (hi - 32) * 5/9;
}

function getStatus(hi) {
  return STATUS_LEVELS.find(s => hi < s.max) || STATUS_LEVELS[STATUS_LEVELS.length-1];
}

function getGaugeArc(hi) {
  const pct = clamp((hi - 20) / 30, 0, 1);
  const angle = pct * 180;
  const rad = (angle * Math.PI) / 180;
  const x = 100 - 80 * Math.cos(rad);
  const y = 100 - 80 * Math.sin(rad);
  const large = angle > 180 ? 1 : 0;
  return `M20 100 A80 80 0 ${large} 1 ${x} ${y}`;
}

// ============================================
// STORAGE
// ============================================
function loadData() {
  try {
    const d = localStorage.getItem(STORE_KEY);
    if (d) state.readings = JSON.parse(d);
    const s = localStorage.getItem(SETT_KEY);
    if (s) state.settings = {...state.settings, ...JSON.parse(s)};
  } catch(e) { console.warn('Storage load failed', e); }
}
function saveData() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.readings.slice(-MAX_READINGS)));
    localStorage.setItem(SETT_KEY, JSON.stringify(state.settings));
  } catch(e) { console.warn('Storage save failed', e); }
}

// ============================================
// TOAST
// ============================================
function toast(msg, type='info', duration=3000) {
  const container = $('#toast-container');
  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="toast-icon ${type}">${icons[type]}</div><div>${msg}</div>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ============================================
// LOADER
// ============================================
function updateLoader(pct) {
  const bar = $('#loader-progress');
  if (bar) bar.style.width = pct + '%';
}
function hideLoader() {
  updateLoader(100);
  setTimeout(() => {
    $('#loader').classList.add('hide');
    setTimeout(() => $('#loader').style.display='none', 700);
  }, 400);
}

// ============================================
// CLOCK
// ============================================
function startClock() {
  const el = $('#live-time');
  const tick = () => { el.textContent = fmtTime(); };
  tick();
  setInterval(tick, 1000);
}

// ============================================
// FORM & PREVIEW
// ============================================
function initForm() {
  const locInput = $('#loc-input');
  const tempInput = $('#temp-input');
  const humInput = $('#hum-input');
  const previewCard = $('#preview-card');
  const previewBadge = $('#preview-badge');
  const previewValue = $('#preview-value');
  const previewBar = $('#preview-bar-fill');
  const previewMeta = $('#preview-meta');

  const dl = $('#loc-list');
  LOCATIONS.forEach(l => { const o=document.createElement('option'); o.value=l; dl.appendChild(o); });

  function updatePreview() {
    const t = parseFloat(tempInput.value);
    const h = parseFloat(humInput.value);
    if (isNaN(t) || isNaN(h)) { previewCard.style.display='none'; return; }
    const hi = calcHeatIndex(t + state.settings.tempOffset, h + state.settings.humOffset);
    const st = getStatus(hi);
    previewCard.style.display='block';
    previewBadge.textContent = st.label;
    previewBadge.className = 'preview-badge ' + st.key;
    previewValue.textContent = fmtNum(hi, 1) + '°C';
    previewValue.style.color = st.color;
    const pct = clamp((hi - 20) / 30 * 100, 0, 100);
    previewBar.style.width = pct + '%';
    previewBar.style.background = st.color;
    previewMeta.textContent = `${locInput.value || 'No location'} • ${fmtNum(t,1)}°C / ${fmtNum(h,1)}% RH`;
  }

  [tempInput, humInput, locInput].forEach(el => el.addEventListener('input', updatePreview));

  $('#reading-form').addEventListener('submit', e => {
    e.preventDefault();
    const loc = locInput.value.trim();
    const t = parseFloat(tempInput.value);
    const h = parseFloat(humInput.value);
    if (!loc || isNaN(t) || isNaN(h)) { toast('Please fill all fields', 'error'); return; }
    if (t < -10 || t > 60) { toast('Temperature out of range', 'error'); return; }
    if (h < 0 || h > 100) { toast('Humidity out of range', 'error'); return; }
    addReading({ loc, temp:t, hum:h });
    e.target.reset();
    previewCard.style.display = 'none';
    toast('Reading recorded successfully', 'success');
  });

  $('#btn-random').addEventListener('click', () => {
    const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const t = clamp(28 + Math.random() * 14, 20, 50);
    const h = clamp(50 + Math.random() * 40, 30, 95);
    locInput.value = loc;
    tempInput.value = fmtNum(t, 1);
    humInput.value = fmtNum(h, 1);
    updatePreview();
    setTimeout(() => $('#reading-form').dispatchEvent(new Event('submit')), 300);
  });
}

// ============================================
// ADD READING
// ============================================
function addReading({ loc, temp, hum }) {
  const adjT = temp + state.settings.tempOffset;
  const adjH = hum + state.settings.humOffset;
  const hi = calcHeatIndex(adjT, adjH);
  const st = getStatus(hi);
  const reading = {
    id: uid(), loc, temp: adjT, hum: adjH, hi, status: st.key,
    time: new Date().toISOString(), raw: { temp, hum }
  };
  state.readings.unshift(reading);
  if (state.readings.length > MAX_READINGS) state.readings.pop();
  saveData();
  renderAll();
  checkAlert(loc, hi, st);
}

function checkAlert(loc, hi, st) {
  if (st.key === 'safe') return;
  const key = loc + '_' + st.key;
  const last = state.lastAlert[key] || 0;
  const cooldown = state.settings.cooldown * 60 * 1000;
  if (Date.now() - last < cooldown) return;
  state.lastAlert[key] = Date.now();
  toast(`${loc}: ${st.label} heat index (${fmtNum(hi,1)}°C)`, st.key==='extreme'?'error':'info', 5000);
}

// ============================================
// RENDER: GAUGE & HERO
// ============================================
function renderGauge() {
  const latest = state.readings[0];
  const hi = latest ? latest.hi : null;
  const arc = $('#gauge-arc');
  const val = $('#gauge-value');
  const badge = $('#hero-badge');
  const dot = $('#badge-dot');
  const text = $('#badge-text');

  if (hi !== null && !isNaN(hi)) {
    arc.setAttribute('d', getGaugeArc(hi));
    val.textContent = fmtNum(hi, 1);
    const st = getStatus(hi);
    val.style.fill = st.color;
    dot.className = 'badge-dot ' + st.key;
    text.textContent = st.label;
    badge.style.borderColor = st.color + '33';
  } else {
    arc.setAttribute('d', 'M20 100 A80 80 0 0 1 20 100');
    val.textContent = '--';
    dot.className = 'badge-dot';
    text.textContent = 'Ready';
    badge.style.borderColor = '';
  }
}

function renderHeroStats() {
  const today = new Date().toDateString();
  const todayReadings = state.readings.filter(r => new Date(r.time).toDateString() === today);
  const total = state.readings.length;
  const avg = total > 0 ? state.readings.reduce((a,r)=>a+r.hi,0)/total : null;
  const peak = todayReadings.length > 0 ? Math.max(...todayReadings.map(r=>r.hi)) : null;
  $('#hstat-avg').textContent = fmtNum(avg, 1) + (avg!==null?'°C':'');
  $('#hstat-peak').textContent = fmtNum(peak, 1) + (peak!==null?'°C':'');
  $('#hstat-total').textContent = total;
}

// ============================================
// RENDER: DASHBOARD
// ============================================
function renderDashboard() {
  const counts = { safe:0, caution:0, danger:0, extreme:0 };
  const today = new Date().toDateString();
  const todayReadings = state.readings.filter(r => new Date(r.time).toDateString() === today);

  const latestByLoc = {};
  state.readings.forEach(r => { if (!latestByLoc[r.loc] || r.time > latestByLoc[r.loc].time) latestByLoc[r.loc] = r; });
  Object.values(latestByLoc).forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

  Object.keys(counts).forEach(key => {
    const el = $('#count-' + key);
    animateCounter(el, parseInt(el.textContent)||0, counts[key], 700);
  });

  const total = state.readings.length;
  const avg = total > 0 ? state.readings.reduce((a,r)=>a+r.hi,0)/total : null;
  const peak = todayReadings.length > 0 ? Math.max(...todayReadings.map(r=>r.hi)) : null;
  const last = state.readings[0];

  $('#sum-total').textContent = total;
  $('#sum-avg').textContent = fmtNum(avg, 1) + (avg!==null?'°C':'');
  $('#sum-peak').textContent = fmtNum(peak, 1) + (peak!==null?'°C':'');
  $('#sum-last').textContent = last ? fmtTime(new Date(last.time)) : '--';
}

function animateCounter(el, from, to, duration) {
  if (from === to) return;
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ============================================
// RENDER: ACTIVITY
// ============================================
function renderActivity() {
  const list = $('#activity-list');
  const recent = state.readings.slice(0, 10);
  if (recent.length === 0) {
    list.innerHTML = `<div class="activity-empty"><div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg></div><p>No readings yet. Add your first measurement above.</p></div>`;
    return;
  }
  list.innerHTML = recent.map(r => {
    const st = STATUS_LEVELS.find(s => s.key === r.status) || STATUS_LEVELS[0];
    const time = new Date(r.time);
    const timeStr = time.toLocaleTimeString('en-PH', {hour:'2-digit', minute:'2-digit', hour12:false});
    return `<div class="activity-item">
      <div class="activity-dot ${r.status}"></div>
      <div class="activity-info">
        <div class="activity-loc">${r.loc}</div>
        <div class="activity-meta">${timeStr} • ${fmtNum(r.temp,1)}°C / ${fmtNum(r.hum,0)}%</div>
      </div>
      <div class="activity-hi" style="color:${st.color}">${fmtNum(r.hi,1)}°</div>
    </div>`;
  }).join('');
}

$('#btn-clear-recent')?.addEventListener('click', () => {
  if (!confirm('Clear all readings? This cannot be undone.')) return;
  state.readings = [];
  saveData();
  renderAll();
  toast('All readings cleared', 'info');
});

// ============================================
// RENDER: HISTORY
// ============================================
function renderHistory(filter='') {
  const tbody = $('#history-tbody');
  let data = state.readings;
  if (filter.trim()) {
    const q = filter.toLowerCase();
    data = data.filter(r => r.loc.toLowerCase().includes(q));
  }
  if (data.length === 0) {
    tbody.innerHTML = `<tr class="table-empty"><td colspan="7"><div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg><p>${filter ? 'No matches found' : 'No readings recorded yet'}</p><span>${filter ? 'Try a different search term' : 'Go to Monitor to add your first measurement'}</span></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.slice(0, 100).map(r => {
    const st = STATUS_LEVELS.find(s => s.key === r.status) || STATUS_LEVELS[0];
    const timeStr = fmtDateTime(new Date(r.time));
    return `<tr data-id="${r.id}">
      <td style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-dim)">${timeStr}</td>
      <td style="font-weight:600">${r.loc}</td>
      <td style="font-family:var(--font-mono)">${fmtNum(r.temp,1)}°C</td>
      <td style="font-family:var(--font-mono)">${fmtNum(r.hum,0)}%</td>
      <td style="font-family:var(--font-mono);font-weight:700;color:${st.color}">${fmtNum(r.hi,1)}°C</td>
      <td><span class="status-tag ${r.status}">${st.label}</span></td>
      <td><button class="btn-row" onclick="app.deleteReading('${r.id}')" aria-label="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
    </tr>`;
  }).join('');
}

function deleteReading(id) {
  state.readings = state.readings.filter(r => r.id !== id);
  saveData();
  renderAll();
  toast('Reading deleted', 'info');
}

$('#history-search')?.addEventListener('input', debounce(e => renderHistory(e.target.value), 200));

// ============================================
// EXPORT / IMPORT
// ============================================
function exportCSV() {
  if (state.readings.length === 0) { toast('No data to export', 'error'); return; }
  const rows = [['ID','Time','Location','Temperature_C','Humidity_%','HeatIndex_C','Status']];
  state.readings.forEach(r => rows.push([r.id, r.time, r.loc, fmtNum(r.temp,2), fmtNum(r.hum,2), fmtNum(r.hi,2), r.status]));
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  downloadFile(csv, 'schoolheat_export.csv', 'text/csv');
  toast('CSV exported', 'success');
}

function exportJSON() {
  const data = { version:'2.0', exportedAt:new Date().toISOString(), settings:state.settings, readings:state.readings };
  downloadFile(JSON.stringify(data, null, 2), 'schoolheat_backup.json', 'application/json');
  toast('JSON backup exported', 'success');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.readings && Array.isArray(data.readings)) {
        state.readings = data.readings.slice(0, MAX_READINGS);
        if (data.settings) state.settings = {...state.settings, ...data.settings};
        saveData(); renderAll(); applySettings();
        toast(`Imported ${state.readings.length} readings`, 'success');
      } else throw new Error('Invalid format');
    } catch(err) { toast('Import failed: invalid file', 'error'); }
  };
  reader.readAsText(file);
}

$('#btn-export')?.addEventListener('click', exportCSV);
$('#btn-export-json')?.addEventListener('click', exportJSON);
$('#btn-import')?.addEventListener('click', () => $('#file-import').click());
$('#file-import')?.addEventListener('change', e => { if(e.target.files[0]) importJSON(e.target.files[0]); e.target.value=''; });

// ============================================
// FORECAST CHART (Lazy)
// ============================================
function initChart() {
  if (state.chartLoaded || typeof Chart === 'undefined') return;
  if (state.readings.length < 3) return;

  const ctx = $('#forecast-chart');
  const fallback = $('#chart-fallback');
  if (!ctx) return;

  const byDay = {};
  state.readings.forEach(r => {
    const d = new Date(r.time).toLocaleDateString('en-PH', {month:'short', day:'numeric'});
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(r.hi);
  });
  const days = Object.keys(byDay).slice(-7);
  const avgs = days.map(d => byDay[d].reduce((a,b)=>a+b,0)/byDay[d].length);

  const projDays = [], projVals = [];
  if (avgs.length >= 3) {
    const n = avgs.length;
    const slope = (avgs[n-1] - avgs[0]) / (n - 1);
    for (let i = 1; i <= 3; i++) {
      const nextVal = avgs[n-1] + slope * i;
      const date = new Date(); date.setDate(date.getDate() + i);
      projDays.push(date.toLocaleDateString('en-PH', {month:'short', day:'numeric'}) + ' (proj)');
      projVals.push(clamp(nextVal, 20, 55));
    }
  }

  const allLabels = [...days, ...projDays];
  const allData = [...avgs, ...projVals];
  const pointColors = allData.map(v => getStatus(v).color);
  const pointRadii = avgs.map(() => 5).concat(projVals.map(() => 7));
  const pointStyles = avgs.map(() => 'circle').concat(projVals.map(() => 'rectRot'));

  fallback.style.display = 'none';
  ctx.style.display = 'block';

  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [{
        label: 'Heat Index (°C)',
        data: allData,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: pointColors,
        pointBorderColor: '#0a0a1a',
        pointBorderWidth: 2,
        pointRadius: pointRadii,
        pointStyle: pointStyles,
        pointHoverRadius: 9
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#12122a', titleColor: '#f0f0f8', bodyColor: '#8b8ba8',
          borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1, padding: 14, cornerRadius: 10,
          callbacks: {
            label: ctx => `Heat Index: ${fmtNum(ctx.parsed.y, 1)}°C`,
            afterLabel: ctx => `Status: ${getStatus(ctx.parsed.y).label}`
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#5a5a78', font: { family: 'Inter', size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#5a5a78', font: { family: 'JetBrains Mono', size: 11 } }, suggestedMin: 20, suggestedMax: 50 }
      }
    }
  });
  state.chartLoaded = true;
}

const chartObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) initChart(); });
}, { threshold: 0.15 });

// ============================================
// CAMPUS MAP
// ============================================
function renderMap() {
  const container = $('#map-locations');
  if (!container) return;

  const positions = [
    [15,85],[10,75],[20,60],[30,55],[25,45],[35,40],[45,35],[50,25],[40,70],[55,60],
    [60,75],[65,70],[50,80],[80,85],[45,15],[70,30],[75,25],[85,35],[80,20],[60,15],
    [30,30],[35,25],[40,20],[55,40],[60,35],[65,30],[75,50],[80,45],[85,55],[50,50]
  ];

  const latestByLoc = {};
  state.readings.forEach(r => { if (!latestByLoc[r.loc] || r.time > latestByLoc[r.loc].time) latestByLoc[r.loc] = r; });

  container.innerHTML = LOCATIONS.map((loc, i) => {
    const r = latestByLoc[loc];
    const status = r ? r.status : 'nodata';
    const hi = r ? fmtNum(r.hi, 1) + '°C' : 'No data';
    const [x, y] = positions[i] || [50, 50];
    return `<div class="map-pin ${status}" style="left:${x}%;top:${y}%">
      <div class="pin-tooltip"><strong>${loc}</strong>${hi}</div>
    </div>`;
  }).join('');
}

// ============================================
// SETTINGS
// ============================================
function initSettings() {
  const modal = $('#modal-settings');
  $('#btn-settings')?.addEventListener('click', () => { modal.style.display='flex'; applySettings(); });
  $('#btn-close-settings')?.addEventListener('click', () => modal.style.display='none');
  modal?.addEventListener('click', e => { if(e.target === modal) modal.style.display='none'; });

  ['set-temp-offset','set-hum-offset','set-threshold','set-cooldown'].forEach(id => {
    $(`#${id}`)?.addEventListener('change', saveSettingsFromUI);
  });

  $('#btn-reset')?.addEventListener('click', () => {
    if (!confirm('Reset ALL data and settings? This cannot be undone.')) return;
    state.readings = [];
    state.settings = { tempOffset:0, humOffset:0, threshold:32, cooldown:5, smsNumber:'' };
    state.lastAlert = {};
    saveData(); applySettings(); renderAll();
    toast('All data reset', 'info');
    modal.style.display = 'none';
  });
}

function applySettings() {
  $('#set-temp-offset').value = state.settings.tempOffset;
  $('#set-hum-offset').value = state.settings.humOffset;
  $('#set-threshold').value = state.settings.threshold;
  $('#set-cooldown').value = state.settings.cooldown;
}

function saveSettingsFromUI() {
  state.settings.tempOffset = parseFloat($('#set-temp-offset').value) || 0;
  state.settings.humOffset = parseFloat($('#set-hum-offset').value) || 0;
  state.settings.threshold = parseFloat($('#set-threshold').value) || 32;
  state.settings.cooldown = parseFloat($('#set-cooldown').value) || 5;
  saveData();
  toast('Settings saved', 'success');
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select')) return;
  if (e.key === 'n' || e.key === 'N') { $('#loc-input')?.focus(); e.preventDefault(); }
  if (e.key === 's' || e.key === 'S') { $('#btn-settings')?.click(); e.preventDefault(); }
  if (e.key === 'd' || e.key === 'D') { $('#btn-random')?.click(); e.preventDefault(); }
  if (e.key === 'Escape') { $('#modal-settings').style.display = 'none'; }
});

// ============================================
// SERVICE WORKER
// ============================================
function initSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// ============================================
// RENDER ALL
// ============================================
function renderAll() {
  renderGauge();
  renderHeroStats();
  renderDashboard();
  renderActivity();
  renderHistory($('#history-search')?.value || '');
  renderMap();
  if (state.chartLoaded && state.chart) { state.chart.destroy(); state.chart = null; state.chartLoaded = false; }
  initChart();
}

// ============================================
// INIT
// ============================================
function init() {
  updateLoader(15);
  loadData();
  updateLoader(45);

  startClock();
  initForm();
  initSettings();
  initSW();

  const forecastSection = $('#section-forecast');
  if (forecastSection) chartObserver.observe(forecastSection);

  updateLoader(75);
  renderAll();
  updateLoader(100);

  hideLoader();

  window.app = { deleteReading };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
