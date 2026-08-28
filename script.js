/* ===== SCHOOLHEAT v3.2 - TUKLAS 2025 (BUG FIXES) ===== */
(function(){
'use strict';

// ============================================
// CONFIG
// ============================================
const STORE_KEY = 'sh_v32_data';
const SETT_KEY = 'sh_v32_sett';
const FB_POLL = 4000;
const BR_POLL = 3000;
const SMS_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// ============================================
// LOCATIONS - Matching campus map legend exactly
// ============================================
const LOCATIONS = [
  { id:'loc-01', num:1,  name:'3 Classroom, SBP4BE Building AusAID', x:30, y:75 },
  { id:'loc-02', num:2,  name:'School Clinic', x:15, y:25 },
  { id:'loc-03', num:3,  name:'6 Classroom, DepEd Modified School Bldg', x:20, y:65 },
  { id:'loc-04', num:4,  name:'6 Classroom, JICA-EFIP', x:8, y:55 },
  { id:'loc-05', num:5,  name:'Literacy Office', x:6, y:45 },
  { id:'loc-06', num:6,  name:'Publication Office', x:8, y:18 },
  { id:'loc-07', num:7,  name:'4 Classroom, PPSIP Building', x:15, y:18 },
  { id:'loc-08', num:8,  name:'SSLG Office', x:22, y:18 },
  { id:'loc-09', num:9,  name:'3 Storey, 15 Classroom, DepEd SS Bldg', x:32, y:15 },
  { id:'loc-10', num:10, name:'2 Storey Comp. Lab.', x:45, y:22 },
  { id:'loc-11', num:11, name:'Guidance Office', x:50, y:28 },
  { id:'loc-12', num:12, name:'PTA Office', x:53, y:30 },
  { id:'loc-13', num:13, name:'1 Classroom, DepEd SS Bldg', x:56, y:32 },
  { id:'loc-14', num:14, name:'3 Classroom, DepEd SS Bldg', x:62, y:30 },
  { id:'loc-15', num:15, name:'1 Classroom, SS Building', x:68, y:30 },
  { id:'loc-16', num:16, name:'3 Storey, 9 Classroom, DepEd SS Bldg', x:65, y:45 },
  { id:'loc-17', num:17, name:'4 Classroom, SEDP Building', x:18, y:35 },
  { id:'loc-18', num:18, name:'School Canteen', x:22, y:35 },
  { id:'loc-19', num:19, name:'2 Classroom, Baptist Donated Bldg', x:26, y:35 },
  { id:'loc-20', num:20, name:'3 Classroom, SBP4BE Bldg AusAID', x:38, y:40 },
  { id:'loc-21', num:21, name:'2 Classroom, DepEd SS Bldg', x:15, y:50 },
  { id:'loc-22', num:22, name:'2 Storey, 4 Classroom, DepEd SS Bldg', x:18, y:58 },
  { id:'loc-23', num:23, name:'3 Classroom, DepEd SS Bldg', x:18, y:72 },
  { id:'loc-24', num:24, name:'Handwashing Facility', x:45, y:72 },
  { id:'loc-25', num:25, name:'Administration Building / DepEd SS Bldg', x:52, y:48 },
  { id:'loc-26', num:26, name:'1 Classroom, DepEd SS Bldg', x:62, y:55 },
  { id:'loc-27', num:27, name:'1 Classroom, DepEd SS Bldg', x:58, y:42 },
  { id:'loc-28', num:28, name:'2 Storey, 2 Classroom, DepEd SS Bldg', x:58, y:70 },
  { id:'loc-29', num:29, name:'Guard House', x:52, y:75 },
  { id:'loc-sg', num:'SG', name:'School Gate', x:45, y:85 },
];

// ============================================
// STATE
// ============================================
let readings = [];
let settings = {
  fbUrl:'', bridgeUrl:'', smsNum:'', smsThresh:41, smsOn:false,
  cloud:false, dark:false
};
let fbTimer = null, brTimer = null;
let fbLast = null;
let busy = false;
let curTab = 'monitor';
let smsCooldown = {}; // locId -> timestamp
let forecastPreds = []; // store for tooltip

// ============================================
// UTILS
// ============================================
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = t => { const d=document.createElement('div'); d.textContent=t; return d.innerHTML; };
const fmtTime = iso => new Date(iso).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});

