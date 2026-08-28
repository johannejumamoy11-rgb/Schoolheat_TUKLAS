/* ===== SCHOOLHEAT APP v2.0 - CLOUD EDITION ===== */
const APP_VERSION = '2.0';
const STORAGE_KEY = 'schoolheat_data_v2';
const SETTINGS_KEY = 'schoolheat_settings';

const LOCATIONS = [
  { id: 'loc-1', number: 1, name: "3 Classroom, SBP4BE Building AusAID", outdoor: false },
  { id: 'loc-2', number: 2, name: "School Clinic", outdoor: false },
  { id: 'loc-3', number: 3, name: "Principal's Office", outdoor: false },
  { id: 'loc-4', number: 4, name: "Faculty Room", outdoor: false },
  { id: 'loc-5', number: 5, name: "Library", outdoor: false },
  { id: 'loc-6', number: 6, name: "Science Lab", outdoor: false },
  { id: 'loc-7', number: 7, name: "Computer Lab", outdoor: false },
  { id: 'loc-8', number: 8, name: "Canteen", outdoor: false },
  { id: 'loc-9', number: 9, name: "Gymnasium", outdoor: false },
  { id: 'loc-10', number: 10, name: "Auditorium", outdoor: false },
  { id: 'loc-11', number: 11, name: "TLE Workshop", outdoor: false },
  { id: 'loc-12', number: 12, name: "AVR Room", outdoor: false },
  { id: 'loc-13', number: 13, name: "Guidance Office", outdoor: false },
  { id: 'loc-14', number: 14, name: "Registrar Office", outdoor: false },
  { id: 'loc-15', number: 15, name: "Supply Room", outdoor: false },
  { id: 'loc-16', number: 16, name: "Boys Comfort Room", outdoor: false },
  { id: 'loc-17', number: 17, name: "Girls Comfort Room", outdoor: false },
  { id: 'loc-18', number: 18, name: "Open Covered Court", outdoor: true },
  { id: 'loc-19', number: 19, name: "Flag Pole Area", outdoor: true },
  { id: 'loc-20', number: 20, name: "Front Gate", outdoor: true },
  { id: 'loc-21', number: 21, name: "Parking Area", outdoor: true },
  { id: 'loc-22', number: 22, name: "Garden Area", outdoor: true },
  { id: 'loc-23', number: 23, name: "Basketball Court", outdoor: true },
  { id: 'loc-24', number: 24, name: "Volleyball Court", outdoor: true },
  { id: 'loc-25', number: 25, name: "Quadrangle", outdoor: true },
  { id: 'loc-26', number: 26, name: "Covered Walkway", outdoor: true },
  { id: 'loc-27', number: 27, name: "Water Station", outdoor: true },
  { id: 'loc-28', number: 28, name: "Waiting Shed", outdoor: true },
  { id: 'loc-29', number: 29, name: "Perimeter Fence", outdoor: true },
];

let readings = [];
let settings = { 
  bridgeUrl: '', firebaseUrl: '', alertPhone: '', 
  alertThreshold: 41, autoAlert: true, sound: true, darkMode: false,
  cloudMode: false
};
let bridgeConnected = false;
let firebaseConnected = false;
let bridgeInterval = null;
let firebaseInterval = null;
let lastFirebaseTemp = null;

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  loadSettings();
  initTabs();
  initLocations();
  initEventListeners();
  initDarkMode();
  initLoading();
  updateConnectionStatus();
  renderDashboard();
  initMap();
  initPWA();
});

function initLoading() {
  setTimeout(() => {
    document.getElementById('loading-screen').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('loading-screen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
    }, 500);
  }, 2500);
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(tab).classList.add('active');
      if (tab === 'dashboard') renderDashboard();
      if (tab === 'map') updateMapMarkers();
      if (tab === 'history') renderHistory();
      if (tab === 'prediction') renderPrediction();
    });
  });
}

function initLocations() {
  const selects = ['locationSelect', 'historyLocationFilter', 'predLocationSelect'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    if (id === 'historyLocationFilter') el.appendChild(new Option('All Locations', 'all'));
    LOCATIONS.forEach(loc => el.appendChild(new Option(`${loc.number}. ${loc.name}`, loc.id)));
  });
}

