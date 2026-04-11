/**
 * Elektroenergy.sk — badge pri „Do košíka“ na listingoch: koľko ks danej ceny (priceId) je už v košíku.
 * Nie je to súčet všetkých položiek v košíku (ten má téma v hlavičke); ide o per-produkt indikátor.
 *
 * Založené na lightee-scripts/badgescript.js; upravené podľa productarrows.js:
 * - posledný záznam shoptet.cart v dataLayer (nie dataLayer.find — ten môže byť zastaralý)
 * - agregácia quantity pri viacerých riadkoch rovnakého priceId
 * - Shoptet udalosti: ShoptetCartUpdated, ShoptetDataLayerUpdated, … (nie len shoptet.cart.updated)
 */
(function () {
  var BADGE_CLASS = "ee-cart-badge";
  var BADGE_CONTAINER_ID = "ee-cart-badge-overlay";
  var timer = null;

  function schedule(fn, ms) {
    clearTimeout(timer);
    timer = setTimeout(fn, ms || 80);
  }

  function getContainer() {
    var c = document.getElementById(BADGE_CONTAINER_ID);
    if (!c) {
      c = document.createElement("div");
      c.id = BADGE_CONTAINER_ID;
      c.setAttribute("aria-hidden", "true");
      c.style.position = "absolute";
      c.style.top = "0";
      c.style.left = "0";
      c.style.width = "100%";
      c.style.pointerEvents = "none";
      c.style.zIndex = "99999";
      document.body.appendChild(c);
    }
    return c;
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

  function quantityForPriceId(priceId) {
    var want = Number(priceId);
    if (!isFinite(want)) return 0;
    var cart = getShoptetCartArray();
    var sum = 0;
    var i,
      it,
      pid;
    for (i = 0; i < cart.length; i++) {
      it = cart[i];
      if (!it || typeof it !== "object") continue;
      pid = Number(it.priceId);
      if (pid !== want) continue;
      sum += Number(it.quantity) || 0;
    }
    return sum;
  }

  function renderBadges() {
    var container = getContainer();
    container.innerHTML = "";

    var products = document.querySelectorAll("button.add-to-cart-button");
    var i,
      btn,
      form,
      priceIdEl,
      priceId,
      qty,
      rect,
      badge;

    for (i = 0; i < products.length; i++) {
      btn = products[i];
      form = btn.closest("form");
      if (!form) continue;
      priceIdEl = form.querySelector("input[name='priceId']");
      if (!priceIdEl || !priceIdEl.value) continue;
      priceId = priceIdEl.value;
      qty = quantityForPriceId(priceId);
      if (qty <= 0) continue;

      rect = btn.getBoundingClientRect();
      badge = document.createElement("div");
      badge.className = BADGE_CLASS;
      badge.textContent = qty > 99 ? "99+" : String(Math.round(qty));
      badge.title = qty + " ks v ko\u0161\u00edku";
      badge.style.position = "absolute";
      badge.style.top = rect.top + window.scrollY - 8 + "px";
      badge.style.left = rect.left + window.scrollX + rect.width - 12 + "px";
      badge.style.minWidth = "1.25rem";
      badge.style.height = "1.25rem";
      badge.style.lineHeight = "1.25rem";
      badge.style.padding = "0 4px";
      badge.style.borderRadius = "999px";
      badge.style.background = "#c41e3a";
      badge.style.color = "#fff";
      badge.style.fontSize = "11px";
      badge.style.fontWeight = "700";
      badge.style.textAlign = "center";
      badge.style.boxShadow = "0 1px 2px rgba(0,0,0,.2)";
      container.appendChild(badge);
    }
  }

  function boot() {
    renderBadges();
    schedule(renderBadges, 0);
  }

  function init() {
    boot();
    [
      "ShoptetCartUpdated",
      "ShoptetDataLayerUpdated",
      "ShoptetDOMCartLoaded",
      "ShoptetDOMPageContentLoaded",
      "ShoptetDOMSearchResultsLoaded",
      "shoptet.cart.updated",
    ].forEach(function (name) {
      document.addEventListener(name, function () {
        schedule(renderBadges, 60);
      });
    });
    window.addEventListener(
      "scroll",
      function () {
        schedule(renderBadges, 40);
      },
      { passive: true }
    );
    window.addEventListener("resize", function () {
      schedule(renderBadges, 60);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
