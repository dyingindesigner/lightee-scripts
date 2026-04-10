/**
 * Elektroenergy.sk — desktop hover menu pod „Môj účet“
 * v4 — viditeľný trigger (nie skrytý mobile klon), resize → znova pripojiť, vyšší z-index, hover aj na <span>.
 * v4.1 — dedupe kandidátov cez WeakSet (predtým zlý výber), span cez children namiesto :scope.
 */
(function () {
  "use strict";

  var STORAGE_STYLE = "ee-account-hover-menu-style";
  var PANEL_CLASS = "ee-account-hover-panel";
  var OPEN_CLASS = "ee-account-hover-open";
  var ATTR_MOUNTED = "data-ee-acc-hover-mounted";

  var LINKS = [
    { href: "https://www.elektroenergy.sk/klient/objednavky/", text: "Objednávky" },
    { href: "https://www.elektroenergy.sk/klient/klient-zlavy/", text: "Zľavy" },
    { href: "https://www.elektroenergy.sk/klient/nastavenie/", text: "Osobné údaje" },
    { href: "https://www.elektroenergy.sk/klient/", text: "Nastavenia účtu" },
    { href: "https://www.elektroenergy.sk/logout/", text: "Odhlásiť", isButton: true },
  ];

  /** PC layout: široký viewport; nevyžadujeme pointer:fine (hybridné notebooky). */
  function isDesktopLayout() {
    return window.matchMedia("(min-width: 992px)").matches;
  }

  function hrefIsClientAccountRoot(href) {
    if (!href || href === "#" || href.indexOf("javascript:") === 0) return false;
    if (href === "/klient" || href === "/klient/") return true;
    try {
      var u = new URL(href, window.location.origin);
      if (u.origin !== window.location.origin) return false;
      var p = u.pathname.replace(/\/+$/, "") || "/";
      return p === "/klient";
    } catch (e) {
      return false;
    }
  }

  function resolveClickable(el) {
    if (!el) return null;
    if (el.tagName === "A" || el.tagName === "BUTTON") return el;
    return el.closest("a") || el.closest("button");
  }

  /** Prvý match v DOMe často patrí skrytej mobilnej verzii — berieme viditeľný s najväčšou plochou. */
  function isRoughlyVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    var st = window.getComputedStyle(el);
    if (st.visibility === "hidden" || st.display === "none") return false;
    if (parseFloat(st.opacity || "1") === 0) return false;
    return true;
  }

  function pickBestVisibleAccountLink(nodes) {
    var best = null;
    var bestArea = 0;
    var i, el, r, area, hrefAttr;
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      if (!el || el.tagName !== "A" || el.closest(".login-widget")) continue;
      hrefAttr = el.getAttribute("href") || el.href || "";
      if (!hrefIsClientAccountRoot(hrefAttr)) continue;
      if (!isRoughlyVisible(el)) continue;
      r = el.getBoundingClientRect();
      area = r.width * r.height;
      if (area >= bestArea) {
        bestArea = area;
        best = el;
      }
    }
    return best;
  }

  function collectAccountCandidates() {
    var seen = [];
    var dedup = typeof WeakSet !== "undefined" ? new WeakSet() : null;
    function add(sel) {
      var list = document.querySelectorAll(sel);
      var i, el;
      for (i = 0; i < list.length; i++) {
        el = list[i];
        if (!el) continue;
        if (dedup) {
          if (dedup.has(el)) continue;
          dedup.add(el);
        }
        seen.push(el);
      }
    }
    add("a.top-nav-button-account");
    add("a.top-nav-button[href='/klient/']");
    add("a.top-nav-button[href='/klient']");
    add('a[class*="top-nav-button-account"]');
    return seen;
  }

  function findAccountTrigger() {
    var best = pickBestVisibleAccountLink(collectAccountCandidates());
    if (best) return best;

    var selectors = [
      '[data-testid="linkAccountOverview"]',
      '[data-testid="linkAccount"]',
      "a.user-login",
    ];
    var i;
    for (i = 0; i < selectors.length; i++) {
      var raw = document.querySelector(selectors[i]);
      var el = resolveClickable(raw);
      if (!el || el.closest(".login-widget")) continue;
      if (el.tagName === "A" && !hrefIsClientAccountRoot(el.getAttribute("href") || el.href || "")) continue;
      if (el.tagName === "A" && !isRoughlyVisible(el)) continue;
      return el;
    }

    var roots = document.querySelectorAll(".user-action-in, .user-action, .overall-wrapper .container, header");
    var r, j, nodes, n, href, t;

    for (r = 0; r < roots.length; r++) {
      nodes = roots[r].querySelectorAll("a[href], button");
      for (j = 0; j < nodes.length; j++) {
        n = nodes[j];
        if (n.closest(".login-widget")) continue;
        href = n.getAttribute("href") || "";
        t = (n.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
        if (/m[oô]j\s*účet|moj\s*ucet|m[uů]j\s*účet|m[uů]j\s*ucet/.test(t)) {
          if (n.tagName === "BUTTON" || hrefIsClientAccountRoot(href || n.href || "")) {
            if (n.tagName !== "A" || isRoughlyVisible(n)) return n;
          }
        }
      }
    }

    var candidates = document.querySelectorAll(
      '.user-action a[href], .user-action-in a[href], header .user-action a[href], header a[href*="klient"]'
    );
    var fb = null;
    for (i = 0; i < candidates.length; i++) {
      n = candidates[i];
      if (n.closest(".login-widget")) continue;
      href = n.getAttribute("href") || "";
      if (!hrefIsClientAccountRoot(href)) continue;
      if (/zabudnute-heslo|registracia|zapomenute|signup/i.test(href)) continue;
      if (!isRoughlyVisible(n)) continue;
      t = (n.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (/prihl[aá]s/i.test(t) && !/účet|ucet/i.test(t)) continue;
      if (/účet|ucet/i.test(t) || !fb) fb = n;
    }
    return fb;
  }

  function injectStyles() {
    if (document.getElementById(STORAGE_STYLE)) return;
    var root = document.documentElement;
    var cs = getComputedStyle(root);
    var primary = (cs.getPropertyValue("--color-primary") || "#DC2626").trim() || "#DC2626";
    var primaryHover = (cs.getPropertyValue("--color-primary-hover") || "#B91C1C").trim() || "#B91C1C";
    var style = document.createElement("style");
    style.id = STORAGE_STYLE;
    style.textContent =
      "." +
      PANEL_CLASS +
      "{position:fixed;z-index:2147483000;margin:0;padding:6px 0;min-width:240px;list-style:none;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:6px;box-shadow:0 10px 40px rgba(0,0,0,.12);font-size:15px;line-height:1.35;visibility:hidden;opacity:0;transform:translateY(-4px);transition:opacity .15s ease,transform .15s ease,visibility .15s;}" +
      "." +
      PANEL_CLASS +
      "." +
      OPEN_CLASS +
      "{visibility:visible;opacity:1;transform:translateY(0);}" +
      "." +
      PANEL_CLASS +
      " a{display:block;padding:10px 18px;color:#1a1a1a;text-decoration:none;transition:background .12s ease;}" +
      "." +
      PANEL_CLASS +
      " a:hover,.ee-acc-menu-item:focus{background:rgba(0,0,0,.05);outline:none;}" +
      "." +
      PANEL_CLASS +
      " .ee-acc-logout{margin:8px 12px 6px;padding:10px 16px;text-align:center;border-radius:6px;background:" +
      primary +
      ";color:#fff;font-weight:600;border:none;cursor:pointer;width:calc(100% - 24px);box-sizing:border-box;text-decoration:none;display:block;}" +
      "." +
      PANEL_CLASS +
      " .ee-acc-logout:hover{background:" +
      primaryHover +
      ";color:#fff;}";
    document.head.appendChild(style);
  }

  function positionPanel(trigger, panel) {
    var r = trigger.getBoundingClientRect();
    panel.style.top = r.bottom + 6 + "px";
    panel.style.left = r.left + "px";
  }

  var attachScheduled = false;
  var observerStarted = false;
  var resizeDebounce = null;

  function attachMenu() {
    if (document.documentElement.getAttribute(ATTR_MOUNTED) === "1") return;

    if (!isDesktopLayout()) return;

    var trigger = findAccountTrigger();
    if (!trigger) return;

    document.documentElement.setAttribute(ATTR_MOUNTED, "1");

    injectStyles();

    var panel = document.createElement("ul");
    panel.className = PANEL_CLASS;
    panel.setAttribute("role", "menu");
    panel.setAttribute("aria-label", "Účet");

    LINKS.forEach(function (item) {
      var li = document.createElement("li");
      li.setAttribute("role", "none");
      var node;
      if (item.isButton) {
        node = document.createElement("a");
        node.href = item.href;
        node.className = "ee-acc-logout";
        node.setAttribute("role", "menuitem");
        node.textContent = item.text;
      } else {
        node = document.createElement("a");
        node.href = item.href;
        node.className = "ee-acc-menu-item";
        node.setAttribute("role", "menuitem");
        node.textContent = item.text;
      }
      li.appendChild(node);
      panel.appendChild(li);
    });

    document.body.appendChild(panel);

    var hideTimer = null;

    function openPanel() {
      if (!isDesktopLayout()) return;
      clearTimeout(hideTimer);
      positionPanel(trigger, panel);
      panel.classList.add(OPEN_CLASS);
      trigger.setAttribute("aria-expanded", "true");
    }

    function closePanel() {
      panel.classList.remove(OPEN_CLASS);
      trigger.setAttribute("aria-expanded", "false");
    }

    function scheduleClose() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(closePanel, 180);
    }

    trigger.setAttribute("aria-haspopup", "menu");
    if (!trigger.getAttribute("aria-expanded")) trigger.setAttribute("aria-expanded", "false");

    function bindHoverTargets(el) {
      el.addEventListener("mouseenter", openPanel, false);
      el.addEventListener("mouseleave", scheduleClose, false);
    }

    bindHoverTargets(trigger);
    var ch = trigger.children;
    for (var si = 0; si < ch.length; si++) {
      if (ch[si].tagName === "SPAN") bindHoverTargets(ch[si]);
    }
    panel.addEventListener(
      "mouseenter",
      function () {
        clearTimeout(hideTimer);
      },
      false
    );
    panel.addEventListener("mouseleave", scheduleClose, false);

    trigger.addEventListener("focus", openPanel, true);
    trigger.addEventListener("blur", scheduleClose, false);

    window.addEventListener(
      "scroll",
      function () {
        if (panel.classList.contains(OPEN_CLASS)) positionPanel(trigger, panel);
      },
      true
    );
    window.addEventListener("resize", function () {
      if (!isDesktopLayout()) {
        closePanel();
        return;
      }
      if (panel.classList.contains(OPEN_CLASS)) positionPanel(trigger, panel);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains(OPEN_CLASS)) {
        closePanel();
        if (trigger.focus) trigger.focus();
      }
    });
  }

  function scheduleAttach() {
    if (attachScheduled) return;
    attachScheduled = true;
    window.requestAnimationFrame(function () {
      attachScheduled = false;
      try {
        attachMenu();
      } catch (err) {}
    });
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;
    var obs = new MutationObserver(function () {
      if (document.documentElement.getAttribute(ATTR_MOUNTED) === "1") {
        obs.disconnect();
        return;
      }
      scheduleAttach();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  function boot() {
    scheduleAttach();
    startObserver();
    setTimeout(scheduleAttach, 400);
    setTimeout(scheduleAttach, 1500);
    setTimeout(scheduleAttach, 3500);
    window.addEventListener("load", scheduleAttach);

    window.addEventListener("resize", function () {
      clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(function () {
        if (document.documentElement.getAttribute(ATTR_MOUNTED) === "1") return;
        scheduleAttach();
      }, 250);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
