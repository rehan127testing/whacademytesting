/**
 * app.js — W.H. Academy
 * Shared student-app bootstrap.
 *
 * 2026-09-15 final navigation/theme stabilization:
 * - one canonical desktop sidebar on every student page
 * - Settings / Theme / Log Out always present
 * - theme button cycles a curated set; Settings exposes the full theme library
 * - theme-polish.css is injected app-wide so page-specific markup cannot drift
 */
(function bootstrap() {
  'use strict';

  const THEMES = {
    light: 'Light',
    dark: 'Dark',
    midnight: 'Midnight',
    ocean: 'Ocean',
    aurora: 'Aurora',
    forest: 'Forest',
    gold: 'Gold',
    sunset: 'Sunset',
    rose: 'Rose',
    candy: 'Candy',
    grape: 'Grape',
    sky: 'Sky',
    mint: 'Mint',
    lavender: 'Lavender',
    ember: 'Ember'
  };

  const VALID_THEMES = Object.keys(THEMES);

  // The sidebar button stays useful instead of requiring 15 clicks.
  // Every theme is still available from Settings.
  const QUICK_THEME_CYCLE = [
    'light', 'grape', 'ocean', 'mint', 'sunset', 'midnight'
  ];

  const NAV_ITEMS = [
    ['dashboard.html', 'Dashboard'],
    ['games.html', 'Chapters'],
    ['boss-battle.html', 'Boss Battle'],
    ['badges.html', 'Badges'],
    ['revision.html', 'Revision'],
    ['leaderboard.html', 'Ranks'],
    ['rechecking.html', 'Support & Rechecking'],
    ['progress.html', 'My Progress'],
    ['profile.html', 'Profile']
  ];

  function ensureThemeStylesheet() {
    if (document.querySelector('link[data-wha-theme-polish]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/css/theme-polish.css';
    link.setAttribute('data-wha-theme-polish', 'true');
    document.head.appendChild(link);
  }

  function currentTheme() {
    const settings = Storage.getSettings();
    return VALID_THEMES.includes(settings.theme) ? settings.theme : 'light';
  }

  function updateThemeButtonLabels() {
    const theme = currentTheme();
    Utils.qsa('[data-action="cycle-theme"]').forEach((btn) => {
      const label = THEMES[theme] || 'Theme';
      btn.textContent = 'Theme · ' + label;
      btn.setAttribute('aria-label', 'Change theme. Current theme: ' + label);
      btn.setAttribute('title', 'Current theme: ' + label);
    });
  }

  function applySettings() {
    const settings = Storage.getSettings();
    const root = document.documentElement;
    const theme = VALID_THEMES.includes(settings.theme) ? settings.theme : 'light';
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-text-size', settings.textSize || 'default');
    updateThemeButtonLabels();
  }

  function cycleTheme() {
    const current = currentTheme();
    const index = QUICK_THEME_CYCLE.indexOf(current);
    const next = QUICK_THEME_CYCLE[(index >= 0 ? index + 1 : 0) % QUICK_THEME_CYCLE.length];
    Storage.setSettings({ theme: next });
    applySettings();

    // Keep the Settings select synchronized when the user cycles while on that page.
    const select = Utils.qs('#setting-theme');
    if (select) select.value = next;
  }

  function navLink(page, label) {
    return '<a class="sidebar__item" href="' + page + '" data-nav-page="' + page + '">' +
      '<span class="sidebar__label">' + label + '</span>' +
      '</a>';
  }

  function ensureCanonicalSidebar() {
    const sidebar = Utils.qs('.sidebar');
    if (!sidebar) return;

    let brand = sidebar.querySelector('.top-bar__brand');
    if (!brand) {
      brand = document.createElement('a');
      brand.className = 'top-bar__brand text-display';
      brand.href = 'dashboard.html';
      brand.textContent = 'W.H. Academy';
      sidebar.prepend(brand);
    } else {
      brand.href = 'dashboard.html';
      brand.textContent = 'W.H. Academy';
    }

    let nav = sidebar.querySelector('.sidebar__nav');
    if (!nav) {
      nav = document.createElement('div');
      nav.className = 'sidebar__nav';
      brand.insertAdjacentElement('afterend', nav);
    }

    // Rebuild, rather than patching page-by-page markup. This is what removes
    // missing icons, duplicate icons and different tab order across pages.
    nav.innerHTML = NAV_ITEMS.map((item) => navLink(item[0], item[1])).join('');

    // Remove old per-page footer variants only if they contain common controls.
    Array.from(sidebar.children).forEach((child) => {
      if (child === brand || child === nav) return;
      if (
        child.classList?.contains('sidebar__footer') ||
        child.querySelector?.('[data-action="logout"]') ||
        child.querySelector?.('[data-action="toggle-theme"]') ||
        child.querySelector?.('[data-action="cycle-theme"]') ||
        child.querySelector?.('[data-nav-page="settings.html"]')
      ) {
        child.remove();
      }
    });

    const footer = document.createElement('div');
    footer.className = 'sidebar__footer';
    footer.innerHTML =
      '<a class="sidebar__item" href="settings.html" data-nav-page="settings.html">' +
        '<span class="sidebar__label">Settings</span>' +
      '</a>' +
      '<button type="button" class="sidebar__item" data-action="cycle-theme"></button>' +
      '<button type="button" class="sidebar__item" data-action="logout">' +
        '<span class="sidebar__label">Log Out</span>' +
      '</button>';

    sidebar.appendChild(footer);
    updateThemeButtonLabels();
  }

  function ensureThemeOptions() {
    const select = Utils.qs('#setting-theme');
    if (!select) return;

    const order = [
      'light', 'dark', 'midnight', 'ocean', 'sky', 'aurora', 'mint',
      'forest', 'gold', 'sunset', 'ember', 'rose', 'candy', 'grape', 'lavender'
    ];

    const labels = {
      light: 'Light (default)',
      dark: 'Dark',
      midnight: 'Midnight (dark blue)',
      ocean: 'Ocean',
      sky: 'Sky (blue · violet)',
      aurora: 'Aurora (teal · green)',
      mint: 'Mint (fresh green · cyan)',
      forest: 'Forest',
      gold: 'Gold',
      sunset: 'Sunset',
      ember: 'Ember (red · orange)',
      rose: 'Rose',
      candy: 'Candy (pink · violet)',
      grape: 'Grape (violet)',
      lavender: 'Lavender (soft purple)'
    };

    select.innerHTML = order.map((value) =>
      '<option value="' + value + '">' + labels[value] + '</option>'
    ).join('');

    select.value = currentTheme();
  }

  function wireCommonChrome() {
    Utils.qsa('[data-action="logout"]').forEach((logoutBtn) => {
      if (logoutBtn.dataset.whaWired === '1') return;
      logoutBtn.dataset.whaWired = '1';
      logoutBtn.addEventListener('click', () => Router.logoutAndRedirect());
    });

    // Existing mobile/top-bar "toggle" controls now use the same curated cycle.
    Utils.qsa('[data-action="toggle-theme"], [data-action="cycle-theme"]').forEach((themeBtn) => {
      if (themeBtn.dataset.whaWired === '1') return;
      themeBtn.dataset.whaWired = '1';
      themeBtn.addEventListener('click', cycleTheme);
    });

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
    ensureThemeStylesheet();
    applySettings();

    if (!Router.guardAuthenticatedPage()) return;

    ensureCanonicalSidebar();
    ensureThemeOptions();
    wireCommonChrome();
    updateThemeButtonLabels();

    showOfflineIndicator();
    window.addEventListener('online', showOfflineIndicator);
    window.addEventListener('offline', showOfflineIndicator);
    registerServiceWorker();

    document.dispatchEvent(new CustomEvent('wha:ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
