/**
 * Listing: množstvo +/− pri „Do košíka“ (B2B). Zdroj: lightee-scripts/productarrows.js
 * v1.1 — step už nie je odvodený z min (oprava +2 pri min>1); predvolený krok 1 ako pri HTML input type=number.
 * v1.2 — zobrazenie množstva z košíka; +/- pri položke v košíku volá updateQuantityInCart; sync po ShoptetDataLayerUpdated.
 * v1.3 — sync množstva aj z getShoptetDataLayer('cart') / dataLayer (mini košík často nemá priceId v DOM).
 */
(function () {
  var cache = {},
    timer,
    syncTimer;

  function num(v, d) {
    v = parseFloat((v + "").replace(",", "."));
    return isFinite(v) && v > 0 ? v : d || 1;
  }

  function stepPositive(cfg) {
    var s = num(cfg.step, NaN);
    return isFinite(s) && s > 0 ? s : 1;
  }

  function n(t) {
    return (t || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function getState() {
    var s = { groupId: null, loggedIn: false },
      srcs = [
        window.eeCustomer,
        window.customer,
        window.shoptet && window.shoptet.customer,
        window.shoptet && window.shoptet.config && window.shoptet.config.customer,
        window.Shoptet && window.Shoptet.customer,
      ],
      i,
      o,
      v;

    for (i = 0; i < srcs.length; i++) {
      o = srcs[i];
      if (!o || typeof o !== "object") continue;
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
          o.page && o.page.customer,
        ];
        for (var j = 0; j < list.length; j++) {
          var c = list[j];
          if (!c || typeof c !== "object") continue;
          v = Number(c.groupId);
          if (!isNaN(v)) s.groupId = v;
          if (c.registered === true || c.mainAccount === true) s.loggedIn = true;
        }
      }
    }

    if (!s.loggedIn) {
      var acc = Array.from(document.querySelectorAll("a,button")).some(function (el) {
        var t = n(el.textContent);
        return t === "M\u00f4j \u00fa\u010det" || t.indexOf("M\u00f4j \u00fa\u010det") !== -1;
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
    return btn.closest(".product,.p,.product-box,li,[data-micro-identifier]") || btn.parentElement;
  }

  function listingButton(btn) {
    if (!btn || btn.dataset.eeQtyReady === "1") return false;
    if (!/do ko[s\u0161]\u00edka/i.test(n(btn.textContent))) return false;
    if (
      btn.closest(
        "#cart-widget,.cart-widget,.cart-table,.order-summary-top,#checkoutSidebar,.p-detail-inner,.product-detail,.type-detail,.extras-col"
      )
    )
      return false;
    return !!card(btn);
  }

  function linkOf(btn) {
    var c = card(btn);
    var a = c && c.querySelector("a[href]:not(.btn)");
    return a && a.href ? a.href : "";
  }

  function priceIdOf(btn) {
    var c = card(btn);
    var i = c && c.querySelector('input[name="priceId"]');
    return i && i.value ? parseInt(i.value, 10) : null;
  }

  function normalizeQty(val, cfg) {
    var min = num(cfg.min, 1),
      step = stepPositive(cfg),
      max = num(cfg.max, 9999);
    val = num(val, min);
    if (val < min) val = min;
    val = min + Math.round((val - min) / step) * step;
    if (val > max) val = max;
    return val;
  }

  function decimals(v) {
    var s = String(v);
    return s.indexOf(".") === -1 ? 0 : s.length - s.indexOf(".") - 1;
  }

  function formatVal(v, cfg) {
    var d = Math.max(decimals(cfg.min), decimals(stepPositive(cfg)));
    return d ? v.toFixed(d).replace(".", ",") : String(Math.round(v));
  }

  function setQty(box, val, cfg) {
    val = normalizeQty(val, cfg);
    box.dataset.qty = String(val);
    var input = box.querySelector("input.amount");
    if (input) input.value = formatVal(val, cfg);
  }

  /** Pole položiek košíka z oficiálneho dataLayer (obsahuje priceId, quantity, itemId). */
  function getShoptetCartArray() {
    if (typeof getShoptetDataLayer === "function") {
      try {
        var c = getShoptetDataLayer("cart");
        if (Array.isArray(c)) return c;
      } catch (e1) {}
    }
    if (Array.isArray(window.dataLayer)) {
      var i,
        entry,
        sh,
        dl = dataLayer;
      for (i = dl.length - 1; i >= 0; i--) {
        entry = dl[i];
        if (!entry || typeof entry !== "object") continue;
        sh = entry.shoptet;
        if (sh && Array.isArray(sh.cart)) return sh.cart;
      }
    }
    return [];
  }

  /** Súčet množstva a itemId pre priceId (prvá neprázdna položka). */
  function cartAggregateForPriceId(priceId) {
    var want = Number(priceId);
    if (!isFinite(want)) return null;
    var cart = getShoptetCartArray();
    var sum = 0;
    var itemId = null;
    var i,
      it,
      pid;
    for (i = 0; i < cart.length; i++) {
      it = cart[i];
      if (!it || typeof it !== "object") continue;
      pid = Number(it.priceId);
      if (pid !== want) continue;
      sum += Number(it.quantity) || 0;
      if (!itemId && it.itemId != null && String(it.itemId) !== "") itemId = String(it.itemId);
    }
    if (sum <= 0) return null;
    return { quantity: sum, itemId: itemId };
  }

  /** DOM + dataLayer: itemId pre API, quantity pre zobrazenie. */
  function resolveCartRow(priceId) {
    var dom = findCartLineContext(priceId);
    var ag = cartAggregateForPriceId(priceId);
    var itemId = (dom && dom.itemId) || (ag && ag.itemId) || null;
    var qty = null;
    if (dom && dom.amountInput) {
      var raw = dom.amountInput.value;
      var pv = parseFloat(String(raw).replace(",", "."));
      if (isFinite(pv) && pv > 0) qty = pv;
    }
    if (qty == null && ag && ag.quantity > 0) qty = ag.quantity;
    return { itemId: itemId, quantity: qty };
  }

  /** Riadok košíka (mini košík / widget) s daným priceId — pre itemId a aktuálne množstvo. */
  function findCartLineContext(priceId) {
    var w = String(priceId);
    var candidates = document.querySelectorAll(
      '#cart-widget input[name="priceId"],' +
        '.cart-widget input[name="priceId"],' +
        '.cart-table input[name="priceId"],' +
        'form.cart input[name="priceId"],' +
        '[data-testid="cartWidgetProduct"] input[name="priceId"],' +
        '.advanced-order input[name="priceId"],' +
        'header input[name="priceId"],' +
        '.dropdown-menu input[name="priceId"],' +
        '.cart-popup input[name="priceId"],' +
        '[class*="cart-widget"] input[name="priceId"],' +
        '[class*="headerCart"] input[name="priceId"]'
    );
    var i,
      inp,
      row,
      itemEl,
      amtEl;
    for (i = 0; i < candidates.length; i++) {
      inp = candidates[i];
      if (!inp || String(inp.value) !== w) continue;
      row = inp.closest(
        'tr, li, .product, .cart-widget-product, [data-micro="cartItem"], [data-testid="cartWidgetProduct"], .removeable'
      );
      if (!row) row = inp.closest("form") || inp.parentElement;
      itemEl = row.querySelector('input[name="itemId"], input[name="itemGuid"]');
      amtEl = row.querySelector('input.amount, input[name="amount"][type="number"], input[name="quantity"]');
      if (itemEl && itemEl.value) return { itemId: itemEl.value, amountInput: amtEl };
    }
    return null;
  }

  function cfgFromQtyHost(qtyHost) {
    var input = qtyHost.querySelector("input.amount");
    if (!input) return { min: 1, step: 1, max: 9999 };
    return parseDetailAmountInput(input);
  }

  function syncWrapFromCart(wrap) {
    if (!wrap || !isB2B()) return;
    var pid = parseInt(wrap.getAttribute("data-ee-price-id"), 10);
    if (!isFinite(pid)) return;
    var qtyHost = wrap.querySelector(".ee-qty-inline");
    if (!qtyHost) return;
    var cfg = cfgFromQtyHost(qtyHost);
    var row = resolveCartRow(pid);
    var q = row.quantity != null && row.quantity > 0 ? row.quantity : cfg.min;
    setQty(qtyHost, q, cfg);
  }

  function syncAllWrapsFromCart() {
    if (!isB2B()) return;
    document.querySelectorAll(".ee-qty-wrap[data-ee-price-id]").forEach(syncWrapFromCart);
  }

  function scheduleCartSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncAllWrapsFromCart, 80);
  }

  function pushCartQty(priceId, qtyHost, cfg, nextVal) {
    nextVal = normalizeQty(nextVal, cfg);
    var row = resolveCartRow(priceId);
    var cs = window.shoptet && shoptet.cartShared;
    if (row.itemId && cs && typeof cs.updateQuantityInCart === "function") {
      cs.updateQuantityInCart({ itemId: row.itemId, priceId: priceId, amount: nextVal });
    }
    setQty(qtyHost, nextVal, cfg);
    scheduleCartSync();
  }

  function applyStepDelta(priceId, qtyHost, cfg, delta) {
    var cur = num(qtyHost.dataset.qty, cfg.min);
    var next = cur + delta;
    var row = resolveCartRow(priceId);
    if (row.itemId && window.shoptet && shoptet.cartShared && typeof shoptet.cartShared.updateQuantityInCart === "function") {
      pushCartQty(priceId, qtyHost, cfg, normalizeQty(next, cfg));
      return;
    }
    setQty(qtyHost, next, cfg);
  }

  function css() {
    if (document.getElementById("ee-list-qty-style")) return;
    var s = document.createElement("style");
    s.id = "ee-list-qty-style";
    s.textContent =
      ".ee-qty-wrap{display:flex;align-items:center;gap:8px;flex-wrap:wrap}" +
      ".ee-qty-wrap .quantity{margin:0}" +
      ".ee-qty-wrap .btn,.ee-qty-wrap .add-to-cart-button{margin:0}" +
      ".ee-qty-inline{display:inline-flex;align-items:center}" +
      ".ee-qty-inline .quantity{min-width:118px}";
    document.head.appendChild(s);
  }

  function buildQty(cfg) {
    var min = num(cfg.min, 1),
      step = stepPositive(cfg),
      max = num(cfg.max, 9999);
    var d = document.createElement("div");
    d.className = "ee-qty-inline";
    d.innerHTML =
      '<div class="quantity">' +
      '<button type="button" class="decrease" aria-label="Znížiť množstvo o ' +
      String(step).replace(".", ",") +
      '"><span>-</span></button>' +
      '<input type="number" name="amount" class="amount" value="' +
      formatVal(min, cfg) +
      '" min="' +
      min +
      '" step="' +
      step +
      '" max="' +
      max +
      '" data-min="' +
      min +
      '" inputmode="decimal">' +
      '<button type="button" class="increase" aria-label="Zvýšiť množstvo o ' +
      String(step).replace(".", ",") +
      '"><span>+</span></button>' +
      "</div>";
    return d;
  }

  function fallbackQtyHandlers(box, cfg, priceId) {
    var minus = box.querySelector(".decrease");
    var plus = box.querySelector(".increase");
    var input = box.querySelector("input.amount");
    var step = stepPositive(cfg);

    function stop(e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }

    if (minus)
      minus.addEventListener("click", function (e) {
        if (!isB2B()) return;
        stop(e);
        applyStepDelta(priceId, box, cfg, -step);
      });

    if (plus)
      plus.addEventListener("click", function (e) {
        if (!isB2B()) return;
        stop(e);
        applyStepDelta(priceId, box, cfg, step);
      });

    if (input) {
      function sync() {
        if (!isB2B()) return;
        var v = normalizeQty(input.value, cfg);
        var row = resolveCartRow(priceId);
        if (row.itemId && window.shoptet && shoptet.cartShared && typeof shoptet.cartShared.updateQuantityInCart === "function") {
          shoptet.cartShared.updateQuantityInCart({ itemId: row.itemId, priceId: priceId, amount: v });
        }
        setQty(box, v, cfg);
        scheduleCartSync();
      }
      input.addEventListener("change", sync);
      input.addEventListener("blur", sync);
    }
  }

  function parseDetailAmountInput(input) {
    if (!input) return { min: 1, step: 1, max: 9999 };
    var min = num(input.getAttribute("min") || input.value, 1);
    var stepAttr = input.getAttribute("step");
    var step =
      stepAttr != null && String(stepAttr).replace(/\s/g, "") !== ""
        ? num(stepAttr, 1)
        : 1;
    var maxAttr = input.getAttribute("max");
    var max = maxAttr != null && String(maxAttr).replace(/\s/g, "") !== "" ? num(maxAttr, 9999) : 9999;
    return { min: min, step: step, max: max };
  }

  function fetchCfg(url) {
    if (!url) return Promise.resolve({ min: 1, step: 1, max: 9999 });
    if (cache[url]) return cache[url];

    cache[url] = fetch(url, { credentials: "same-origin" })
      .then(function (r) {
        return r.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var input = doc.querySelector(
          "#product-detail-form input.amount,#product-detail input.amount,input.amount[name=\"amount\"]"
        );
        return parseDetailAmountInput(input);
      })
      .catch(function () {
        return { min: 1, step: 1, max: 9999 };
      });

    return cache[url];
  }

  function mount(btn) {
    var pid = priceIdOf(btn);
    if (!pid || !window.shoptet || !shoptet.cartShared || typeof shoptet.cartShared.addToCart !== "function") return;

    var c = card(btn);
    if (!c) return;

    var wrap = document.createElement("div");
    wrap.className = "ee-qty-wrap";
    wrap.setAttribute("data-ee-price-id", String(pid));

    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);

    var qtyHost = null;
    var cfgCurrent = { min: 1, step: 1, max: 9999 };

    fetchCfg(linkOf(btn)).then(function (cfg) {
      cfgCurrent = cfg;
      qtyHost = buildQty(cfg);
      wrap.insertBefore(qtyHost, btn);
      fallbackQtyHandlers(qtyHost, cfg, pid);
      syncWrapFromCart(wrap);

      if (typeof window.run_multiply === "function") {
        try {
          window.run_multiply();
        } catch (e) {}
      }
    });

    btn.addEventListener(
      "click",
      function (e) {
        if (!isB2B()) return;

        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();

        var amount = cfgCurrent.min;
        if (qtyHost) {
          var input = qtyHost.querySelector("input.amount");
          amount = normalizeQty(input ? input.value : qtyHost.dataset.qty, cfgCurrent);
          setQty(qtyHost, amount, cfgCurrent);
        }

        var row = resolveCartRow(pid);
        var cs = shoptet.cartShared;
        if (row.itemId && typeof cs.updateQuantityInCart === "function") {
          cs.updateQuantityInCart({ itemId: row.itemId, priceId: pid, amount: amount });
        } else {
          cs.addToCart({ priceId: pid, amount: amount });
        }
        scheduleCartSync();
      },
      true
    );

    btn.dataset.eeQtyReady = "1";
  }

  function init() {
    if (!isB2B()) return;
    css();
    document.querySelectorAll("button,a.btn").forEach(function (btn) {
      if (listingButton(btn)) mount(btn);
    });
    scheduleCartSync();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(init, 120);
  }

  function boot() {
    init();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("ShoptetDOMPageContentLoaded", schedule);
    document.addEventListener("ShoptetDOMSearchResultsLoaded", schedule);
    document.addEventListener("ShoptetDataLayerUpdated", scheduleCartSync);
    window.addEventListener("load", schedule);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
