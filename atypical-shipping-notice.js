/**
 * Soft notice: atypická doprava (feed: ATYPICAL_SHIPPING=1).
 * Vložiť do Shoptet: Vzhľad a obsah → Editor → HTML kód → Pätička.
 *
 * Konfigurácia (pred načítaním tohto súboru alebo hneď po):
 *   window.EE_ATYPICAL_SHIPPING = {
 *     codes: ['178816','283031', ...],  // povinné pole kódov
 *     messageTitle: '...',
 *     messageBody: '...',
 *     debug: false
 *   };
 *
 * Alternatíva: načítať kódy z JSON (po nahratí na FTP /user/documents/):
 *   window.EE_ATYPICAL_SHIPPING_JSON_URL = 'https://cdn.myshoptet.com/.../atypical-shipping-codes.json';
 *   (očakáva sa tvar { "codes": ["..."] } alebo pole z extract skriptu)
 */
(function () {
  'use strict';

  var CFG = window.EE_ATYPICAL_SHIPPING || {};
  var NOTICE_CLASS = 'ee-atypical-shipping-notice';
  var DATA_ATTR = 'data-ee-atyp-notice';
  var CONTACT_PHONE = CFG.contactPhone || '+421908134795';
  var CONTACT_EMAIL = CFG.contactEmail || 'info@elektroenergy.sk';

  function log() {
    if (CFG.debug) {
      console.log.apply(console, ['[EE atyp]'].concat([].slice.call(arguments)));
    }
  }

  function normalizeCodes(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === 'object' && Array.isArray(raw.codes)) return raw.codes.map(String);
    return [];
  }

  function codeSet() {
    return new Set(normalizeCodes(CFG.codes));
  }

  function currentPath() {
    if (window.__EE_TEST_PATH__ !== undefined && window.__EE_TEST_PATH__ !== null) {
      return String(window.__EE_TEST_PATH__);
    }
    return window.location.pathname || '';
  }

  function extractCodeFromPathname(path) {
    var m = path.match(/(?:^|\/)([A-Za-z]{2}-\d+|\d{5,})(?:\/|$|\?|#)/);
    if (m) return m[1];
    m = path.match(/-(\d{5,})\/?$/);
    return m ? m[1] : null;
  }

  function isAtypicalCode(code, set) {
    if (!code || !set.size) return false;
    return set.has(String(code).trim());
  }

  function ensureStyles() {
    if (document.getElementById('ee-atyp-shipping-styles')) return;
    var s = document.createElement('style');
    s.id = 'ee-atyp-shipping-styles';
    s.textContent =
      '.' +
      NOTICE_CLASS +
      '{background:#fff8e6;border:1px solid #e6c200;border-radius:6px;padding:12px 14px;margin:12px 0;font-size:14px;line-height:1.45;color:#5c4a00;}' +
      '.' +
      NOTICE_CLASS +
      ' strong{display:block;margin-bottom:4px;}' +
      '.' +
      NOTICE_CLASS +
      ' a{color:#5c4a00;text-decoration:underline;}' +
      '.' +
      NOTICE_CLASS +
      ' ul{margin:8px 0 0 18px;padding:0;}';
    document.head.appendChild(s);
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function normalizePhoneForHref(phone) {
    return String(phone || '').replace(/[^\d+]/g, '');
  }

  function contactLinksHtml() {
    var telHref = normalizePhoneForHref(CONTACT_PHONE);
    return (
      '<a href="tel:' +
      escapeHtml(telHref) +
      '">' +
      escapeHtml(CONTACT_PHONE) +
      '</a> alebo <a href="mailto:' +
      escapeHtml(CONTACT_EMAIL) +
      '">' +
      escapeHtml(CONTACT_EMAIL) +
      '</a>'
    );
  }

  function defaultProductBody() {
    return (
      'Tento produkt má atypickú dopravu. Spôsob a cena doručenia sú na dohode (' +
      contactLinksHtml() +
      ').'
    );
  }

  function buildNotice(bodyHtml, attrValue) {
    var div = document.createElement('div');
    div.className = NOTICE_CLASS;
    div.setAttribute(DATA_ATTR, attrValue || '1');
    div.innerHTML =
      '<strong>' +
      (CFG.messageTitle || 'Upozornenie k doprave') +
      '</strong>' +
      (bodyHtml || CFG.messageBody || defaultProductBody());
    return div;
  }

  function initPDP(set) {
    if (document.body.querySelector('[' + DATA_ATTR + ']')) return;
    var code =
      extractCodeFromPathname(currentPath()) ||
      (function () {
        var el = document.querySelector('.detail-parameters th');
        var nodes = document.querySelectorAll('th, td, .dkLabFavouriteProductDetailParameterName, .parameter-name');
        for (var i = 0; i < nodes.length; i++) {
          var t = (nodes[i].textContent || '').trim();
          if (/kód produktu/i.test(t)) {
            var row = nodes[i].closest('tr');
            if (row) {
              var td = row.querySelector('td');
              if (td) return (td.textContent || '').trim();
            }
          }
        }
        return null;
      })();
    log('PDP code', code);
    if (!isAtypicalCode(code, set)) return;

    var anchor =
      document.querySelector('.add-to-cart button') ||
      document.querySelector('button[type="submit"][name*="amount"]') ||
      document.querySelector('.dkLabAddProductDetailToCart') ||
      document.querySelector('.price-final');

    ensureStyles();
    var note = buildNotice();
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(note, anchor);
    } else {
      var wrap = document.querySelector('.p-detail-inner') || document.querySelector('main') || document.body;
      wrap.insertBefore(note, wrap.firstChild);
    }
  }

  function collectCartAtypicalItems(container, set) {
    var rows = container.querySelectorAll('tr[data-micro="cartItem"], .cart-item, .removeable');
    if (!rows.length) {
      rows = container.querySelectorAll('table tbody tr');
    }

    var items = [];
    var seen = {};
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var text = row.textContent || '';
      var link = row.querySelector('a[href*="/"]');
      var href = link ? link.getAttribute('href') || '' : '';
      var fromUrl = extractCodeFromPathname(href);
      var fromText = text.match(/\b([A-Za-z]{2}-\d+|\d{5,})\b/g);
      var hit = fromUrl;
      if (!hit && fromText) {
        for (var k = 0; k < fromText.length; k++) {
          if (set.has(fromText[k])) {
            hit = fromText[k];
            break;
          }
        }
      }
      if (!hit || !set.has(hit) || seen[hit]) continue;
      seen[hit] = true;
      items.push({
        code: hit,
        name: link ? (link.textContent || '').trim() : hit,
        href: href
      });
    }
    return items;
  }

  function buildCartBody(items) {
    var intro =
      items.length === 1
        ? 'V košíku máte produkt s atypickou dopravou:'
        : 'V košíku máte produkty s atypickou dopravou:';
    var list = '<ul>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var safeName = escapeHtml(item.name || item.code);
      if (item.href) {
        list += '<li><a href="' + escapeHtml(item.href) + '">' + safeName + '</a></li>';
      } else {
        list += '<li>' + safeName + '</li>';
      }
    }
    list += '</ul>';
    return intro + list + 'Spôsob a cena doručenia sú na dohode (' + contactLinksHtml() + ').';
  }

  function initCart(set) {
    if (document.body.querySelector('[' + DATA_ATTR + '="cart"]')) return;
    var container =
      document.querySelector('.cart-table') ||
      document.querySelector('.cart-content') ||
      document.querySelector('#cart') ||
      document.body;
    var items = collectCartAtypicalItems(container, set);
    if (!items.length) return;

    ensureStyles();
    var banner = buildNotice(CFG.cartMessageBody || buildCartBody(items), 'cart');
    var summary = document.querySelector('.cart-summary, .co-box, .cart-buttons');
    if (summary && summary.parentNode) {
      summary.parentNode.insertBefore(banner, summary);
    } else {
      container.insertBefore(banner, container.firstChild);
    }
  }

  function run(set) {
    var path = currentPath();
    if (/\/kosik\/?$/i.test(path) || /\/cart\/?$/i.test(path)) {
      initCart(set);
    } else if (/\/detail\//i.test(path) || /-\d{5,}\/?$/i.test(path) || document.querySelector('.type-product')) {
      initPDP(set);
    }
  }

  function startWithCodes(codes) {
    CFG.codes = codes;
    var set = codeSet();
    log('codes loaded', set.size);
    if (!set.size) {
      log('no codes, skip');
      return;
    }
    run(set);
  }

  function loadJsonThen(cb) {
    var url = window.EE_ATYPICAL_SHIPPING_JSON_URL;
    if (!url) {
      cb([]);
      return;
    }
    fetch(url, { credentials: 'omit', mode: 'cors' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var codes = normalizeCodes(data);
        cb(codes);
      })
      .catch(function (e) {
        log('fetch json failed', e);
        cb([]);
      });
  }

  window.EE_initAtypicalShippingNotice = function () {
    if (normalizeCodes(CFG.codes).length) {
      startWithCodes(CFG.codes);
      return;
    }
    loadJsonThen(function (codes) {
      if (codes.length) startWithCodes(codes);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.EE_initAtypicalShippingNotice);
  } else {
    window.EE_initAtypicalShippingNotice();
  }
})();
