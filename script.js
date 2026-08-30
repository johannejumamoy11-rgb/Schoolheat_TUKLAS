/* ============================================
   SchoolHeat Ultimate — TUKLAS 2026
   Core Application Logic
   ============================================ */

const LOCATIONS = [
  { name: "School Gate", x: 50, y: 92 },
  { name: "Admin Building", x: 50, y: 78 },
  { name: "Principal's Office", x: 45, y: 75 },
  { name: "Faculty Room", x: 55, y: 75 },
  { name: "Library", x: 30, y: 65 },
  { name: "Science Lab", x: 70, y: 65 },
  { name: "Computer Lab", x: 75, y: 55 },
  { name: "TLE Building", x: 25, y: 55 },
  { name: "AVR / Auditorium", x: 50, y: 55 },
  { name: "Canteen", x: 15, y: 45 },
  { name: "Clinic", x: 40, y: 45 },
  { name: "Guidance Office", x: 60, y: 45 },
  { name: "Registrar", x: 50, y: 42 },
  { name: "Room 1", x: 20, y: 35 },
  { name: "Room 2", x: 30, y: 35 },
  { name: "Room 3", x: 40, y: 35 },
  { name: "Room 4", x: 50, y: 35 },
  { name: "Room 5", x: 60, y: 35 },
  { name: "Room 6", x: 70, y: 35 },
  { name: "Room 7", x: 80, y: 35 },
  { name: "Room 8", x: 25, y: 25 },
  { name: "Room 9", x: 35, y: 25 },
  { name: "Room 10", x: 45, y: 25 },
  { name: "Room 11", x: 55, y: 25 },
  { name: "Room 12", x: 65, y: 25 },
  { name: "Room 13", x: 75, y: 25 },
  { name: "Basketball Court", x: 50, y: 12 },
  { name: "Open Court", x: 20, y: 12 },
  { name: "Gazebo / Garden", x: 85, y: 15 }
];

const STATUS_COLORS = {
  safe: '#10b981',
  caution: '#f59e0b',
  danger: '#ef4444',
  extreme: '#dc2626',
  nodata: '#6b7280'
};

const STATUS_LABELS = {
  safe: 'Safe',
  caution: 'Caution',
  danger: 'Danger',
  extreme: 'Extreme',
  nodata: 'No Data'
};

class SchoolHeatApp {
  constructor() {
    this.readings = JSON.parse(localStorage.getItem('sh_readings') || '[]');
    this.settings = JSON.parse(localStorage.getItem('sh_settings') || '{"firebase":true,"sms":false,"outlier":true,"spike":true,"tempOffset":0,"humidityOffset":0}');
    this.currentTab = 'dashboard';
    this.forecastChartLoaded = false;
    this.trendChartLoaded = false;
    this.distributionChartLoaded = false;
    this.init();
  }

  init() {
    this.populateLocations();
    this.applySettings();
    this.bindEvents();
    this.updateDashboard();
    this.renderHistory();
    this.renderMap();
    this.setupForecastObserver();
    this.setupTrendObserver();
    this.setupDistributionObserver();
    this.hideLoader();
  }

