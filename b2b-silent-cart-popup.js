/**
 * Elektroenergy.sk — B2B: potlačenie Colorbox popupu „Produkt bol pridaný do košíka!“
 * cez Shoptet API parameter silent pri addToCart / updateQuantityInCart.
 *
 * Načítajte PRED ostatnými vlastnými skriptami (productarrows.js, …), aby sa patchol cartShared
 * skôr, než sa zavolá prvé pridanie do košíka.
 *
 * @see https://developers.shoptet.com/home/shoptet-tools/editing-templates/how-to-properly-add-product-to-cart-with-javascript/
 */
(function () {
  "use strict";

  var PATCH_FLAG = "__eeB2bSilentCartPopup";
  var pollAttempts = 0;
  var maxPolls = 80;

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

  function patchCartShared(cs) {
    if (!cs || cs[PATCH_FLAG]) return true;
    if (typeof cs.addToCart !== "function" && typeof cs.updateQuantityInCart !== "function") return false;

    if (typeof cs.addToCart === "function") {
      var origAdd = cs.addToCart.bind(cs);
      cs.addToCart = function (opts) {
        return origAdd(withSilent(opts));
      };
    }

    if (typeof cs.updateQuantityInCart === "function") {
      var origUpd = cs.updateQuantityInCart.bind(cs);
      cs.updateQuantityInCart = function (opts) {
        return origUpd(withSilent(opts));
      };
    }

    cs[PATCH_FLAG] = true;
    return true;
  }

  function tryPatch() {
    var sh = window.shoptet;
    if (sh && sh.cartShared) return patchCartShared(sh.cartShared);
    return false;
  }

  function schedulePoll() {
    if (tryPatch()) return;
    var id = setInterval(function () {
      pollAttempts++;
      if (tryPatch() || pollAttempts >= maxPolls) clearInterval(id);
    }, 250);
  }

  function boot() {
    if (tryPatch()) return;
    schedulePoll();
  }

  boot();

  document.addEventListener("ShoptetDOMPageContentLoaded", function () {
    var sh = window.shoptet;
    if (sh && sh.cartShared && !sh.cartShared[PATCH_FLAG]) patchCartShared(sh.cartShared);
  });

  window.addEventListener("load", function () {
    var sh = window.shoptet;
    if (sh && sh.cartShared && !sh.cartShared[PATCH_FLAG]) patchCartShared(sh.cartShared);
  });
})();
