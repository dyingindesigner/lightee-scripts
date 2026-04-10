/**
 * Elektroenergy.sk — desktop hover menu pod „Môj účet“
 * Vanilla JS, bez závislostí. Na mobile/tablete sa nespúšťa (hover + pointer fine + min šírka).
 */
(function () {
  "use strict";

  var STORAGE_STYLE = "ee-account-hover-menu-style";
  var PANEL_CLASS = "ee-account-hover-panel";
  var OPEN_CLASS = "ee-account-hover-open";

  var LINKS = [
    { href: "https://www.elektroenergy.sk/klient/objednavky/", text: "Objednávky" },
    { href: "https://www.elektroenergy.sk/klient/klient-zlavy/", text: "Zľavy" },
    { href: "https://www.elektroenergy.sk/klient/nastavenie/", text: "Osobné údaje" },
    { href: "https://www.elektroenergy.sk/klient/", text: "Nastavenia účtu" },
    { href: "https://www.elektroenergy.sk/logout/", text: "Odhlásiť", isButton: true },
  ];

  function isDesktopHover() {
    return window.matchMedia("(min-width: 992px) and (hover: hover) and (pointer: fine)").matches;
  }

  function findAccountTrigger() {
    var el = document.querySelector('a[data-testid="linkAccountOverview"]');
    if (el) return el;
    var candidates = document.querySelectorAll(
      '.user-action a[href="/klient/"], .user-action a[href="/klient"], .user-action-in a[href="/klient/"], .user-action-in a[href="/klient"], header a[href="/klient/"], header a[href="/klient"]'
    );
    var i, a, t;
    for (i = 0; i < candidates.length; i++) {
      a = candidates[i];
      if (a.closest(".login-widget")) continue;
      if (/zabudnute-heslo|registracia/i.test(a.getAttribute("href") || "")) continue;
      t = (a.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (/m[oô]j\s*účet|moj\s*ucet|m[uů]j\s*účet/i.test(t)) return a;
    }
    return null;
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
      "{position:fixed;z-index:100050;margin:0;padding:6px 0;min-width:240px;list-style:none;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:6px;box-shadow:0 10px 40px rgba(0,0,0,.12);font-size:15px;line-height:1.35;visibility:hidden;opacity:0;transform:translateY(-4px);transition:opacity .15s ease,transform .15s ease,visibility .15s;}" +
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

  function init() {
    if (!isDesktopHover()) return;

    var trigger = findAccountTrigger();
    if (!trigger) return;

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
      if (!isDesktopHover()) return;
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
    trigger.setAttribute("aria-expanded", "false");

    trigger.addEventListener(
      "mouseenter",
      function () {
        openPanel();
      },
      false
    );
    trigger.addEventListener("mouseleave", scheduleClose, false);
    panel.addEventListener("mouseenter", function () {
      clearTimeout(hideTimer);
    }, false);
    panel.addEventListener("mouseleave", scheduleClose, false);

    trigger.addEventListener(
      "focus",
      function () {
        openPanel();
      },
      true
    );
    trigger.addEventListener("blur", scheduleClose, false);

    window.addEventListener(
      "scroll",
      function () {
        if (panel.classList.contains(OPEN_CLASS)) positionPanel(trigger, panel);
      },
      true
    );
    window.addEventListener("resize", function () {
      if (!isDesktopHover()) {
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
