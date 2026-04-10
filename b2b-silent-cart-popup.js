/**
 * Elektroenergy.sk — B2B: potlačenie popupu „Produkt bol pridaný do košíka!“ (Colorbox advanced order).
 *
 * 1) addToCart / updateQuantityInCart — doplnenie silent: true (Shoptet API).
 * 2) Opätovné obalenie, ak Shoptet po načítaní prepíše funkcie na cartShared (nie len prvý patch).
 * 3) Záloha: ak sa modal aj tak otvorí, okamžite ho zatvoriť (B2B).
 *
 * Načítajte PRED productarrows.js a ostatnými skriptami, ktoré volajú košík.
 *
 * @see https://developers.shoptet.com/home/shoptet-tools/editing-templates/how-to-properly-add-product-to-cart-with-javascript/
 */
(function () {
  "use strict";

  var WRAP_MARK = "__eeB2bSilentWrap";
  var SESSION_KEY = "ee_b2b_session";
  var pollAttempts = 0;
  var maxPolls = 120;
  var closeDebounce = null;

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

  /** Po jednom rozpoznaní B2B v session zapamätáme (popup môže prísť skôr než groupId v dataLayer). */
  function shouldTreatAsB2BForUi() {
    if (isB2B()) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch (e) {}
      return true;
    }
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (e2) {
      return false;
    }
  }

  function withSilent(opts) {
    if (!isB2B()) return opts;
    if (opts == null || typeof opts !== "object" || Object.prototype.toString.call(opts) !== "[object Object]") return opts;
    if (opts.silent === false) return opts;
    var o = {};
    var k;
    for (k in opts) {
      if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
    }
    o.silent = true;
    return o;
  }

  /** Obalí funkcie znova, ak Shoptet prepísal referenciu (bez flagu na cartShared). */
  function patchCartShared(cs) {
    if (!cs) return false;
    var touched = false;

    if (typeof cs.addToCart === "function" && !cs.addToCart[WRAP_MARK]) {
      var origAdd = cs.addToCart.bind(cs);
      var wrappedAdd = function (opts) {
        return origAdd(withSilent(opts));
      };
      wrappedAdd[WRAP_MARK] = true;
      cs.addToCart = wrappedAdd;
      touched = true;
    }

    if (typeof cs.updateQuantityInCart === "function" && !cs.updateQuantityInCart[WRAP_MARK]) {
      var origUpd = cs.updateQuantityInCart.bind(cs);
      var wrappedUpd = function (opts) {
        return origUpd(withSilent(opts));
      };
      wrappedUpd[WRAP_MARK] = true;
      cs.updateQuantityInCart = wrappedUpd;
      touched = true;
    }

    return touched;
  }

  function tryPatch() {
    var sh = window.shoptet;
    if (!sh || !sh.cartShared) return false;
    patchCartShared(sh.cartShared);
    return true;
  }

  function schedulePoll() {
    var id = setInterval(function () {
      pollAttempts++;
      tryPatch();
      if (pollAttempts >= maxPolls) clearInterval(id);
    }, 200);
  }

  function closeAdvancedOrderIfOpen() {
    if (!shouldTreatAsB2BForUi()) return;

    var box = document.getElementById("colorbox");
    if (!box) return;

    var st = window.getComputedStyle(box);
    if (st.display === "none" || st.visibility === "hidden") return;

    var isOrderPopup =
      box.classList.contains("colorbox--order") ||
      !!box.querySelector('[data-testid="popupAdvancedOrder"]') ||
      !!box.querySelector(".advanced-order");

    if (!isOrderPopup) return;

    if (window.jQuery && window.jQuery.colorbox) {
      try {
        window.jQuery.colorbox.close();
      } catch (e0) {}
    }

    var btn = box.querySelector("#cboxClose, .cboxClose--order, button.cboxClose");
    if (btn) {
      try {
        btn.click();
      } catch (e1) {}
    }

    var ov = document.getElementById("cboxOverlay");
    if (ov) {
      try {
        ov.style.display = "none";
      } catch (e2) {}
    }
  }

  function scheduleCloseCheck() {
    clearTimeout(closeDebounce);
    closeDebounce = setTimeout(closeAdvancedOrderIfOpen, 0);
  }

  function bootObserver() {
    if (document.documentElement.dataset.eeB2bCartMo === "1") return;
    document.documentElement.dataset.eeB2bCartMo = "1";

    var mo = new MutationObserver(scheduleCloseCheck);
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  function boot() {
    tryPatch();
    schedulePoll();
    bootObserver();
    scheduleCloseCheck();
  }

  boot();

  document.addEventListener("ShoptetDOMPageContentLoaded", function () {
    tryPatch();
    scheduleCloseCheck();
  });

  document.addEventListener("ShoptetDataLayerUpdated", function () {
    tryPatch();
  });

  window.addEventListener("load", function () {
    tryPatch();
    scheduleCloseCheck();
  });
})();
