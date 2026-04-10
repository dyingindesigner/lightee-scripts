/**
 * Listing: množstvo +/− pri „Do košíka“ (B2B). Zdroj: lightee-scripts/productarrows.js
 * v1.5 — jeden „commit“ do košíka (add / update / remove); +/- funguje aj bez položky v košíku;
 *         vstup + Enter / blur zapíše množstvo; sync z dataLayer neprepisuje pole počas úpravy.
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

  function resolveItemId(priceId) {
    var ag = cartAggregateForPriceId(priceId);
    if (ag && ag.itemId) return ag.itemId;
    var dom = findCartLineContext(priceId);
    return dom && dom.itemId ? dom.itemId : null;
  }

  function resolveCartRow(priceId) {
    var dom = findCartLineContext(priceId);
    var ag = cartAggregateForPriceId(priceId);
    var itemId = (ag && ag.itemId) || (dom && dom.itemId) || null;
    var qty = null;
    if (ag && ag.quantity > 0) qty = ag.quantity;
    else if (dom && dom.amountInput && !dom.amountInput.closest(".ee-qty-wrap")) {
      var raw = dom.amountInput.value;
      var pv = parseFloat(String(raw).replace(",", "."));
      if (isFinite(pv) && pv > 0) qty = pv;
    }
    return {
      itemId: itemId,
      quantity: qty,
      inCart: !!(ag && ag.quantity > 0),
    };
  }

  function forEachPriceIdInputInCartRoots(cb) {
    var roots = document.querySelectorAll(
      "#cart-widget," +
        "#navigationCart," +
        ".navigation-cart," +
        ".header-cart," +
        ".responsive-cart," +
        ".cart-popup," +
        ".cart-table," +
        "table.cart-table," +
        "form.cart," +
        ".advanced-order," +
        '[data-testid="cartWidget"],' +
        '[data-testid="cartWidgetProduct"]'
    );
    var ri,
      r,
      list,
      j,
      inp;
    for (ri = 0; ri < roots.length; ri++) {
      r = roots[ri];
      if (!r || !r.querySelectorAll) continue;
      list = r.querySelectorAll('input[name="priceId"]');
      for (j = 0; j < list.length; j++) {
        inp = list[j];
        if (inp && !inp.closest(".ee-qty-wrap")) cb(inp);
      }
    }
  }

  function findCartLineContext(priceId) {
    var w = String(priceId);
    var found = null;
    forEachPriceIdInputInCartRoots(function (inp) {
      if (found || String(inp.value) !== w) return;
      var row = inp.closest(
        'tr, li, .cart-widget-product, [data-micro="cartItem"], [data-testid="cartWidgetProduct"], .removeable, .cart-popup-product'
      );
      if (!row) row = inp.closest("form") || inp.parentElement;
      if (!row) return;
      var itemEl = row.querySelector('input[name="itemId"], input[name="itemGuid"]');
      var amtEl = row.querySelector('input.amount, input[name="amount"][type="number"], input[name="quantity"]');
      if (amtEl && amtEl.closest(".ee-qty-wrap")) amtEl = null;
      if (itemEl && itemEl.value) found = { itemId: itemEl.value, amountInput: amtEl };
    });
    return found;
  }

  function qtyWrapFromInner(el) {
    return el && el.closest ? el.closest(".ee-qty-wrap") : null;
  }

  function isWrapQtyEditing(wrap) {
    if (!wrap) return false;
    if (wrap.getAttribute("data-ee-qty-editing") === "1") return true;
    var inp = wrap.querySelector(".ee-qty-inline input.amount");
    return inp && document.activeElement === inp;
  }

  function cfgFromQtyHost(qtyHost) {
    var input = qtyHost.querySelector("input.amount");
    if (!input) return { min: 1, step: 1, max: 9999 };
    var cfg = parseDetailAmountInput(input);
    var pm = input.getAttribute("data-ee-product-min");
    if (pm != null && String(pm).replace(/\s/g, "") !== "") cfg.min = num(pm, 1);
    return cfg;
  }

  /**
   * Zapíše cieľové množstvo do košíka: 0 / prázdne = odstrániť riadok, inak add alebo update.
   */
  function commitTargetQtyToCart(priceId, qtyHost, cfg, rawVal) {
    var cs = window.shoptet && shoptet.cartShared;
    if (!cs || !isB2B()) return;

    var parsed = parseFloat(String(rawVal != null ? rawVal : "").replace(",", "."));
    var ag = cartAggregateForPriceId(priceId);
    var cartQty = ag && ag.quantity > 0 ? ag.quantity : 0;
    var itemId = resolveItemId(priceId);
    var min = num(cfg.min, 1);

    if (!isFinite(parsed) || parsed <= 0) {
      if (cartQty > 0 && itemId && typeof cs.removeFromCart === "function") {
        cs.removeFromCart({ itemId: itemId });
      }
      setQty(qtyHost, min, cfg);
      scheduleCartSync();
      return;
    }

    var target = normalizeQty(parsed, cfg);

    if (cartQty > 0 && itemId && typeof cs.updateQuantityInCart === "function") {
      cs.updateQuantityInCart({ itemId: itemId, priceId: priceId, amount: target });
    } else if (typeof cs.addToCart === "function") {
      try {
        cs.addToCart({ priceId: priceId, amount: target, silent: true });
      } catch (e2) {
        cs.addToCart({ priceId: priceId, amount: target });
      }
    }

    setQty(qtyHost, target, cfg);
    scheduleCartSync();
  }

  function syncWrapFromCart(wrap) {
    if (!wrap || !isB2B()) return;
    if (isWrapQtyEditing(wrap)) return;
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
    syncTimer = setTimeout(syncAllWrapsFromCart, 200);
  }

  /** +/- podľa skutočného stavu košíka (prvé + pridá min, ďalšie +/- idú po kroku). */
  function applyStepDelta(priceId, qtyHost, cfg, delta) {
    var ag = cartAggregateForPriceId(priceId);
    var cartQty = ag && ag.quantity > 0 ? ag.quantity : 0;
    var step = stepPositive(cfg);
    var min = num(cfg.min, 1);
    var next;

    if (delta > 0) {
      next = cartQty <= 0 ? min : cartQty + step;
    } else {
      if (cartQty <= 0) return;
      next = cartQty - step;
    }

    commitTargetQtyToCart(priceId, qtyHost, cfg, next);
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
      '" min="0" step="' +
      step +
      '" max="' +
      max +
      '" data-min="' +
      min +
      '" data-ee-product-min="' +
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
    var wrap = qtyWrapFromInner(box);

    function stop(e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }

    if (wrap) {
      wrap.addEventListener(
        "focusin",
        function (e) {
          if (e.target && e.target.classList && e.target.classList.contains("amount")) wrap.setAttribute("data-ee-qty-editing", "1");
        },
        true
      );
      wrap.addEventListener(
        "focusout",
        function () {
          setTimeout(function () {
            if (!wrap.contains(document.activeElement)) wrap.removeAttribute("data-ee-qty-editing");
          }, 0);
        },
        true
      );
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
      function commitFromInput() {
        if (!isB2B()) return;
        if (wrap) wrap.removeAttribute("data-ee-qty-editing");
        commitTargetQtyToCart(priceId, box, cfg, input.value);
      }
      input.addEventListener("keydown", function (e) {
        if (!isB2B()) return;
        if (e.key === "Enter") {
          e.preventDefault();
          input.dataset.eeSkipBlurCommit = "1";
          commitFromInput();
        }
      });
      input.addEventListener("blur", function () {
        if (!isB2B()) return;
        if (input.dataset.eeSkipBlurCommit === "1") {
          delete input.dataset.eeSkipBlurCommit;
          return;
        }
        commitFromInput();
      });
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

        if (!qtyHost) return;
        var input = qtyHost.querySelector("input.amount");
        var amountRaw = input ? input.value : qtyHost.dataset.qty;
        commitTargetQtyToCart(pid, qtyHost, cfgCurrent, amountRaw);
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

  function bindCartHoverSync() {
    if (document.documentElement.dataset.eeQtyCartHover === "1") return;
    document.documentElement.dataset.eeQtyCartHover = "1";
    document.addEventListener(
      "pointerover",
      function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (
          t.closest('a[href*="kosik"]') ||
          t.closest('a[href*="/kosik/"]') ||
          t.closest("#cart-widget") ||
          t.closest(".header-cart") ||
          t.closest(".responsive-cart")
        )
          scheduleCartSync();
      },
      true
    );
  }

  function boot() {
    init();
    bindCartHoverSync();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("ShoptetDOMPageContentLoaded", schedule);
    document.addEventListener("ShoptetDOMSearchResultsLoaded", schedule);
    document.addEventListener("ShoptetDataLayerUpdated", scheduleCartSync);
    document.addEventListener("ShoptetDOMCartLoaded", scheduleCartSync);
    document.addEventListener("ShoptetCartUpdated", scheduleCartSync);
    window.addEventListener("load", schedule);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
