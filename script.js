/* ============================================
   SCHOOLHEAT ULTIMATE v3.0 — APPLICATION LOGIC
   Charts • Gauge • Map • Trends • Forecast
   ============================================ */

// ============================================
// STATE
// ============================================
const App = {
  readings: [],
  settings: {
    firebase: false,
    sms: false,
    interval: 30,
    tempOffset: 0,
    humOffset: 0,
    outlier: true,
    spike: true
  },
  charts: {},
  currentFilter: 'all',
  demoMode: false
};

// ============================================
// LOCATION COORDINATES (percentage-based on map)
// ============================================
const LOCATION_COORDS = {
  "Main Building": { x: 45, y: 35 },
  "Science Building": { x: 35, y: 30 },
  "Math Building": { x: 55, y: 30 },
  "English Building": { x: 40, y: 45 },
  "Filipino Building": { x: 50, y: 45 },
  "TLE Building": { x: 60, y: 40 },
  "AP Building": { x: 30, y: 40 },
  "MAPEH Building": { x: 65, y: 35 },
  "ESP Building": { x: 25, y: 35 },
  "Principal's Office": { x: 48, y: 25 },
  "Faculty Room": { x: 42, y: 28 },
  "Registrar's Office": { x: 52, y: 28 },
  "Canteen": { x: 70, y: 50 },
  "Clinic": { x: 20, y: 50 },
  "Library": { x: 55, y: 20 },
  "Guidance Office": { x: 38, y: 22 },
  "School Gate": { x: 50, y: 85 },
  "Basketball Court": { x: 75, y: 60 },
  "Open Court": { x: 25, y: 60 },
  "Grandstand": { x: 80, y: 45 },
  "Parking Area": { x: 15, y: 75 },
  "Garden Area": { x: 85, y: 25 },
  "Flag Pole Area": { x: 50, y: 10 },
  "Quadrangle": { x: 50, y: 55 },
  "Back Gate": { x: 50, y: 5 },
  "AVR": { x: 60, y: 22 },
  "Computer Lab": { x: 32, y: 25 },
  "Science Lab": { x: 35, y: 32 },
  "Home Economics Room": { x: 62, y: 42 },
  "Industrial Arts Room": { x: 58, y: 38 },
  "Comfort Room (CR)": { x: 45, y: 50 },
  "Storage Room": { x: 15, y: 40 }
};

// ============================================
// HEAT INDEX CALCULATION (Steadman-Rothfusz)
// ============================================
function calculateHeatIndex(T, RH) {
  // Simple approximation for Celsius
  const hi = -8.784694755 + 1.61139411 * T + 2.338548839 * RH
    - 0.14611605 * T * RH - 0.012308094 * T * T
    - 0.016424828 * RH * RH + 0.002211732 * T * T * RH
    + 0.00072546 * T * RH * RH - 0.000003582 * T * T * RH * RH;
  return Math.round(hi * 10) / 10;
}

function getCategory(hi) {
  if (hi < 27) return { name: 'Safe', class: 'safe', risk: 'Minimal', rec: 'Normal activities', icon: '✓' };
  if (hi < 32) return { name: 'Caution', class: 'caution', risk: 'Moderate', rec: 'Stay hydrated', icon: '!' };
  if (hi < 41) return { name: 'Danger', class: 'danger', risk: 'High', rec: 'Limit outdoor activity', icon: '⚡' };
  return { name: 'Extreme', class: 'extreme', risk: 'Very High', rec: 'Avoid outdoor exposure', icon: '☠' };
}

// ============================================
// STORAGE
// ============================================
function loadData() {
  try {
    const data = localStorage.getItem('schoolheat_readings');
    if (data) App.readings = JSON.parse(data);
    const settings = localStorage.getItem('schoolheat_settings');
    if (settings) App.settings = { ...App.settings, ...JSON.parse(settings) };
  } catch (e) { console.error('Load error:', e); }
}

