(function () {
  function n(t) {
    return (t || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }
  /**
   * Parsuje jednu cenu v SK formáte (medzery ako tisícky, desatinná čiarka): „12 059,30“, „59,30“, „1234“.
   * Staré správanie bralo len prvé \d+ → pri „1 234,56“ vzniklo 1 € a zvyšok ostal v DOM (rozbité hlavičky košíka).
   */
  function p(t) {
    var s = n(t).replace(/\u20ac/g, "").trim();
    if (!s) return null;
    var m = s.match(/^([\d\s]+),(\d{1,2})$/);
    if (m) {
      var intPart = m[1].replace(/\s/g, "");
      if (/^\d+$/.test(intPart)) return parseFloat(intPart + "." + m[2]);
    }
    var compact = s.replace(/\s/g, "");
    if (/^\d+(,\d{1,2})?$/.test(compact)) return parseFloat(compact.replace(",", "."));
    var m2 = s.match(/(\d+(?:[.,]\d{1,2})?)/);
    return m2 ? parseFloat(m2[1].replace(",", ".")) : null;
  }
  function f(v) {
    return v == null ? "" : "\u20ac" + v.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Hrubá suma pre B2B prepočet: ak je text stále naša posledná „net“ úprava, berieme uloženú hodnotu.
   * Ak sa text zmenil (Shoptet dopočítal košík / nový riadok), znova parsujeme číslo z DOM — inak ostane
   * staré data-ee-gross-original a súčty za „5 položiek“ sa držia aj po pridaní ďalších.
   */
  function resolveGrossFromPriceEl(el, txt) {
    var rendered = el.dataset.eeRendered;
    if (rendered && n(txt) === n(rendered)) {
      var stored = parseFloat(el.dataset.eeGrossOriginal || "");
      return isNaN(stored) ? null : stored;
    }
    var parsed = p(txt);
    if (parsed == null) return null;
    el.dataset.eeGrossOriginal = String(parsed);
    return parsed;
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

  function setNet(el) {
    if (!el) return;
    var txt = n(el.textContent);
    if (!txt || /ZADARMO|bez DPH|s DPH/i.test(txt)) return;
    if (el.dataset.eeRendered === txt) return;

    var gross = resolveGrossFromPriceEl(el, txt);
    if (gross == null) return;

    var next = f(gross / 1.23);
    if (n(el.textContent) === n(next)) return;

    el.textContent = next;
    el.dataset.eeRendered = n(next);
  }

  function swapBlocks() {
    document.querySelectorAll(".prices,.p-final-price-wrapper").forEach(function (box) {
      var ex = box.querySelector(".price-additional"),
        main = box.querySelector(".price-final-holder,.price-final strong,.price-final");
      if (!ex || !main) return;

      var xt = n(ex.textContent),
        mt = n(main.textContent),
        xv = p(xt),
        mv = p(mt);

      if (!/bez DPH/i.test(xt) || xv == null || mv == null) return;

      var mark = mv + "|" + xv;
      if (box.dataset.eeSwap === mark) return;

      var suf = mt.replace(/^.*?(\u20ac\s*\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s*\u20ac)/, "").trim();
      main.textContent = f(xv) + (suf && suf.length < 12 ? " " + suf : "");
      ex.textContent = f(mv) + " s DPH";
      ex.style.opacity = ".75";
      ex.style.fontSize = ".9em";
      box.dataset.eeSwap = mark;
    });
  }

  function ensureVatNote(target, gross) {
    var parent = target.parentElement;
    if (!parent) return;
    var extra = parent.querySelector(".price-additional.ee-b2b-vat-note");
    if (!extra) {
      extra = document.createElement("span");
      extra.className = "price-additional ee-b2b-vat-note";
      target.insertAdjacentElement("afterend", extra);
    }
    extra.textContent = f(gross) + " s DPH";
    extra.style.display = "block";
    extra.style.opacity = ".75";
    extra.style.fontSize = ".9em";
  }

  function swapCartRowTotals() {
    document
      .querySelectorAll(
        'td.p-total[data-testid="cellTotalPrice"] .price-final[data-testid="cartPrice"], td.p-total[data-testid="cellTotalPrice"] .price-final'
      )
      .forEach(function (el) {
        var txt = n(el.textContent);
        var gross = resolveGrossFromPriceEl(el, txt);
        if (gross == null) return;
        var net = gross / 1.23;
        var next = f(net);
        if (n(el.textContent) !== n(next)) el.textContent = next;
        el.dataset.eeRendered = n(next);
        ensureVatNote(el, gross);
      });
  }

  function swapCartUnitPrices() {
    document
      .querySelectorAll(
        'td.p-price.p-cell .price-final[data-testid="cartItemPrice"], td.p-price .price-final[data-testid="cartItemPrice"]'
      )
      .forEach(function (el) {
        var txt = n(el.textContent);
        var gross = resolveGrossFromPriceEl(el, txt);
        if (gross == null) return;
        var net = gross / 1.23;
        var next = f(net);
        if (n(el.textContent) !== n(next)) el.textContent = next;
        el.dataset.eeRendered = n(next);
        ensureVatNote(el, gross);
      });
  }

  function swapMiniCart() {
    document
      .querySelectorAll(
        '.cart-price[data-testid="headerCartPrice"],' +
          ".cart-price.visible-lg-inline-block," +
          ".cart-overview-final-price," +
          '[data-testid="cartWidgetProductPrice"],' +
          '[data-testid="recapItemPrice"]'
      )
      .forEach(setNet);
  }

  function run() {
    var s = getState();
    if (!s.loggedIn) return;
    if (s.groupId == null || Number(s.groupId) === 1) return;
    swapBlocks();
    swapCartRowTotals();
    swapCartUnitPrices();
    swapMiniCart();
  }

  var timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  }

  function boot() {
    run();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("ShoptetDOMPageContentLoaded", schedule);
    window.addEventListener("load", schedule);
    ["ShoptetCartUpdated", "ShoptetDOMAdvancedOrderLoaded", "ShoptetCartRecalculated"].forEach(function (name) {
      document.addEventListener(name, schedule);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
