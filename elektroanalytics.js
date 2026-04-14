/**
 * Elektroenergy — first-party analytics (Supabase Edge Function ingest)
 *
 * Hostovanie: GitHub + jsDelivr, napr.
 *   https://cdn.jsdelivr.net/gh/USER/REPO@main/dist/elektroanalytics.js
 *
 * Povinná konfigurácia pred načítaním (v hlavičke/pätičke PRED týmto súborom):
 *   <script>
 *     window.EE_ANALYTICS = {
 *       endpoint: "https://XXXX.supabase.co/functions/v1/collect",
 *       siteKey: "elektroenergy",
 *       ingestSecret: "rovnaké ako ANALYTICS_INGEST_SECRET vo funkcii",
 *       supabaseAnonKey: "anon/public key z Settings → API (ak má funkcia zapnuté JWT)",
 *       // voliteľné: getCustomerId / customerIdSelector; getCustomerLabel / customerNameSelector;
 *       // getCartEuros / cartTotalSelector — košík € (inak predvolené selektory)
 *       // checkoutStepRules, thanksTest, clickSampleRate, heartbeatSec, heartbeatIdleSec (predvolene 30)
 *       // requireMarketingConsent, hasMarketingConsent, consentCookieNames, consentPollMs, onConsentChanged
 *       // heartbeat len pri viditeľnej karte a ak nebola nečinnosť dlhšie ako heartbeatIdleSec — šetrí DB (B2B katalóg).
 *     };
 *   </script>
 *   <script defer src=".../elektroanalytics.js"></script>
 */
