/**
 * Elektroenergy.sk — badge pri „Do košíka“ na listingoch: koľko ks danej ceny (priceId) je už v košíku.
 * Badge je v DOM priamo na tlačidle (nie globálny overlay), aby ostal nalepený pri skrolovaní / karuseli / transformoch.
 *
 * B2C: často add-to-cart-button; B2B: btn btn-cart + data-testid (productarrows).
 */
(function () {
  var BADGE_CLASS = "ee-cart-badge";
  var HOST_CLASS = "ee-cart-badge-host";
  var STYLE_ID = "ee-cart-badge-styles";
  var timer = null;

  function schedule(fn, ms) {
    clearTimeout(timer);
    timer = setTimeout(fn, ms || 80);
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      "button." +
      HOST_CLASS +
      "{position:relative!important;overflow:visible!important;z-index:2}" +
      "button." +
      HOST_CLASS +
      " ." +
      BADGE_CLASS +
      "{position:absolute;top:0;right:0;box-sizing:border-box;min-width:1.125rem;height:1.125rem;padding:0 .28rem;margin:0;" +
      "line-height:1.125rem;border-radius:999px;background:#d92d20;color:#fff;" +
      "font:700 11px/1.125rem system-ui,-apple-system,sans-serif;text-align:center;white-space:nowrap;" +
      "border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.25);" +
      "transform:translate(30%,-35%);pointer-events:none}" +
      "button." +
      HOST_CLASS +
      " ." +
      BADGE_CLASS +
      ".ee-cart-badge--wide{min-width:1.375rem;height:1.25rem;line-height:1.25rem;padding:0 5px;font-size:10px}";
    (document.head || document.documentElement).appendChild(s);
  }

  function clearBadges() {
    document.querySelectorAll("." + BADGE_CLASS).forEach(function (el) {
      el.remove();
    });
    document.querySelectorAll("button." + HOST_CLASS).forEach(function (btn) {
      btn.classList.remove(HOST_CLASS);
    });
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

  function isListingAddToCartButton(btn) {
    if (!btn) return false;
    if (btn.getAttribute("data-testid") !== "buttonAddToCart" && !btn.classList.contains("add-to-cart-button")) return false;
    if (!btn.closest(".product")) return false;
    if (
      btn.closest(
        "#cart-widget,.cart-widget,.cart-table,.order-summary-top,#checkoutSidebar,.p-detail-inner,.product-detail,.type-detail,.extras-col"
      )
    )
      return false;
    return true;
  }

  function renderBadges() {
    ensureStyles();
    clearBadges();

    var products = document.querySelectorAll(
      '.product button[data-testid="buttonAddToCart"], .product button.add-to-cart-button'
    );
    var i,
      btn,
      form,
      priceIdEl,
      priceId,
      qty,
      badge,
      label;

    for (i = 0; i < products.length; i++) {
      btn = products[i];
      if (!isListingAddToCartButton(btn)) continue;
      form = btn.closest("form");
      if (!form) continue;
      priceIdEl = form.querySelector("input[name='priceId']");
      if (!priceIdEl || !priceIdEl.value) continue;
      priceId = priceIdEl.value;
      qty = quantityForPriceId(priceId);
      if (qty <= 0) continue;

      btn.classList.add(HOST_CLASS);
      badge = document.createElement("span");
      badge.className = BADGE_CLASS;
      badge.setAttribute("aria-hidden", "true");
      label = qty > 99 ? "99+" : String(Math.round(qty));
      badge.textContent = label;
      badge.title = qty + " ks v ko\u0161\u00edku";
      if (label.length > 2) badge.classList.add("ee-cart-badge--wide");
      btn.appendChild(badge);
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
    window.addEventListener("resize", function () {
      schedule(renderBadges, 120);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
