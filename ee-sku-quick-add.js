/**
 * EE SKU quick-add bar.
 * Desktop: floating panel above Bulk button.
 * Mobile: compact SKU+ launcher with bottom sheet.
 */
(function () {
  "use strict";

  if (window.__EE_SKU_QUICK_ADD_BOOTED__) return;
  window.__EE_SKU_QUICK_ADD_BOOTED__ = true;

  var ROOT_ID = "ee-skuqa-root";
  var BTN_ID = "ee-skuqa-btn";
  var PANEL_ID = "ee-skuqa-panel";
  var STYLE_ID = "ee-skuqa-style";
  var LS_HISTORY_KEY = "ee_sku_quick_add_history_v1";
  var FLOAT_SOURCE = "skuqa";

  var core = window.EE_CORE || null;
  var sync = window.EE_FEATURES_SYNC || null;
  var state = {
    context: null,
    open: false,
    working: false,
  };

  function n(v) {
    return String(v || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function loadHistory() {
    try {
      var x = JSON.parse(localStorage.getItem(LS_HISTORY_KEY) || "[]");
      if (!Array.isArray(x)) return [];
      return x.filter(Boolean).slice(0, 5);
    } catch (_e) {
      return [];
    }
  }

  function saveHistory(raw) {
    try {
      var list = [raw].concat(loadHistory().filter(function (x) {
        return x !== raw;
      }));
      localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(list.slice(0, 5)));
    } catch (_e) {}
  }

  function parseLines(text) {
    var lines = String(text || "").split(/\r?\n/);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var line = n(lines[i]);
      if (!line) continue;
      var parts = line.split(/[;,]/);
      var code = n(parts[0] || "");
      if (!code) continue;
      var qty = Math.max(1, Number(n(parts[1] || "1")) || 1);
      out.push({ code: code, qty: qty });
    }
    return out;
  }

  function addToCart(code, qty) {
    var safeCode = n(code);
    var safeQty = Math.max(1, Number(qty || 1) || 1);
    if (!safeCode) return { ok: false, reason: "empty_code" };
    if (window.shoptet && window.shoptet.cartShared && typeof window.shoptet.cartShared.addToCart === "function") {
      try {
        window.shoptet.cartShared.addToCart({ productCode: safeCode, amount: safeQty }, true);
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: (e && e.message) || "add_failed" };
      }
    }
    return { ok: false, reason: "api_missing" };
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      "\n#" +
      ROOT_ID +
      "{position:fixed;left:14px;bottom:214px;z-index:2147483641}" +
      "\n#" + ROOT_ID + ".ee-hidden{display:none}" +
      "\n#" +
      BTN_ID +
      "{height:38px;padding:0 12px;border-radius:999px;border:1px solid #cbd5e1;background:#1d4ed8;color:#fff;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:7px;cursor:pointer;box-shadow:0 8px 18px rgba(29,78,216,.26)}" +
      "\n#" +
      ROOT_ID +
      " .ee-overlay{position:fixed;inset:0;background:rgba(2,6,23,.42);opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:2147483644}" +
      "\n#" +
      ROOT_ID +
      ".open .ee-overlay{opacity:1;pointer-events:auto}" +
      "\n#" +
      PANEL_ID +
      "{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top-left-radius:14px;border-top-right-radius:14px;border:1px solid #e2e8f0;transform:translateY(105%);transition:transform .2s ease;z-index:2147483645;padding:12px;display:grid;gap:8px}" +
      "\n#" +
      ROOT_ID +
      ".open #" +
      PANEL_ID +
      "{transform:translateY(0)}" +
      "\n#" +
      ROOT_ID +
      " .ee-title{font-size:15px;font-weight:700;color:#0f172a}" +
      "\n#" +
      ROOT_ID +
      " .ee-help{font-size:12px;color:#64748b}" +
      "\n#" +
      ROOT_ID +
      " textarea{width:100%;min-height:90px;border:1px solid #cbd5e1;border-radius:10px;padding:8px 10px;font-size:14px;resize:vertical}" +
      "\n#" +
      ROOT_ID +
      " .ee-row{display:flex;gap:8px;flex-wrap:wrap}" +
      "\n#" +
      ROOT_ID +
      " .ee-btn{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:8px 10px;font-size:13px;cursor:pointer}" +
      "\n#" +
      ROOT_ID +
      " .ee-btn.primary{background:#1d4ed8;border-color:#1d4ed8;color:#fff}" +
      "\n#" +
      ROOT_ID +
      " .ee-log{font-size:12px;color:#334155;min-height:16px;line-height:1.35}" +
      "\n#" +
      ROOT_ID +
      " .ee-history{display:flex;gap:6px;flex-wrap:wrap}" +
      "\n#" +
      ROOT_ID +
      " .ee-chip{border:1px solid #cbd5e1;background:#f8fafc;border-radius:999px;padding:4px 8px;font-size:11px;cursor:pointer}" +
      "\n@media (min-width:981px){#" +
      ROOT_ID +
      "{bottom:258px}#" +
      ROOT_ID +
      ".ee-desktop-inline .ee-overlay{display:none;pointer-events:none}#" +
      PANEL_ID +
      "{left:14px;right:auto;bottom:258px;width:min(360px,calc(100vw - 28px));border-radius:12px;transform:translateY(10px) scale(.98);opacity:0;pointer-events:none}#" +
      ROOT_ID +
      ".open #" +
      PANEL_ID +
      "{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}}" +
      "\n@media (max-width:980px){#" +
      ROOT_ID +
      "{bottom:206px}#" +
      BTN_ID +
      "{height:36px;padding:0 10px;font-size:12px}}";
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ensureRoot() {
    var root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML =
      '<button id="' +
      BTN_ID +
      '" type="button" aria-expanded="false">⌨ SKU+</button>' +
      '<div class="ee-overlay"></div>' +
      '<div id="' +
      PANEL_ID +
      '" role="dialog" aria-label="Rýchle pridanie SKU">' +
      '<div class="ee-title">Rýchle pridanie SKU</div>' +
      '<div class="ee-help">Formát: <strong>SKU,qty</strong> na riadok (napr. ZLS604C,5)</div>' +
      '<textarea data-role="input" placeholder="R.8145,2&#10;ZLS604C,5"></textarea>' +
      '<div class="ee-history" data-role="history"></div>' +
      '<div class="ee-row">' +
      '<button class="ee-btn" data-act="clear">Vyčistiť</button>' +
      '<button class="ee-btn" data-act="close">Zavrieť</button>' +
      '<button class="ee-btn primary" data-act="add">Pridať do košíka</button>' +
      "</div>" +
      '<div class="ee-log" data-role="log">Pripravené.</div>' +
      "</div>";
    document.body.appendChild(root);
    bindUI(root);
    renderHistory(root);
    return root;
  }

  function renderHistory(root) {
    var wrap = root.querySelector('[data-role="history"]');
    if (!wrap) return;
    var history = loadHistory();
    if (!history.length) {
      wrap.innerHTML = "";
      return;
    }
    wrap.innerHTML = history
      .map(function (x) {
        return '<button type="button" class="ee-chip" data-act="history" data-val="' + x.replace(/"/g, "&quot;") + '">' + x + "</button>";
      })
      .join("");
  }

  function setLog(root, text) {
    var log = root.querySelector('[data-role="log"]');
    if (log) log.textContent = text;
  }

  function setOpen(root, open) {
    state.open = !!open;
    root.classList.toggle("open", state.open);
    root.querySelector("#" + BTN_ID).setAttribute("aria-expanded", state.open ? "true" : "false");
    setFloatingOwner(state.open);
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

  function bindUI(root) {
    var btn = root.querySelector("#" + BTN_ID);
    var ta = root.querySelector('[data-role="input"]');
    btn.addEventListener("click", function () {
      setOpen(root, !state.open);
      if (state.open) ta.focus();
    });
    root.querySelector(".ee-overlay").addEventListener("click", function () {
      setOpen(root, false);
    });
    root.addEventListener("click", function (e) {
      var action = e.target && e.target.getAttribute && e.target.getAttribute("data-act");
      if (!action) return;
      if (action === "clear") {
        ta.value = "";
        setLog(root, "Pole vyčistené.");
      } else if (action === "close") {
        setOpen(root, false);
      } else if (action === "history") {
        ta.value = e.target.getAttribute("data-val") || "";
      } else if (action === "add") {
        if (state.working) return;
        var raw = n(ta.value);
        if (!raw) {
          setLog(root, "Zadajte aspoň jeden riadok SKU,qty.");
          return;
        }
        state.working = true;
        var rows = parseLines(raw);
        if (!rows.length) {
          state.working = false;
          setLog(root, "Nenašiel sa validný vstup.");
          return;
        }
        var ok = 0;
        var bad = 0;
        for (var i = 0; i < rows.length; i++) {
          var res = addToCart(rows[i].code, rows[i].qty);
          if (res.ok) ok++;
          else bad++;
        }
        saveHistory(raw);
        renderHistory(root);
        setLog(root, "Pridané: " + ok + " | Chyby: " + bad + ".");
        state.working = false;
      }
    });
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        root.querySelector('[data-act="add"]').click();
      }
    });
  }

  function refreshPlacement() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var isDesktop = window.matchMedia && window.matchMedia("(min-width: 981px)").matches;
    root.classList.toggle("ee-desktop-inline", !!isDesktop);
  }

  function boot() {
    ensureStyle();
    if (!sync) return;
    sync
      .getContext()
      .then(function (ctx) {
        state.context = ctx;
        if (!ctx.loggedIn) return;
        ensureRoot();
        syncFloatingVisibility();
        refreshPlacement();
      })
      .catch(function () {});
  }

  boot();
  window.addEventListener("resize", function () {
    if (core && typeof core.scheduleOnce === "function") core.scheduleOnce("ee-skuqa-resize", refreshPlacement, 120);
    else setTimeout(refreshPlacement, 120);
  });
  document.addEventListener("ee-floating-changed", syncFloatingVisibility);
})();
