/**
 * W.H. Academy — Staff Shell / Sidebar Stabilizer
 * Date: 2026-09-16
 *
 * Additive frontend-only patch:
 * - Admin: keeps existing navigation/actions, makes the current sidebar fixed,
 *   richer, icon-consistent, and visually stable.
 * - Teacher: replaces the visible top tab strip with a proper fixed sidebar,
 *   while delegating every click to the ORIGINAL Boss Papers / Grading /
 *   Rechecking buttons. Existing event handlers and backend logic stay intact.
 *
 * No API, Supabase, auth, grading, or rechecking logic is replaced.
 */
(function () {
  'use strict';

  const STYLE_ID = 'wha-staff-shell-style';
  const TEACHER_NAV = ['Boss Papers', 'Grading', 'Rechecking'];
  const ADMIN_NAV = [
    'Students', 'Overview', 'Boss Papers', 'Grading', 'Teachers',
    'Devices', 'Insights', 'Rechecking', 'Analytics'
  ];

  const ICONS = {
    'Students': '👤',
    'Overview': '▥',
    'Boss Papers': '🛡',
    'Grading': '✓',
    'Teachers': '👥',
    'Devices': '▣',
    'Insights': '▤',
    'Rechecking': '↪',
    'Analytics': '▥',
    'Sign out': '↗'
  };

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function allClickables() {
    return Array.from(document.querySelectorAll(
      'button, a, [role="tab"], [role="button"], input[type="button"], input[type="submit"]'
    ));
  }

  function byText(label) {
    const target = norm(label).toLowerCase();
    return allClickables().filter((el) => norm(el.textContent || el.value).toLowerCase() === target);
  }

  function findFirstText(regex) {
    return allClickables().find((el) => regex.test(norm(el.textContent || el.value)));
  }

  function commonAncestor(elements) {
    if (!elements.length) return null;
    let node = elements[0];
    while (node && node !== document.body) {
      if (elements.every((el) => node.contains(el))) return node;
      node = node.parentElement;
    }
    return null;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      :root {
        --wha-staff-sidebar-w: 248px;
        --wha-staff-purple: #4338ca;
        --wha-staff-violet: #7c3aed;
        --wha-staff-blue: #2563eb;
        --wha-staff-ink: #111827;
      }

      /* Shared fixed sidebar */
      .wha-staff-sidebar {
        box-sizing: border-box !important;
        width: var(--wha-staff-sidebar-w) !important;
        height: 100vh !important;
        position: fixed !important;
        inset: 0 auto 0 0 !important;
        z-index: 999 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding: 22px 14px 18px !important;
        color: #fff !important;
        background:
          radial-gradient(circle at 90% 3%, rgba(255,255,255,.22), transparent 28%),
          radial-gradient(circle at 8% 84%, rgba(255,255,255,.10), transparent 32%),
          linear-gradient(165deg, #312e81 0%, var(--wha-staff-purple) 48%, var(--wha-staff-violet) 100%) !important;
        border-right: 1px solid rgba(255,255,255,.16) !important;
        box-shadow: 18px 0 42px rgba(49,46,129,.18) !important;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,.28) transparent;
      }

      .wha-staff-sidebar::-webkit-scrollbar { width: 7px; }
      .wha-staff-sidebar::-webkit-scrollbar-track { background: transparent; }
      .wha-staff-sidebar::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,.26);
        border-radius: 99px;
      }

      .wha-staff-brand {
        display: grid;
        grid-template-columns: 46px 1fr;
        align-items: center;
        gap: 11px;
        padding: 10px;
        margin-bottom: 18px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(255,255,255,.16), rgba(255,255,255,.06));
        box-shadow: inset 0 1px 0 rgba(255,255,255,.12);
      }

      .wha-staff-brand__mark {
        width: 46px;
        height: 46px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        font: 900 15px/1 system-ui, sans-serif;
        color: #fff;
        background: rgba(255,255,255,.16);
        border: 1px solid rgba(255,255,255,.20);
      }

      .wha-staff-brand__title {
        font: 800 15px/1.15 system-ui, sans-serif;
        letter-spacing: -.01em;
        color: #fff;
      }

      .wha-staff-brand__role {
        display: block;
        margin-top: 4px;
        font: 700 10px/1.2 system-ui, sans-serif;
        letter-spacing: .13em;
        text-transform: uppercase;
        color: rgba(255,255,255,.66);
      }

      .wha-staff-sidebar__nav {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .wha-staff-nav-item,
      .wha-admin-sidebar [data-wha-staff-nav] {
        box-sizing: border-box !important;
        width: 100% !important;
        min-height: 46px !important;
        display: flex !important;
        align-items: center !important;
        gap: 11px !important;
        padding: 10px 12px !important;
        margin: 0 !important;
        border: 1px solid transparent !important;
        border-radius: 12px !important;
        color: rgba(255,255,255,.88) !important;
        background: transparent !important;
        font: 700 14px/1.25 system-ui, sans-serif !important;
        text-align: left !important;
        text-decoration: none !important;
        cursor: pointer !important;
        transform: none !important;
        transition: background .16s ease, border-color .16s ease, box-shadow .16s ease !important;
      }

      .wha-staff-nav-item:hover,
      .wha-staff-nav-item:focus-visible,
      .wha-admin-sidebar [data-wha-staff-nav]:hover,
      .wha-admin-sidebar [data-wha-staff-nav]:focus-visible {
        color: #fff !important;
        background: rgba(255,255,255,.13) !important;
        border-color: rgba(255,255,255,.16) !important;
        outline: none !important;
      }

      .wha-staff-nav-item.is-active,
      .wha-admin-sidebar [data-wha-active="true"] {
        color: #fff !important;
        background: linear-gradient(135deg, rgba(255,255,255,.27), rgba(255,255,255,.12)) !important;
        border-color: rgba(255,255,255,.28) !important;
        box-shadow:
          inset 4px 0 0 #fbbf24,
          0 10px 22px rgba(15,23,42,.13) !important;
      }

      .wha-staff-nav-icon {
        width: 22px;
        height: 22px;
        flex: 0 0 22px;
        display: grid;
        place-items: center;
        font-size: 16px;
        line-height: 1;
        color: currentColor;
      }

      .wha-staff-nav-label {
        flex: 1;
        min-width: 0;
      }

      .wha-staff-sidebar__meta {
        margin: 14px 4px 0;
        padding: 12px;
        border-radius: 12px;
        background: rgba(255,255,255,.08);
        border: 1px solid rgba(255,255,255,.10);
        color: rgba(255,255,255,.72);
        font: 600 12px/1.45 system-ui, sans-serif;
      }

      .wha-staff-sidebar__footer {
        margin-top: auto;
        padding-top: 13px;
        border-top: 1px solid rgba(255,255,255,.14);
      }

      .wha-staff-sidebar-spacer {
        width: var(--wha-staff-sidebar-w) !important;
        flex: 0 0 var(--wha-staff-sidebar-w) !important;
        min-height: 1px !important;
      }

      /* Teacher */
      body.wha-teacher-shell {
        min-height: 100vh;
        background:
          radial-gradient(circle at 100% 0, rgba(124,58,237,.09), transparent 38%),
          #f7f8ff !important;
      }

      body.wha-teacher-shell > :not(.wha-staff-sidebar) {
        box-sizing: border-box;
      }

      @media (min-width: 900px) {
        body.wha-teacher-shell {
          padding-left: var(--wha-staff-sidebar-w) !important;
        }

        body.wha-teacher-shell .wha-teacher-original-tabs {
          display: none !important;
        }
      }

      .wha-teacher-sidebar .wha-staff-brand {
        margin-bottom: 12px;
      }

      .wha-teacher-subject {
        display: inline-flex;
        align-self: flex-start;
        margin: 0 4px 14px;
        padding: 6px 9px;
        border-radius: 999px;
        color: #fff;
        background: rgba(255,255,255,.12);
        border: 1px solid rgba(255,255,255,.15);
        font: 700 11px/1 system-ui, sans-serif;
      }

      /* Admin existing sidebar */
      .wha-admin-sidebar {
        color: #fff !important;
        background:
          radial-gradient(circle at 90% 3%, rgba(255,255,255,.22), transparent 28%),
          linear-gradient(165deg, #312e81 0%, #4338ca 55%, #6d28d9 110%) !important;
      }

      .wha-admin-sidebar [data-wha-staff-nav] svg,
      .wha-admin-sidebar [data-wha-staff-nav] img {
        width: 20px !important;
        height: 20px !important;
        flex: 0 0 20px !important;
        color: currentColor !important;
      }

      /* Narrow layouts: do not force a fixed desktop sidebar over the content. */
      @media (max-width: 899px) {
        .wha-teacher-sidebar {
          position: relative !important;
          width: auto !important;
          height: auto !important;
          inset: auto !important;
          margin: 12px !important;
          border-radius: 18px !important;
        }

        .wha-teacher-sidebar .wha-staff-sidebar__nav {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        .wha-teacher-sidebar .wha-staff-sidebar__footer,
        .wha-teacher-sidebar .wha-staff-sidebar__meta {
          display: none !important;
        }

        .wha-teacher-original-tabs {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function iconSpan(label) {
    const s = document.createElement('span');
    s.className = 'wha-staff-nav-icon';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = ICONS[label] || '•';
    return s;
  }

  function labelSpan(label) {
    const s = document.createElement('span');
    s.className = 'wha-staff-nav-label';
    s.textContent = label;
    return s;
  }

  function makeBrand(role) {
    const wrap = document.createElement('div');
    wrap.className = 'wha-staff-brand';
    wrap.innerHTML =
      '<div class="wha-staff-brand__mark">WH</div>' +
      '<div><div class="wha-staff-brand__title">W.H. Academy</div>' +
      '<span class="wha-staff-brand__role">' + role + '</span></div>';
    return wrap;
  }

  function probableSubject() {
    const selectors = [
      '.subject-chip', '.teacher-subject', '.teacher-subjects',
      '[class*="subject"][class*="chip"]', '[class*="subject"][class*="badge"]'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const text = norm(el && el.textContent);
      if (text && text.length <= 60 && !/subject/i.test(text)) return text;
      if (text && text.length <= 60) return text;
    }
    return '';
  }

  function activeOriginal(originals) {
    return originals.find((el) =>
      el.getAttribute('aria-selected') === 'true' ||
      el.getAttribute('aria-current') === 'page' ||
      /(^|\s)(active|is-active|selected)(\s|$)/i.test(el.className || '')
    );
  }

  function setupTeacher() {
    if (document.querySelector('.wha-teacher-sidebar')) return true;

    const found = {};
    TEACHER_NAV.forEach((label) => {
      found[label] = byText(label)[0] || null;
    });

    const originals = TEACHER_NAV.map((x) => found[x]).filter(Boolean);
    if (originals.length < 2) return false;

    const tabRoot = commonAncestor(originals);
    if (tabRoot) tabRoot.classList.add('wha-teacher-original-tabs');

    const aside = document.createElement('aside');
    aside.className = 'wha-staff-sidebar wha-teacher-sidebar';
    aside.setAttribute('aria-label', 'Teacher navigation');
    aside.appendChild(makeBrand('Teacher workspace'));

    const subject = probableSubject();
    if (subject) {
      const chip = document.createElement('div');
      chip.className = 'wha-teacher-subject';
      chip.textContent = subject;
      aside.appendChild(chip);
    }

    const nav = document.createElement('nav');
    nav.className = 'wha-staff-sidebar__nav';

    const newButtons = {};

    TEACHER_NAV.forEach((label) => {
      if (!found[label]) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wha-staff-nav-item';
      b.dataset.whaTeacherTarget = label;
      b.appendChild(iconSpan(label));
      b.appendChild(labelSpan(label));
      b.addEventListener('click', () => {
        found[label].click();
        requestAnimationFrame(() => syncTeacherActive(found, newButtons));
        setTimeout(() => syncTeacherActive(found, newButtons), 80);
      });
      newButtons[label] = b;
      nav.appendChild(b);
    });

    aside.appendChild(nav);

    const meta = document.createElement('div');
    meta.className = 'wha-staff-sidebar__meta';
    meta.textContent = 'Boss papers, grading and rechecking stay subject-scoped by the server.';
    aside.appendChild(meta);

    const footer = document.createElement('div');
    footer.className = 'wha-staff-sidebar__footer';
    const originalSignOut = findFirstText(/^sign\s*out$/i);

    if (originalSignOut) {
      const logout = document.createElement('button');
      logout.type = 'button';
      logout.className = 'wha-staff-nav-item';
      logout.appendChild(iconSpan('Sign out'));
      logout.appendChild(labelSpan('Sign out'));
      logout.addEventListener('click', () => originalSignOut.click());
      footer.appendChild(logout);
    }

    aside.appendChild(footer);
    document.body.insertBefore(aside, document.body.firstChild);
    document.body.classList.add('wha-teacher-shell');

    syncTeacherActive(found, newButtons);

    const observer = new MutationObserver(() => {
      syncTeacherActive(found, newButtons);
    });
    originals.forEach((el) => observer.observe(el, {
      attributes: true,
      attributeFilter: ['class', 'aria-selected', 'aria-current']
    }));

    return true;
  }

  function syncTeacherActive(found, newButtons) {
    const originals = Object.values(found).filter(Boolean);
    const active = activeOriginal(originals);
    let activeLabel = '';

    if (active) {
      activeLabel = Object.keys(found).find((label) => found[label] === active) || '';
    }

    if (!activeLabel) {
      // Visible panels commonly have IDs/data attributes matching the tab name.
      const visible = Array.from(document.querySelectorAll('[id], [data-panel], [data-tab-panel]'))
        .find((el) => {
          const cs = getComputedStyle(el);
          return cs.display !== 'none' && cs.visibility !== 'hidden' &&
            el.offsetWidth > 0 && el.offsetHeight > 0;
        });
      const hint = norm(
        (visible && (visible.id || visible.getAttribute('data-panel') || visible.getAttribute('data-tab-panel'))) || ''
      ).toLowerCase();

      if (/recheck/.test(hint)) activeLabel = 'Rechecking';
      else if (/grad/.test(hint)) activeLabel = 'Grading';
      else if (/paper|boss/.test(hint)) activeLabel = 'Boss Papers';
    }

    if (!activeLabel) activeLabel = TEACHER_NAV.find((x) => newButtons[x]) || '';

    Object.keys(newButtons).forEach((label) => {
      newButtons[label].classList.toggle('is-active', label === activeLabel);
    });
  }

  function sidebarCandidateAdmin() {
    const matches = [];
    ADMIN_NAV.forEach((label) => {
      const el = byText(label)[0];
      if (el) matches.push(el);
    });

    if (matches.length < 5) return { root: null, matches: [] };

    let root = commonAncestor(matches);
    if (!root) return { root: null, matches };

    // Prefer a compact left-side ancestor rather than the whole page.
    let node = root;
    while (node && node !== document.body) {
      const rect = node.getBoundingClientRect();
      const textMatches = matches.filter((el) => node.contains(el)).length;
      if (textMatches >= 5 && rect.width > 150 && rect.width < 360) {
        root = node;
      }
      node = node.parentElement;
    }
    return { root, matches };
  }

  function setupAdmin() {
    if (document.querySelector('.wha-admin-sidebar')) return true;

    const result = sidebarCandidateAdmin();
    const root = result.root;
    if (!root) return false;

    const oldPosition = getComputedStyle(root).position;
    const oldRect = root.getBoundingClientRect();

    root.classList.add('wha-staff-sidebar', 'wha-admin-sidebar');
    root.setAttribute('aria-label', 'Administrator navigation');

    result.matches.forEach((el) => {
      const label = ADMIN_NAV.find((x) => norm(el.textContent || el.value).toLowerCase() === x.toLowerCase());
      if (!label) return;
      el.setAttribute('data-wha-staff-nav', label);

      // Do not add extra visible glyphs here: Admin already has native icons.
      // CSS keeps their geometry stable.
      if (
        el.getAttribute('aria-current') === 'page' ||
        /(^|\s)(active|is-active|selected)(\s|$)/i.test(el.className || '')
      ) {
        el.setAttribute('data-wha-active', 'true');
      }

      el.addEventListener('click', () => {
        result.matches.forEach((x) => x.removeAttribute('data-wha-active'));
        el.setAttribute('data-wha-active', 'true');
      });
    });

    // If the existing sidebar participated in flex/grid layout, fixing it removes
    // its occupied width. Preserve that space without touching Admin logic.
    const parentDisplay = root.parentElement ? getComputedStyle(root.parentElement).display : '';
    const likelyNeedsSpacer =
      oldPosition !== 'fixed' &&
      /flex|grid/.test(parentDisplay) &&
      oldRect.width >= 150 && oldRect.width <= 360 &&
      !root.parentElement.querySelector(':scope > .wha-staff-sidebar-spacer');

    if (likelyNeedsSpacer) {
      const spacer = document.createElement('div');
      spacer.className = 'wha-staff-sidebar-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      root.parentElement.insertBefore(spacer, root);
    }

    document.body.classList.add('wha-admin-shell');
    return true;
  }

  function boot() {
    injectStyles();

    const path = location.pathname.toLowerCase();
    let done = false;

    if (path.endsWith('/teacher.html') || path.endsWith('teacher.html')) {
      done = setupTeacher();
    } else {
      done = setupAdmin();
    }

    // Rechecking tab/sidebar nodes can be injected after the base page loads.
    // Retry briefly instead of racing the existing scripts.
    if (!done) {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        const ok = (path.endsWith('teacher.html')) ? setupTeacher() : setupAdmin();
        if (ok || tries >= 20) clearInterval(timer);
      }, 150);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
