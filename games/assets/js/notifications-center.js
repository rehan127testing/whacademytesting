/**
 * notifications-center.js — W.H. Academy Student Notification Center
 * STEP 18B — 2026-09-25
 *
 * Uses the existing authenticated Supabase routes:
 *   notifications/list
 *   notifications/markRead
 *   notifications/markAllRead
 *
 * Security:
 * - renders backend text with textContent, never innerHTML;
 * - never reads Enrollments/adminNotes directly;
 * - backend decides which notifications this Student may see.
 */
(function notificationCenterBootstrap() {
  'use strict';

  if (window.WhaNotificationCenter) return;

  const POLL_MS = 30000;
  const TYPE_LABELS = {
    AccountStatus: 'Account',
    Broadcast: 'Announcement',
    BossResult: 'Boss Battle',
    Recheck: 'Rechecking'
  };

  let state = {
    notifications: [],
    unreadCount: 0,
    loadedOnce: false,
    loading: false
  };
  let pollTimer = null;
  let panelOpen = false;
  let initialized = false;
  let initialSeenIds = new Set();

  const bellSvg =
    '<svg viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>' +
    '<path stroke-linecap="round" d="M10 21h4"/>' +
    '</svg>';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function formatTime(value) {
    const d = new Date(String(value || ''));
    if (Number.isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(d);
    } catch (_) {
      return d.toLocaleString();
    }
  }

  function typeLabel(type) {
    return TYPE_LABELS[String(type || '')] || 'Notification';
  }

  function badgeText(count) {
    const n = Number(count) || 0;
    return n > 99 ? '99+' : String(n);
  }

  function updateBadges() {
    document.querySelectorAll('[data-wha-notification-count]').forEach((badge) => {
      const count = Number(state.unreadCount) || 0;
      badge.textContent = badgeText(count);
      badge.hidden = count <= 0;
      badge.setAttribute('aria-label', count + ' unread notification' + (count === 1 ? '' : 's'));
    });
  }

  function makeBellButton(extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = extraClass || 'sidebar__item wha-notification-trigger';
    btn.setAttribute('data-wha-notification-trigger', '1');
    btn.setAttribute('aria-label', 'Open notifications');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.innerHTML = bellSvg +
      '<span class="wha-notification-trigger__label">Notifications</span>' +
      '<span class="wha-notification-count" data-wha-notification-count hidden>0</span>';
    btn.addEventListener('click', openPanel);
    return btn;
  }

  function ensureTriggers() {
    const nav = document.querySelector('.sidebar__nav');
    if (nav && !nav.querySelector('[data-wha-notification-trigger]')) {
      const btn = makeBellButton('sidebar__item wha-notification-trigger');
      const profile = nav.querySelector('a[href$="profile.html"], a[data-nav-page="profile.html"]');
      if (profile) nav.insertBefore(btn, profile);
      else nav.appendChild(btn);
    }

    document.querySelectorAll('.top-bar__actions').forEach((actions) => {
      if (actions.querySelector('[data-wha-notification-trigger]')) return;
      const btn = makeBellButton('btn btn--icon wha-notification-trigger wha-notification-trigger--mobile');
      const label = btn.querySelector('.wha-notification-trigger__label');
      if (label) label.classList.add('sr-only');
      actions.insertBefore(btn, actions.firstChild);
    });

    updateBadges();
  }

  function ensurePanel() {
    if (document.getElementById('wha-notification-backdrop')) return;

    const backdrop = el('div', 'wha-notification-backdrop');
    backdrop.id = 'wha-notification-backdrop';
    backdrop.hidden = true;
    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop) closePanel();
    });

    const panel = el('section', 'wha-notification-panel');
    panel.id = 'wha-notification-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'wha-notification-title');

    const header = el('div', 'wha-notification-panel__header');
    const headingWrap = el('div', 'wha-notification-panel__heading');
    const heading = el('h2', '', 'Notifications');
    heading.id = 'wha-notification-title';
    const subtitle = el('p', '', 'Updates from W.H. Academy');
    headingWrap.append(heading, subtitle);

    const closeBtn = el('button', 'wha-notification-close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close notifications');
    closeBtn.addEventListener('click', closePanel);

    header.append(headingWrap, closeBtn);

    const toolbar = el('div', 'wha-notification-toolbar');
    const unreadText = el('span', 'wha-notification-toolbar__count', '');
    unreadText.id = 'wha-notification-unread-text';
    const markAll = el('button', 'wha-notification-mark-all', 'Mark all as read');
    markAll.type = 'button';
    markAll.id = 'wha-notification-mark-all';
    markAll.addEventListener('click', markAllRead);
    toolbar.append(unreadText, markAll);

    const body = el('div', 'wha-notification-list');
    body.id = 'wha-notification-list';
    body.setAttribute('aria-live', 'polite');

    panel.append(header, toolbar, body);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
  }

  function render() {
    ensurePanel();
    updateBadges();

    const list = document.getElementById('wha-notification-list');
    const unreadText = document.getElementById('wha-notification-unread-text');
    const markAll = document.getElementById('wha-notification-mark-all');
    if (!list || !unreadText || !markAll) return;

    const count = Number(state.unreadCount) || 0;
    unreadText.textContent = count
      ? count + ' unread'
      : 'You are all caught up';
    markAll.hidden = count <= 0;
    markAll.disabled = state.loading;

    list.replaceChildren();

    if (state.loading && !state.loadedOnce) {
      const loading = el('div', 'wha-notification-state');
      loading.append(
        el('div', 'wha-notification-state__icon', '…'),
        el('strong', '', 'Loading notifications'),
        el('p', '', 'Getting your latest updates.')
      );
      list.appendChild(loading);
      return;
    }

    if (!state.notifications.length) {
      const empty = el('div', 'wha-notification-state');
      empty.append(
        el('div', 'wha-notification-state__icon', '✓'),
        el('strong', '', 'No notifications yet'),
        el('p', '', 'Account updates, results, rechecking updates and announcements will appear here.')
      );
      list.appendChild(empty);
      return;
    }

    state.notifications.forEach((item) => {
      const card = el('article', 'wha-notification-item' + (item.isRead ? '' : ' is-unread'));
      card.dataset.notificationId = String(item.notificationId || '');

      const top = el('div', 'wha-notification-item__top');
      const type = el('span', 'wha-notification-type', typeLabel(item.notificationType));
      const time = el('time', 'wha-notification-time', formatTime(item.createdAt));
      if (item.createdAt) time.dateTime = String(item.createdAt);
      top.append(type, time);

      const titleRow = el('div', 'wha-notification-item__title-row');
      if (!item.isRead) {
        const dot = el('span', 'wha-notification-unread-dot');
        dot.setAttribute('aria-label', 'Unread');
        titleRow.appendChild(dot);
      }
      titleRow.appendChild(el('h3', 'wha-notification-item__title', item.title || 'W.H. Academy notification'));

      const message = el('p', 'wha-notification-item__message', item.message || '');

      card.append(top, titleRow, message);

      if (!item.isRead) {
        const footer = el('div', 'wha-notification-item__footer');
        const readBtn = el('button', 'wha-notification-read-btn', 'Mark as read');
        readBtn.type = 'button';
        readBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          markRead(item.notificationId);
        });
        footer.appendChild(readBtn);
        card.appendChild(footer);

        card.addEventListener('click', (event) => {
          if (event.target.closest('button')) return;
          markRead(item.notificationId);
        });
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', 'Mark notification as read: ' + (item.title || 'Notification'));
        card.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            markRead(item.notificationId);
          }
        });
      }

      list.appendChild(card);
    });
  }

  function normalizeListing(payload) {
    const list = Array.isArray(payload && payload.notifications) ? payload.notifications : [];
    return {
      notifications: list.map((item) => ({
        notificationId: String(item.notificationId || ''),
        notificationType: String(item.notificationType || ''),
        title: String(item.title || ''),
        message: String(item.message || ''),
        data: item.data && typeof item.data === 'object' ? item.data : {},
        createdAt: String(item.createdAt || ''),
        expiresAt: item.expiresAt || null,
        isRead: !!item.isRead,
        readAt: item.readAt || null
      })).filter((item) => item.notificationId),
      unreadCount: Math.max(0, Number(payload && payload.unreadCount) || 0)
    };
  }

  function maybeToastNewItems(nextList) {
    const currentIds = new Set(nextList.map((n) => n.notificationId));
    if (!state.loadedOnce) {
      initialSeenIds = currentIds;
      return;
    }

    const fresh = nextList.filter((n) => !n.isRead && !initialSeenIds.has(n.notificationId));
    fresh.slice(0, 2).forEach((item) => {
      if (window.Notifications && typeof Notifications.toast === 'function') {
        Notifications.toast((item.title ? item.title + ': ' : '') + item.message, 'info');
      }
    });
    initialSeenIds = currentIds;
  }

  async function refresh(options) {
    const opts = options || {};
    if (state.loading || !navigator.onLine) return;
    state.loading = true;
    if (panelOpen) render();

    try {
      const payload = await Api.request('notifications/list', {});
      const normalized = normalizeListing(payload);
      maybeToastNewItems(normalized.notifications);
      state.notifications = normalized.notifications;
      state.unreadCount = normalized.unreadCount;
      state.loadedOnce = true;
    } catch (err) {
      if (opts.userInitiated && window.Notifications && typeof Notifications.toast === 'function') {
        Notifications.toast((err && err.message) || 'Could not load notifications.', 'error');
      }
    } finally {
      state.loading = false;
      render();
    }
  }

  async function markRead(notificationId) {
    const id = String(notificationId || '');
    if (!id) return;
    const target = state.notifications.find((item) => item.notificationId === id);
    if (!target || target.isRead) return;

    target.isRead = true;
    target.readAt = new Date().toISOString();
    state.unreadCount = Math.max(0, state.unreadCount - 1);
    render();

    try {
      await Api.request('notifications/markRead', { notificationId: id });
    } catch (err) {
      target.isRead = false;
      target.readAt = null;
      state.unreadCount += 1;
      render();
      if (window.Notifications && typeof Notifications.toast === 'function') {
        Notifications.toast((err && err.message) || 'Could not mark this notification as read.', 'error');
      }
    }
  }

  async function markAllRead() {
    const unread = state.notifications.filter((item) => !item.isRead);
    if (!unread.length) return;

    unread.forEach((item) => {
      item.isRead = true;
      item.readAt = new Date().toISOString();
    });
    const previousCount = state.unreadCount;
    state.unreadCount = 0;
    render();

    try {
      await Api.request('notifications/markAllRead', {});
    } catch (err) {
      unread.forEach((item) => {
        item.isRead = false;
        item.readAt = null;
      });
      state.unreadCount = previousCount;
      render();
      if (window.Notifications && typeof Notifications.toast === 'function') {
        Notifications.toast((err && err.message) || 'Could not mark notifications as read.', 'error');
      }
    }
  }

  function openPanel() {
    ensurePanel();
    const backdrop = document.getElementById('wha-notification-backdrop');
    if (!backdrop) return;
    panelOpen = true;
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add('is-open'));
    document.body.classList.add('wha-notification-open');
    render();
    refresh({ userInitiated: true });
    const closeBtn = backdrop.querySelector('.wha-notification-close');
    if (closeBtn) closeBtn.focus();
  }

  function closePanel() {
    const backdrop = document.getElementById('wha-notification-backdrop');
    if (!backdrop) return;
    panelOpen = false;
    backdrop.classList.remove('is-open');
    document.body.classList.remove('wha-notification-open');
    window.setTimeout(() => {
      if (!panelOpen) backdrop.hidden = true;
    }, 180);
    const trigger = document.querySelector('[data-wha-notification-trigger]');
    if (trigger) trigger.focus();
  }

  function startPolling() {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = window.setInterval(() => {
      if (!document.hidden && navigator.onLine) refresh();
    }, POLL_MS);

    window.addEventListener('focus', () => refresh());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh();
    });
    window.addEventListener('online', () => refresh());
  }

  function init() {
    if (initialized) return;
    initialized = true;

    ensureTriggers();
    ensurePanel();
    render();
    refresh();
    startPolling();

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && panelOpen) closePanel();
    });

    window.WhaNotificationCenter = {
      open: openPanel,
      close: closePanel,
      refresh: () => refresh({ userInitiated: true })
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