  hideLoader() {
    const loader = document.getElementById('loading-screen');
    if (!loader) return;
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 600);
    }, 1800);
  }

  /* ============================================
     LOCATION & INPUT
     ============================================ */

  populateLocations() {
    const select = document.getElementById('location-select');
    if (!select) return;
    LOCATIONS.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.name;
      opt.textContent = loc.name;
      select.appendChild(opt);
    });
  }

  bindEvents() {
    const tempInput = document.getElementById('temp-input');
    const humInput = document.getElementById('humidity-input');
    if (tempInput) tempInput.addEventListener('input', () => this.updatePreview());
    if (humInput) humInput.addEventListener('input', () => this.updatePreview());

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key >= '1' && e.key <= '6') {
        const tabs = ['dashboard','input','history','forecast','map','settings'];
        this.switchTab(tabs[parseInt(e.key) - 1]);
      }
      if (e.key === 'n' || e.key === 'N') {
        this.switchTab('input');
        document.getElementById('location-select')?.focus();
      }
      if (e.key === 'c' || e.key === 'C') this.calculate();
      if (e.key === 'd' || e.key === 'D') this.autoRead();
      if (e.key === 'Escape') {
        document.getElementById('auto-read-overlay')?.classList.remove('active');
      }
    });
  }

  /* ============================================
     HEAT INDEX CALCULATION
     ============================================ */

  calculateHeatIndex(T, H) {
    // Steadman-Rothfusz formula (Celsius)
    const c1 = -8.784694755;
    const c2 = 1.61139411;
    const c3 = 2.338548839;
    const c4 = -0.14611605;
    const c5 = -0.012308094;
    const c6 = -0.016424828;
    const c7 = 0.002211732;
    const c8 = 0.00072546;
    const c9 = -0.000003582;
    let hi = c1 + c2*T + c3*H + c4*T*H + c5*T*T + c6*H*H + c7*T*T*H + c8*T*H*H + c9*T*T*H*H;
    return Math.max(T, hi); // HI cannot be lower than actual temp
  }

  getStatus(hi) {
    if (hi < 27) return 'safe';
    if (hi < 33) return 'caution';
    if (hi < 42) return 'danger';
    return 'extreme';
  }

  getStatusColor(status) {
    return STATUS_COLORS[status] || STATUS_COLORS.nodata;
  }

  /* ============================================
     PREVIEW
     ============================================ */

  updatePreview() {
    const temp = parseFloat(document.getElementById('temp-input')?.value);
    const hum = parseFloat(document.getElementById('humidity-input')?.value);
    const card = document.getElementById('preview-card');
    if (!card || isNaN(temp) || isNaN(hum)) {
      if (card) card.style.display = 'none';
      return;
    }
    card.style.display = 'block';
    const hi = this.calculateHeatIndex(temp, hum);
    const status = this.getStatus(hi);
    const bar = document.getElementById('preview-bar');
    const val = document.getElementById('preview-value');
    const stat = document.getElementById('preview-status');
    if (bar) {
      const pct = Math.min(100, Math.max(0, (hi / 50) * 100));
      bar.style.width = pct + '%';
    }
    if (val) val.textContent = hi.toFixed(1) + ' °C';
    if (stat) {
      stat.textContent = STATUS_LABELS[status];
      stat.className = 'preview-status ' + status;
    }
  }

  /* ============================================
     CALCULATE & SAVE
     ============================================ */

  calculate() {
    const loc = document.getElementById('location-select')?.value;
    const temp = parseFloat(document.getElementById('temp-input')?.value);
    const hum = parseFloat(document.getElementById('humidity-input')?.value);
    if (!loc || isNaN(temp) || isNaN(hum)) {
      this.toast('Please fill in all fields', 'warning');
      return;
    }
    if (temp < 0 || temp > 60 || hum < 0 || hum > 100) {
      this.toast('Temperature or humidity out of range', 'error');
      return;
    }
    const hi = this.calculateHeatIndex(temp, hum);
    const status = this.getStatus(hi);
    const reading = {
      id: Date.now(),
      location: loc,
      temperature: temp,
      humidity: hum,
      heatIndex: parseFloat(hi.toFixed(2)),
      status,
      timestamp: new Date().toISOString()
    };
    this.readings.unshift(reading);
    this.saveReadings();
    this.updateDashboard();
    this.renderHistory();
    this.renderMap();
    this.toast(`Saved: ${loc} — ${hi.toFixed(1)}°C (${STATUS_LABELS[status]})`, 'success');
    document.getElementById('temp-input').value = '';
    document.getElementById('humidity-input').value = '';
    document.getElementById('preview-card').style.display = 'none';
  }

  /* ============================================
     AUTO READ
     ============================================ */

  autoRead() {
    const overlay = document.getElementById('auto-read-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    setTimeout(() => {
      overlay.classList.remove('active');
      const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)].name;
      const temp = 28 + Math.random() * 12;
      const hum = 55 + Math.random() * 35;
      const hi = this.calculateHeatIndex(temp, hum);
      const status = this.getStatus(hi);
      const reading = {
        id: Date.now(),
        location: loc,
        temperature: parseFloat(temp.toFixed(1)),
        humidity: parseFloat(hum.toFixed(1)),
        heatIndex: parseFloat(hi.toFixed(2)),
        status,
        timestamp: new Date().toISOString()
      };
      this.readings.unshift(reading);
      this.saveReadings();
      this.updateDashboard();
      this.renderHistory();
      this.renderMap();
      this.toast(`Auto-Read: ${loc} — ${hi.toFixed(1)}°C (${STATUS_LABELS[status]})`, 'success');
    }, 2200);
  }

  /* ============================================
     DASHBOARD
     ============================================ */

  updateDashboard() {
    const counts = { safe: 0, caution: 0, danger: 0, extreme: 0 };
    const latestByLoc = {};
    this.readings.forEach(r => {
      if (!latestByLoc[r.location] || new Date(r.timestamp) > new Date(latestByLoc[r.location].timestamp)) {
        latestByLoc[r.location] = r;
      }
    });
    Object.values(latestByLoc).forEach(r => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });

    // Animate counters
    Object.entries(counts).forEach(([status, count]) => {
      const el = document.getElementById('count-' + status);
      if (el) this.animateCounter(el, parseInt(el.textContent) || 0, count);
    });

    // Latest reading
    const latest = this.readings[0];
    if (latest) {
      document.getElementById('latest-location').textContent = latest.location;
      document.getElementById('latest-time').textContent = this.formatTime(latest.timestamp);
      document.getElementById('latest-temp').textContent = latest.temperature.toFixed(1) + '°C';
      document.getElementById('latest-humidity').textContent = latest.humidity.toFixed(1) + '%';
      document.getElementById('latest-hi').textContent = latest.heatIndex.toFixed(1) + '°C';
      const stEl = document.getElementById('latest-status');
      stEl.textContent = STATUS_LABELS[latest.status];
      stEl.className = 'status-pill ' + latest.status;
      this.drawGauge(latest.heatIndex);
    } else {
      document.getElementById('latest-location').textContent = '—';
      document.getElementById('latest-time').textContent = '—';
      document.getElementById('latest-temp').textContent = '—';
      document.getElementById('latest-humidity').textContent = '—';
      document.getElementById('latest-hi').textContent = '—';
      const stEl = document.getElementById('latest-status');
      stEl.textContent = 'No Data';
      stEl.className = 'status-pill nodata';
      this.drawGauge(0);
    }

    // Activity list
    const activityList = document.getElementById('activity-list');
    if (activityList) {
      if (this.readings.length === 0) {
        activityList.innerHTML = '<div class="activity-empty">No readings yet. Add your first reading or use Auto-Read.</div>';
      } else {
        activityList.innerHTML = this.readings.slice(0, 5).map((r, i) => `
          <div class="activity-item stagger-${Math.min(i+1, 5)}">
            <div class="activity-dot ${r.status}"></div>
            <div class="activity-info">
              <div class="activity-loc">${r.location}</div>
              <div class="activity-meta">${this.formatTime(r.timestamp)} • ${r.temperature.toFixed(1)}°C / ${r.humidity.toFixed(1)}%</div>
            </div>
            <div class="activity-hi ${r.status}">${r.heatIndex.toFixed(1)}°C</div>
          </div>
        `).join('');
      }
    }
  }

  animateCounter(el, from, to) {
    if (from === to) return;
    const duration = 600;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + (to - from) * ease);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ============================================
     CANVAS GAUGE
     ============================================ */

  drawGauge(value) {
    const canvas = document.getElementById('gauge-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = size * 0.38;
    const lineWidth = size * 0.06;
    ctx.clearRect(0, 0, size, size);

    // Glow effect
    ctx.save();
    ctx.shadowColor = 'rgba(59, 130, 246, 0.3)';
    ctx.shadowBlur = 20;

    // Background arc
    ctx.beginPath();
    ctx.arc(center, center, radius, Math.PI * 0.8, Math.PI * 2.2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Colored segments
    const segments = [
      { start: Math.PI * 0.8, end: Math.PI * 1.1, color: STATUS_COLORS.safe },
      { start: Math.PI * 1.1, end: Math.PI * 1.4, color: STATUS_COLORS.caution },
      { start: Math.PI * 1.4, end: Math.PI * 1.7, color: STATUS_COLORS.danger },
      { start: Math.PI * 1.7, end: Math.PI * 2.2, color: STATUS_COLORS.extreme }
    ];
    segments.forEach(seg => {
      ctx.beginPath();
      ctx.arc(center, center, radius, seg.start, seg.end);
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = lineWidth * 0.6;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.25;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Value arc
    const maxVal = 50;
    const angle = Math.PI * 0.8 + (Math.min(value, maxVal) / maxVal) * (Math.PI * 1.4);
    const status = this.getStatus(value);
    const color = STATUS_COLORS[status] || STATUS_COLORS.nodata;

    // Glow for value arc
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(center, center, radius, Math.PI * 0.8, angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Needle
    if (value > 0) {
      const needleLen = radius - 8;
      const nx = center + Math.cos(angle) * needleLen;
      const ny = center + Math.sin(angle) * needleLen;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
      // Needle dot
      ctx.beginPath();
      ctx.arc(center, center, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
  }

  /* ============================================
     HISTORY & CHARTS
     ============================================ */

  renderHistory() {
    const list = document.getElementById('history-list');
    const search = document.getElementById('history-search')?.value.toLowerCase() || '';
    const filter = document.getElementById('history-filter')?.value || 'all';
    if (!list) return;

    let filtered = this.readings;
    if (search) {
      filtered = filtered.filter(r =>
        r.location.toLowerCase().includes(search) ||
        r.status.toLowerCase().includes(search)
      );
    }
    if (filter !== 'all') {
      filtered = filtered.filter(r => r.status === filter);
    }

    if (filtered.length === 0) {
      list.innerHTML = '<div class="history-empty">No readings match your filters.</div>';
    } else {
      list.innerHTML = filtered.map((r, i) => `
        <div class="history-item" style="animation-delay:${Math.min(i*0.03,0.5)}s">
          <div class="history-pin ${r.status}">${r.heatIndex.toFixed(0)}</div>
          <div class="history-info">
            <div class="history-loc">${r.location}</div>
            <div class="history-meta">
              <span>${this.formatTime(r.timestamp)}</span>
              <span>${r.temperature.toFixed(1)}°C</span>
              <span>${r.humidity.toFixed(1)}%</span>
            </div>
          </div>
          <div class="history-hi ${r.status}">${r.heatIndex.toFixed(1)}°C</div>
        </div>
      `).join('');
    }

    // Update distribution chart
    this.drawDistributionChart();
  }

  filterHistory() {
    this.renderHistory();
  }

  /* ============================================
     TREND CHART (Line Chart with Gradient)
     ============================================ */

  setupTrendObserver() {
    const canvas = document.getElementById('trend-chart');
    if (!canvas) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !this.trendChartLoaded) {
          this.trendChartLoaded = true;
          this.drawTrendChart();
        }
      });
    }, { threshold: 0.2 });
    observer.observe(canvas);
  }

  drawTrendChart() {
    const canvas = document.getElementById('trend-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 30, right: 20, bottom: 40, left: 45 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    if (this.readings.length < 2) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Add at least 2 readings to see the trend', w/2, h/2);
      return;
    }

    // Group by date, take average HI per day
    const byDate = {};
    this.readings.slice().reverse().forEach(r => {
      const d = new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!byDate[d]) byDate[d] = { sum: 0, count: 0 };
      byDate[d].sum += r.heatIndex;
      byDate[d].count++;
    });
    const labels = Object.keys(byDate).slice(-10);
    const data = labels.map(d => byDate[d].sum / byDate[d].count);

    const maxVal = Math.max(...data, 45);
    const minVal = Math.min(...data, 20);
    const range = maxVal - minVal || 1;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
      // Y labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const val = maxVal - (range / 4) * i;
      ctx.fillText(val.toFixed(0) + '°', pad.left - 8, y);
    }

    // X labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    labels.forEach((label, i) => {
      const x = pad.left + (chartW / (labels.length - 1)) * i;
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(label, x, pad.top + chartH + 10);
    });

    // Points
    const points = data.map((val, i) => ({
      x: pad.left + (chartW / (labels.length - 1)) * i,
      y: pad.top + chartH - ((val - minVal) / range) * chartH,
      val,
      status: this.getStatus(val)
    }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    grad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    // Fill area
    ctx.beginPath();
    ctx.moveTo(points[0].x, pad.top + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line with glow
    ctx.save();
    ctx.shadowColor = 'rgba(59, 130, 246, 0.4)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
    }
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    // Points with glow
    points.forEach(p => {
      const color = STATUS_COLORS[p.status];
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15;
      ctx.fill();
      ctx.restore();
    });
  }

  /* ============================================
     DISTRIBUTION CHART (Donut)
     ============================================ */

  setupDistributionObserver() {
    const canvas = document.getElementById('distribution-chart');
    if (!canvas) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !this.distributionChartLoaded) {
          this.distributionChartLoaded = true;
          this.drawDistributionChart();
        }
      });
    }, { threshold: 0.2 });
    observer.observe(canvas);
  }

  drawDistributionChart() {
    const canvas = document.getElementById('distribution-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const centerX = w * 0.35;
    const centerY = h / 2;
    const radius = Math.min(w, h) * 0.28;
    const thickness = 18;

    ctx.clearRect(0, 0, w, h);

    const counts = { safe: 0, caution: 0, danger: 0, extreme: 0 };
    this.readings.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    if (total === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data yet', centerX, centerY);
      return;
    }

    let startAngle = -Math.PI / 2;
    const statuses = ['safe', 'caution', 'danger', 'extreme'];
    statuses.forEach(status => {
      const count = counts[status];
      if (count === 0) return;
      const slice = (count / total) * Math.PI * 2;
      const endAngle = startAngle + slice;
      const color = STATUS_COLORS[status];

      // Glow
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      startAngle = endAngle;
    });

    // Center text
    ctx.fillStyle = '#f0f0f5';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), centerX, centerY - 6);
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Readings', centerX, centerY + 12);

    // Legend
    const legendEl = document.getElementById('distribution-legend');
    if (legendEl) {
      legendEl.innerHTML = statuses.map(s => {
        const pct = total > 0 ? Math.round((counts[s] / total) * 100) : 0;
        return `
          <div class="dist-legend-item">
            <span style="background:${STATUS_COLORS[s]}"></span>
            <span>${STATUS_LABELS[s]}</span>
            <span class="dist-count">${counts[s]} (${pct}%)</span>
          </div>
        `;
      }).join('');
    }
  }

  /* ============================================
     FORECAST
     ============================================ */

  setupForecastObserver() {
    const canvas = document.getElementById('forecast-chart');
    if (!canvas) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !this.forecastChartLoaded) {
          this.forecastChartLoaded = true;
          this.drawForecastChart();
        }
      });
    }, { threshold: 0.2 });
    observer.observe(canvas);
  }

  drawForecastChart() {
    const canvas = document.getElementById('forecast-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 30, right: 20, bottom: 40, left: 45 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    if (this.readings.length < 3) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Collect at least 3 days of data for forecast', w/2, h/2);
      document.getElementById('forecast-summary').textContent = 'Collect at least 3 days of data to generate a forecast.';
      document.getElementById('forecast-cards').innerHTML = '';
      return;
    }

    // Simple linear regression for forecast
    const recent = this.readings.slice(0, Math.min(this.readings.length, 20)).reverse();
    const n = recent.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    recent.forEach((r, i) => {
      sumX += i;
      sumY += r.heatIndex;
      sumXY += i * r.heatIndex;
      sumX2 += i * i;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
    const intercept = (sumY - slope * sumX) / n;

    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = new Date();
    const forecast = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const val = intercept + slope * (n + i - 1);
      forecast.push({
        day: days[d.getDay()],
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.max(20, val),
        status: this.getStatus(Math.max(20, val))
      });
    }

    const allValues = [...recent.map(r => r.heatIndex), ...forecast.map(f => f.value)];
    const maxVal = Math.max(...allValues, 45);
    const minVal = Math.min(...allValues, 20);
    const range = maxVal - minVal || 1;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText((maxVal - (range/4)*i).toFixed(0) + '°', pad.left - 8, y);
    }

    // Historical points (last 5)
    const histCount = Math.min(5, recent.length);
    const histPoints = [];
    for (let i = 0; i < histCount; i++) {
      const idx = recent.length - histCount + i;
      const x = pad.left + (chartW / 11) * i;
      const y = pad.top + chartH - ((recent[idx].heatIndex - minVal) / range) * chartH;
      histPoints.push({ x, y, val: recent[idx].heatIndex, status: recent[idx].status, type: 'hist' });
    }

    // Forecast points
    const fcPoints = forecast.map((f, i) => ({
      x: pad.left + (chartW / 11) * (histCount + i),
      y: pad.top + chartH - ((f.value - minVal) / range) * chartH,
      val: f.value,
      status: f.status,
      type: 'fc',
      day: f.day
    }));

    const allPoints = [...histPoints, ...fcPoints];

    // X labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    allPoints.forEach((p, i) => {
      ctx.fillStyle = p.type === 'fc' ? '#9ca3af' : '#6b7280';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(p.day || (i+1), p.x, pad.top + chartH + 10);
    });

    // Historical line
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(histPoints[0].x, histPoints[0].y);
    for (let i = 1; i < histPoints.length; i++) {
      ctx.lineTo(histPoints[i].x, histPoints[i].y);
    }
    ctx.strokeStyle = 'rgba(107,114,128,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Forecast line with gradient
    const grad = ctx.createLinearGradient(fcPoints[0].x, 0, fcPoints[fcPoints.length-1].x, 0);
    grad.addColorStop(0, '#3b82f6');
    grad.addColorStop(1, '#8b5cf6');

    ctx.save();
    ctx.shadowColor = 'rgba(139, 92, 246, 0.3)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(fcPoints[0].x, fcPoints[0].y);
    for (let i = 1; i < fcPoints.length; i++) {
      const prev = fcPoints[i-1];
      const curr = fcPoints[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
    }
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Forecast area fill
    ctx.beginPath();
    ctx.moveTo(fcPoints[0].x, pad.top + chartH);
    fcPoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(fcPoints[fcPoints.length-1].x, pad.top + chartH);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    areaGrad.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
    areaGrad.addColorStop(1, 'rgba(139, 92, 246, 0.0)');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Points
    allPoints.forEach(p => {
      const color = STATUS_COLORS[p.status];
      ctx.save();
      if (p.type === 'fc') {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.type === 'fc' ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (p.type === 'fc') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.12;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    });

    // Forecast cards
    const cardsEl = document.getElementById('forecast-cards');
    if (cardsEl) {
      cardsEl.innerHTML = forecast.map(f => `
        <div class="forecast-day">
          <div class="forecast-day-name">${f.day}</div>
          <div class="forecast-day-icon">${this.getWeatherIcon(f.status)}</div>
          <div class="forecast-day-temp ${f.status}">${f.value.toFixed(1)}°</div>
          <div class="forecast-day-label ${f.status}">${STATUS_LABELS[f.status]}</div>
        </div>
      `).join('');
    }

    const summary = document.getElementById('forecast-summary');
    if (summary) {
      const avg = forecast.reduce((a, f) => a + f.value, 0) / forecast.length;
      const avgStatus = this.getStatus(avg);
      summary.innerHTML = `Average forecast: <strong style="color:${STATUS_COLORS[avgStatus]}">${avg.toFixed(1)}°C</strong> (${STATUS_LABELS[avgStatus]}) over the next 7 days.`;
    }
  }

  getWeatherIcon(status) {
    const icons = {
      safe: '☀️',
      caution: '⛅',
      danger: '🌤️',
      extreme: '🔥'
    };
    return icons[status] || '☀️';
  }

  /* ============================================
     MAP
     ============================================ */

  renderMap() {
    const pinsContainer = document.getElementById('map-pins');
    const mapImg = document.getElementById('map-img');
    if (!pinsContainer) return;

    const latestByLoc = {};
    this.readings.forEach(r => {
      if (!latestByLoc[r.location] || new Date(r.timestamp) > new Date(latestByLoc[r.location].timestamp)) {
        latestByLoc[r.location] = r;
      }
    });

    pinsContainer.innerHTML = LOCATIONS.map(loc => {
      const reading = latestByLoc[loc.name];
      const status = reading ? reading.status : 'nodata';
      const hi = reading ? reading.heatIndex.toFixed(1) + '°C' : 'No data';
      return `
        <div class="map-pin ${status}" style="left:${loc.x}%;top:${loc.y}%">
          <div class="map-pin-tooltip">
            <div class="tt-loc">${loc.name}</div>
            <div class="tt-hi ${status}">${hi}</div>
          </div>
        </div>
      `;
    }).join('');

    // Ensure pins container matches image size after load
    const syncPins = () => {
      if (mapImg && pinsContainer) {
        pinsContainer.style.width = mapImg.clientWidth + 'px';
        pinsContainer.style.height = mapImg.clientHeight + 'px';
      }
    };
    if (mapImg) {
      if (mapImg.complete) syncPins();
      else mapImg.onload = syncPins;
      window.addEventListener('resize', syncPins);
    }
  }

  /* ============================================
     SETTINGS
     ============================================ */

  applySettings() {
    document.getElementById('setting-firebase').checked = this.settings.firebase;
    document.getElementById('setting-sms').checked = this.settings.sms;
    document.getElementById('setting-outlier').checked = this.settings.outlier;
    document.getElementById('setting-spike').checked = this.settings.spike;
    document.getElementById('cal-temp').value = this.settings.tempOffset;
    document.getElementById('cal-humidity').value = this.settings.humidityOffset;
  }

  saveSettings() {
    this.settings = {
      firebase: document.getElementById('setting-firebase').checked,
      sms: document.getElementById('setting-sms').checked,
      outlier: document.getElementById('setting-outlier').checked,
      spike: document.getElementById('setting-spike').checked,
      tempOffset: parseFloat(document.getElementById('cal-temp').value) || 0,
      humidityOffset: parseFloat(document.getElementById('cal-humidity').value) || 0
    };
    localStorage.setItem('sh_settings', JSON.stringify(this.settings));
  }

  /* ============================================
     DATA MANAGEMENT
     ============================================ */

  saveReadings() {
    localStorage.setItem('sh_readings', JSON.stringify(this.readings));
  }

  generateDemoData() {
    const now = new Date();
    const demo = [];
    for (let d = 6; d >= 0; d--) {
      const dayBase = new Date(now);
      dayBase.setDate(dayBase.getDate() - d);
      const numReadings = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < numReadings; i++) {
        const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)].name;
        const hour = 7 + Math.floor(Math.random() * 9);
        const minute = Math.floor(Math.random() * 60);
        const temp = 26 + Math.random() * 14 + (hour - 12) * 0.3;
        const hum = 50 + Math.random() * 40;
        const ts = new Date(dayBase);
        ts.setHours(hour, minute);
        const hi = this.calculateHeatIndex(temp, hum);
        demo.push({
          id: ts.getTime() + i,
          location: loc,
          temperature: parseFloat(temp.toFixed(1)),
          humidity: parseFloat(hum.toFixed(1)),
          heatIndex: parseFloat(hi.toFixed(2)),
          status: this.getStatus(hi),
          timestamp: ts.toISOString()
        });
      }
    }
    this.readings = demo.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    this.saveReadings();
    this.updateDashboard();
    this.renderHistory();
    this.renderMap();
    this.trendChartLoaded = false;
    this.distributionChartLoaded = false;
    this.forecastChartLoaded = false;
    this.drawTrendChart();
    this.drawDistributionChart();
    this.drawForecastChart();
    this.toast('Demo data generated! 7 days of readings added.', 'success');
  }

  clearAllData() {
    if (!confirm('Are you sure you want to clear ALL readings? This cannot be undone.')) return;
    this.readings = [];
    this.saveReadings();
    this.updateDashboard();
    this.renderHistory();
    this.renderMap();
    this.trendChartLoaded = false;
    this.distributionChartLoaded = false;
    this.forecastChartLoaded = false;
    this.drawTrendChart();
    this.drawDistributionChart();
    this.drawForecastChart();
    this.toast('All data cleared.', 'info');
  }

  exportCSV() {
    if (this.readings.length === 0) {
      this.toast('No data to export', 'warning');
      return;
    }
    const headers = ['ID','Location','Temperature (°C)','Humidity (%)','Heat Index (°C)','Status','Timestamp'];
    const rows = this.readings.map(r => [r.id, r.location, r.temperature, r.humidity, r.heatIndex, r.status, r.timestamp]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    this.downloadFile(csv, 'schoolheat_readings.csv', 'text/csv');
    this.toast('CSV exported successfully', 'success');
  }

  exportJSON() {
    if (this.readings.length === 0) {
      this.toast('No data to export', 'warning');
      return;
    }
    const json = JSON.stringify(this.readings, null, 2);
    this.downloadFile(json, 'schoolheat_readings.json', 'application/json');
    this.toast('JSON exported successfully', 'success');
  }

  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ============================================
     NAVIGATION
     ============================================ */

  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + tabId)?.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.nav-btn[data-tab="${tabId}"]`)?.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'history') {
      setTimeout(() => {
        this.trendChartLoaded = false;
        this.distributionChartLoaded = false;
        this.drawTrendChart();
        this.drawDistributionChart();
      }, 100);
    }
    if (tabId === 'forecast') {
      setTimeout(() => {
        this.forecastChartLoaded = false;
        this.drawForecastChart();
      }, 100);
    }
  }

  /* ============================================
     TOAST
     ============================================ */

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = {
      success: '<svg class="toast-icon success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg class="toast-icon error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg class="toast-icon warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg class="toast-icon info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = (icons[type] || icons.info) + '<span>' + message + '</span>';
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

  /* ============================================
     UTILS
     ============================================ */

  formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }
}

// Initialize
const app = new SchoolHeatApp();