function toast(msg, type='inf') {
  const box = $('#toast-box');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(readings)); } catch(e){}
  try { localStorage.setItem(SETT_KEY, JSON.stringify(settings)); } catch(e){}
}
function load() {
  try { readings = JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch(e){ readings=[]; }
  try { settings = JSON.parse(localStorage.getItem(SETT_KEY)) || settings; } catch(e){}
}

// ============================================
// HEAT INDEX (Steadman / Rothfusz) — FIXED for Celsius input
// ============================================
function calcHI(Tc, H) {
  Tc = parseFloat(Tc); H = parseFloat(H);
  if (isNaN(Tc) || isNaN(H)) return null;
  if (Tc < -50 || Tc > 60 || H < 0 || H > 100) return null;

  // Convert Celsius input to Fahrenheit for the formula
  const T = Tc * 9/5 + 32;

  const c = [-42.379, 2.04901523, 10.14333127, -0.22475541, -6.83783e-3, -5.481717e-2, 1.22874e-3, 8.5282e-4, -1.99e-6];
  let HI = c[0] + c[1]*T + c[2]*H + c[3]*T*H + c[4]*T*T + c[5]*H*H + c[6]*T*T*H + c[7]*T*H*H + c[8]*T*T*H*H;

  // Adjustments (Fahrenheit ranges)
  if (H < 13 && T >= 80 && T <= 112) {
    HI -= ((13 - H) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  }
  if (H > 85 && T >= 80 && T <= 87) {
    HI += ((H - 85) / 10) * ((87 - T) / 5);
  }
  if (HI < T) HI = T;

  // Convert result back to Celsius
  HI = (HI - 32) * 5/9;

  return Math.round(HI * 10) / 10;
}

function getStatus(HI) {
  if (HI < 27) return {lvl:'safe', label:'Safe', color:'#00e676', icon:'✅', advice:'Normal activities safe.'};
  if (HI < 32) return {lvl:'caution', label:'Caution', color:'#ffca28', icon:'⚠️', advice:'Fatigue possible. Stay hydrated.'};
  if (HI < 41) return {lvl:'danger', label:'Danger', color:'#ff5252', icon:'🔥', advice:'Heat exhaustion likely. Limit outdoor activity.'};
  return {lvl:'extreme', label:'Extreme', color:'#d50000', icon:'☠️', advice:'Heat stroke imminent! Seek cool area now!' };
}

// ============================================
// GAUGE
// ============================================
function drawGauge(val) {
  const cvs = document.getElementById('heatGauge');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 260;
  cvs.width = size * dpr; cvs.height = size * dpr;
  ctx.scale(dpr, dpr);
  const cx = size/2, cy = size/2, r = 100;
  const a0 = Math.PI * .75, a1 = Math.PI * 2.25, span = a1 - a0;

  ctx.clearRect(0,0,size,size);

  // bg arc
  ctx.beginPath(); ctx.arc(cx,cy,r,a0,a1); ctx.lineWidth=16; ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineCap='round'; ctx.stroke();

  // segments
  const segs = [{p:.30,c:'#00e676'},{p:.25,c:'#ffca28'},{p:.30,c:'#ff5252'},{p:.15,c:'#d50000'}];
  let ca = a0;
  segs.forEach(s=>{ ctx.beginPath(); ctx.arc(cx,cy,r,ca,ca+span*s.p); ctx.lineWidth=16; ctx.strokeStyle=s.c; ctx.stroke(); ca+=span*s.p; });

  // ticks
  for(let i=0;i<=10;i++){ const a=a0+span*i/10; ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*(r-18),cy+Math.sin(a)*(r-18)); ctx.lineTo(cx+Math.cos(a)*(r-26),cy+Math.sin(a)*(r-26)); ctx.lineWidth=(i%5==0)?2:1; ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.stroke(); }

  // needle
  let na = a0;
  if (val !== null && !isNaN(val)) { const max=55; na = a0 + span * Math.max(0,Math.min(val,max))/max; }
  const nl = r - 22;
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(na)*nl, cy+Math.sin(na)*nl); ctx.lineWidth=3; ctx.strokeStyle='#fff'; ctx.lineCap='round'; ctx.stroke();

  // center
  ctx.beginPath(); ctx.arc(cx,cy,7,0,Math.PI*2); ctx.fillStyle='var(--accent)'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();

  // glow at tip
  ctx.beginPath(); ctx.arc(cx+Math.cos(na)*nl, cy+Math.sin(na)*nl, 5, 0, Math.PI*2); ctx.fillStyle='rgba(255,107,53,.35)'; ctx.fill();
}

