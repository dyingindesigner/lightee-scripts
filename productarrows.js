(function () {
var cache = {}, timer;

function num(v, d) {
  v = parseFloat((v + '').replace(',', '.'));
  return isFinite(v) && v > 0 ? v : (d || 1);
}

function n(t) {
  return (t || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function getState() {
  var s = { groupId: null, loggedIn: false }, srcs = [
    window.eeCustomer,
    window.customer,
    window.shoptet && window.shoptet.customer,
    window.shoptet && window.shoptet.config && window.shoptet.config.customer,
    window.Shoptet && window.Shoptet.customer
  ], i, o, v;

  for (i = 0; i < srcs.length; i++) {
    o = srcs[i];
    if (!o || typeof o !== 'object') continue;
    v = Number(o.groupId);
    if (!isNaN(v)) s.groupId = v;
    if (o.registered === true || o.mainAccount === true) s.loggedIn = true;
  }

  if (Array.isArray(window.dataLayer)) {
    for (i = 0; i < dataLayer.length; i++) {
      o = dataLayer[i] || {};
      var list = [
        o,
        o.customer,
        o.shoptet && o.shoptet.customer,
        o.ecommerce && o.ecommerce.customer,
        o.page && o.page.customer
      ];
      for (var j = 0; j < list.length; j++) {
        var c = list[j];
        if (!c || typeof c !== 'object') continue;
        v = Number(c.groupId);
        if (!isNaN(v)) s.groupId = v;
        if (c.registered === true || c.mainAccount === true) s.loggedIn = true;
      }
    }
  }

  if (!s.loggedIn) {
    var acc = Array.from(document.querySelectorAll('a,button')).some(function (el) {
      var t = n(el.textContent);
      return t === 'Môj účet' || t.indexOf('Môj účet') !== -1;
    });
    if (acc) s.loggedIn = true;
  }

  return s;
}

function isB2B() {
  var s = getState();
  return !!s.loggedIn && s.groupId != null && Number(s.groupId) !== 1;
}

function card(btn) {
  return btn.closest('.product,.p,.product-box,li,[data-micro-identifier]') || btn.parentElement;
}

function listingButton(btn) {
  if (!btn || btn.dataset.eeQtyReady === '1') return false;
  if (!/do ko[sš]íka/i.test((btn.textContent || '').replace(/\s+/g, ' ').trim())) return false;
  if (btn.closest('#cart-widget,.cart-widget,.cart-table,.order-summary-top,#checkoutSidebar,.p-detail-inner,.product-detail,.type-detail,.extras-col')) return false;
  return !!card(btn);
}

function linkOf(btn) {
  var c = card(btn);
  var a = c && c.querySelector('a[href]:not(.btn)');
  return a && a.href ? a.href : '';
}

function priceIdOf(btn) {
  var c = card(btn);
  var i = c && c.querySelector('input[name="priceId"]');
  return i && i.value ? parseInt(i.value, 10) : null;
}

function normalizeQty(val, cfg) {
  var min = num(cfg.min, 1), step = num(cfg.step, min), max = num(cfg.max, 9999);
  val = num(val, min);
  if (val < min) val = min;
  val = min + Math.round((val - min) / step) * step;
  if (val > max) val = max;
  return val;
}

function decimals(v) {
  var s = String(v);
  return s.indexOf('.') === -1 ? 0 : s.length - s.indexOf('.') - 1;
}

function formatVal(v, cfg) {
  var d = Math.max(decimals(cfg.min), decimals(cfg.step));
  return d ? v.toFixed(d).replace('.', ',') : String(Math.round(v));
}

function setQty(box, val, cfg) {
  val = normalizeQty(val, cfg);
  box.dataset.qty = String(val);
  var input = box.querySelector('input.amount');
  if (input) input.value = formatVal(val, cfg);
}

function css() {
  if (document.getElementById('ee-list-qty-style')) return;
  var s = document.createElement('style');
  s.id = 'ee-list-qty-style';
  s.textContent =
    '.ee-qty-wrap{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
    '.ee-qty-wrap .quantity{margin:0}' +
    '.ee-qty-wrap .btn,.ee-qty-wrap .add-to-cart-button{margin:0}' +
    '.ee-qty-inline{display:inline-flex;align-items:center}' +
    '.ee-qty-inline .quantity{min-width:118px}';
  document.head.appendChild(s);
}

function buildQty(cfg) {
  var min = num(cfg.min, 1), step = num(cfg.step, min), max = num(cfg.max, 9999);
  var d = document.createElement('div');
  d.className = 'ee-qty-inline';
  d.innerHTML =
    '<div class="quantity">' +
      '<button type="button" class="decrease" aria-label="Znížiť množstvo o ' + String(step).replace('.', ',') + '"><span>-</span></button>' +
      '<input type="number" name="amount" class="amount" value="' + formatVal(min, cfg) + '" min="' + min + '" step="' + step + '" max="' + max + '" data-min="' + min + '" inputmode="decimal">' +
      '<button type="button" class="increase" aria-label="Zvýšiť množstvo o ' + String(step).replace('.', ',') + '"><span>+</span></button>' +
    '</div>';
  return d;
}

function fallbackQtyHandlers(box, cfg) {
  var minus = box.querySelector('.decrease');
  var plus = box.querySelector('.increase');
  var input = box.querySelector('input.amount');

  if (minus) minus.addEventListener('click', function (e) {
    if (!isB2B()) return;
    if (e.__eeDone) return;
    e.preventDefault();
    e.stopPropagation();
    setQty(box, num(box.dataset.qty, cfg.min) - cfg.step, cfg);
  });

  if (plus) plus.addEventListener('click', function (e) {
    if (!isB2B()) return;
    if (e.__eeDone) return;
    e.preventDefault();
    e.stopPropagation();
    setQty(box, num(box.dataset.qty, cfg.min) + cfg.step, cfg);
  });

  if (input) {
    function sync() {
      if (!isB2B()) return;
      setQty(box, input.value, cfg);
    }
    input.addEventListener('change', sync);
    input.addEventListener('blur', sync);
  }
}

function fetchCfg(url) {
  if (!url) return Promise.resolve({ min: 1, step: 1, max: 9999 });
  if (cache[url]) return cache[url];

  cache[url] = fetch(url, { credentials: 'same-origin' })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var input = doc.querySelector('#product-detail-form input.amount,#product-detail input.amount,input.amount[name="amount"]');
      return {
        min: input ? num(input.getAttribute('min') || input.value, 1) : 1,
        step: input ? num(input.getAttribute('step') || input.getAttribute('min') || input.value, 1) : 1,
        max: input ? num(input.getAttribute('max'), 9999) : 9999
      };
    })
    .catch(function () {
      return { min: 1, step: 1, max: 9999 };
    });

  return cache[url];
}

function mount(btn) {
  var pid = priceIdOf(btn);
  if (!pid || !window.shoptet || !shoptet.cartShared || typeof shoptet.cartShared.addToCart !== 'function') return;

  var c = card(btn);
  if (!c) return;

  var wrap = document.createElement('div');
  wrap.className = 'ee-qty-wrap';

  btn.parentNode.insertBefore(wrap, btn);
  wrap.appendChild(btn);

  var qtyHost = null;
  var cfgCurrent = { min: 1, step: 1, max: 9999 };

  fetchCfg(linkOf(btn)).then(function (cfg) {
    cfgCurrent = cfg;
    qtyHost = buildQty(cfg);
    wrap.insertBefore(qtyHost, btn);
    fallbackQtyHandlers(qtyHost, cfg);

    if (typeof window.run_multiply === 'function') {
      try { window.run_multiply(); } catch (e) {}
    }
  });

  btn.addEventListener('click', function (e) {
    if (!isB2B()) return;

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    var amount = cfgCurrent.min;
    if (qtyHost) {
      var input = qtyHost.querySelector('input.amount');
      amount = normalizeQty(input ? input.value : qtyHost.dataset.qty, cfgCurrent);
      setQty(qtyHost, amount, cfgCurrent);
    }

    shoptet.cartShared.addToCart({ priceId: pid, amount: amount });
  }, true);

  btn.dataset.eeQtyReady = '1';
}

function init() {
  if (!isB2B()) return;
  css();
  document.querySelectorAll('button,a.btn').forEach(function (btn) {
    if (listingButton(btn)) mount(btn);
  });
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(init, 120);
}

function boot() {
  init();
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('ShoptetDOMPageContentLoaded', schedule);
  document.addEventListener('ShoptetDOMSearchResultsLoaded', schedule);
  window.addEventListener('load', schedule);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
