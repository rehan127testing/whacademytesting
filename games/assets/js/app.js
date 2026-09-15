/**
 * app.js — W.H. Academy
 * Bootstraps every page: applies stored settings (theme, text size),
 * enforces the auth guard, wires common chrome (nav, logout, offline
 * indicator), and registers the service worker for offline support.
 * Runs on every page via a single shared <script> include.
 */
(function bootstrap() {
  var VALID_THEMES = ['light', 'dark', 'ocean', 'forest', 'sunset',
                      'grape', 'rose', 'candy', 'aurora', 'gold', 'midnight'];

  function applySettings() {
    const settings = Storage.getSettings();
    const root = document.documentElement;
    const theme = VALID_THEMES.indexOf(settings.theme) >= 0 ? settings.theme : 'light';
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-text-size', settings.textSize || 'default');
  }

  function supportNavMarkup() {
    return '<svg viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8a2.5 2.5 0 01-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 014 13.5v-8z"/>' +
      '<path stroke-linecap="round" d="M8 8h8M8 11.5h5"/>' +
      '</svg><span>Support &amp; Rechecking</span>';
  }

  function ensureSupportNav() {
    const nav = Utils.qs('.sidebar__nav');
    if (!nav) return;

    let link = nav.querySelector('a[href$="rechecking.html"], a[data-nav-page="rechecking.html"]');
    if (!link) {
      link = document.createElement('a');
      link.className = 'sidebar__item';
      link.href = 'rechecking.html';
      link.setAttribute('data-nav-page', 'rechecking.html');
      link.innerHTML = supportNavMarkup();

      const profileLink = nav.querySelector('a[href$="profile.html"], a[data-nav-page="profile.html"]');
      if (profileLink) nav.insertBefore(link, profileLink);
      else nav.appendChild(link);
    } else {
      link.classList.add('sidebar__item');
      link.setAttribute('data-nav-page', 'rechecking.html');
      link.innerHTML = supportNavMarkup();
    }
  }

  function wireCommonChrome() {
    const logoutBtn = Utils.qs('[data-action="logout"]');
    if (logoutBtn) logoutBtn.addEventListener('click', () => Router.logoutAndRedirect());
    const themeToggle = Utils.qs('[data-action="toggle-theme"]');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const current = Storage.getSettings().theme;
        const next = current === 'dark' ? 'light' : 'dark';
        Storage.setSettings({ theme: next });
        applySettings();
      });
    }

    ensureSupportNav();
    Router.highlightActiveNav();
  }

  function showOfflineIndicator() {
    let banner = Utils.qs('#offline-banner');
    if (!navigator.onLine) {
      if (!banner) {
        banner = Utils.createEl('div', {
          id: 'offline-banner',
          class: 'badge badge--warning',
          role: 'status',
          style: 'position:fixed;top:var(--space-3);left:50%;transform:translateX(-50%);z-index:1150;'
        }, 'You are offline — some features may be limited.');
        document.body.appendChild(banner);
      }
    } else if (banner) {
      banner.remove();
      Api.flushPendingQueue();
    }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  function init() {
    applySettings();
    if (!Router.guardAuthenticatedPage()) return;
    wireCommonChrome();
    showOfflineIndicator();
    window.addEventListener('online', showOfflineIndicator);
    window.addEventListener('offline', showOfflineIndicator);
    registerServiceWorker();
    document.dispatchEvent(new CustomEvent('wha:ready'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
