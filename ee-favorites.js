/**
 * EE favorites (mobile-first, logged-in users only).
 * Separate script: does not mutate existing feature scripts.
 */
(function () {
  "use strict";

  var ROOT_ID = "ee-favorites-root";
  var BTN_ID = "ee-favorites-fab";
  var DRAWER_ID = "ee-favorites-drawer";
  var STYLE_ID = "ee-favorites-style";
  var LS_KEY_PREFIX = "ee_favorites_v1";
  var FLOAT_SOURCE = "favorites";

  if (window.__EE_FAVORITES_BOOTED__) return;
  window.__EE_FAVORITES_BOOTED__ = true;

  var sync = window.EE_FEATURES_SYNC || null;
  var core = window.EE_CORE || null;
  var state = {
    context: null,
    items: [],
    open: false,
  };

  function n(v) {
    return String(v || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      "\n#" + ROOT_ID + "{position:fixed;left:14px;bottom:124px;z-index:2147483642;display:flex;flex-direction:column;align-items:flex-start;gap:8px}" +
      "\n#" + BTN_ID + "{height:38px;min-width:44px;padding:0 12px;border-radius:999px;border:1px solid #cbd5e1;background:#111827;color:#fff;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 8px 18px rgba(2,6,23,.22)}" +
      "\n#"+BTN_ID+" .ee-count{background:#ef4444;color:#fff;border-radius:999px;padding:1px 7px;font-size:11px;min-width:18px;text-align:center}" +
      "\n#"+DRAWER_ID+"{position:fixed;left:0;right:0;bottom:0;top:auto;max-height:min(78svh,640px);background:#fff;border-top-left-radius:14px;border-top-right-radius:14px;transform:translateY(106%);transition:transform .2s ease;z-index:2147483645;display:flex;flex-direction:column;border:1px solid #e2e8f0}" +
      "\n#"+ROOT_ID+".open #"+DRAWER_ID+"{transform:translateY(0)}" +
      "\n#"+ROOT_ID+" .ee-overlay{position:fixed;inset:0;background:rgba(2,6,23,.42);opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:2147483644}" +
      "\n#"+ROOT_ID+".open .ee-overlay{opacity:1;pointer-events:auto}" +
      "\n#"+ROOT_ID+" .ee-head{display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #e2e8f0}" +
      "\n#"+ROOT_ID+" .ee-title{font-size:16px;font-weight:700;color:#0f172a}" +
      "\n#"+ROOT_ID+" .ee-close{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:6px 10px;font-size:13px;cursor:pointer}" +
      "\n#"+ROOT_ID+" .ee-body{padding:10px;overflow:auto}" +
      "\n#"+ROOT_ID+" .ee-row{display:grid;grid-template-columns:52px 1fr auto;gap:10px;align-items:center;padding:8px 2px;border-bottom:1px solid #f1f5f9}" +
      "\n#"+ROOT_ID+" .ee-row img{width:48px;height:48px;object-fit:contain;background:#f8fafc;border-radius:8px}" +
      "\n#"+ROOT_ID+" .ee-name{font-size:13px;font-weight:600;color:#0f172a;line-height:1.3}" +
      "\n#"+ROOT_ID+" .ee-code{font-size:12px;color:#64748b;margin-top:2px}" +
      "\n#"+ROOT_ID+" .ee-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}" +
      "\n#"+ROOT_ID+" .ee-btn{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:6px 8px;font-size:12px;cursor:pointer}" +
      "\n#"+ROOT_ID+" .ee-btn.primary{background:#16a34a;border-color:#16a34a;color:#fff}" +
      "\n.ee-fav-toggle{border:none;background:transparent;padding:0;cursor:pointer;color:#475569;font-size:18px;line-height:1}" +
      "\n.ee-fav-toggle.is-on{color:#dc2626}" +
      "\n.ee-fav-inline{display:inline-flex;align-items:center;gap:6px}" +
      "\n#" + ROOT_ID + ".ee-hidden{display:none}" +
      "\n@media (min-width: 981px){#" + DRAWER_ID + "{left:auto;right:14px;bottom:168px;top:auto;width:min(420px,calc(100vw - 24px));max-height:min(70vh,620px);border-radius:14px;transform:translateY(12px) scale(.98);opacity:0;pointer-events:none}#" + ROOT_ID + ".open #" + DRAWER_ID + "{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}}" +
      "\n@media (max-width:980px){#" + ROOT_ID + "{bottom:116px}#" + BTN_ID + "{height:36px;padding:0 10px;font-size:12px}}";
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function lsKey() {
    var id = state.context && state.context.localKey ? state.context.localKey : "guest";
    return LS_KEY_PREFIX + "::" + location.hostname + "::" + id;
  }

  function loadLocal() {
    try {
      var parsed = JSON.parse(localStorage.getItem(lsKey()) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (x) {
        return x && typeof x.product_code === "string" && n(x.product_code);
      });
    } catch (_e) {
      return [];
    }
  }

  function saveLocal() {
    try {
      localStorage.setItem(lsKey(), JSON.stringify(state.items));
    } catch (_e) {}
  }

  function setFabCount() {
    var el = document.querySelector("#" + BTN_ID + " .ee-count");
    if (!el) return;
    el.textContent = String(state.items.length || 0);
  }

  function isFav(code) {
    var key = n(code).toUpperCase();
    return state.items.some(function (it) {
      return n(it.product_code).toUpperCase() === key;
    });
  }

  function extractCodeFromNode(node) {
    if (!node) return "";
    var direct = n(node.getAttribute && node.getAttribute("data-product-code"));
    if (direct) return direct;
    var input = node.querySelector && node.querySelector('input[name="productCode"],input[name="product_code"]');
    if (input && n(input.value)) return n(input.value);
    var attrNode = node.querySelector && node.querySelector("[data-product-code]");
    if (attrNode && n(attrNode.getAttribute("data-product-code"))) return n(attrNode.getAttribute("data-product-code"));
    var txt = n(node.textContent || "");
    var m = txt.match(/(?:K[ÓO]D\s*PRODUKTU|K[ÓO]D)\s*[:\-]?\s*([A-Z0-9._\-]{3,})/i);
    return m ? n(m[1]) : "";
  }

  function extractMetaFromNode(node) {
    if (!node) return null;
    var code = extractCodeFromNode(node);
    if (!code) return null;
    var titleNode =
      node.querySelector("h1,h2,h3,.name,.p-name,.product-name,a") ||
      document.querySelector("h1");
    var linkNode = node.querySelector("a[href]") || document.querySelector('link[rel="canonical"]');
    var imgNode = node.querySelector("img[src]");
    return {
      product_code: code,
      product_name: n((titleNode && titleNode.textContent) || ("Produkt " + code)),
      product_url: n((linkNode && (linkNode.href || linkNode.getAttribute("href"))) || location.href),
      product_image: n((imgNode && (imgNode.currentSrc || imgNode.src)) || ""),
      updated_at: new Date().toISOString(),
    };
  }

  function toggleFavorite(meta, sourceBtn) {
    if (!meta || !meta.product_code) return;
    var idx = state.items.findIndex(function (it) {
      return n(it.product_code).toUpperCase() === n(meta.product_code).toUpperCase();
    });
    if (idx >= 0) {
      state.items.splice(idx, 1);
      if (sync && state.context && state.context.canSync) {
        sync.deleteFavorite(state.context.ownerHash, meta.product_code).catch(function () {});
      }
    } else {
      state.items.unshift(meta);
      if (sync && state.context && state.context.canSync) {
        sync.upsertFavorite(state.context.ownerHash, meta).catch(function () {});
      }
    }
    saveLocal();
    renderDrawerBody();
    setFabCount();
    refreshToggleStates();
    if (sourceBtn) sourceBtn.blur();
  }

  function ensureToggleForNode(node) {
    if (!node || node.querySelector(".ee-fav-toggle")) return;
    var meta = extractMetaFromNode(node);
    if (!meta) return;
    var mount = node.querySelector(".p-in, .product-top, .product, .p, h1, .detail-parameters") || node;
    var wrap = document.createElement("span");
    wrap.className = "ee-fav-inline";
    wrap.innerHTML = '<button type="button" class="ee-fav-toggle" aria-label="Obľúbené" title="Obľúbené">❤</button>';
    var btn = wrap.querySelector("button");
    btn.dataset.eeCode = meta.product_code;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(meta, btn);
    });
    if (/^H1$/i.test(mount.tagName || "")) {
      mount.insertAdjacentElement("afterend", wrap);
    } else {
      mount.appendChild(wrap);
    }
  }

  function mountInlineToggles() {
    if (!state.context || !state.context.loggedIn) return;
    var candidates = document.querySelectorAll(
      ".product, .product-box, .p, .product-item, .p-in, .detail, #content"
    );
    for (var i = 0; i < candidates.length; i++) ensureToggleForNode(candidates[i]);
    refreshToggleStates();
  }

  function refreshToggleStates() {
    var toggles = document.querySelectorAll(".ee-fav-toggle[data-ee-code]");
    for (var i = 0; i < toggles.length; i++) {
      var code = toggles[i].dataset.eeCode;
      var on = isFav(code);
      toggles[i].classList.toggle("is-on", on);
      toggles[i].setAttribute("aria-pressed", on ? "true" : "false");
      toggles[i].textContent = on ? "❤" : "♡";
    }
  }

  function addToCart(code) {
    var safeCode = n(code);
    if (!safeCode) return Promise.resolve(false);
    if (window.shoptet && window.shoptet.cartShared && typeof window.shoptet.cartShared.addToCart === "function") {
      try {
        window.shoptet.cartShared.addToCart({ productCode: safeCode, amount: 1 }, true);
        return Promise.resolve(true);
      } catch (_e) {}
    }
    return Promise.resolve(false);
  }

  function renderDrawerBody() {
    var body = document.querySelector("#" + ROOT_ID + " .ee-body");
    if (!body) return;
    if (!state.items.length) {
      body.innerHTML = '<div style="font-size:13px;color:#475569;padding:6px 2px">Zatiaľ nemáte žiadne obľúbené produkty.</div>';
      return;
    }
    body.innerHTML = state.items
      .map(function (it) {
        return (
          '<div class="ee-row" data-code="' +
          String(it.product_code).replace(/"/g, "&quot;") +
          '">' +
          '<img src="' +
          String(it.product_image || "").replace(/"/g, "&quot;") +
          '" alt="">' +
          "<div>" +
          '<div class="ee-name">' +
          String(it.product_name || it.product_code) +
          "</div>" +
          '<div class="ee-code">Kód: ' +
          String(it.product_code) +
          "</div>" +
          "</div>" +
          '<div class="ee-actions">' +
          '<button class="ee-btn primary" data-act="cart">Do košíka</button>' +
          '<button class="ee-btn" data-act="open">Detail</button>' +
          '<button class="ee-btn" data-act="remove">Odstrániť</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function ensureRoot() {
    var root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML =
      '<button id="' +
      BTN_ID +
      '" type="button" aria-expanded="false">❤ Obľúbené <span class="ee-count">0</span></button>' +
      '<div class="ee-overlay"></div>' +
      '<div id="' +
      DRAWER_ID +
      '" role="dialog" aria-label="Obľúbené produkty">' +
      '<div class="ee-head"><div class="ee-title">Obľúbené produkty</div><button type="button" class="ee-close">Zavrieť</button></div>' +
      '<div class="ee-body"></div>' +
      "</div>";
    document.body.appendChild(root);

    var fab = root.querySelector("#" + BTN_ID);
    fab.addEventListener("click", function () {
      state.open = !state.open;
      root.classList.toggle("open", state.open);
      fab.setAttribute("aria-expanded", state.open ? "true" : "false");
      setFloatingOwner(state.open);
      if (state.open) renderDrawerBody();
    });
    root.querySelector(".ee-overlay").addEventListener("click", function () {
      state.open = false;
      root.classList.remove("open");
      fab.setAttribute("aria-expanded", "false");
      setFloatingOwner(false);
    });
    root.querySelector(".ee-close").addEventListener("click", function () {
      state.open = false;
      root.classList.remove("open");
      fab.setAttribute("aria-expanded", "false");
      setFloatingOwner(false);
    });
    root.querySelector(".ee-body").addEventListener("click", function (e) {
      var btn = e.target && e.target.closest("button[data-act]");
      if (!btn) return;
      var row = btn.closest(".ee-row");
      if (!row) return;
      var code = row.getAttribute("data-code");
      var item = state.items.find(function (x) {
        return n(x.product_code).toUpperCase() === n(code).toUpperCase();
      });
      if (!item) return;
      if (btn.dataset.act === "remove") {
        toggleFavorite(item, null);
      } else if (btn.dataset.act === "open") {
        location.href = item.product_url || "/vyhladavanie/?string=" + encodeURIComponent(item.product_code);
      } else if (btn.dataset.act === "cart") {
        addToCart(item.product_code);
      }
    });
    return root;
  }

  function syncFloatingVisibility() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var current = document.documentElement.getAttribute("data-ee-floating-open");
    root.classList.toggle("ee-hidden", !!current && current !== FLOAT_SOURCE);
  }

  function setFloatingOwner(open) {
    if (open) document.documentElement.setAttribute("data-ee-floating-open", FLOAT_SOURCE);
    else if (document.documentElement.getAttribute("data-ee-floating-open") === FLOAT_SOURCE)
      document.documentElement.removeAttribute("data-ee-floating-open");
    document.dispatchEvent(new CustomEvent("ee-floating-changed"));
  }

  function mergeByCode(base, incoming) {
    var map = new Map();
    (base || []).forEach(function (it) {
      map.set(n(it.product_code).toUpperCase(), it);
    });
    (incoming || []).forEach(function (it) {
      if (!it || !it.product_code) return;
      var key = n(it.product_code).toUpperCase();
      var prev = map.get(key);
      if (!prev) map.set(key, it);
      else {
        var p = Date.parse(prev.updated_at || 0) || 0;
        var c = Date.parse(it.updated_at || 0) || 0;
        map.set(key, c >= p ? it : prev);
      }
    });
    return Array.from(map.values());
  }

  function syncFromRemote() {
    if (!sync || !state.context || !state.context.canSync) return Promise.resolve();
    return sync
      .listFavorites(state.context.ownerHash)
      .then(function (rows) {
        if (!Array.isArray(rows)) return;
        state.items = mergeByCode(state.items, rows);
        saveLocal();
      })
      .catch(function () {});
  }

  function boot() {
    ensureStyle();
    sync
      .getContext()
      .then(function (ctx) {
        state.context = ctx;
        if (!ctx.loggedIn) return;
        state.items = loadLocal();
        ensureRoot();
        syncFloatingVisibility();
        setFabCount();
        mountInlineToggles();
        renderDrawerBody();
        return syncFromRemote().then(function () {
          setFabCount();
          renderDrawerBody();
          refreshToggleStates();
        });
      })
      .catch(function () {});
  }

  function scheduleMount() {
    if (core && typeof core.scheduleOnce === "function") {
      core.scheduleOnce("ee-fav-mount", mountInlineToggles, 80);
    } else {
      setTimeout(mountInlineToggles, 80);
    }
  }

  boot();
  document.addEventListener("ee-floating-changed", syncFloatingVisibility);
  document.addEventListener("ShoptetDOMPageContentLoaded", scheduleMount);
  document.addEventListener("ShoptetCartUpdated", scheduleMount);
  if (core && typeof core.routeChanged === "function") core.routeChanged(scheduleMount);
  if (document.body && typeof MutationObserver !== "undefined") {
    new MutationObserver(scheduleMount).observe(document.body, { childList: true, subtree: true });
  }

  var _setOpen = function () {
    var root = document.getElementById(ROOT_ID);
    var fab = root && root.querySelector("#" + BTN_ID);
    if (!root || !fab) return;
    var observer = new MutationObserver(function () {
      var isOpen = root.classList.contains("open");
      setFloatingOwner(isOpen);
      fab.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  };
  setTimeout(_setOpen, 0);
})();