function initEventListeners() {
  document.getElementById('calculateBtn').addEventListener('click', manualCalculate);
  document.getElementById('autoReadBtn').addEventListener('click', toggleAutoRead);
  document.getElementById('simulateBtn').addEventListener('click', simulateReading);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
  document.getElementById('generateReportBtn').addEventListener('click', generateReport);
  document.getElementById('connectBridgeBtn').addEventListener('click', connectBridge);
  document.getElementById('disconnectBridgeBtn').addEventListener('click', disconnectBridge);
  document.getElementById('connectFirebaseBtn').addEventListener('click', connectFirebase);
  document.getElementById('disconnectFirebaseBtn').addEventListener('click', disconnectFirebase);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
  document.getElementById('soundToggle').addEventListener('click', toggleSound);
  document.getElementById('fab').addEventListener('click', () => switchTab('monitor'));
  document.getElementById('printReportBtn').addEventListener('click', () => window.print());
  document.getElementById('closeReportBtn').addEventListener('click', () => document.getElementById('reportModal').classList.add('hidden'));
  document.querySelector('.modal-close').addEventListener('click', () => document.getElementById('reportModal').classList.add('hidden'));
  document.getElementById('cloudModeToggle').addEventListener('change', (e) => {
    settings.cloudMode = e.target.checked;
    if (settings.cloudMode && settings.firebaseUrl) connectFirebase();
    else if (!settings.cloudMode) disconnectFirebase();
    saveSettings();
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
      if (e.key === '1') { e.preventDefault(); switchTab('monitor'); }
      if (e.key === '2') { e.preventDefault(); switchTab('history'); }
      if (e.key === '3') { e.preventDefault(); switchTab('prediction'); }
      if (e.key === '4') { e.preventDefault(); switchTab('dashboard'); }
      if (e.key === '5') { e.preventDefault(); switchTab('map'); }
      if (e.key === '6') { e.preventDefault(); switchTab('settings'); }
      if (e.key === 'Enter') { e.preventDefault(); manualCalculate(); }
    }
  });
}

function switchTab(tab) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (btn) btn.click();
}

function calculateHeatIndex(T, H) {
  let HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (H * 0.094));
  if (HI >= 80) {
    HI = -42.379 + 2.04901523 * T + 10.14333127 * H
      - 0.22475541 * T * H - 6.83783e-3 * T * T
      - 5.481717e-2 * H * H + 1.22874e-3 * T * T * H
      + 8.5282e-4 * T * H * H - 1.99e-6 * T * T * H * H;
    if (H < 13 && T >= 80 && T <= 112) HI -= ((13 - H) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    if (H > 85 && T >= 80 && T <= 87) HI += ((H - 85) / 10) * ((87 - T) / 5);
  }
  return Math.round(HI * 10) / 10;
}

function getHeatStatus(HI) {
  if (HI < 27) return { level: 'safe', label: 'Safe', color: '#5cb85c', advice: 'No precautions needed.' };
  if (HI < 32) return { level: 'caution', label: 'Caution', color: '#f0ad4e', advice: 'Fatigue possible with prolonged exposure.' };
  if (HI < 41) return { level: 'extreme-caution', label: 'Extreme Caution', color: '#ff8c00', advice: 'Heat cramps and exhaustion possible.' };
  if (HI < 51) return { level: 'danger', label: 'Danger', color: '#d9534f', advice: 'Heat cramps and exhaustion likely. Stroke possible.' };
  return { level: 'extreme-danger', label: 'Extreme Danger', color: '#8b0000', advice: 'Heat stroke highly likely! Seek cool area immediately!' };
}

