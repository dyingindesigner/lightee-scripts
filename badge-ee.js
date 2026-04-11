/**
 * Elektroenergy.sk — badge pri „Do košíka“: koľko ks danej ceny (priceId) je už v košíku.
 * Listing (.product), B2B karty, aj detail produktu ([data-testid="divAddToCart"]).
 * Badge je v DOM na tlačidle (scroll / karusel / transform).
 *
 * B2C: add-to-cart-button; B2B listing: btn btn-cart + data-testid; PDP: add-to-cart-button v .add-to-cart.
 */
(function () {
  var BADGE_CLASS = "ee-cart-badge";
  var HOST_CLASS = "ee-cart-badge-host";
  /** px namiesto rem — na Shoptet môže html/font-size zmeniť rem a badge vyzerá miniatúrne. */
  var STYLE_ID = "ee-cart-badge-styles-v3";
  var timer = null;

  function schedule(fn, ms) {
    clearTimeout(timer);
    timer = setTimeout(fn, ms || 80);
  }

  function ensureStyles() {
    var legacy = document.getElementById("ee-cart-badge-styles");
    if (legacy) legacy.remove();
    legacy = document.getElementById("ee-cart-badge-styles-v2");
    if (legacy) legacy.remove();
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
      "{position:absolute;top:0;right:0;box-sizing:border-box;display:flex;align-items:center;justify-content:center;" +
      "min-width:28px;height:28px;padding:0 8px;margin:0;border-radius:999px;background:#d92d20;color:#fff;" +
      "font:700 15px system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1;text-align:center;white-space:nowrap;" +
      "border:3px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.3);" +
      "transform:translate(28%,-32%);pointer-events:none;-webkit-font-smoothing:antialiased}" +
      "button." +
      HOST_CLASS +
      " ." +
      BADGE_CLASS +
      ".ee-cart-badge--wide{min-width:36px;height:28px;padding:0 9px;font-size:14px}";
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

  function isExcludedCartContext(btn) {
    return !!btn.closest(
      "#cart-widget,.cart-widget,.cart-table,.order-summary-top,#checkoutSidebar,.extras-col"
    );
  }

  /**
   * PDP: tlačidlo v [data-testid="divAddToCart"] (nie je v .product).
   * Listing: .product, nie blok detailu (p-detail-inner…).
   */
  function shouldShowBadge(btn) {
    if (!btn) return false;
    if (btn.getAttribute("data-testid") !== "buttonAddToCart" && !btn.classList.contains("add-to-cart-button")) return false;
    if (isExcludedCartContext(btn)) return false;

    if (btn.closest('[data-testid="divAddToCart"]')) return true;

    if (btn.closest(".product")) {
      if (btn.closest(".p-detail-inner,.product-detail,.type-detail")) return false;
      return true;
    }

    return false;
  }

  function priceIdInputForButton(btn) {
    var form = btn.closest("form");
    var el = form && form.querySelector("input[name='priceId']");
    if (el && el.value) return el;
    var box = btn.closest('[data-testid="divAddToCart"], .add-to-cart');
    if (box) {
      el = box.querySelector("input[name='priceId']");
      if (el && el.value) return el;
    }
    var detail = btn.closest(".p-detail-inner,.product-detail,#product-detail,.type-detail");
    if (detail) {
      el = detail.querySelector("input[name='priceId']");
      if (el && el.value) return el;
    }
    return null;
  }

  function renderBadges() {
    ensureStyles();
    clearBadges();

    var products = document.querySelectorAll(
      'button[data-testid="buttonAddToCart"], button.add-to-cart-button'
    );
    var i,
      btn,
      priceIdEl,
      priceId,
      qty,
      badge,
      label;

    for (i = 0; i < products.length; i++) {
      btn = products[i];
      if (!shouldShowBadge(btn)) continue;
      priceIdEl = priceIdInputForButton(btn);
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