// ============================================
// TABS — FIXED: touch + click for mobile
// ============================================
function goTab(tab) {
  curTab = tab;
  $$('.tab-panel').forEach(p => p.classList.remove('active'));
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  const panel = $(`.tab-panel[data-tab="${tab}"]`);
  const btn = $(`.nav-btn[data-tab="${tab}"]`);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if (tab==='dashboard') renderDash();
  if (tab==='history') renderHist();
  if (tab==='forecast') renderForecast();
  if (tab==='map') renderMap();
}

// ============================================
// READINGS
// ============================================
function addReading(locId, temp, hum, hi) {
  const loc = LOCATIONS.find(l=>l.id===locId);
  const st = getStatus(hi);
  const r = { id:Date.now(), ts:new Date().toISOString(), locId, locName:loc?loc.name:locId, temp:parseFloat(temp), hum:parseFloat(hum), hi, status:st.lvl };
  readings.unshift(r);
  if (readings.length > 200) readings = readings.slice(0,200);
  save();
  return r;
}

function delReading(id) {
  readings = readings.filter(r=>r.id!==id);
  save(); renderHist(); renderDash(); renderMap();
  toast('Reading deleted','ok');
}

function clearAll() {
  readings=[]; save(); renderHist(); renderDash(); renderMap();
  toast('All data cleared','ok');
}

// ============================================
// SMS ALERT — FIXED: cooldown + reliable triggering
// ============================================
function sendSMS(reading, status) {
  if (!settings.smsOn || !settings.smsNum) return;
  let num = settings.smsNum.trim().replace(/\s/g,'');
  if (!num) return;
  if (!num.startsWith('+')) num = '+' + num;

  // Cooldown check (per location)
  const now = Date.now();
  if (smsCooldown[reading.locId] && (now - smsCooldown[reading.locId]) < SMS_COOLDOWN_MS) return;
  smsCooldown[reading.locId] = now;

  const body = `HEAT ALERT: ${reading.locName} is ${status.label} (${reading.hi}°C). ${status.advice}`;
  const url = `sms:${num}?body=${encodeURIComponent(body)}`;

  // Use anchor click to bypass popup blockers
  const a = document.createElement('a');
  a.href = url;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  toast(`SMS alert triggered for ${num}`, 'ok');
}