function manualCalculate() {
  const locId = document.getElementById('locationSelect').value;
  const temp = parseFloat(document.getElementById('tempInput').value);
  const humidity = parseFloat(document.getElementById('humidityInput').value);
  if (isNaN(temp) || isNaN(humidity)) { showToast('Please enter valid values.', 'warning'); return; }

  const HI = calculateHeatIndex(temp, humidity);
  const status = getHeatStatus(HI);
  const location = LOCATIONS.find(l => l.id === locId);

  const reading = {
    id: Date.now(), locationId: locId, locationName: location.name,
    temperature: temp, humidity: humidity, heatIndex: HI,
    status: status.level, timestamp: new Date().toISOString()
  };

  readings.unshift(reading);
  saveData();
  displayResult(reading, status);
  showToast(`Heat Index: ${HI}C - ${status.label}`, status.level === 'safe' ? 'success' : status.level.includes('danger') ? 'error' : 'warning');
  if (settings.autoAlert && HI >= settings.alertThreshold) sendAlert(reading, status);
  renderDashboard();
  updateMapMarkers();
}

function displayResult(reading, status) {
  document.getElementById('resultArea').classList.remove('hidden');
  document.getElementById('gaugeValue').textContent = reading.heatIndex;
  document.getElementById('gaugeStatus').textContent = status.label;
  document.getElementById('gaugeStatus').className = 'gauge-status status-' + status.level;
  document.getElementById('hiValue').textContent = reading.heatIndex + 'C';
  document.getElementById('hiStatus').textContent = status.label;
  document.getElementById('hiStatus').style.color = status.color;
  document.getElementById('hiAdvice').textContent = status.advice;
  document.getElementById('hiTime').textContent = new Date(reading.timestamp).toLocaleString();
  drawGauge(reading.heatIndex, status.color);
}

function drawGauge(value, color) {
  const canvas = document.getElementById('heatGauge');
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2, cy = canvas.height / 2, r = 100;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
  ctx.lineWidth = 20; ctx.strokeStyle = '#e0e0e0'; ctx.stroke();
  const maxVal = 60;
  const angle = 0.75 * Math.PI + (Math.min(value, maxVal) / maxVal) * 1.5 * Math.PI;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0.75 * Math.PI, angle);
  ctx.lineWidth = 20; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke();
}

function simulateReading() {
  const temps = [28, 30, 33, 36, 38, 40, 42, 45];
  const hums = [55, 60, 65, 70, 75, 80, 85];
  document.getElementById('tempInput').value = temps[Math.floor(Math.random() * temps.length)];
  document.getElementById('humidityInput').value = hums[Math.floor(Math.random() * hums.length)];
  manualCalculate();
}

/* ===== FIREBASE CLOUD MODE ===== */
function connectFirebase() {
  const url = document.getElementById('firebaseUrl').value.trim();
  if (!url) { showToast('Please enter your Firebase Database URL first!', 'warning'); return; }

  settings.firebaseUrl = url;
  saveSettings();

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp({ databaseURL: url });
    }
    firebaseDb = firebase.database();
    firebaseConnected = true;
    settings.cloudMode = true;
    document.getElementById('cloudModeToggle').checked = true;
    document.getElementById('firebaseStatus').innerHTML = `<span style="color:#5cb85c">Connected to Firebase Cloud!</span><br>Reading live data from anywhere...`;
    showToast('Cloud mode active! Anyone can access live data.', 'success');
    updateConnectionStatus();

    if (firebaseInterval) clearInterval(firebaseInterval);
    firebaseInterval = setInterval(pollFirebase, 3000);
    pollFirebase();
  } catch (e) {
    firebaseConnected = false;
    document.getElementById('firebaseStatus').innerHTML = `<span style="color:#d9534f">Failed: ${e.message}</span>`;
    showToast('Firebase connection failed. Check URL.', 'error');
    updateConnectionStatus();
  }
}

function disconnectFirebase() {
  firebaseConnected = false;
  settings.cloudMode = false;
  document.getElementById('cloudModeToggle').checked = false;
  if (firebaseInterval) { clearInterval(firebaseInterval); firebaseInterval = null; }
  document.getElementById('firebaseStatus').textContent = 'Disconnected from cloud';
  showToast('Cloud mode disabled.', 'info');
  updateConnectionStatus();
}

