// SchoolHeat Install Helper
// Detects platform and shows install prompts

(function() {
  let deferredPrompt = null;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  console.log('[PWA] Install helper loaded');
  console.log('[PWA] Standalone:', isStandalone);
  console.log('[PWA] iOS:', isIOS);
  console.log('[PWA] Protocol:', window.location.protocol);

  function createBanner(html, type) {
    if (document.getElementById('pwa-install-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = html;
    const bg = type === 'success' ? '#28a745' : (type === 'warning' ? '#fd7e14' : '#d9534f');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:' + bg + ';color:white;padding:14px 18px;font-family:"Segoe UI",sans-serif;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:space-between;gap:12px;';

    const style = document.createElement('style');
    style.textContent = '#pwa-install-banner button{background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:white;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;white-space:nowrap;width:auto;margin:0;}#pwa-install-banner button:hover{background:rgba(255,255,255,0.35);}#pwa-install-banner .close-btn{background:transparent;border:none;font-size:18px;padding:0 4px;}';
    if (!document.getElementById('pwa-banner-style')) {
      style.id = 'pwa-banner-style';
      document.head.appendChild(style);
    }

    document.body.appendChild(banner);

    // Attach close button listeners AFTER banner is in DOM
    banner.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        banner.remove();
      });
    });
  }

  // Android / Desktop Chrome/Edge
  window.addEventListener('beforeinstallprompt', function(e) {
    console.log('[PWA] beforeinstallprompt fired');
    e.preventDefault();
    deferredPrompt = e;

    createBanner(
      '<span>📲 Install <strong>SchoolHeat</strong> for offline access and a full-screen app experience.</span>' +
      '<div style="display:flex;gap:8px;flex-shrink:0;">' +
      '<button id="pwa-install-btn">Install Now</button>' +
      '<button class="close-btn">✕</button>' +
      '</div>'
    );

    const btn = document.getElementById('pwa-install-btn');
    if (btn) {
      btn.addEventListener('click', async function() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          const banner = document.getElementById('pwa-install-banner');
          if (banner) banner.remove();
          createBanner('<span>✅ SchoolHeat installed! Open it from your home screen or app menu.</span>', 'success');
          setTimeout(function() {
            const b = document.getElementById('pwa-install-banner');
            if (b) b.remove();
          }, 4000);
        }
        deferredPrompt = null;
      });
    }
  });

  // iOS Safari
  if (isIOS && !isStandalone) {
    console.log('[PWA] Showing iOS install banner');
    setTimeout(function() {
      createBanner(
        '<span>📱 <strong>iPhone/iPad:</strong> Tap the <strong>Share</strong> button, then choose <strong>Add to Home Screen</strong> to install SchoolHeat for offline use.</span>' +
        '<button class="close-btn">✕</button>'
      );
    }, 1500);
  }

  // file:// warning
  if (window.location.protocol === 'file:' && !isIOS && !isStandalone) {
    console.log('[PWA] file:// detected');
    setTimeout(function() {
      createBanner(
        '<span>⚠️ Open this page through a web server (not double-click) for the install button to appear. Or use the Install App button in Settings.</span>' +
        '<button class="close-btn">✕</button>',
        'warning'
      );
    }, 3000);
  }

  // Expose API for script.js
  window.SchoolHeatInstall = {
    canInstall: function() { return !!deferredPrompt; },
    trigger: async function() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        return outcome === 'accepted';
      }
      return false;
    },
    getStatus: function() {
      return {
        standalone: isStandalone,
        ios: isIOS,
        protocol: window.location.protocol,
        deferredPrompt: !!deferredPrompt,
        swSupported: 'serviceWorker' in navigator
      };
    }
  };

  if (isStandalone) {
    console.log('[PWA] Already running in standalone mode');
  }
})();