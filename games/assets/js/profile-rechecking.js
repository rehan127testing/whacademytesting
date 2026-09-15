/**
 * W.H. Academy — Profile Rechecking summary (Step 15D / lifetime-control v2)
 * Destination: games/assets/js/profile-rechecking.js
 * Classification: PRODUCTION-PORTABLE
 *
 * Adds a Profile > Rechecking tab without changing profile.html.
 * Resolved lifetime history remains visible; NeedsStudentInfo gets a direct
 * action link back to the SAME claim in Rechecking Center.
 */
(function () {
  'use strict';

  function esc(value) {
    return Utils.escapeHtml(value == null ? '' : String(value));
  }

  function statusText(request) {
    if (request.status === 'Open' && request.adminReviewStatus === 'NeedsStudentInfo') {
      return 'Action needed — update your claim';
    }
    if (request.status === 'Open' && request.adminReviewStatus === 'NeedsReview') {
      return 'Sent back for another teacher review';
    }
    if (request.status === 'Open') {
      return 'Under recheck';
    }
    if (request.finalOutcome === 'CheckingCorrect') {
      return 'Complete — checking confirmed correct';
    }
    if (request.adminReviewStatus === 'Confirmed') {
      return 'Complete — Admin confirmed';
    }
    return 'Rechecked — Admin review pending';
  }

  function requestRow(request) {
    const needsStudent = request.status === 'Open' && request.adminReviewStatus === 'NeedsStudentInfo';
    const resolved = request.status === 'Resolved';
    const outcome = request.finalOutcome === 'CheckingCorrect'
      ? 'Original checking confirmed correct'
      : (request.finalOutcome === 'Corrected' ? 'Marking corrected' : '');

    return (
      '<div style="padding:.8rem 0;border-top:1px solid var(--line-soft);">' +
        '<div style="display:flex;justify-content:space-between;gap:.75rem;align-items:flex-start;flex-wrap:wrap;">' +
          '<div>' +
            '<strong>' + esc(request.paperId) + '</strong>' +
            '<div class="muted" style="font-size:.82rem;margin-top:.2rem;">Request ' + esc(request.requestId) + '</div>' +
          '</div>' +
          '<span class="badge ' + (needsStudent ? 'badge--warning' : (resolved ? 'badge--success' : 'badge--info')) + '">' + esc(statusText(request)) + '</span>' +
        '</div>' +
        '<div class="muted" style="font-size:.85rem;margin-top:.45rem;">Questions: ' + esc((request.claimedQuestionIds || []).join(', ')) + '</div>' +
        (outcome ? '<div style="font-size:.85rem;margin-top:.35rem;"><strong>' + esc(outcome) + '</strong></div>' : '') +
        (request.adminNote ? '<div class="muted" style="font-size:.85rem;margin-top:.35rem;">Admin: ' + esc(request.adminNote) + '</div>' : '') +
        (Number(request.studentRevisionCount) > 0 ? '<div class="muted" style="font-size:.8rem;margin-top:.25rem;">Revisions submitted: ' + esc(request.studentRevisionCount) + '</div>' : '') +
        (needsStudent ? '<div style="margin-top:.6rem;"><a class="btn btn--primary btn--sm" href="rechecking.html?paper=' + encodeURIComponent(request.paperId) + '">Edit / clarify same claim</a></div>' : '') +
      '</div>'
    );
  }

  async function loadProfileRechecks() {
    const host = Utils.qs('#profile-rechecks');
    if (!host) return;

    try {
      const data = await Api.request('bossbattle/recheck/myRequests', {});
      const rows = (data && data.requests) || [];

      if (!rows.length) {
        host.innerHTML = '<span class="muted">No rechecking requests yet.</span>';
        return;
      }

      host.innerHTML = rows.slice(0, 5).map(requestRow).join('') +
        (rows.length > 5
          ? '<div style="margin-top:.75rem;"><a class="btn btn--secondary btn--sm" href="rechecking.html">View full rechecking history</a></div>'
          : '');
    } catch (error) {
      host.innerHTML = '<span class="muted">Rechecking history will appear here.</span>';
    }
  }

  document.addEventListener('wha:ready', async function () {
    if (Router.currentPageName() !== 'profile.html') return;

    const tabs = Utils.qs('[role="tablist"].profile-tabs');
    const certificatesPanel = Utils.qs('#panel-certificates');
    if (!tabs || !certificatesPanel || Utils.qs('#tab-rechecking')) return;

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.className = 'tab';
    tab.id = 'tab-rechecking';
    tab.setAttribute('aria-selected', 'false');
    tab.setAttribute('aria-controls', 'panel-rechecking');
    tab.tabIndex = -1;
    tab.textContent = 'Rechecking';
    tabs.appendChild(tab);

    const panel = document.createElement('div');
    panel.setAttribute('role', 'tabpanel');
    panel.id = 'panel-rechecking';
    panel.setAttribute('aria-labelledby', 'tab-rechecking');
    panel.hidden = true;
    panel.style.marginTop = 'var(--space-5)';
    panel.innerHTML =
      '<div class="card" style="padding:1rem;">' +
        '<div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;">' +
          '<div>' +
            '<h2 class="profile-section-title" style="margin-top:0;">Boss paper rechecking</h2>' +
            '<p class="muted">Your open and resolved rechecking requests stay here as lifetime history unless Admin archives one.</p>' +
          '</div>' +
          '<a class="btn btn--primary" href="rechecking.html">Open Rechecking Center</a>' +
        '</div>' +
        '<div id="profile-rechecks" style="margin-top:1rem;"><p class="muted">Loading recent requests…</p></div>' +
      '</div>';

    certificatesPanel.insertAdjacentElement('afterend', panel);
    await loadProfileRechecks();
  });
})();