async function pollFirebase() {
  if (!firebaseConnected || !firebaseDb) return;
  try {
    const snapshot = await firebaseDb.ref('readings/latest').once('value');
    const data = snapshot.val();
    if (data && data.temperature !== undefined && data.humidity !== undefined) {
      document.getElementById('tempInput').value = data.temperature;
      document.getElementById('humidityInput').value = data.humidity;
      const currentTemp = parseFloat(document.getElementById('tempInput').value);
      if (currentTemp !== lastFirebaseTemp) {
        lastFirebaseTemp = currentTemp;
        manualCalculate();
      }
    }
  } catch (e) { console.error('Firebase poll error:', e); }
}

/* ===== LOCAL BRIDGE ===== */
async function connectBridge() {
  const url = document.getElementById('bridgeUrl').value.trim() || 'http://localhost:5000';
  settings.bridgeUrl = url;
  saveSettings();
  try {
    const res = await fetch(`${url}/api/status`, { method: 'GET', mode: 'cors', signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      bridgeConnected = true;
      document.getElementById('bridgeStatus').innerHTML = `<span style="color:#5cb85c">Connected to ${url}</span><br>Arduino: ${data.arduino_connected ? 'Yes' : 'No'}`;
      showToast('Bridge connected!', 'success');
      updateConnectionStatus();
    }
  } catch (e) {
    bridgeConnected = false;
    document.getElementById('bridgeStatus').innerHTML = `<span style="color:#d9534f">Failed: ${e.message}</span>`;
    showToast('Connection failed. Is bridge_server.py running?', 'error');
    updateConnectionStatus();
  }
}

function disconnectBridge() {
  bridgeConnected = false;
  if (bridgeInterval) { clearInterval(bridgeInterval); bridgeInterval = null; }
  document.getElementById('bridgeStatus').textContent = 'Disconnected';
  showToast('Bridge disconnected.', 'info');
  updateConnectionStatus();
}

function toggleAutoRead() {
  if (settings.cloudMode && firebaseConnected) {
    showToast('Cloud mode is active - data updates automatically!', 'info');
    return;
  }
  if (bridgeInterval) {
    clearInterval(bridgeInterval); bridgeInterval = null;
    showToast('Auto-read stopped.', 'info');
    document.getElementById('autoReadBtn').textContent = 'Auto-Read from Arduino';
  } else {
    if (!bridgeConnected) { showToast('Connect to bridge or enable Cloud Mode first!', 'warning'); return; }
    bridgeInterval = setInterval(fetchBridgeData, 5000);
    showToast('Auto-read started.', 'success');
    document.getElementById('autoReadBtn').textContent = 'Stop Auto-Read';
    fetchBridgeData();
  }
}

async function fetchBridgeData() {
  if (!bridgeConnected || !settings.bridgeUrl) return;
  try {
    const res = await fetch(`${settings.bridgeUrl}/api/read`, { mode: 'cors', signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data.temperature !== undefined && data.humidity !== undefined) {
        document.getElementById('tempInput').value = data.temperature;
        document.getElementById('humidityInput').value = data.humidity;
        manualCalculate();
      }
    }
  } catch (e) { console.error('Bridge error:', e); }
}

function updateConnectionStatus() {
  const dot = document.querySelector('.status-dot');
  const text = document.getElementById('statusText');
  const cloud = document.getElementById('cloudStatus');

  if (firebaseConnected) {
    dot.className = 'status-dot online';
    text.textContent = 'Cloud Mode - Live from Anywhere';
    cloud.textContent = 'Firebase Active';
  } else if (bridgeConnected) {
    dot.className = 'status-dot online';
    text.textContent = 'Online - Local Bridge';
    cloud.textContent = settings.bridgeUrl && settings.bridgeUrl.includes('ngrok') ? settings.bridgeUrl : '';
  } else {
    dot.className = 'status-dot offline';
    text.textContent = 'Offline - Manual Input Mode';
    cloud.textContent = '';
  }
}

function renderHistory() {
  const filter = document.getElementById('historyLocationFilter').value;
  const tbody = document.querySelector('#historyTable tbody');
  tbody.innerHTML = '';
  const filtered = filter === 'all' ? readings : readings.filter(r => r.locationId === filter);
  filtered.slice(0, 100).forEach(r => {
    const status = getHeatStatus(r.heatIndex);
    const row = document.createElement('tr');
    row.innerHTML = `<td>${new Date(r.timestamp).toLocaleString()}</td><td>${r.locationName}</td><td>${r.temperature}C</td><td>${r.humidity}%</td><td><strong style="color:${status.color}">${r.heatIndex}C</strong></td><td><span style="background:${status.color};color:white;padding:4px 10px;border-radius:10px;font-size:12px;font-weight:700">${status.label}</span></td><td><button onclick="deleteReading(${r.id})" style="background:#dc3545;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px">Delete</button></td>`;
    tbody.appendChild(row);
  });
  drawHistoryChart(filtered.slice(0, 50));
}

function deleteReading(id) {
  readings = readings.filter(r => r.id !== id);
  saveData(); renderHistory(); renderDashboard();
  showToast('Reading deleted.', 'info');
}

function clearHistory() {
  if (!confirm('Delete ALL readings?')) return;
  readings = []; saveData(); renderHistory(); renderDashboard();
  showToast('All history cleared.', 'info');
}

function drawHistoryChart(data) {
  const canvas = document.getElementById('historyChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.offsetWidth || 600;
  const h = canvas.height = 250;
  ctx.clearRect(0, 0, w, h);
  if (data.length < 2) { ctx.fillStyle = '#999'; ctx.textAlign = 'center'; ctx.fillText('Not enough data', w/2, h/2); return; }
  const rev = [...data].reverse();
  const maxHI = Math.max(...rev.map(d => d.heatIndex), 50);
  const minHI = Math.min(...rev.map(d => d.heatIndex), 0);
  const pad = 40, cw = w - pad*2, ch = h - pad*2;
  ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) { const y = pad + (i/5)*ch; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w-pad, y); ctx.stroke(); }
  ctx.beginPath(); ctx.strokeStyle = '#d9534f'; ctx.lineWidth = 3;
  rev.forEach((d, i) => { const x = pad + (i/(rev.length-1))*cw; const y = pad + ch - ((d.heatIndex-minHI)/(maxHI-minHI))*ch; if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
  rev.forEach((d, i) => { const x = pad + (i/(rev.length-1))*cw; const y = pad + ch - ((d.heatIndex-minHI)/(maxHI-minHI))*ch; const s = getHeatStatus(d.heatIndex); ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fillStyle=s.color; ctx.fill(); });
}

function renderPrediction() {
  const locId = document.getElementById('predLocationSelect').value;
  const locReadings = readings.filter(r => r.locationId === locId);
  const container = document.getElementById('predictionTable');
  container.innerHTML = '';
  if (locReadings.length < 3) { container.innerHTML = '<p style="color:#999;text-align:center;padding:20px">Need at least 3 readings for predictions.</p>'; return; }
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const avgHI = locReadings.reduce((s,r) => s + r.heatIndex, 0) / locReadings.length;
    const status = getHeatStatus(avgHI);
    const div = document.createElement('div'); div.className = 'pred-day';
    div.innerHTML = `<div class="day-name">${days[d.getDay()]}</div><div class="day-temp" style="color:${status.color}">${avgHI.toFixed(1)}C</div><div class="day-status" style="background:${status.color}">${status.label}</div>`;
    container.appendChild(div);
  }
  drawPredictionChart(locReadings);
}

function drawPredictionChart(data) {
  const canvas = document.getElementById('predictionChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.offsetWidth || 600;
  const h = canvas.height = 200;
  ctx.clearRect(0, 0, w, h);
  const rev = [...data].reverse().slice(0, 30);
  const maxHI = Math.max(...rev.map(d => d.heatIndex), 50);
  const pad = 30, cw = w - pad*2, ch = h - pad*2;
  const bw = cw / rev.length;
  rev.forEach((d, i) => { const s = getHeatStatus(d.heatIndex); const bh = (d.heatIndex / maxHI) * ch; ctx.fillStyle = s.color; ctx.fillRect(pad + i*bw + 2, h - pad - bh, bw - 4, bh); });
}

function renderDashboard() {
  const stats = document.getElementById('dashboardStats');
  const grid = document.getElementById('dashboardGrid');
  const latestByLoc = {};
  readings.forEach(r => { latestByLoc[r.locationId] = r; });
  const locs = Object.values(latestByLoc);
  const safe = locs.filter(r => r.heatIndex < 27).length;
  const caution = locs.filter(r => r.heatIndex >= 27 && r.heatIndex < 32).length;
  const extreme = locs.filter(r => r.heatIndex >= 32 && r.heatIndex < 41).length;
  const danger = locs.filter(r => r.heatIndex >= 41 && r.heatIndex < 51).length;
  const exDanger = locs.filter(r => r.heatIndex >= 51).length;
  stats.innerHTML = `<div class="stat-card"><div class="stat-value">${readings.length}</div><div class="stat-label">Total Readings</div></div><div class="stat-card"><div class="stat-value">${safe}</div><div class="stat-label">Safe</div></div><div class="stat-card"><div class="stat-value">${caution + extreme}</div><div class="stat-label">Caution</div></div><div class="stat-card"><div class="stat-value">${danger + exDanger}</div><div class="stat-label">Danger</div></div>`;
  grid.innerHTML = '';
  LOCATIONS.forEach(loc => {
    const r = latestByLoc[loc.id];
    const status = r ? getHeatStatus(r.heatIndex) : { level: 'safe', label: 'No Data', color: '#999', advice: 'No readings yet.' };
    const card = document.createElement('div'); card.className = `dash-card ${status.level}`;
    card.innerHTML = `<h4 style="margin-bottom:8px;font-size:15px">${loc.number}. ${loc.name}</h4><p style="font-size:24px;font-weight:800;color:${status.color};margin-bottom:4px">${r ? r.heatIndex + 'C' : '--'}</p><p style="font-size:12px;font-weight:700;background:${status.color};color:white;display:inline-block;padding:3px 10px;border-radius:8px">${status.label}</p><p style="font-size:12px;color:var(--text-light);margin-top:8px">${status.advice}</p>${r ? `<p style="font-size:11px;color:#999;margin-top:6px">${new Date(r.timestamp).toLocaleString()}</p>` : ''}`;
    grid.appendChild(card);
  });
}

function initMap() {}

function updateMapMarkers() {
  const container = document.getElementById('mapMarkers');
  container.innerHTML = '';
  const latestByLoc = {};
  readings.forEach(r => { latestByLoc[r.locationId] = r; });
  LOCATIONS.forEach((loc, i) => {
    const r = latestByLoc[loc.id];
    const status = r ? getHeatStatus(r.heatIndex) : { level: 'safe', color: '#999' };
    const marker = document.createElement('div');
    marker.className = `map-marker ${status.level}`;
    marker.textContent = loc.number;
    marker.title = `${loc.name}: ${r ? r.heatIndex + 'C' : 'No data'}`;
    const col = i % 5, row = Math.floor(i / 5);
    marker.style.left = `${15 + col * 18}%`;
    marker.style.top = `${15 + row * 15}%`;
    marker.addEventListener('click', () => { document.getElementById('locationSelect').value = loc.id; switchTab('monitor'); showToast(`Selected: ${loc.name}`, 'info'); });
    container.appendChild(marker);
  });
}

function generateReport() {
  const latestByLoc = {};
  readings.forEach(r => { latestByLoc[r.locationId] = r; });
  let html = `<div style="text-align:center;margin-bottom:20px"><h1 style="color:#d9534f;font-size:28px">HEAT ADVISORY REPORT</h1><p style="font-size:14px;color:#666">Mahaplag National High School</p><p style="font-size:14px;color:#666">Generated: ${new Date().toLocaleString()}</p></div><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#d9534f;color:white"><th style="padding:10px;text-align:left">Location</th><th style="padding:10px">Temp</th><th style="padding:10px">Humidity</th><th style="padding:10px">Heat Index</th><th style="padding:10px">Status</th><th style="padding:10px">Last Reading</th></tr></thead><tbody>`;
  LOCATIONS.forEach(loc => {
    const r = latestByLoc[loc.id];
    const status = r ? getHeatStatus(r.heatIndex) : { label: 'No Data', color: '#999' };
    html += `<tr style="border-bottom:1px solid #ddd"><td style="padding:10px">${loc.number}. ${loc.name}</td><td style="padding:10px;text-align:center">${r ? r.temperature + 'C' : '--'}</td><td style="padding:10px;text-align:center">${r ? r.humidity + '%' : '--'}</td><td style="padding:10px;text-align:center;font-weight:700;color:${status.color}">${r ? r.heatIndex + 'C' : '--'}</td><td style="padding:10px;text-align:center"><span style="background:${status.color};color:white;padding:3px 10px;border-radius:8px;font-size:11px">${status.label}</span></td><td style="padding:10px;text-align:center;font-size:11px;color:#666">${r ? new Date(r.timestamp).toLocaleString() : 'Never'}</td></tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('reportContent').innerHTML = html;
  document.getElementById('reportModal').classList.remove('hidden');
}

function exportCSV() {
  if (readings.length === 0) { showToast('No data to export.', 'warning'); return; }
  let csv = 'Timestamp,Location,Temperature(C),Humidity(%),Heat Index(C),Status\n';
  readings.forEach(r => { const status = getHeatStatus(r.heatIndex); csv += `${r.timestamp},"${r.locationName}",${r.temperature},${r.humidity},${r.heatIndex},${status.label}\n`; });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `SchoolHeat_Export_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported!', 'success');
}

function sendAlert(reading, status) {
  if (!settings.alertPhone) return;
  const msg = `HEAT ALERT: ${reading.locationName} is at ${status.label} level (${reading.heatIndex}C). ${status.advice}`;
  window.open(`https://wa.me/${settings.alertPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 400); }, 3000);
}

function saveSettings() {
  settings.bridgeUrl = document.getElementById('bridgeUrl').value.trim();
  settings.firebaseUrl = document.getElementById('firebaseUrl').value.trim();
  settings.alertPhone = document.getElementById('alertPhone').value.trim();
  settings.alertThreshold = parseFloat(document.getElementById('alertThreshold').value) || 41;
  settings.autoAlert = document.getElementById('autoAlertEnabled').checked;
  settings.cloudMode = document.getElementById('cloudModeToggle').checked;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  showToast('Settings saved!', 'success');
}

function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    settings = JSON.parse(saved);
    document.getElementById('bridgeUrl').value = settings.bridgeUrl || '';
    document.getElementById('firebaseUrl').value = settings.firebaseUrl || '';
    document.getElementById('alertPhone').value = settings.alertPhone || '';
    document.getElementById('alertThreshold').value = settings.alertThreshold || 41;
    document.getElementById('autoAlertEnabled').checked = settings.autoAlert !== false;
    document.getElementById('cloudModeToggle').checked = settings.cloudMode || false;
    if (settings.firebaseUrl && settings.cloudMode) {
      setTimeout(() => connectFirebase(), 1000);
    }
  }
}

function toggleDarkMode() {
  settings.darkMode = !settings.darkMode;
  document.body.classList.toggle('dark-mode', settings.darkMode);
  document.getElementById('darkModeToggle').textContent = settings.darkMode ? '☀️' : '🌙';
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function initDarkMode() {
  if (settings.darkMode) { document.body.classList.add('dark-mode'); document.getElementById('darkModeToggle').textContent = '☀️'; }
}

function toggleSound() {
  settings.sound = !settings.sound;
  document.getElementById('soundToggle').textContent = settings.sound ? '🔊' : '🔇';
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(readings)); }
function loadData() { const saved = localStorage.getItem(STORAGE_KEY); if (saved) readings = JSON.parse(saved); }

function initPWA() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    const btn = document.getElementById('installBtn');
    btn.style.display = 'inline-block';
    btn.addEventListener('click', () => e.prompt());
  });
}
