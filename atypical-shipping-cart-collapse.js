/**
 * Collapsible list for atypical shipping cart notice.
 * Keeps first 5 products visible and toggles the rest.
 *
 * Load AFTER atypical-shipping-notice.js.
 */
(function () {
  'use strict';

  var NOTICE_SELECTOR = '.ee-atypical-shipping-notice[data-ee-atyp-notice="cart"]';
  var MAX_VISIBLE_ITEMS = 5;

  function ensureStyles() {
    if (document.getElementById('ee-atyp-collapse-styles')) return;
    var s = document.createElement('style');
    s.id = 'ee-atyp-collapse-styles';
    s.textContent =
      '.ee-atyp-collapse-toggle{' +
      'margin-top:8px;background:transparent;border:0;padding:0;cursor:pointer;' +
      'font:inherit;font-weight:600;color:#5c4a00;text-decoration:underline;}' +
      '.ee-atyp-collapse-hidden{display:none;}';
    document.head.appendChild(s);
  }

  function buildToggleButton(hiddenCount) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ee-atyp-collapse-toggle';
    btn.setAttribute('data-ee-atyp-collapse-toggle', '1');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Zobraziť všetko (' + hiddenCount + ')';
    return btn;
  }

  function applyCollapseToNotice(notice) {
    if (!notice || notice.getAttribute('data-ee-atyp-collapse-ready') === '1') return;
    var list = notice.querySelector('ul');
    if (!list) return;
    var items = list.querySelectorAll('li');
    if (items.length <= MAX_VISIBLE_ITEMS) {
      notice.setAttribute('data-ee-atyp-collapse-ready', '1');
      return;
    }

    ensureStyles();
    var hidden = [];
    for (var i = MAX_VISIBLE_ITEMS; i < items.length; i++) {
      items[i].classList.add('ee-atyp-collapse-hidden');
      hidden.push(items[i]);
    }

    var button = buildToggleButton(hidden.length);
    button.addEventListener('click', function () {
      var expanded = button.getAttribute('aria-expanded') === 'true';
      for (var k = 0; k < hidden.length; k++) {
        hidden[k].classList.toggle('ee-atyp-collapse-hidden', expanded);
      }
      button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      button.textContent = expanded ? 'Zobraziť všetko (' + hidden.length + ')' : 'Zobraziť menej';
    });

    list.insertAdjacentElement('afterend', button);
    notice.setAttribute('data-ee-atyp-collapse-ready', '1');
  }

  function run() {
    var notices = document.querySelectorAll(NOTICE_SELECTOR);
    for (var i = 0; i < notices.length; i++) {
      applyCollapseToNotice(notices[i]);
    }
  }

  function boot() {
    run();
    var root = document.body || document.documentElement;
    if (!root) return;
    var obs = new MutationObserver(function () {
      run();
    });
    obs.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