// ============================================
// CALCULATE — FIXED: busy lock respected by sim/auto
// ============================================
function doCalc() {
  if (busy) return;
  busy = true;
  const locId = $('#loc-select').value;
  const temp = parseFloat($('#temp-in').value);
  const hum = parseFloat($('#hum-in').value);

  if (!locId) { toast('Select a location','warn'); busy=false; return; }
  if (isNaN(temp) || temp<0 || temp>60) { toast('Temperature: 0-60°C','warn'); busy=false; return; }
  if (isNaN(hum) || hum<0 || hum>100) { toast('Humidity: 0-100%','warn'); busy=false; return; }

  const hi = calcHI(temp, hum);
  if (hi === null) { toast('Calculation error','bad'); busy=false; return; }

  const st = getStatus(hi);
  const r = addReading(locId, temp, hum, hi);

  // update gauge
  drawGauge(hi);
  $('#g-val').textContent = hi.toFixed(1);
  $('#g-status').textContent = st.label;
  $('#g-status').style.color = st.color;
  $('#g-status').style.borderColor = st.color+'40';
  $('#g-status').style.background = st.color+'15';

  // show result
  const box = $('#result-box');
  box.classList.remove('hidden');
  $('#res-icon').textContent = st.icon;
  $('#res-title').textContent = st.label;
  $('#res-title').style.color = st.color;
  $('#res-advice').textContent = st.advice;
  $('#res-hi').textContent = hi.toFixed(1);
  $('#res-temp').textContent = temp.toFixed(1);
  $('#res-hum').textContent = hum.toFixed(0);
  $('#res-time').textContent = 'Recorded: ' + fmtTime(r.ts);

  toast(`Heat Index: ${hi.toFixed(1)}°C — ${st.label}`, st.lvl==='safe'?'ok':'bad');

  if (settings.smsOn && hi >= settings.smsThresh) sendSMS(r, st);

  renderDash(); renderMap();
  busy = false;
}

function doSim() {
  if (busy) { toast('Wait for current calculation','warn'); return; }
  const temps = [28,30,33,36,38,40,42,45];
  const hums = [55,60,65,70,75,80,85];
  $('#temp-in').value = temps[Math.floor(Math.random()*temps.length)];
  $('#hum-in').value = hums[Math.floor(Math.random()*hums.length)];
  doCalc();
}

function doAuto() {
  if (busy) { toast('Wait for current calculation','warn'); return; }
  const loc = $('#loc-select').value;
  if (!loc) { toast('Select location first','warn'); return; }
  $('#btn-auto').disabled = true;
  $('#btn-auto').innerHTML = '⏳ Reading...';
  setTimeout(() => {
    $('#temp-in').value = (28 + Math.random()*15).toFixed(1);
    $('#hum-in').value = (50 + Math.random()*40).toFixed(0);
    doCalc();
    $('#btn-auto').disabled = false;
    $('#btn-auto').innerHTML = '⚡ Auto-Read Arduino';
  }, 1200);
}

// ============================================
// RENDER DASHBOARD
// ============================================
function renderDash() {
  const latest = {};
  readings.forEach(r => { if (!latest[r.locId] || r.ts > latest[r.locId].ts) latest[r.locId]=r; });
  const vals = Object.values(latest);
  $('#st-safe').textContent = vals.filter(r=>r.hi<27).length;
  $('#st-caution').textContent = vals.filter(r=>r.hi>=27&&r.hi<32).length;
  $('#st-danger').textContent = vals.filter(r=>r.hi>=32).length;
  $('#st-total').textContent = readings.length;
  renderLocList('all');
}

function renderLocList(filter) {
  const list = $('#loc-list');
  const latest = {};
  readings.forEach(r => { if (!latest[r.locId] || r.ts > latest[r.locId].ts) latest[r.locId]=r; });

  const items = LOCATIONS.map(loc => {
    const r = latest[loc.id];
    return { ...loc, r, status: r ? r.status : 'unknown', hi: r ? r.hi : null, temp: r ? r.temp : null, time: r ? fmtTime(r.ts) : null };
  });

  const filt = filter==='all' ? items : items.filter(i => i.status===filter);

  list.innerHTML = filt.map(item => {
    const st = item.status==='unknown' ? {lvl:'unknown',label:'No Data',color:'#666'} : getStatus(item.hi);
    return `<div class="loc-row" data-lid="${esc(item.id)}">
      <div class="loc-dot ${item.status}"></div>
      <div class="loc-info">
        <div class="loc-name">${esc(item.num)}. ${esc(item.name)}</div>
        <div class="loc-meta">${item.time ? item.temp+'°C • '+item.time : 'No readings'}</div>
      </div>
      <div class="loc-badge ${item.status}">${st.label}</div>
    </div>`;
  }).join('');

  $$('.loc-row').forEach(row => {
    row.addEventListener('click', () => {
      $('#loc-select').value = row.dataset.lid;
      goTab('monitor');
      toast('Location selected','inf');
    });
  });
}