function saveData() {
  try {
    localStorage.setItem('schoolheat_readings', JSON.stringify(App.readings));
    localStorage.setItem('schoolheat_settings', JSON.stringify(App.settings));
  } catch (e) { console.error('Save error:', e); }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const icons = {
    success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-icon">${icons[type]}</div><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabId}`);
  });
  if (tabId === 'history') renderHistory();
  if (tabId === 'forecast') renderForecast();
  if (tabId === 'map') renderMap();
  if (tabId === 'dashboard') renderDashboard();
}

// ============================================
// CANVAS GAUGE
// ============================================
function drawGauge(value) {
  const canvas = document.getElementById('gauge-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h - 20, r = w * 0.38;

  ctx.clearRect(0, 0, w, h);

  // Background arc
  const startAngle = Math.PI * 0.8;
  const endAngle = Math.PI * 2.2;
  const totalAngle = endAngle - startAngle;

  // Colored segments
  const segments = [
    { pct: 0.27, color: '#10b981', glow: 'rgba(16,185,129,0.3)' },
    { pct: 0.32, color: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
    { pct: 0.41, color: '#ef4444', glow: 'rgba(239,68,68,0.3)' },
    { pct: 1.0, color: '#dc2626', glow: 'rgba(220,38,38,0.4)' }
  ];

  let currentAngle = startAngle;
  segments.forEach(seg => {
    const segEnd = startAngle + totalAngle * seg.pct;
    // Glow
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, currentAngle, segEnd);
    ctx.lineWidth = 12;
    ctx.strokeStyle = seg.glow;
    ctx.lineCap = 'round';
    ctx.stroke();
    // Main arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, currentAngle, segEnd);
    ctx.lineWidth = 8;
    ctx.strokeStyle = seg.color;
    ctx.lineCap = 'round';
    ctx.stroke();
    currentAngle = segEnd;
  });

  // Ticks
  for (let i = 0; i <= 10; i++) {
    const angle = startAngle + (totalAngle * i / 10);
    const x1 = cx + Math.cos(angle) * (r - 12);
    const y1 = cy + Math.sin(angle) * (r - 12);
    const x2 = cx + Math.cos(angle) * (r - 4);
    const y2 = cy + Math.sin(angle) * (r - 4);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.stroke();
  }

  // Needle
  if (value !== null && !isNaN(value)) {
    const maxVal = 55;
    const clamped = Math.min(Math.max(value, 0), maxVal);
    const needleAngle = startAngle + (totalAngle * clamped / maxVal);
    const nx = cx + Math.cos(needleAngle) * (r - 16);
    const ny = cy + Math.sin(needleAngle) * (r - 16);

    // Needle glow
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Needle
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a14';
    ctx.fill();
  }
}

// ============================================
// INPUT HANDLING
// ============================================
function updatePreview() {
  const temp = parseFloat(document.getElementById('temp-input').value);
  const hum = parseFloat(document.getElementById('humidity-input').value);
  const gaugeVal = document.getElementById('gauge-value');
  const statusEl = document.getElementById('preview-status');
  const catEl = document.getElementById('detail-category');
  const riskEl = document.getElementById('detail-risk');
  const recEl = document.getElementById('detail-rec');

  if (isNaN(temp) || isNaN(hum) || temp < 0 || hum < 0 || hum > 100) {
    gaugeVal.textContent = '--';
    statusEl.textContent = 'Enter values to calculate';
    catEl.textContent = '--';
    riskEl.textContent = '--';
    recEl.textContent = '--';
    drawGauge(null);
    return;
  }

  const hi = calculateHeatIndex(temp, hum);
  const cat = getCategory(hi);

  gaugeVal.textContent = hi.toFixed(1);
  gaugeVal.style.color = 
    cat.class === 'safe' ? '#10b981' :
    cat.class === 'caution' ? '#f59e0b' :
    cat.class === 'danger' ? '#ef4444' : '#dc2626';

  statusEl.textContent = cat.name;
  statusEl.style.color = gaugeVal.style.color;
  statusEl.style.background = cat.class === 'safe' ? 'rgba(16,185,129,0.1)' :
    cat.class === 'caution' ? 'rgba(245,158,11,0.1)' :
    cat.class === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(220,38,38,0.1)';

  catEl.textContent = cat.name;
  catEl.style.color = gaugeVal.style.color;
  riskEl.textContent = cat.risk;
  recEl.textContent = cat.rec;

  drawGauge(hi);
}

function addReading() {
  const location = document.getElementById('location-select').value;
  const temp = parseFloat(document.getElementById('temp-input').value);
  const hum = parseFloat(document.getElementById('humidity-input').value);

  if (!location) { showToast('Please select a location', 'warning'); return; }
  if (isNaN(temp) || isNaN(hum)) { showToast('Please enter valid temperature and humidity', 'warning'); return; }
  if (temp < 0 || temp > 60) { showToast('Temperature must be between 0-60°C', 'warning'); return; }
  if (hum < 0 || hum > 100) { showToast('Humidity must be between 0-100%', 'warning'); return; }

  const hi = calculateHeatIndex(temp, hum);
  const cat = getCategory(hi);

  const reading = {
    id: Date.now(),
    location,
    temp: Math.round(temp * 10) / 10,
    humidity: Math.round(hum * 10) / 10,
    heatIndex: hi,
    category: cat.class,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  };

  App.readings.unshift(reading);
  saveData();

  document.getElementById('location-select').value = '';
  document.getElementById('temp-input').value = '';
  document.getElementById('humidity-input').value = '';
  updatePreview();

  showToast(`Reading saved: ${location} — ${hi.toFixed(1)}°C ${cat.name}`, cat.class === 'extreme' ? 'error' : cat.class === 'danger' ? 'warning' : 'success');
  renderDashboard();
}

function autoRead() {
  const overlay = document.getElementById('auto-read-overlay');
  overlay.classList.add('active');

  setTimeout(() => {
    const locations = Object.keys(LOCATION_COORDS);
    const location = locations[Math.floor(Math.random() * locations.length)];
    const temp = 28 + Math.random() * 12;
    const hum = 50 + Math.random() * 40;
    const hi = calculateHeatIndex(temp, hum);
    const cat = getCategory(hi);

    const reading = {
      id: Date.now(),
      location,
      temp: Math.round(temp * 10) / 10,
      humidity: Math.round(hum * 10) / 10,
      heatIndex: hi,
      category: cat.class,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    App.readings.unshift(reading);
    saveData();

    overlay.classList.remove('active');
    showToast(`Auto-read: ${location} — ${hi.toFixed(1)}°C ${cat.name}`, cat.class === 'extreme' ? 'error' : cat.class === 'danger' ? 'warning' : 'success');
    renderDashboard();

    // If on input tab, populate the fields
    if (document.getElementById('panel-input').classList.contains('active')) {
      document.getElementById('location-select').value = location;
      document.getElementById('temp-input').value = temp.toFixed(1);
      document.getElementById('humidity-input').value = hum.toFixed(1);
      updatePreview();
    }
  }, 2200);
}

// ============================================
// DASHBOARD
// ============================================
function animateCounter(el, target, duration = 800) {
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + diff * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function renderDashboard() {
  const counts = { safe: 0, caution: 0, danger: 0, extreme: 0 };
  const recent = App.readings.slice(0, 5);

  recent.forEach(r => { if (counts[r.category] !== undefined) counts[r.category]++; });

  animateCounter(document.getElementById('stat-safe'), counts.safe);
  animateCounter(document.getElementById('stat-caution'), counts.caution);
  animateCounter(document.getElementById('stat-danger'), counts.danger);
  animateCounter(document.getElementById('stat-extreme'), counts.extreme);

  const list = document.getElementById('recent-readings');
  if (recent.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/></svg>
      <p>No readings yet. Add your first reading in the Input tab.</p>
      <button class="btn-primary" onclick="switchTab('input')">Add Reading</button>
    </div>`;
    return;
  }

  list.innerHTML = recent.map(r => {
    const cat = getCategory(r.heatIndex);
    return `<div class="reading-item">
      <div class="reading-badge ${r.category}"></div>
      <div class="reading-info">
        <div class="reading-location">${r.location}</div>
        <div class="reading-meta">${r.date} • ${r.time}</div>
      </div>
      <div class="reading-value">
        <div class="reading-hi ${r.category}">${r.heatIndex.toFixed(1)}°C</div>
        <div class="reading-temp">${r.temp}°C / ${r.humidity}%</div>
      </div>
    </div>`;
  }).join('');
}

// ============================================
// HISTORY & CHARTS
// ============================================
function createGradient(ctx, colorStart, colorEnd) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

function renderTrendChart() {
  const canvas = document.getElementById('trend-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');

  if (App.charts.trend) { App.charts.trend.destroy(); }

  const data = [...App.readings].reverse().slice(-20);
  if (data.length < 2) {
    canvas.parentElement.innerHTML = '<div class="empty-state" style="padding:60px 20px"><p>Need at least 2 readings for trend chart</p></div>';
    return;
  }

  const labels = data.map(r => r.time);
  const values = data.map(r => r.heatIndex);
  const colors = values.map(v => 
    v < 27 ? '#10b981' : v < 32 ? '#f59e0b' : v < 41 ? '#ef4444' : '#dc2626'
  );

  const gradientFill = ctx.createLinearGradient(0, 0, 0, 280);
  gradientFill.addColorStop(0, 'rgba(99,102,241,0.2)');
  gradientFill.addColorStop(1, 'rgba(99,102,241,0)');

  App.charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Heat Index (°C)',
        data: values,
        borderColor: '#6366f1',
        backgroundColor: gradientFill,
        borderWidth: 3,
        pointBackgroundColor: colors,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10,10,20,0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => `Heat Index: ${ctx.parsed.y.toFixed(1)}°C`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: { color: '#64748b', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: { color: '#64748b', font: { size: 10 } },
          suggestedMin: 20,
          suggestedMax: 50
        }
      }
    }
  });
}

function renderDistributionChart() {
  const canvas = document.getElementById('distribution-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (App.charts.distribution) { App.charts.distribution.destroy(); }

  const counts = { Safe: 0, Caution: 0, Danger: 0, Extreme: 0 };
  App.readings.forEach(r => {
    const name = r.category.charAt(0).toUpperCase() + r.category.slice(1);
    if (counts[name] !== undefined) counts[name]++;
  });

  if (App.readings.length === 0) {
    canvas.parentElement.innerHTML = '<div class="empty-state" style="padding:40px 20px"><p>No data</p></div>';
    return;
  }

  App.charts.distribution = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#dc2626'],
        borderColor: 'rgba(10,10,20,0.8)',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', padding: 16, font: { size: 11 }, usePointStyle: true }
        }
      }
    }
  });
}

function renderLocationChart() {
  const canvas = document.getElementById('location-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (App.charts.location) { App.charts.location.destroy(); }

  const locData = {};
  App.readings.forEach(r => {
    if (!locData[r.location]) locData[r.location] = { sum: 0, count: 0 };
    locData[r.location].sum += r.heatIndex;
    locData[r.location].count++;
  });

  const sorted = Object.entries(locData)
    .map(([loc, d]) => ({ loc, avg: d.sum / d.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);

  if (sorted.length === 0) {
    canvas.parentElement.innerHTML = '<div class="empty-state" style="padding:40px 20px"><p>No data</p></div>';
    return;
  }

  const barColors = sorted.map(d => 
    d.avg < 27 ? '#10b981' : d.avg < 32 ? '#f59e0b' : d.avg < 41 ? '#ef4444' : '#dc2626'
  );

  App.charts.location = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(d => d.loc.length > 12 ? d.loc.substring(0, 12) + '...' : d.loc),
      datasets: [{
        label: 'Avg Heat Index',
        data: sorted.map(d => d.avg),
        backgroundColor: barColors,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 9 }, maxRotation: 45 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: { color: '#64748b', font: { size: 10 } }
        }
      }
    }
  });
}

function renderHistory() {
  renderTrendChart();
  renderDistributionChart();
  renderLocationChart();

  const search = (document.getElementById('history-search')?.value || '').toLowerCase();
  const list = document.getElementById('history-list');

  let filtered = App.readings;
  if (App.currentFilter !== 'all') {
    filtered = filtered.filter(r => r.category === App.currentFilter);
  }
  if (search) {
    filtered = filtered.filter(r => 
      r.location.toLowerCase().includes(search) || 
      r.date.toLowerCase().includes(search) ||
      r.time.toLowerCase().includes(search)
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
      <p>${App.readings.length === 0 ? 'No history yet. Readings will appear here.' : 'No readings match your filter.'}</p>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map((r, i) => {
    const cat = getCategory(r.heatIndex);
    return `<div class="history-item" style="animation-delay:${i * 0.03}s">
      <div class="reading-badge ${r.category}"></div>
      <div class="history-item-info">
        <div class="history-item-location">${r.location}</div>
        <div class="history-item-meta">${r.date} • ${r.time} • ${r.temp}°C / ${r.humidity}%</div>
      </div>
      <div class="history-item-values">
        <div class="history-item-hi ${r.category}">${r.heatIndex.toFixed(1)}°C</div>
        <div class="history-item-raw">${cat.name}</div>
      </div>
      <button class="history-item-delete" onclick="deleteReading(${r.id})" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
  }).join('');
}

function deleteReading(id) {
  App.readings = App.readings.filter(r => r.id !== id);
  saveData();
  renderHistory();
  renderDashboard();
  showToast('Reading deleted', 'info');
}

function clearHistory() {
  if (!confirm('Are you sure you want to delete all readings?')) return;
  App.readings = [];
  saveData();
  renderHistory();
  renderDashboard();
  showToast('All readings cleared', 'info');
}

function exportCSV() {
  if (App.readings.length === 0) { showToast('No data to export', 'warning'); return; }
  const headers = ['Date', 'Time', 'Location', 'Temperature (°C)', 'Humidity (%)', 'Heat Index (°C)', 'Category'];
  const rows = App.readings.map(r => [r.date, r.time, r.location, r.temp, r.humidity, r.heatIndex, r.category]);
  const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
  downloadFile(csv, 'schoolheat_readings.csv', 'text/csv');
  showToast('CSV exported successfully', 'success');
}

function exportJSON() {
  if (App.readings.length === 0) { showToast('No data to export', 'warning'); return; }
  const json = JSON.stringify(App.readings, null, 2);
  downloadFile(json, 'schoolheat_readings.json', 'application/json');
  showToast('JSON exported successfully', 'success');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// FORECAST
// ============================================
function renderForecast() {
  const badge = document.getElementById('forecast-badge');
  const cards = document.getElementById('forecast-cards');
  const canvas = document.getElementById('forecast-chart');

  const uniqueDays = [...new Set(App.readings.map(r => r.date))];

  if (uniqueDays.length < 3) {
    badge.textContent = `Needs ${3 - uniqueDays.length} more day(s) of data`;
    badge.className = 'forecast-badge';
    cards.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-5"/></svg>
      <p>Add at least 3 days of readings to generate a forecast.</p>
    </div>`;
    if (App.charts.forecast) { App.charts.forecast.destroy(); App.charts.forecast = null; }
    if (canvas) canvas.parentElement.innerHTML = '<canvas id="forecast-chart"></canvas>';
    return;
  }

  badge.textContent = 'Forecast Ready';
  badge.className = 'forecast-badge ready';

  // Simple linear regression for forecast
  const dailyAvg = {};
  App.readings.forEach(r => {
    if (!dailyAvg[r.date]) dailyAvg[r.date] = { sum: 0, count: 0 };
    dailyAvg[r.date].sum += r.heatIndex;
    dailyAvg[r.date].count++;
  });

  const days = Object.entries(dailyAvg).map(([date, d]) => ({ date, avg: d.sum / d.count }));
  days.sort((a, b) => new Date(a.date) - new Date(b.date));

  const n = days.length;
  const sumX = days.reduce((s, _, i) => s + i, 0);
  const sumY = days.reduce((s, d) => s + d.avg, 0);
  const sumXY = days.reduce((s, d, i) => s + i * d.avg, 0);
  const sumX2 = days.reduce((s, _, i) => s + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const forecast = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 1; i <= 7; i++) {
    const predicted = intercept + slope * (n - 1 + i);
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dayName = dayNames[date.getDay()];
    forecast.push({ day: dayName, hi: Math.max(20, predicted), date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
  }

  // Render cards
  cards.innerHTML = forecast.map(f => {
    const cat = getCategory(f.hi);
    return `<div class="forecast-card ${cat.class}">
      <div class="forecast-day">${f.day}</div>
      <div class="forecast-icon">${cat.icon}</div>
      <div class="forecast-temp">${f.hi.toFixed(1)}°C</div>
      <div class="forecast-label">${cat.name}</div>
    </div>`;
  }).join('');

  // Render chart
  if (canvas && typeof Chart !== 'undefined') {
    if (App.charts.forecast) App.charts.forecast.destroy();
    const ctx = canvas.getContext('2d');

    const histLabels = days.map(d => d.date);
    const histValues = days.map(d => d.avg);
    const foreLabels = forecast.map(f => f.day);
    const foreValues = forecast.map(f => f.hi);

    const gradHist = ctx.createLinearGradient(0, 0, 0, 280);
    gradHist.addColorStop(0, 'rgba(99,102,241,0.3)');
    gradHist.addColorStop(1, 'rgba(99,102,241,0.02)');

    const gradFore = ctx.createLinearGradient(0, 0, 0, 280);
    gradFore.addColorStop(0, 'rgba(168,85,247,0.3)');
    gradFore.addColorStop(1, 'rgba(168,85,247,0.02)');

    App.charts.forecast = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [...histLabels, ...foreLabels],
        datasets: [
          {
            label: 'Historical',
            data: [...histValues, ...Array(7).fill(null)],
            borderColor: '#6366f1',
            backgroundColor: gradHist,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#6366f1',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Forecast',
            data: [...Array(histLabels.length).fill(null), ...foreValues],
            borderColor: '#a855f7',
            backgroundColor: gradFore,
            borderWidth: 3,
            borderDash: [6, 4],
            pointRadius: 4,
            pointBackgroundColor: '#a855f7',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { color: '#94a3b8', usePointStyle: true, padding: 16 }
          },
          tooltip: {
            backgroundColor: 'rgba(10,10,20,0.95)',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#64748b', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#64748b', font: { size: 10 } },
            suggestedMin: 20
          }
        }
      }
    });
  }
}

// ============================================
// MAP
// ============================================
function renderMap() {
  const pinsContainer = document.getElementById('map-pins');
  if (!pinsContainer) return;

  // Get latest reading per location
  const latest = {};
  App.readings.forEach(r => {
    if (!latest[r.location] || new Date(r.timestamp) > new Date(latest[r.location].timestamp)) {
      latest[r.location] = r;
    }
  });

  pinsContainer.innerHTML = Object.entries(LOCATION_COORDS).map(([loc, coords]) => {
    const reading = latest[loc];
    const cat = reading ? reading.category : 'nodata';
    const hi = reading ? reading.heatIndex.toFixed(1) : 'No data';
    return `<div class="map-pin ${cat}" style="left:${coords.x}%;top:${coords.y}%">
      <div class="map-pin-tooltip">${loc}: ${hi}°C</div>
    </div>`;
  }).join('');
}

// ============================================
// SETTINGS
// ============================================
function openSettings() {
  document.getElementById('setting-firebase').checked = App.settings.firebase;
  document.getElementById('setting-sms').checked = App.settings.sms;
  document.getElementById('setting-interval').value = App.settings.interval;
  document.getElementById('setting-temp-offset').value = App.settings.tempOffset;
  document.getElementById('setting-hum-offset').value = App.settings.humOffset;
  document.getElementById('setting-outlier').checked = App.settings.outlier;
  document.getElementById('setting-spike').checked = App.settings.spike;
  document.getElementById('settings-modal').classList.add('active');
}

function closeSettings() {
  document.getElementById('settings-modal').classList.remove('active');
}

function saveSettings() {
  App.settings.firebase = document.getElementById('setting-firebase').checked;
  App.settings.sms = document.getElementById('setting-sms').checked;
  App.settings.interval = parseInt(document.getElementById('setting-interval').value) || 30;
  App.settings.tempOffset = parseFloat(document.getElementById('setting-temp-offset').value) || 0;
  App.settings.humOffset = parseFloat(document.getElementById('setting-hum-offset').value) || 0;
  App.settings.outlier = document.getElementById('setting-outlier').checked;
  App.settings.spike = document.getElementById('setting-spike').checked;
  saveData();
  closeSettings();
  showToast('Settings saved', 'success');
}

function resetSettings() {
  App.settings = { firebase: false, sms: false, interval: 30, tempOffset: 0, humOffset: 0, outlier: true, spike: true };
  saveData();
  openSettings();
  showToast('Settings reset to default', 'info');
}

// ============================================
// DEMO DATA
// ============================================
function generateDemoData() {
  const locations = Object.keys(LOCATION_COORDS);
  const now = new Date();

  for (let d = 6; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(day.getDate() - d);
    const dateStr = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // 3-5 readings per day
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const loc = locations[Math.floor(Math.random() * locations.length)];
      const hour = 8 + Math.floor(Math.random() * 8);
      const minute = Math.floor(Math.random() * 60);
      day.setHours(hour, minute);

      const temp = 26 + Math.random() * 14 + (hour > 12 ? 3 : 0);
      const hum = 45 + Math.random() * 45;
      const hi = calculateHeatIndex(temp, hum);
      const cat = getCategory(hi);

      App.readings.push({
        id: Date.now() + Math.random(),
        location: loc,
        temp: Math.round(temp * 10) / 10,
        humidity: Math.round(hum * 10) / 10,
        heatIndex: hi,
        category: cat.class,
        timestamp: day.toISOString(),
        date: dateStr,
        time: day.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      });
    }
  }

  App.readings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  saveData();
  renderDashboard();
  showToast('Demo data generated (7 days)', 'success');
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.key) {
    case '1': switchTab('dashboard'); break;
    case '2': switchTab('input'); break;
    case '3': switchTab('history'); break;
    case '4': switchTab('forecast'); break;
    case '5': switchTab('map'); break;
    case '6': switchTab('about'); break;
    case 'n': case 'N':
      switchTab('input');
      setTimeout(() => document.getElementById('location-select')?.focus(), 100);
      break;
    case 'c': case 'C':
      if (document.getElementById('panel-input').classList.contains('active')) {
        addReading();
      }
      break;
    case 'd': case 'D':
      if (!App.demoMode) { App.demoMode = true; generateDemoData(); }
      break;
    case 's': case 'S':
      openSettings();
      break;
    case 'Escape':
      closeSettings();
      document.getElementById('auto-read-overlay')?.classList.remove('active');
      break;
  }
});

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Input
  document.getElementById('temp-input')?.addEventListener('input', updatePreview);
  document.getElementById('humidity-input')?.addEventListener('input', updatePreview);
  document.getElementById('btn-calculate')?.addEventListener('click', addReading);
  document.getElementById('btn-auto-read')?.addEventListener('click', autoRead);

  // History
  document.getElementById('history-search')?.addEventListener('input', renderHistory);
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.currentFilter = btn.dataset.filter;
      renderHistory();
    });
  });
  document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);
  document.getElementById('btn-export-json')?.addEventListener('click', exportJSON);
  document.getElementById('btn-clear-history')?.addEventListener('click', clearHistory);
  document.getElementById('btn-view-all')?.addEventListener('click', () => switchTab('history'));

  // Settings
  document.getElementById('btn-settings-header')?.addEventListener('click', openSettings);
  document.getElementById('btn-close-settings')?.addEventListener('click', closeSettings);
  document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);
  document.getElementById('btn-reset-settings')?.addEventListener('click', resetSettings);
  document.getElementById('settings-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });

  // Initial render
  renderDashboard();
  drawGauge(null);

  // Hide loader
  setTimeout(() => {
    document.getElementById('loading-screen')?.classList.add('hidden');
  }, 2000);
});
