/**
 * Elektroenergy.sk — po prihlásení vrátiť zákazníka na stránku, kde bol pred loginom.
 * 1) Pred odoslaním doplní skryté pole referer (Shoptet formulár).
 * 2) Záloha cez sessionStorage + jednorazový redirect z /klient/ po úspešnom prihlásení.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "ee_returnAfterLogin";

  function isLoginForm(form) {
    if (!form || form.tagName !== "FORM") return false;
    var act = form.getAttribute("action") || "";
    return (
      act === "/action/Customer/Login/" ||
      act.indexOf("/action/Customer/Login") !== -1 ||
      form.getAttribute("data-testid") === "formLogin"
    );
  }

  function isClientAccountRootPath(pathname) {
    var p = pathname.replace(/\/+$/, "") || "/";
    return p === "/klient";
  }

  /**
   * Povolená návratová URL: rovnaký origin, nie koreň /klient (tam by vznikla slučka).
   */
  function isAllowedReturnUrl(urlString) {
    try {
      var u = new URL(urlString, window.location.origin);
      if (u.origin !== window.location.origin) return false;
      if (isClientAccountRootPath(u.pathname)) return false;
      if (u.protocol !== "http:" && u.protocol !== "https:") return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function rememberReturnUrl(form) {
    var href = window.location.href;
    if (!isAllowedReturnUrl(href)) return;
    var refInput = form.querySelector('input[name="referer"]');
    if (refInput) refInput.value = href;
    try {
      sessionStorage.setItem(STORAGE_KEY, href);
    } catch (err) {}
  }

  function onSubmitCapture(ev) {
    var form = ev.target;
    if (!isLoginForm(form)) return;
    rememberReturnUrl(form);
  }

  function hasLogoutLink() {
    var links = document.querySelectorAll("a[href]");
    var i, h;
    for (i = 0; i < links.length; i++) {
      h = links[i].getAttribute("href") || "";
      if (h === "/logout/" || /\/logout\/?(\?|$)/.test(h)) return true;
    }
    return false;
  }

  function tryRedirectAfterLoginLanding() {
    if (!isClientAccountRootPath(window.location.pathname)) return;
    if (!hasLogoutLink()) return;
    var raw;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return;
    }
    if (!raw || !isAllowedReturnUrl(raw)) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (e2) {}
      return;
    }
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e3) {}
    window.location.replace(raw);
  }

  document.addEventListener("submit", onSubmitCapture, true);

  function scheduleRedirectCheck() {
    tryRedirectAfterLoginLanding();
    setTimeout(tryRedirectAfterLoginLanding, 80);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleRedirectCheck);
  } else {
    scheduleRedirectCheck();
  }
})();