// ============================================
// RENDER HISTORY
// ============================================
function renderHist() {
  const tbody = $('#hist-body');
  const empty = $('#hist-empty');
  const filter = $('#hist-filter').value;

  if (readings.length===0) {
    tbody.innerHTML=''; empty.classList.remove('hidden'); return;
  }
  empty.classList.add('hidden');

  const rows = (filter==='all'?readings:readings.filter(r=>r.locId===filter)).slice(0,100);
  tbody.innerHTML = rows.map(r => {
    const st = getStatus(r.hi);
    return `<tr>
      <td>${fmtTime(r.ts)}</td>
      <td>${esc(r.locName)}</td>
      <td>${r.temp.toFixed(1)}°C</td>
      <td>${r.hum.toFixed(0)}%</td>
      <td><strong style="color:${st.color}">${r.hi.toFixed(1)}°C</strong></td>
      <td><span class="pill-status ${r.status}">${st.label}</span></td>
      <td><button class="btn-del" data-rid="${r.id}">Del</button></td>
    </tr>`;
  }).join('');

  $$('.btn-del').forEach(b => b.addEventListener('click', () => delReading(parseInt(b.dataset.rid))));
}

function exportCSV() {
  if (!readings.length) { toast('No data','warn'); return; }
  let csv = 'Timestamp,Location,Temperature,Humidity,HeatIndex,Status\n';
  readings.forEach(r => { const s=getStatus(r.hi); csv+=`${r.ts},"${r.locName}",${r.temp},${r.hum},${r.hi},${s.label}\n`; });
  const blob = new Blob([csv],{type:'text/csv'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`SchoolHeat_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  toast('CSV exported','ok');
}

// ============================================
// RENDER FORECAST — FIXED: interactive hover tooltip
// ============================================
function renderForecast() {
  const cvs = document.getElementById('forecastChart');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssW = cvs.clientWidth || 600;
  const cssH = 280;
  cvs.width = cssW * dpr; cvs.height = cssH * dpr;
  ctx.scale(dpr, dpr);
  const W = cssW, H = cssH, pad = {t:35,r:25,b:50,l:50};
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;

  ctx.clearRect(0,0,W,H);

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date();
  forecastPreds = [];
  for (let i=0; i<7; i++) {
    const d = new Date(today); d.setDate(today.getDate()+i);
    const dn = days[d.getDay()];
    const same = readings.filter(r => new Date(r.ts).getDay()===d.getDay());
    let avg = same.length ? same.reduce((s,r)=>s+r.hi,0)/same.length : (30+Math.random()*10);
    avg = Math.round(Math.max(25, Math.min(55, avg + (Math.random()-.5)*3))*10)/10;
    forecastPreds.push({day:dn, date:d.toLocaleDateString(), hi:avg, status:getStatus(avg), x:0, y:0});
  }

  const maxV = 55;
  const gx = i => pad.l + cw * i / 6;
  const gy = v => pad.t + ch - ch * v / maxV;

  // Store point coordinates for tooltip
  forecastPreds.forEach((p, i) => { p.x = gx(i); p.y = gy(p.hi); });

  // grid lines
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;
  for (let i=0; i<=5; i++) {
    const y = pad.t + ch * i / 5;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
  }
  // vertical grid
  for (let i=0; i<7; i++) {
    const x = gx(i);
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ch); ctx.stroke();
  }

  // y labels
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'right';
  for (let i=0; i<=5; i++) {
    const v = Math.round(55 - 55 * i / 5);
    ctx.fillText(v + '°C', pad.l - 10, pad.t + ch * i / 5 + 4);
  }

  // area fill
  ctx.beginPath(); ctx.moveTo(gx(0), gy(forecastPreds[0].hi));
  for (let i=1; i<7; i++) ctx.lineTo(gx(i), gy(forecastPreds[i].hi));
  ctx.lineTo(gx(6), pad.t + ch); ctx.lineTo(gx(0), pad.t + ch); ctx.closePath();
  const grd = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grd.addColorStop(0, 'rgba(255,107,53,.30)');
  grd.addColorStop(1, 'rgba(255,107,53,0)');
  ctx.fillStyle = grd; ctx.fill();

  // line
  ctx.beginPath(); ctx.moveTo(gx(0), gy(forecastPreds[0].hi));
  for (let i=1; i<7; i++) ctx.lineTo(gx(i), gy(forecastPreds[i].hi));
  ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 3; ctx.stroke();

  // points
  forecastPreds.forEach((p, i) => {
    const x = gx(i), y = gy(p.hi);
    // outer glow
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2);
    ctx.fillStyle = p.status.color + '33'; ctx.fill();
    // inner point
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2);
    ctx.fillStyle = p.status.color; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    // day label
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.day, x, pad.t + ch + 20);
    // date label
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(p.date, x, pad.t + ch + 36);
    // value label above point
    ctx.fillStyle = p.status.color;
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText(p.hi.toFixed(1) + '°', x, y - 14);
  });

  // cards
  const box = $('#forecast-cards');
  box.innerHTML = forecastPreds.map(p => `
    <div class="fc-card">
      <div class="day">${p.day}</div>
      <div class="temp" style="color:${p.status.color}">${p.hi.toFixed(1)}°C</div>
      <div class="stat" style="background:${p.status.color}22;color:${p.status.color}">${p.status.label}</div>
    </div>
  `).join('');
}

// ============================================
// FORECAST TOOLTIP INTERACTION
// ============================================
function initForecastInteraction() {
  const cvs = document.getElementById('forecastChart');
  const tooltip = document.getElementById('chart-tooltip');
  if (!cvs || !tooltip) return;

  cvs.addEventListener('mousemove', e => {
    const rect = cvs.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (cvs.width / rect.width / (window.devicePixelRatio||1));
    const my = (e.clientY - rect.top) * (cvs.height / rect.height / (window.devicePixelRatio||1));

    let nearest = -1, minDist = Infinity;
    for (let i = 0; i < forecastPreds.length; i++) {
      const dist = Math.hypot(mx - forecastPreds[i].x, my - forecastPreds[i].y);
      if (dist < minDist) { minDist = dist; nearest = i; }
    }

    if (nearest >= 0 && minDist < 40) {
      const p = forecastPreds[nearest];
      tooltip.style.display = 'block';
      tooltip.style.left = (e.pageX + 12) + 'px';
      tooltip.style.top = (e.pageY - 12) + 'px';
      tooltip.innerHTML = `<strong>${p.day}, ${p.date}</strong><br>HI: <span style="color:${p.status.color}">${p.hi.toFixed(1)}°C</span> — ${p.status.label}`;
      cvs.style.cursor = 'pointer';
    } else {
      tooltip.style.display = 'none';
      cvs.style.cursor = 'default';
    }
  });

  cvs.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
}

// ============================================
// RENDER MAP — FIXED: trim textContent, proper positioning
// ============================================
function renderMap() {
  const box = $('#map-markers');
  if (!box) return;
  const latest = {};
  readings.forEach(r => { if (!latest[r.locId] || r.ts > latest[r.locId].ts) latest[r.locId]=r; });

  box.innerHTML = LOCATIONS.map(loc => {
    const r = latest[loc.id];
    const st = r ? getStatus(r.hi) : {lvl:'unknown',color:'#666',label:'No Data'};
    return `<div class="map-pin ${st.lvl}" style="left:${loc.x}%;top:${loc.y}%" title="${esc(loc.num)}. ${esc(loc.name)}${r?' — '+r.hi+'°C':''}" data-num="${esc(loc.num)}">${loc.num}</div>`;
  }).join('');

  $$('.map-pin').forEach(pin => {
    pin.addEventListener('click', () => {
      const num = pin.textContent.trim();
      const loc = LOCATIONS.find(l => String(l.num) === num);
      if (loc) {
        $('#loc-select').value = loc.id;
        goTab('monitor');
        toast(`${loc.name} selected`, 'inf');
      }
    });
  });
}

// ============================================
// FIREBASE — FIXED: poll /sensor_data.json to match Python script
// ============================================
async function pollFB() {
  if (!settings.fbUrl) return;
  try {
    // Match the Python bridge endpoint
    const url = settings.fbUrl.replace(/\/$/,'') + '/sensor_data.json';
    const res = await fetch(url, {cache:'no-store'});
    if (!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    if (data && typeof data.temperature==='number' && typeof data.humidity==='number') {
      const t = parseFloat(data.temperature), h = parseFloat(data.humidity);
      $('#temp-in').value = t.toFixed(1);
      $('#hum-in').value = h.toFixed(0);

      // Only update gauge + status, do NOT auto-record to wrong location
      const hi = calcHI(t, h);
      if (hi !== null) {
        fbLast = {t, h, hi};
        const st = getStatus(hi);
        drawGauge(hi);
        $('#g-val').textContent = hi.toFixed(1);
        $('#g-status').textContent = st.label + ' (Cloud)';
        $('#g-status').style.color = st.color;
        $('#g-status').style.borderColor = st.color + '40';
        $('#g-status').style.background = st.color + '15';
        updateConn(true, 'Cloud Live');
        // Pulse the calculate button to show new data is ready
        $('#btn-calc').classList.add('pulse-btn');
        setTimeout(() => $('#btn-calc').classList.remove('pulse-btn'), 2000);
      }
    }
  } catch(e) {
    updateConn(false, 'Cloud Error');
  }
}

function startFB() {
  if (fbTimer) clearInterval(fbTimer);
  fbTimer = setInterval(pollFB, FB_POLL);
  pollFB();
}
function stopFB() {
  if (fbTimer) { clearInterval(fbTimer); fbTimer=null; }
}

// ============================================
// BRIDGE
// ============================================
async function pollBridge() {
  if (!settings.bridgeUrl) return;
  try {
    const res = await fetch(settings.bridgeUrl.replace(/\/$/,'')+'/api/read', {cache:'no-store'});
    if (!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    if (data.temperature!==undefined && data.humidity!==undefined) {
      const t = parseFloat(data.temperature), h = parseFloat(data.humidity);
      $('#temp-in').value = t.toFixed(1);
      $('#hum-in').value = h.toFixed(0);
      const hi = calcHI(t, h);
      if (hi !== null) {
        const st = getStatus(hi);
        drawGauge(hi);
        $('#g-val').textContent = hi.toFixed(1);
        $('#g-status').textContent = st.label + ' (Bridge)';
        $('#g-status').style.color = st.color;
        $('#g-status').style.borderColor = st.color + '40';
        $('#g-status').style.background = st.color + '15';
        updateConn(true, 'Bridge Live');
        $('#btn-calc').classList.add('pulse-btn');
        setTimeout(() => $('#btn-calc').classList.remove('pulse-btn'), 2000);
      }
    }
  } catch(e) { updateConn(false, 'Bridge Error'); }
}
function startBridge() {
  if (brTimer) clearInterval(brTimer);
  brTimer = setInterval(pollBridge, BR_POLL);
  pollBridge();
}
function stopBridge() {
  if (brTimer) { clearInterval(brTimer); brTimer=null; }
}

function updateConn(ok, txt) {
  const badge = $('#conn-badge');
  badge.className = 'header-status ' + (ok?'online':'');
  badge.querySelector('.txt').textContent = txt;
}

// ============================================
// INIT
// ============================================
function init() {
  load();

  // populate selects
  const sel = $('#loc-select');
  sel.innerHTML = '<option value="">Select Location...</option>' + LOCATIONS.map(l=>`<option value="${l.id}">${l.num}. ${l.name}</option>`).join('');

  const hsel = $('#hist-filter');
  hsel.innerHTML = '<option value="all">All Locations</option>' + LOCATIONS.map(l=>`<option value="${l.id}">${l.num}. ${l.name}</option>`).join('');

  // settings values
  if ($('#fb-url')) $('#fb-url').value = settings.fbUrl||'';
  if ($('#bridge-url')) $('#bridge-url').value = settings.bridgeUrl||'';
  if ($('#sms-num')) $('#sms-num').value = settings.smsNum||'';
  if ($('#sms-thresh')) $('#sms-thresh').value = settings.smsThresh||41;
  if ($('#tog-sms')) $('#tog-sms').checked = settings.smsOn||false;
  if ($('#tog-cloud')) $('#tog-cloud').checked = settings.cloud||false;
  if (settings.cloud && settings.fbUrl) { $('#cloud-box').classList.remove('hidden'); startFB(); }

  // events — FIXED: touch + click for tabs
  $$('.nav-btn').forEach(b => {
    const handler = (e) => { e.preventDefault(); goTab(b.dataset.tab); };
    b.addEventListener('click', handler);
    b.addEventListener('touchend', handler);
  });

  $('#btn-calc').addEventListener('click', doCalc);
  $('#btn-auto').addEventListener('click', doAuto);
  $('#btn-sim').addEventListener('click', doSim);
  $('#btn-export').addEventListener('click', exportCSV);
  $('#btn-clear').addEventListener('click', () => { if(confirm('Delete ALL readings?')) clearAll(); });
  $('#btn-wipe').addEventListener('click', () => { if(confirm('Delete ALL data?')) clearAll(); });

  $$('.filter-pills .pill').forEach(p => p.addEventListener('click', () => {
    $$('.filter-pills .pill').forEach(x=>x.classList.remove('active'));
    p.classList.add('active'); renderLocList(p.dataset.f);
  }));

  $('#tog-cloud').addEventListener('change', e => {
    settings.cloud = e.target.checked;
    $('#cloud-box').classList.toggle('hidden', !settings.cloud);
    if (settings.cloud && settings.fbUrl) startFB(); else stopFB();
    save();
  });
  $('#btn-fb-con').addEventListener('click', () => {
    const url = $('#fb-url').value.trim();
    if (!url) { toast('Enter Firebase URL','warn'); return; }
    settings.fbUrl = url; save(); startFB();
    toast('Connecting to Firebase...','inf');
  });
  $('#btn-br-con').addEventListener('click', () => {
    const url = $('#bridge-url').value.trim();
    if (!url) { toast('Enter bridge URL','warn'); return; }
    settings.bridgeUrl = url; save(); startBridge();
    toast('Connecting to bridge...','inf');
  });
  $('#tog-sms').addEventListener('change', e => { settings.smsOn = e.target.checked; save(); });
  $('#sms-num').addEventListener('change', e => { settings.smsNum = e.target.value; save(); });
  $('#sms-thresh').addEventListener('change', e => { settings.smsThresh = parseFloat(e.target.value)||41; save(); });
  $('#hist-filter').addEventListener('change', renderHist);

  // initial render
  drawGauge(null);
  renderDash();
  renderHist();
  renderMap();
  initForecastInteraction();

  // remove loader
  setTimeout(() => {
    $('#loading-screen').classList.add('hidden');
    $('#app').classList.remove('hidden');
  }, 1800);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
