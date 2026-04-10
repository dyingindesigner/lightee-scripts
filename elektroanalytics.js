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
 *       // voliteľné: checkoutStepRules, thanksTest, clickSampleRate, heartbeatSec
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

  var sessionKey = getSessionKey();
  var pathNow = function () {
    return location.pathname + location.search;
  };

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

  function pushEvent(event_type, path, meta) {
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
    if (QUEUE.length === 0) return;
    var batch = QUEUE.splice(0, 40);
    var payload = JSON.stringify({
      site_key: cfg.siteKey,
      session_key: sessionKey,
      events: batch,
    });
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
        pushEvent("cart_step", p, { step: step });
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
  var activeMs = 0;
  var lastTick = Date.now();

  function tickActive() {
    var now = Date.now();
    if (document.visibilityState === "visible") {
      activeMs += Math.min(now - lastTick, 60000);
    }
    lastTick = now;
  }

  setInterval(function () {
    tickActive();
  }, 5000);

  document.addEventListener("visibilitychange", function () {
    lastTick = Date.now();
  });

  setInterval(function () {
    tickActive();
    pushEvent("heartbeat", pathNow(), {
      active_ms: Math.round(activeMs),
      vis: document.visibilityState,
    });
    flush(false);
  }, heartbeatSec * 1000);

  window.addEventListener("pagehide", function () {
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

  handleLocation("initial");
})();
