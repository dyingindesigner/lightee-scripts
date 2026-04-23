/**
 * EE saved shopping lists (logged-in users, mobile-first).
 * Separate script with local-first + optional Supabase sync.
 */
(function () {
  "use strict";

  if (window.__EE_SAVED_LISTS_BOOTED__) return;
  window.__EE_SAVED_LISTS_BOOTED__ = true;

  var ROOT_ID = "ee-lists-root";
  var BTN_ID = "ee-lists-fab";
  var PANEL_ID = "ee-lists-panel";
  var STYLE_ID = "ee-lists-style";
  var LS_KEY_PREFIX = "ee_saved_lists_v1";
  var FLOAT_SOURCE = "lists";
  var sync = window.EE_FEATURES_SYNC || null;
  var core = window.EE_CORE || null;
  var state = {
    context: null,
    open: false,
    lists: [],
  };

  function n(v) {
    return String(v || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function uid() {
    return "list_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function lsKey() {
    var id = state.context && state.context.localKey ? state.context.localKey : "guest";
    return LS_KEY_PREFIX + "::" + location.hostname + "::" + id;
  }

  function loadLocal() {
    try {
      var data = JSON.parse(localStorage.getItem(lsKey()) || "[]");
      if (!Array.isArray(data)) return [];
      return data;
    } catch (_e) {
      return [];
    }
  }

  function saveLocal() {
    try {
      localStorage.setItem(lsKey(), JSON.stringify(state.lists));
    } catch (_e) {}
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      "\n#" +
      ROOT_ID +
      "{position:fixed;left:14px;bottom:168px;z-index:2147483641}" +
      "\n#" + ROOT_ID + ".ee-hidden{display:none}" +
      "\n#" +
      BTN_ID +
      "{height:38px;padding:0 12px;border-radius:999px;border:1px solid #cbd5e1;background:#0f766e;color:#fff;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:7px;cursor:pointer;box-shadow:0 8px 18px rgba(15,118,110,.24)}" +
      "\n#" +
      ROOT_ID +
      " .ee-overlay{position:fixed;inset:0;background:rgba(2,6,23,.42);opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:2147483644}" +
      "\n#" +
      ROOT_ID +
      ".open .ee-overlay{opacity:1;pointer-events:auto}" +
      "\n#" +
      PANEL_ID +
      "{position:fixed;left:0;right:0;bottom:0;max-height:min(80svh,680px);background:#fff;border-top-left-radius:14px;border-top-right-radius:14px;transform:translateY(104%);transition:transform .2s ease;border:1px solid #e2e8f0;z-index:2147483645;display:flex;flex-direction:column}" +
      "\n#" +
      ROOT_ID +
      ".open #" +
      PANEL_ID +
      "{transform:translateY(0)}" +
      "\n#" +
      ROOT_ID +
      " .ee-head{display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #e2e8f0}" +
      "\n#" +
      ROOT_ID +
      " .ee-title{font-size:16px;font-weight:700}" +
      "\n#" +
      ROOT_ID +
      " .ee-close{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:6px 10px;font-size:13px;cursor:pointer}" +
      "\n#" +
      ROOT_ID +
      " .ee-body{padding:10px;overflow:auto;display:grid;gap:10px}" +
      "\n#" +
      ROOT_ID +
      " .ee-card{border:1px solid #e2e8f0;border-radius:10px;padding:10px}" +
      "\n#" +
      ROOT_ID +
      " .ee-label{font-size:12px;color:#64748b;margin-bottom:4px}" +
      "\n#" +
      ROOT_ID +
      " input, #" +
      ROOT_ID +
      " textarea{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px}" +
      "\n#" +
      ROOT_ID +
      " textarea{min-height:84px;resize:vertical}" +
      "\n#" +
      ROOT_ID +
      " .ee-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9}" +
      "\n#" +
      ROOT_ID +
      " .ee-row:last-child{border-bottom:none}" +
      "\n#" +
      ROOT_ID +
      " .ee-name{font-size:13px;font-weight:600}" +
      "\n#" +
      ROOT_ID +
      " .ee-meta{font-size:12px;color:#64748b;margin-top:2px}" +
      "\n#" +
      ROOT_ID +
      " .ee-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}" +
      "\n#" +
      ROOT_ID +
      " .ee-btn{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:6px 8px;font-size:12px;cursor:pointer}" +
      "\n#" +
      ROOT_ID +
      " .ee-btn.primary{background:#0f766e;color:#fff;border-color:#0f766e}" +
      "\n#" +
      ROOT_ID +
      " .ee-hint{font-size:12px;color:#64748b;line-height:1.35}" +
      "\n@media (min-width:981px){#" +
      ROOT_ID +
      "{bottom:212px}#" +
      PANEL_ID +
      "{left:auto;right:14px;bottom:210px;width:min(520px,calc(100vw - 24px));max-height:68vh;border-radius:14px;transform:translateY(12px) scale(.98);opacity:0;pointer-events:none}#" +
      ROOT_ID +
      ".open #" +
      PANEL_ID +
      "{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}}" +
      "\n@media (max-width:980px){#" +
      ROOT_ID +
      "{bottom:160px}#" +
      BTN_ID +
      "{height:36px;font-size:12px;padding:0 10px}}";
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function getCartItems() {
    var cart = core && typeof core.getCartArray === "function" ? core.getCartArray() : [];
    if (!Array.isArray(cart)) return [];
    var out = [];
    for (var i = 0; i < cart.length; i++) {
      var row = cart[i] || {};
      var code = n(row.code || row.productCode || row.productId || row.sku);
      if (!code) continue;
      var qty = Math.max(1, Number(row.amount || row.quantity || 1) || 1);
      out.push({
        product_code: code,
        quantity: qty,
        product_name: n(row.name || row.item_name || "Produkt " + code),
        product_url: n(row.url || ""),
        product_image: n(row.image || row.imageUrl || ""),
        updated_at: new Date().toISOString(),
      });
    }
    return out;
  }

  function addCodeToCart(code, qty) {
    var safeCode = n(code);
    var safeQty = Math.max(1, Number(qty || 1) || 1);
    if (!safeCode) return false;
    if (window.shoptet && window.shoptet.cartShared && typeof window.shoptet.cartShared.addToCart === "function") {
      try {
        window.shoptet.cartShared.addToCart({ productCode: safeCode, amount: safeQty }, true);
        return true;
      } catch (_e) {
        return false;
      }
    }
    return false;
  }

  function parseSkuInput(text) {
    var lines = String(text || "").split(/\r?\n/);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var line = n(lines[i]);
      if (!line) continue;
      var parts = line.split(/[;,]/);
      var code = n(parts[0] || "");
      if (!code) continue;
      var qty = Math.max(1, Number(n(parts[1] || "1")) || 1);
      out.push({
        product_code: code,
        quantity: qty,
        product_name: "Produkt " + code,
        product_url: "",
        product_image: "",
        updated_at: new Date().toISOString(),
      });
    }
    return out;
  }

  function mergeLists(localRows, remoteRows) {
    var byId = new Map();
    (localRows || []).forEach(function (r) {
      if (r && r.list_id) byId.set(r.list_id, r);
    });
    (remoteRows || []).forEach(function (r) {
      if (!r || !r.list_id) return;
      var prev = byId.get(r.list_id);
      if (!prev) byId.set(r.list_id, r);
      else {
        var p = Date.parse(prev.updated_at || 0) || 0;
        var c = Date.parse(r.updated_at || 0) || 0;
        byId.set(r.list_id, c >= p ? Object.assign({}, prev, r) : prev);
      }
    });
    return Array.from(byId.values());
  }

  function ensureRoot() {
    var root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML =
      '<button id="' +
      BTN_ID +
      '" type="button">📋 Zoznamy</button>' +
      '<div class="ee-overlay"></div>' +
      '<div id="' +
      PANEL_ID +
      '" role="dialog" aria-label="Uložené nákupné zoznamy">' +
      '<div class="ee-head"><div class="ee-title">Uložené nákupné zoznamy</div><button type="button" class="ee-close">Zavrieť</button></div>' +
      '<div class="ee-body">' +
      '<div class="ee-card"><div class="ee-label">Názov zoznamu</div><input data-role="name" placeholder="Napr. Mesačný odber">' +
      '<div class="ee-label" style="margin-top:8px">Položky (SKU,qty na riadok)</div><textarea data-role="items" placeholder="ZLS604C,5&#10;R.8145,2"></textarea>' +
      '<div class="ee-hint" style="margin-top:6px">Tip: môžeš načítať aktuálny košík jedným klikom a uložiť ho ako zoznam.</div>' +
      '<div class="ee-actions" style="margin-top:8px"><button class="ee-btn" data-act="load-cart">Načítať z košíka</button><button class="ee-btn primary" data-act="save-list">Uložiť zoznam</button></div></div>' +
      '<div class="ee-card"><div class="ee-label">Moje zoznamy</div><div data-role="list-rows"></div></div>' +
      "</div>" +
      "</div>";
    document.body.appendChild(root);

    var toggle = root.querySelector("#" + BTN_ID);
    function closePanel() {
      state.open = false;
      root.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      setFloatingOwner(false);
    }
    toggle.addEventListener("click", function () {
      state.open = !state.open;
      root.classList.toggle("open", state.open);
      toggle.setAttribute("aria-expanded", state.open ? "true" : "false");
      setFloatingOwner(state.open);
      if (state.open) renderListRows();
    });
    root.querySelector(".ee-overlay").addEventListener("click", closePanel);
    root.querySelector(".ee-close").addEventListener("click", closePanel);
    root.querySelector(".ee-body").addEventListener("click", function (e) {
      var btn = e.target && e.target.closest("button[data-act]");
      if (!btn) return;
      var act = btn.dataset.act;
      if (act === "load-cart") {
        var cartItems = getCartItems();
        var ta = root.querySelector('[data-role="items"]');
        ta.value = cartItems
          .map(function (it) {
            return it.product_code + "," + it.quantity;
          })
          .join("\n");
      } else if (act === "save-list") {
        persistFromForm();
      } else if (act === "use-list") {
        var id = btn.getAttribute("data-id");
        useList(id);
      } else if (act === "delete-list") {
        var delId = btn.getAttribute("data-id");
        deleteList(delId);
      } else if (act === "load-form") {
        var loadId = btn.getAttribute("data-id");
        loadListIntoForm(loadId);
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

  function renderListRows() {
    var wrap = document.querySelector("#" + ROOT_ID + ' [data-role="list-rows"]');
    if (!wrap) return;
    if (!state.lists.length) {
      wrap.innerHTML = '<div class="ee-hint">Zatiaľ nemáte uložené zoznamy.</div>';
      return;
    }
    wrap.innerHTML = state.lists
      .map(function (row) {
        var count = Array.isArray(row.items) ? row.items.length : 0;
        return (
          '<div class="ee-row">' +
          "<div>" +
          '<div class="ee-name">' +
          String(row.list_name || row.list_id) +
          "</div>" +
          '<div class="ee-meta">' +
          count +
          " položiek</div>" +
          "</div>" +
          '<div class="ee-actions">' +
          '<button class="ee-btn primary" data-act="use-list" data-id="' +
          row.list_id +
          '">Do košíka</button>' +
          '<button class="ee-btn" data-act="load-form" data-id="' +
          row.list_id +
          '">Upraviť</button>' +
          '<button class="ee-btn" data-act="delete-list" data-id="' +
          row.list_id +
          '">Odstrániť</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function loadListIntoForm(listId) {
    var row = state.lists.find(function (x) {
      return x.list_id === listId;
    });
    if (!row) return;
    var root = document.getElementById(ROOT_ID);
    root.querySelector('[data-role="name"]').value = row.list_name || "";
    root.querySelector('[data-role="name"]').dataset.editingListId = row.list_id;
    root.querySelector('[data-role="items"]').value = (row.items || [])
      .map(function (it) {
        return it.product_code + "," + it.quantity;
      })
      .join("\n");
  }

  function persistFromForm() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var nameInput = root.querySelector('[data-role="name"]');
    var itemsInput = root.querySelector('[data-role="items"]');
    var listName = n(nameInput.value);
    var items = parseSkuInput(itemsInput.value);
    if (!listName || !items.length) return;
    var listId = n(nameInput.dataset.editingListId) || uid();
    var existingIdx = state.lists.findIndex(function (x) {
      return x.list_id === listId;
    });
    var row = {
      list_id: listId,
      list_name: listName,
      items: items,
      updated_at: new Date().toISOString(),
    };
    if (existingIdx >= 0) state.lists[existingIdx] = row;
    else state.lists.unshift(row);
    saveLocal();
    renderListRows();
    nameInput.dataset.editingListId = "";
    if (sync && state.context && state.context.canSync) {
      sync.upsertSavedList(state.context.ownerHash, row, items).catch(function () {});
    }
  }

  function useList(listId) {
    var row = state.lists.find(function (x) {
      return x.list_id === listId;
    });
    if (!row || !Array.isArray(row.items)) return;
    for (var i = 0; i < row.items.length; i++) addCodeToCart(row.items[i].product_code, row.items[i].quantity);
    if (sync && state.context && state.context.canSync) {
      sync.touchListLastUsed(state.context.ownerHash, listId).catch(function () {});
    }
  }

  function deleteList(listId) {
    state.lists = state.lists.filter(function (x) {
      return x.list_id !== listId;
    });
    saveLocal();
    renderListRows();
    if (sync && state.context && state.context.canSync) {
      sync.deleteSavedList(state.context.ownerHash, listId).catch(function () {});
    }
  }

  function syncFromRemote() {
    if (!sync || !state.context || !state.context.canSync) return Promise.resolve();
    return sync
      .listSavedLists(state.context.ownerHash)
      .then(function (remoteLists) {
        if (!Array.isArray(remoteLists) || !remoteLists.length) return;
        var jobs = remoteLists.map(function (row) {
          return sync
            .listSavedListItems(state.context.ownerHash, row.list_id)
            .then(function (items) {
              return Object.assign({}, row, { items: Array.isArray(items) ? items : [] });
            })
            .catch(function () {
              return Object.assign({}, row, { items: [] });
            });
        });
        return Promise.all(jobs).then(function (rows) {
          state.lists = mergeLists(state.lists, rows);
          saveLocal();
          renderListRows();
        });
      })
      .catch(function () {});
  }

  function boot() {
    ensureStyle();
    if (!sync) return;
    sync
      .getContext()
      .then(function (ctx) {
        state.context = ctx;
        if (!ctx.loggedIn) return;
        state.lists = loadLocal();
        ensureRoot();
        syncFloatingVisibility();
        renderListRows();
        syncFromRemote();
      })
      .catch(function () {});
  }

  boot();
  document.addEventListener("ee-floating-changed", syncFloatingVisibility);
})();
