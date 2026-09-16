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



  function contrastRatio(a,b){
    const hi=Math.max(a,b), lo=Math.min(a,b);
    return (hi+.05)/(lo+.05);
  }

  function fixThemeContrast(){
    const root=document.documentElement;
    const theme=root.getAttribute('data-theme')||'light';

    Utils.qsa('.wha-auto-contrast-dark,.wha-auto-contrast-light').forEach(el=>{
      el.classList.remove('wha-auto-contrast-dark','wha-auto-contrast-light');
    });

    if(theme==='light')return;

    const candidates=document.querySelectorAll([
      '.badge','[class*="badge"]','[class*="pill"]','[class*="chip"]',
      '[class*="tier"]','[class*="before"]','[class*="after"]',
      '[class*="snapshot"]','[class*="score"]','[class*="result"]',
      '[class*="status"]','[class*="progress"]'
    ].join(','));

    candidates.forEach(el=>{
      if(!(el instanceof HTMLElement))return;
      const cs=getComputedStyle(el), bg=rgbParts(cs.backgroundColor), fg=rgbParts(cs.color);
      if(!bg||!fg||bg.a<.55)return;
      const bl=relativeLuminance(bg), fl=relativeLuminance(fg);
      if(contrastRatio(bl,fl)>=3.6)return;
      el.classList.add(bl>.52?'wha-auto-contrast-dark':'wha-auto-contrast-light');
    });
  }

  let contrastObserver = null;
  let contrastQueued = false;

  function rgbParts(value) {
    const m = String(value || '').match(
      /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/i
    );
    if (!m) return null;
    return {
      r: Number(m[1]),
      g: Number(m[2]),
      b: Number(m[3]),
      a: m[4] == null ? 1 : Number(m[4])
    };
  }

  function relativeLuminance(rgb) {
    if (!rgb) return 0;
    const linear = [rgb.r, rgb.g, rgb.b].map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }

  function elementHasOwnText(el) {
    return Array.from(el.childNodes).some((node) =>
      node.nodeType === Node.TEXT_NODE && String(node.textContent || '').trim()
    );
  }

  function fixMidnightContrast() {
    const root = document.documentElement;
    const isMidnight = root.getAttribute('data-theme') === 'midnight';

    // Remove temporary classes immediately outside Midnight.
    if (!isMidnight) {
      Utils.qsa('.wha-midnight-dark-ink').forEach((el) => {
        el.classList.remove('wha-midnight-dark-ink');
      });
      return;
    }

    // Scan semantic/visual UI surfaces rather than changing Midnight globally.
    // This catches pale Boss badge bars, badge-tier pills, before/after audit
    // boxes, light status chips, and future light cards with the same problem.
    const candidates = document.querySelectorAll([
      '.badge',
      '[class*="badge"]',
      '[class*="pill"]',
      '[class*="chip"]',
      '[class*="tier"]',
      '[class*="before"]',
      '[class*="after"]',
      '[class*="snapshot"]',
      '[class*="score"]',
      '[class*="progress"]',
      '[class*="result"]'
    ].join(','));

    candidates.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;

      const cs = getComputedStyle(el);
      const bg = rgbParts(cs.backgroundColor);
      const fg = rgbParts(cs.color);

      if (!bg || bg.a < 0.55) {
        el.classList.remove('wha-midnight-dark-ink');
        return;
      }

      const bgLum = relativeLuminance(bg);
      const fgLum = relativeLuminance(fg);

      // Only fix the exact bad case: pale/light surface + pale/light text.
      const needsDarkInk =
        bgLum >= 0.70 &&
        (fgLum >= 0.62 || elementHasOwnText(el));

      el.classList.toggle('wha-midnight-dark-ink', needsDarkInk);
    });
  }

  function queueMidnightContrastFix() {
    if (contrastQueued) return;
    contrastQueued = true;
    requestAnimationFrame(() => {
      contrastQueued = false;
      fixMidnightContrast();
      fixThemeContrast();
    });
  }

  function watchMidnightContrast() {
    if (contrastObserver) return;
    contrastObserver = new MutationObserver(queueMidnightContrastFix);
    contrastObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    queueMidnightContrastFix();
    requestAnimationFrame(fixThemeContrast);
  }

  function applySettings() {
    const settings = Storage.getSettings();
    const root = document.documentElement;
    const theme = VALID_THEMES.includes(settings.theme) ? settings.theme : 'light';
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-text-size', settings.textSize || 'default');
    updateThemeButtonLabels();
    queueMidnightContrastFix();
    requestAnimationFrame(fixThemeContrast);
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
    watchMidnightContrast();

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
