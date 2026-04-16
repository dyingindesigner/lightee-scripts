/**
 * Elektroenergy.sk — return flow for login and logout.
 *
 * Login:
 * 1) Before submit, set hidden referer from candidate priority.
 * 2) Fallback redirect from /klient/ to remembered page after successful login.
 *
 * Logout:
 * 1) On logout click, remember current page.
 * 2) After logout landing (home/login/client), redirect once back to remembered page.
 *
 * Change notes:
 * - Candidate order now prefers current URL over referrer to avoid one-step-back return.
 * - Last public page is persisted in sessionStorage (ee_lastPublicPage) as a safer fallback.
 * - Hover-menu logout keeps returning user back to the page where logout started.
 */
(function () {
  "use strict";

  var STORAGE_LOGIN_KEY = "ee_returnAfterLogin";
  var STORAGE_LOGOUT_KEY = "ee_returnAfterLogout";
  var STORAGE_LAST_PUBLIC_KEY = "ee_lastPublicPage";
  var STORAGE_TTL_MS = 30 * 60 * 1000;

  function normalizePath(pathname) {
    var p = String(pathname || "/").replace(/\/+$/, "");
    return p || "/";
  }

  function isClientAccountRootPath(pathname) {
    return normalizePath(pathname) === "/klient";
  }

  function isLoginPath(pathname) {
    return normalizePath(pathname) === "/login";
  }

  function isLogoutPath(pathname) {
    return normalizePath(pathname) === "/logout";
  }

  function isLikelyLogoutLandingPath(pathname) {
    var p = normalizePath(pathname);
    return p === "/" || p === "/login" || p === "/klient";
  }

  function isLoginForm(form) {
    if (!form || form.tagName !== "FORM") return false;
    var act = form.getAttribute("action") || "";
    return (
      act === "/action/Customer/Login/" ||
      act.indexOf("/action/Customer/Login") !== -1 ||
      form.getAttribute("data-testid") === "formLogin"
    );
  }

  function hasLogoutLink() {
    var links = document.querySelectorAll("a[href]");
    var i;
    for (i = 0; i < links.length; i++) {
      if (isLogoutHref(links[i].getAttribute("href") || "")) return true;
    }
    return false;
  }

  function isLoggedIn() {
    return hasLogoutLink();
  }

  function toAbsoluteUrl(urlString) {
    try {
      return new URL(urlString, window.location.origin).href;
    } catch (e) {
      return null;
    }
  }

  function stripHash(urlString) {
    try {
      var u = new URL(urlString, window.location.origin);
      u.hash = "";
      return u.href;
    } catch (e) {
      return String(urlString || "");
    }
  }

  /**
   * Allowed return URL: same origin, http/https, not login/logout.
   * For login flow we also block /klient root to avoid loops.
   */
  function isAllowedReturnUrl(urlString, options) {
    var opts = options || {};
    var allowClientRoot = !!opts.allowClientRoot;

    try {
      var u = new URL(urlString, window.location.origin);
      if (u.origin !== window.location.origin) return false;
      if (u.protocol !== "http:" && u.protocol !== "https:") return false;
      if (isLoginPath(u.pathname) || isLogoutPath(u.pathname)) return false;
      if (!allowClientRoot && isClientAccountRootPath(u.pathname)) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function writeStoredUrl(key, url) {
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          url: String(url || ""),
          ts: Date.now(),
        })
      );
    } catch (e) {}
  }

  function readStoredUrl(key) {
    try {
      var raw = sessionStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      if (!parsed.url || typeof parsed.url !== "string") return null;
      if (!parsed.ts || typeof parsed.ts !== "number") return null;
      if (Date.now() - parsed.ts > STORAGE_TTL_MS) {
        sessionStorage.removeItem(key);
        return null;
      }
      return parsed.url;
    } catch (e) {
      return null;
    }
  }

  function clearStoredUrl(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {}
  }

  function rememberLastPublicPage() {
    var current = window.location.href;
    if (!isAllowedReturnUrl(current, { allowClientRoot: true })) return;
    writeStoredUrl(STORAGE_LAST_PUBLIC_KEY, current);
  }

  function getLastPublicCandidateUrl() {
    var last = readStoredUrl(STORAGE_LAST_PUBLIC_KEY);
    if (!last) return null;
    return isAllowedReturnUrl(last, { allowClientRoot: false }) ? last : null;
  }

  function getBackToCandidateUrl() {
    try {
      var backTo = new URLSearchParams(window.location.search).get("backTo");
      if (!backTo) return null;
      var abs = toAbsoluteUrl(backTo);
      if (!abs) return null;
      return isAllowedReturnUrl(abs, { allowClientRoot: false }) ? abs : null;
    } catch (e) {
      return null;
    }
  }

  function getReferrerCandidateUrl() {
    var ref = document.referrer || "";
    if (!ref) return null;
    return isAllowedReturnUrl(ref, { allowClientRoot: false }) ? ref : null;
  }

  function getCurrentCandidateUrl() {
    var href = window.location.href;
    return isAllowedReturnUrl(href, { allowClientRoot: false }) ? href : null;
  }

  function resolveLoginReturnCandidate() {
    return (
      getBackToCandidateUrl() ||
      getCurrentCandidateUrl() ||
      getLastPublicCandidateUrl() ||
      getReferrerCandidateUrl()
    );
  }

  function rememberLoginReturnUrl(form) {
    var candidate = resolveLoginReturnCandidate();
    if (!candidate) return;

    var refInput = form.querySelector('input[name="referer"]');
    if (refInput) refInput.value = candidate;

    writeStoredUrl(STORAGE_LOGIN_KEY, candidate);
  }

  function tryRedirectAfterLoginLanding() {
    if (!isClientAccountRootPath(window.location.pathname)) return;
    if (!isLoggedIn()) return;

    var target = readStoredUrl(STORAGE_LOGIN_KEY);
    if (!target || !isAllowedReturnUrl(target, { allowClientRoot: false })) {
      clearStoredUrl(STORAGE_LOGIN_KEY);
      return;
    }

    clearStoredUrl(STORAGE_LOGIN_KEY);

    if (stripHash(window.location.href) === stripHash(target)) return;
    window.location.replace(target);
  }

  function isLogoutHref(href) {
    if (!href) return false;
    try {
      var u = new URL(href, window.location.origin);
      if (u.origin !== window.location.origin) return false;
      return isLogoutPath(u.pathname);
    } catch (e) {
      return false;
    }
  }

  function rememberLogoutReturnUrl() {
    var current = window.location.href;
    if (!isAllowedReturnUrl(current, { allowClientRoot: true })) return;
    writeStoredUrl(STORAGE_LOGOUT_KEY, current);
  }

  function onClickCapture(ev) {
    var el = ev.target;
    if (!el || !el.closest) return;

    var link = el.closest("a[href]");
    if (!link) return;

    var href = link.getAttribute("href") || "";
    if (!isLogoutHref(href)) return;

    rememberLogoutReturnUrl();
  }

  function tryRedirectAfterLogoutLanding() {
    if (isLoggedIn()) {
      clearStoredUrl(STORAGE_LOGOUT_KEY);
      return;
    }

    if (!isLikelyLogoutLandingPath(window.location.pathname)) return;

    var target = readStoredUrl(STORAGE_LOGOUT_KEY);
    if (!target || !isAllowedReturnUrl(target, { allowClientRoot: true })) {
      clearStoredUrl(STORAGE_LOGOUT_KEY);
      return;
    }

    clearStoredUrl(STORAGE_LOGOUT_KEY);

    if (stripHash(window.location.href) === stripHash(target)) return;
    window.location.replace(target);
  }

  function onSubmitCapture(ev) {
    var form = ev.target;
    if (!isLoginForm(form)) return;
    rememberLoginReturnUrl(form);
  }

  document.addEventListener("submit", onSubmitCapture, true);
  document.addEventListener("click", onClickCapture, true);

  function scheduleChecks() {
    rememberLastPublicPage();
    tryRedirectAfterLoginLanding();
    tryRedirectAfterLogoutLanding();
    setTimeout(function () {
      tryRedirectAfterLoginLanding();
      tryRedirectAfterLogoutLanding();
    }, 80);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleChecks);
  } else {
    scheduleChecks();
  }
})();
