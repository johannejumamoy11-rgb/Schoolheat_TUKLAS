// SchoolHeat Bridge Connector
// Add this file alongside script.js — don't replace script.js!
// This adds the "Connect to Python Bridge" button and polling.

(function() {
  const DEFAULT_BRIDGE_URL = 'http://localhost:5000';
  const BRIDGE_POLL_MS = 5000;
  let bridgePollingInterval = null;
  let bridgeConnected = false;

  function getBridgeUrl() {
    let url = localStorage.getItem('bridge_url');
    if (!url) url = DEFAULT_BRIDGE_URL;
    return url.replace(/\/+$/, '') + '/api/reading';
  }

  function isHttpsPage() {
    return window.location.protocol === 'https:';
  }

  function isLocalhostBridge() {
    const url = localStorage.getItem('bridge_url') || DEFAULT_BRIDGE_URL;
    return url.includes('localhost') || url.includes('127.0.0.1');
  }

  function askForBridgeUrl() {
    const current = localStorage.getItem('bridge_url') || '';
    const msg = 'Enter your bridge server URL.\n\n' +
                'If using Cloudflare Tunnel, paste the https://...trycloudflare.com link here.\n' +
                'If on same PC, use: http://localhost:5000';
    const input = prompt(msg, current || 'https://');
    if (input && input.trim()) {
      let url = input.trim();
      // Remove trailing slashes
      url = url.replace(/\/+$/, '');
      localStorage.setItem('bridge_url', url);
      return url.replace(/\/+$/, '') + '/api/reading';
    }
    return null;
  }

  function toggleBridgeConnection() {
    const btn = document.getElementById('connect-bridge-btn');
    if (bridgeConnected) {
      stopBridgePolling();
      btn.textContent = '🔗 Connect to Python Bridge';
      btn.classList.remove('active-monitor');
      const status = document.getElementById('auto-monitor-status');
      if (status) status.innerHTML = '<span style="color: orange;">Bridge disconnected.</span>';
      return;
    }

    // If on HTTPS (GitHub Pages) and bridge URL is localhost, ask for a real URL
    if (isHttpsPage() && isLocalhostBridge()) {
      const newUrl = askForBridgeUrl();
      if (!newUrl) {
        const status = document.getElementById('auto-monitor-status');
        if (status) status.innerHTML = '<span style="color: orange;">Bridge connection cancelled. A public HTTPS URL is required.</span>';
        return;
      }
    }

    startBridgePolling();
    btn.textContent = '🔌 Disconnect Bridge';
    btn.classList.add('active-monitor');
    const status = document.getElementById('auto-monitor-status');
    if (status) status.innerHTML = '<span style="color: green;">✅ Bridge polling started...</span>';
  }

  function startBridgePolling() {
    bridgeConnected = true;
    fetchBridgeReading();
    bridgePollingInterval = setInterval(fetchBridgeReading, BRIDGE_POLL_MS);
  }

  function stopBridgePolling() {
    bridgeConnected = false;
    if (bridgePollingInterval) {
      clearInterval(bridgePollingInterval);
      bridgePollingInterval = null;
    }
  }

  async function fetchBridgeReading() {
    try {
      const res = await fetch(getBridgeUrl());
      if (!res.ok) {
        const status = document.getElementById('auto-monitor-status');
        if (status) {
          if (res.status === 503) {
            status.innerHTML = '<span style="color: orange;">⏳ Bridge online, but no Arduino data yet. Check serial output format.</span>';
          } else if (res.status === 404) {
            status.innerHTML = '<span style="color: orange;">Bridge online, but no Arduino data yet.</span>';
          } else {
            status.innerHTML = '<span style="color: red;">Bridge error: HTTP ' + res.status + '</span>';
          }
        }
        return;
      }
      const data = await res.json();
      if (data.temperature !== undefined && data.humidity !== undefined) {
        processBridgeData(data.temperature, data.humidity, data.timestamp);
      }
    } catch (err) {
      console.error('Bridge fetch error:', err);
      const status = document.getElementById('auto-monitor-status');
      if (status) {
        if (isHttpsPage() && isLocalhostBridge()) {
          status.innerHTML = '<span style="color: red;">Cannot connect: GitHub Pages (HTTPS) cannot reach localhost (HTTP). Click the button again to enter a public URL.</span>';
        } else {
          status.innerHTML = '<span style="color: red;">Cannot reach bridge. Is bridge_server.py running?</span>';
        }
      }
    }
  }

  function processBridgeData(temp, humidity, serverTimestamp) {
    temp = parseFloat(temp);
    humidity = parseFloat(humidity);
    if (isNaN(temp) || isNaN(humidity) || temp < -50 || temp > 60 || humidity < 0 || humidity > 100) {
      console.warn('Bridge returned invalid values:', temp, humidity);
      return;
    }

    const tempInput = document.getElementById('temperature');
    const humInput = document.getElementById('humidity');
    if (tempInput) tempInput.value = temp.toFixed(1);
    if (humInput) humInput.value = humidity.toFixed(1);

    const location = document.getElementById('location-select');
    if (!location) return;
    const locId = location.value;
    const locName = window.LOCATIONS_BY_ID && window.LOCATIONS_BY_ID[locId] ? window.LOCATIONS_BY_ID[locId].name : locId;

    const heatIndex = window.calculateHeatIndex ? window.calculateHeatIndex(temp, humidity) : temp;
    const status = window.getHeatStatus ? window.getHeatStatus(heatIndex) : 'Safe';
    const color = window.getStatusColor ? window.getStatusColor(status) : '#28a745';

    if (window.addToHistory) window.addToHistory(locId, temp, humidity, heatIndex);

    const resultText = document.getElementById('result-text');
    if (resultText) {
      const ts = serverTimestamp ? new Date(serverTimestamp) : new Date();
      const timeStr = isNaN(ts.getTime()) ? new Date().toLocaleTimeString() : ts.toLocaleTimeString();
      resultText.innerHTML = `<strong style="color: ${color};">Heat Index: ${heatIndex.toFixed(1)}°C</strong><br><strong style="color: ${color};">Status: ${status}</strong><br><small>Temp: ${temp}°C | Humidity: ${humidity}% | Location: ${locName} | Bridge @ ${timeStr}</small>`;
    }

    if (window.updateGauge) window.updateGauge(heatIndex);

    window.lastHeatData = { heatIndex: heatIndex.toFixed(1), temp, humidity, status, location: locName, timestamp: new Date().toLocaleString() };

    const threshold = parseFloat(localStorage.getItem('warning_threshold') || '32');
    if (heatIndex >= threshold && window.triggerWarning) window.triggerWarning(heatIndex, status, locId);
    if (window.updateDashboard) window.updateDashboard();

    const autoStatus = document.getElementById('auto-monitor-status');
    if (autoStatus) autoStatus.innerHTML = `<span style="color: green;">✅ Live: ${temp}°C, ${humidity}% @ ${new Date().toLocaleTimeString()}</span>`;
  }

  function injectBridgeButton() {
    const autoBtn = document.getElementById('auto-monitor-btn');
    if (!autoBtn) {
      console.log('Bridge connector: auto-monitor-btn not found yet, retrying...');
      setTimeout(injectBridgeButton, 500);
      return;
    }
    if (document.getElementById('connect-bridge-btn')) return; // already injected

    const btn = document.createElement('button');
    btn.id = 'connect-bridge-btn';
    btn.className = 'secondary-btn';
    btn.textContent = '🔗 Connect to Python Bridge';
    btn.style.marginTop = '10px';
    btn.addEventListener('click', toggleBridgeConnection);
    autoBtn.parentNode.insertBefore(btn, autoBtn.nextSibling);
    console.log('Bridge connector: button injected');
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectBridgeButton);
  } else {
    injectBridgeButton();
  }

  window.addEventListener('beforeunload', stopBridgePolling);
})();