(function () {
  "use strict";

  var cfg = window.EE_ANALYTICS || {};
  if (!cfg.endpoint || !cfg.siteKey || !cfg.ingestSecret) {
    return;
  }

  var STORAGE_SID = "ee_analytics_sid";
  var STORAGE_LAST_PATH = "ee_analytics_last_sent_path";
  var QUEUE = [];
  var flushScheduled = false;

  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getSessionKey() {
    try {
      var s = localStorage.getItem(STORAGE_SID);
      if (s && s.length > 10) return s;
      s = uuid();
      localStorage.setItem(STORAGE_SID, s);
      return s;
    } catch (e) {
      return uuid();
    }
  }

  var sessionKey = null;
  function ensureSessionKey() {
    if (!sessionKey) sessionKey = getSessionKey();
    return sessionKey;
  }
  var pathNow = function () {
    return location.pathname + location.search;
  };
  /** --- Consent gate (marketing cookies) --- */
  var requireMarketingConsent = cfg.requireMarketingConsent !== false;
  var consentCookieNames = Array.isArray(cfg.consentCookieNames)
    ? cfg.consentCookieNames
    : ["cookie_consent_marketing", "consent_marketing", "cc_marketing"];
  var consentGranted = !requireMarketingConsent;
  var consentPollMs =
    typeof cfg.consentPollMs === "number" && cfg.consentPollMs >= 500
      ? Math.round(cfg.consentPollMs)
      : 2000;
  var consentPollTimer = null;

  function parseCookieMap() {
    var map = {};
    try {
      var raw = document.cookie || "";
      if (!raw) return map;
      var parts = raw.split(";");
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i].split("=");
        var k = p.shift();
        if (!k) continue;
        var v = p.join("=");
        map[decodeURIComponent(k.trim())] = decodeURIComponent((v || "").trim());
      }
    } catch (e) {}
    return map;
  }

  function isTruthyConsentValue(v) {
    var t = String(v || "")
      .trim()
      .toLowerCase();
    return t === "1" || t === "true" || t === "yes" || t === "granted" || t === "allow";
  }

  function hasMarketingConsent() {
    if (!requireMarketingConsent) return true;
    try {
      if (typeof cfg.hasMarketingConsent === "function") {
        return !!cfg.hasMarketingConsent();
      }
    } catch (e0) {}
    var cookies = parseCookieMap();
    for (var i = 0; i < consentCookieNames.length; i++) {
      var key = consentCookieNames[i];
      if (Object.prototype.hasOwnProperty.call(cookies, key)) {
        return isTruthyConsentValue(cookies[key]);
      }
    }
    return false;
  }

  function refreshConsentState() {
    var prev = consentGranted;
    consentGranted = hasMarketingConsent();
    if (!prev && consentGranted) {
      handleLocation("consent_granted");
      flush(false);
    }
  }

  function initConsentWatch() {
    refreshConsentState();
    if (consentGranted || !requireMarketingConsent) return;
    if (typeof cfg.onConsentChanged === "function") {
      try {
        cfg.onConsentChanged(function () {
          refreshConsentState();
        });
      } catch (e) {}
    }
    consentPollTimer = setInterval(function () {
      refreshConsentState();
      if (consentGranted) {
        clearInterval(consentPollTimer);
        consentPollTimer = null;
      }
    }, consentPollMs);
  }


  /** Predvolené pravidlá pre Shoptet SK — uprav podľa reálnych URL v obchode. */
  var defaultCheckoutRules = [
    { id: "cart", re: /^\/kosik\/?/i },
    { id: "checkout", re: /^\/objednavka/i },
    { id: "checkout", re: /^\/order\/?/i },
    { id: "checkout", re: /\/objednavka\//i },
  ];

  var defaultThanks =
    /dekujeme|dakujeme|thank-you|thankyou|potvrdenie-objednavky|order-confirmation|objednavka-uspesna/i;

  var checkoutRules = cfg.checkoutStepRules || defaultCheckoutRules;
  var thanksTest = cfg.thanksTest instanceof RegExp ? cfg.thanksTest : defaultThanks;

  function matchCheckoutStep(pathname) {
    for (var i = 0; i < checkoutRules.length; i++) {
      var rule = checkoutRules[i];
      if (rule.re && rule.re.test(pathname)) return rule.id || "checkout";
    }
    return null;
  }

  function isThanks(pathname) {
    return thanksTest.test(pathname);
  }

  /**
   * Heuristiky pre Shoptet, ak v EE_ANALYTICS nie je vlastné getCustomerId.
   * Over na reálnej šablóne — DOM sa môže líšiť podľa témy / verzie.
   */
  function discoverCustomerId() {
    if (typeof cfg.customerIdSelector === "string" && cfg.customerIdSelector) {
      try {
        var el = document.querySelector(cfg.customerIdSelector);
        if (el) {
          var fromAttr =
            el.getAttribute("data-customer-id") ||
            el.getAttribute("data-id") ||
            el.getAttribute("data-account-id");
          if (fromAttr && String(fromAttr).trim()) return String(fromAttr).trim().slice(0, 128);
          if (el.textContent && String(el.textContent).trim())
            return String(el.textContent).trim().slice(0, 128);
        }
      } catch (e) {}
    }
    try {
      var c1 = window.shoptet && window.shoptet.customer;
      if (c1) {
        if (c1.id != null && String(c1.id).length > 0) return String(c1.id).slice(0, 128);
        /* Shoptet 2 často posiela len guid + email (bez id / mena) */
        if (c1.guid != null && String(c1.guid).length > 0) return String(c1.guid).slice(0, 128);
      }
    } catch (e2) {}
    try {
      var c2 = window.Shoptet && window.Shoptet.customer;
      if (c2) {
        if (c2.id != null && String(c2.id).length > 0) return String(c2.id).slice(0, 128);
        if (c2.guid != null && String(c2.guid).length > 0) return String(c2.guid).slice(0, 128);
      }
    } catch (e3) {}
    return null;
  }

  function resolveCustomerId() {
    try {
      if (typeof cfg.getCustomerId === "function") {
        var id = cfg.getCustomerId();
        if (id != null && String(id).length > 0) return String(id).slice(0, 128);
      }
    } catch (e) {}
    var discovered = discoverCustomerId();
    if (discovered) return discovered;
    return null;
  }

  /**
   * Zobrazené meno pre dashboard (customer_label v ingeste). Len ak je používateľ prihlásený.
   */
  function discoverCustomerLabel() {
    if (typeof cfg.customerNameSelector === "string" && cfg.customerNameSelector) {
      try {
        var nel = document.querySelector(cfg.customerNameSelector);
        if (nel && nel.textContent) {
          var tx = String(nel.textContent).replace(/\s+/g, " ").trim();
          if (tx) return tx.slice(0, 120);
        }
      } catch (e) {}
    }
    try {
      var sc = window.shoptet && window.shoptet.customer;
      if (sc) {
        if (sc.fullName && String(sc.fullName).trim()) return String(sc.fullName).trim().slice(0, 120);
        var fn = (sc.firstName && String(sc.firstName).trim()) || "";
        var ln = (sc.lastName && String(sc.lastName).trim()) || "";
        var comb = (fn + " " + ln).trim();
        if (comb) return comb.slice(0, 120);
        /* Ak Shoptet neposiela meno, zobraz aspoň e-mail (Elektroenergy: len guid + email) */
        if (sc.email && String(sc.email).trim()) return String(sc.email).trim().slice(0, 120);
      }
    } catch (e2) {}
    try {
      var Sc = window.Shoptet && window.Shoptet.customer;
      if (Sc) {
        if (Sc.fullName && String(Sc.fullName).trim()) return String(Sc.fullName).trim().slice(0, 120);
        if (Sc.email && String(Sc.email).trim()) return String(Sc.email).trim().slice(0, 120);
      }
    } catch (e3) {}
    return null;
  }

  function resolveCustomerLabel() {
    try {
      if (typeof cfg.getCustomerLabel === "function") {
        var gl = cfg.getCustomerLabel();
        if (gl != null && String(gl).trim()) return String(gl).trim().slice(0, 120);
      }
    } catch (e) {}
    return discoverCustomerLabel();
  }

  function tryCartEuros() {
    try {
      if (typeof cfg.getCartEuros === "function") {
        var v = cfg.getCartEuros();
        if (typeof v === "number" && !isNaN(v)) return Math.round(v * 100) / 100;
      }
    } catch (e) {}
    function parseEurosFromElement(el) {
      if (!el || !el.textContent) return null;
      var raw = el.textContent.replace(/\s/g, " ").replace(/\u00a0/g, " ");
      var m = raw.match(/([\d\s,\.]+)\s*(€|EUR)/i) || raw.match(/€\s*([\d\s,\.]+)/i);
      if (m) {
        var chunk = m[1] ? m[1] : m[0];
        var num = String(chunk).replace(/\s/g, "").replace(",", ".");
        var n = parseFloat(num);
        if (!isNaN(n)) return Math.round(n * 100) / 100;
      }
      return null;
    }
    if (cfg.cartTotalSelector) {
      try {
        var elSel = document.querySelector(cfg.cartTotalSelector);
        var parsed = parseEurosFromElement(elSel);
        if (parsed != null) return parsed;
      } catch (e2) {}
    }
    /* Shoptet: prvý .price-final môže byť prázdny alebo riadková cena — súčet je často posledný alebo v súhrne */
    try {
      var wrap = document.querySelector("#cart-wrapper, .cart-wrapper, #cart");
      if (wrap) {
        var prefer = wrap.querySelector(
          ".cart-summary .price-final, .cart-summary strong.price-final, tfoot .price-final, .recapitulation-total .price-final"
        );
        var pvPref = parseEurosFromElement(prefer);
        if (pvPref != null) return pvPref;
        var finals = wrap.querySelectorAll(".price-final");
        if (finals.length > 0) {
          var lastPv = parseEurosFromElement(finals[finals.length - 1]);
          if (lastPv != null) return lastPv;
          var maxPv = null;
          for (var fi = 0; fi < finals.length; fi++) {
            var one = parseEurosFromElement(finals[fi]);
            if (one != null && (maxPv == null || one > maxPv)) maxPv = one;
          }
          if (maxPv != null) return maxPv;
        }
      }
    } catch (eW) {}
    var defaultCartSelectors = [
      ".cart-summary strong.price-final",
      ".recapitulation-table .price",
      "[data-testid='cart-total']",
      ".order-recapitulation__total",
    ];
    for (var ci = 0; ci < defaultCartSelectors.length; ci++) {
      try {
        var cel = document.querySelector(defaultCartSelectors[ci]);
        var pv = parseEurosFromElement(cel);
        if (pv != null) return pv;
      } catch (e3) {}
    }
    return null;
  }

  function pushEvent(event_type, path, meta) {
    if (!consentGranted) return;
    QUEUE.push({
      event_type: event_type,
      path: path || pathNow(),
      meta: meta || {},
    });
    scheduleFlush();
  }

  function scheduleFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    setTimeout(function () {
      flushScheduled = false;
      flush(false);
    }, 400);
  }

  function flush(isUnload) {
    if (!consentGranted) return;
    if (QUEUE.length === 0) return;
    var batch = QUEUE.splice(0, 40);
    var cid = resolveCustomerId();
    var clabel = cid ? resolveCustomerLabel() : null;
    var payloadObj = {
      site_key: cfg.siteKey,
      session_key: ensureSessionKey(),
      events: batch,
    };
    if (cid) payloadObj.customer_id = cid;
    if (clabel) payloadObj.customer_label = clabel;
    var payload = JSON.stringify(payloadObj);
    var url = cfg.endpoint;
    var headers = {
      "Content-Type": "application/json",
      "x-ee-analytics-secret": cfg.ingestSecret,
    };
    if (cfg.supabaseAnonKey) {
      headers.Authorization = "Bearer " + cfg.supabaseAnonKey;
      // Supabase Edge Functions často vyžadujú aj apikey (rovnaká hodnota ako publishable/anon)
      headers.apikey = cfg.supabaseAnonKey;
    }
    // sendBeacon nevie poslať vlastné hlavičky (tajomstvo) — pri odchode používame fetch + keepalive
    fetch(url, {
      method: "POST",
      headers: headers,
      body: payload,
      keepalive: !!isUnload,
      mode: "cors",
    }).catch(function () {});
  }

  /** --- Page + funnel --- */
  function handleLocation(reason) {
    bumpActivity();
    var p = pathNow();
    var pathname = location.pathname;

    pushEvent("pageview", p, { reason: reason || "load", title: document.title });

    var step = matchCheckoutStep(pathname);
    if (step) {
      var last = null;
      try {
        last = sessionStorage.getItem(STORAGE_LAST_PATH);
      } catch (e) {}
      var key = step + "|" + p;
      if (last !== key) {
        try {
          sessionStorage.setItem(STORAGE_LAST_PATH, key);
        } catch (e2) {}
        var cm = { step: step };
        var euros = tryCartEuros();
        if (euros != null) cm.cart_eur = euros;
        pushEvent("cart_step", p, cm);
        /* Cena na /kosik/ sa často vykreslí až po chvíli — druhý pokus bez duplicity kľúča v storage */
        if (step === "cart") {
          setTimeout(function () {
            try {
              if (!/^\/kosik/i.test(location.pathname)) return;
              var euros2 = tryCartEuros();
              if (euros2 == null) return;
              pushEvent("cart_step", pathNow(), {
                step: "cart",
                cart_eur: euros2,
                reason: "deferred_price",
              });
            } catch (eDef) {}
          }, 700);
        }
      }
    }

    if (isThanks(pathname)) {
      pushEvent("purchase_thanks", p, { step: "thanks" });
    }
  }

  /** --- Kliky (vzorkovanie) --- */
  var sample =
    typeof cfg.clickSampleRate === "number" && cfg.clickSampleRate > 0 && cfg.clickSampleRate <= 1
      ? cfg.clickSampleRate
      : 1;

  function clickSummary(el) {
    if (!el || !el.tagName) return {};
    var tag = el.tagName.toLowerCase();
    var id = el.id || "";
    var cls = (el.className && String(el.className).slice(0, 120)) || "";
    var txt = "";
    if (el.innerText) txt = String(el.innerText).replace(/\s+/g, " ").trim().slice(0, 80);
    return { tag: tag, id: id, cls: cls, txt: txt };
  }

  document.addEventListener(
    "click",
    function (ev) {
      bumpActivity();
      if (Math.random() > sample) return;
      var t = ev.target;
      if (!t || !t.closest) return;
      var interactive = t.closest(
        "a,button,input,select,textarea,[role=button],[data-analytics-click]"
      );
      var el = interactive || t;
      pushEvent("click", pathNow(), clickSummary(el));
    },
    true
  );

  /** --- Trvanie relácie (aktívny čas v okne) --- */
  var heartbeatSec = Math.max(20, Math.min(120, cfg.heartbeatSec || 30));
  var heartbeatIdleSec = Math.max(10, Math.min(600, cfg.heartbeatIdleSec || 30));
  var heartbeatIdleMs = heartbeatIdleSec * 1000;
  var activeMs = 0;
  var lastTick = Date.now();
  var lastActivityAt = Date.now();

  function tickActive() {
    var now = Date.now();
    if (document.visibilityState === "visible") {
      activeMs += Math.min(now - lastTick, 60000);
    }
    lastTick = now;
  }

  /** Po návrate z idle hneď jeden pulse, aby dashboard videl „je späť“. */
  function bumpActivity() {
    var now = Date.now();
    var wasIdle = now - lastActivityAt > heartbeatIdleMs;
    lastActivityAt = now;
    if (wasIdle && document.visibilityState === "visible") {
      tickActive();
      var hbr = {
        active_ms: Math.round(activeMs),
        vis: document.visibilityState,
      };
      if (/^\/kosik/i.test(location.pathname)) {
        var cer = tryCartEuros();
        if (cer != null) hbr.cart_eur = cer;
      }
      pushEvent("heartbeat", pathNow(), hbr);
      flush(false);
    }
  }

  setInterval(function () {
    tickActive();
  }, 5000);

  document.addEventListener("visibilitychange", function () {
    lastTick = Date.now();
    if (document.visibilityState === "visible") {
      bumpActivity();
    }
  });

  document.addEventListener("pointerdown", bumpActivity, true);
  document.addEventListener("keydown", bumpActivity, true);
  var lastScrollBump = 0;
  document.addEventListener(
    "scroll",
    function () {
      var n = Date.now();
      if (n - lastScrollBump < 800) return;
      lastScrollBump = n;
      bumpActivity();
    },
    true
  );
  var lastMoveBump = 0;
  document.addEventListener(
    "mousemove",
    function () {
      var n = Date.now();
      if (n - lastMoveBump < 2500) return;
      lastMoveBump = n;
      bumpActivity();
    },
    true
  );

  setInterval(function () {
    tickActive();
    /* Neťahaj pulse do DB pri skrytej karte / inom okne — typický B2B katalóg na pozadí. */
    if (document.visibilityState !== "visible") {
      return;
    }
    /* Bez interakcie dlhšie ako heartbeatIdleSec — žiadny pulse (šetrí DB). */
    if (Date.now() - lastActivityAt > heartbeatIdleMs) {
      return;
    }
    var hb = {
      active_ms: Math.round(activeMs),
      vis: document.visibilityState,
    };
    if (/^\/kosik/i.test(location.pathname)) {
      var ce = tryCartEuros();
      if (ce != null) hb.cart_eur = ce;
    }
    pushEvent("heartbeat", pathNow(), hb);
    flush(false);
  }, heartbeatSec * 1000);

  window.addEventListener("pagehide", function () {
    if (!consentGranted) return;
    tickActive();
    pushEvent("session_end", pathNow(), { active_ms: Math.round(activeMs) });
    flush(true);
  });

  /** --- SPA / zmeny URL (Shoptet často full reload; ak nie, zober aj hash) --- */
  var lastHref = location.href;
  setInterval(function () {
    if (location.href !== lastHref) {
      lastHref = location.href;
      handleLocation("url_change");
    }
  }, 500);

  window.addEventListener("popstate", function () {
    handleLocation("popstate");
  });

  if (history.pushState) {
    var _ps = history.pushState;
    history.pushState = function () {
      _ps.apply(history, arguments);
      setTimeout(function () {
        handleLocation("pushState");
      }, 0);
    };
    var _rs = history.replaceState;
    history.replaceState = function () {
      _rs.apply(history, arguments);
      setTimeout(function () {
        handleLocation("replaceState");
      }, 0);
    };
  }

  initConsentWatch();
  if (consentGranted) {
    handleLocation("initial");
  }
})();
