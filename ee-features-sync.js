/**
 * EE features sync bridge (Supabase + identity context).
 * Separate runtime for new UX features (favorites, lists, quick add).
 */
(function () {
  "use strict";

  if (window.EE_FEATURES_SYNC && window.EE_FEATURES_SYNC.version) return;

  var DEFAULT_CFG = {
    url: "https://wcqytqqgkukhbfqvqble.supabase.co",
    key: "sb_publishable_iG-Xk1L9D9QugEuMaMXiNA_gsrTDm-d",
    schema: "public",
    siteKey: location.hostname,
    enabled: true,
  };

  function pickConfig() {
    var raw = window.EE_FEATURES_SUPABASE || {};
    return {
      url: String(raw.url || DEFAULT_CFG.url || "").trim().replace(/\/+$/, ""),
      key: String(raw.key || DEFAULT_CFG.key || "").trim(),
      schema: String(raw.schema || DEFAULT_CFG.schema || "public").trim(),
      siteKey: String(raw.siteKey || DEFAULT_CFG.siteKey || location.hostname || "site").trim(),
      enabled: raw.enabled !== false,
    };
  }

  function normalize(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function sha256Hex(input) {
    var source = String(input || "");
    if (window.crypto && window.crypto.subtle && typeof TextEncoder !== "undefined") {
      return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(source)).then(function (buf) {
        var arr = new Uint8Array(buf);
        var out = "";
        for (var i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, "0");
        return out;
      });
    }
    var hash = 2166136261;
    for (var j = 0; j < source.length; j++) {
      hash ^= source.charCodeAt(j);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Promise.resolve(("00000000" + (hash >>> 0).toString(16)).slice(-8));
  }

  function findIdentity() {
    var coreState = window.EE_CORE && typeof window.EE_CORE.getCustomerState === "function"
      ? window.EE_CORE.getCustomerState()
      : { loggedIn: false };
    var candidates = [
      window.eeCustomer,
      window.customer,
      window.shoptet && window.shoptet.customer,
      window.shoptet && window.shoptet.config && window.shoptet.config.customer,
      window.Shoptet && window.Shoptet.customer,
    ];
    var out = {
      loggedIn: !!coreState.loggedIn,
      groupId: coreState.groupId != null ? String(coreState.groupId) : "",
      customerId: "",
      email: "",
      displayName: "",
    };

    function absorb(obj) {
      if (!obj || typeof obj !== "object") return;
      out.customerId =
        out.customerId ||
        normalize(
          obj.customerId ||
            obj.customerID ||
            obj.customer_id ||
            obj.userId ||
            obj.user_id ||
            obj.id ||
            obj.guid
        );
      out.email = out.email || normalize(obj.email || obj.mail || obj.userEmail);
      out.displayName =
        out.displayName ||
        normalize(obj.fullName || obj.name || [obj.firstName, obj.lastName].filter(Boolean).join(" "));
      if (obj.registered === true || obj.mainAccount === true || obj.loggedIn === true) out.loggedIn = true;
    }

    for (var i = 0; i < candidates.length; i++) absorb(candidates[i]);
    if (Array.isArray(window.dataLayer)) {
      for (var j = 0; j < window.dataLayer.length; j++) {
        var row = window.dataLayer[j] || {};
        absorb(row);
        absorb(row.customer);
        absorb(row.shoptet && row.shoptet.customer);
        absorb(row.ecommerce && row.ecommerce.customer);
        absorb(row.page && row.page.customer);
      }
    }
    return out;
  }

  var cfg = pickConfig();
  var identityPromise = null;

  function getContext() {
    if (!identityPromise) {
      identityPromise = Promise.resolve(findIdentity()).then(function (identity) {
        var fingerprintSeed = [
          cfg.siteKey,
          String(identity.customerId || "").toLowerCase(),
          String(identity.email || "").toLowerCase(),
          String(identity.groupId || ""),
        ].join("|");
        return sha256Hex(fingerprintSeed).then(function (ownerHash) {
          return {
            loggedIn: !!identity.loggedIn,
            customerId: identity.customerId,
            email: identity.email,
            displayName: identity.displayName,
            ownerHash: ownerHash,
            localKey: (identity.customerId || identity.email || "guest").toLowerCase(),
            canSync: !!cfg.enabled && !!cfg.url && !!cfg.key && !!identity.loggedIn,
          };
        });
      });
    }
    return identityPromise;
  }

  function request(path, options, ownerHash) {
    var headers = Object.assign(
      {
        apikey: cfg.key,
        Authorization: "Bearer " + cfg.key,
        Accept: "application/json",
        "Content-Type": "application/json",
        "Accept-Profile": cfg.schema,
        "Content-Profile": cfg.schema,
        "x-site-key": cfg.siteKey,
      },
      (options && options.headers) || {}
    );
    if (ownerHash) headers["x-owner-hash"] = ownerHash;
    return fetch(cfg.url + "/rest/v1/" + path, Object.assign({}, options || {}, { headers: headers })).then(
      function (res) {
        if (!res.ok) {
          return res.text().then(function (t) {
            throw new Error("Supabase " + res.status + " " + (t || res.statusText));
          });
        }
        if (res.status === 204) return null;
        return res.text().then(function (txt) {
          if (!txt) return null;
          try {
            return JSON.parse(txt);
          } catch (_e) {
            return null;
          }
        });
      }
    );
  }

  function table(name) {
    var map = {
      favorites: "ee_features_favorites",
      saved_lists: "ee_features_saved_lists",
      saved_list_items: "ee_features_saved_list_items",
    };
    return map[name] || name;
  }

  function listFavorites(ownerHash) {
    var q =
      table("favorites") +
      "?select=product_code,product_name,product_url,product_image,updated_at&site_key=eq." +
      encodeURIComponent(cfg.siteKey) +
      "&owner_hash=eq." +
      encodeURIComponent(ownerHash) +
      "&order=updated_at.desc";
    return request(q, { method: "GET" }, ownerHash);
  }

  function upsertFavorite(ownerHash, row) {
    var payload = [
      {
        site_key: cfg.siteKey,
        owner_hash: ownerHash,
        product_code: row.product_code,
        product_name: row.product_name || "",
        product_url: row.product_url || "",
        product_image: row.product_image || "",
        updated_at: new Date().toISOString(),
      },
    ];
    var q = table("favorites") + "?on_conflict=site_key,owner_hash,product_code";
    return request(
      q,
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(payload),
      },
      ownerHash
    );
  }

  function deleteFavorite(ownerHash, productCode) {
    var q =
      table("favorites") +
      "?site_key=eq." +
      encodeURIComponent(cfg.siteKey) +
      "&owner_hash=eq." +
      encodeURIComponent(ownerHash) +
      "&product_code=eq." +
      encodeURIComponent(productCode);
    return request(q, { method: "DELETE", headers: { Prefer: "return=minimal" } }, ownerHash);
  }

  function listSavedLists(ownerHash) {
    var q =
      table("saved_lists") +
      "?select=list_id,list_name,updated_at,last_used_at&site_key=eq." +
      encodeURIComponent(cfg.siteKey) +
      "&owner_hash=eq." +
      encodeURIComponent(ownerHash) +
      "&order=updated_at.desc";
    return request(q, { method: "GET" }, ownerHash);
  }

  function listSavedListItems(ownerHash, listId) {
    var q =
      table("saved_list_items") +
      "?select=list_id,product_code,quantity,product_name,product_url,product_image,updated_at&site_key=eq." +
      encodeURIComponent(cfg.siteKey) +
      "&owner_hash=eq." +
      encodeURIComponent(ownerHash) +
      "&list_id=eq." +
      encodeURIComponent(listId) +
      "&order=updated_at.desc";
    return request(q, { method: "GET" }, ownerHash);
  }

  function upsertSavedList(ownerHash, listRow, items) {
    var listPayload = [
      {
        site_key: cfg.siteKey,
        owner_hash: ownerHash,
        list_id: listRow.list_id,
        list_name: listRow.list_name,
        updated_at: new Date().toISOString(),
      },
    ];
    var q = table("saved_lists") + "?on_conflict=site_key,owner_hash,list_id";
    return request(
      q,
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(listPayload),
      },
      ownerHash
    ).then(function () {
      var delQ =
        table("saved_list_items") +
        "?site_key=eq." +
        encodeURIComponent(cfg.siteKey) +
        "&owner_hash=eq." +
        encodeURIComponent(ownerHash) +
        "&list_id=eq." +
        encodeURIComponent(listRow.list_id);
      return request(delQ, { method: "DELETE", headers: { Prefer: "return=minimal" } }, ownerHash).then(
        function () {
          if (!Array.isArray(items) || !items.length) return null;
          var rows = items.map(function (it) {
            return {
              site_key: cfg.siteKey,
              owner_hash: ownerHash,
              list_id: listRow.list_id,
              product_code: String(it.product_code || "").trim(),
              quantity: Number(it.quantity || 1),
              product_name: String(it.product_name || ""),
              product_url: String(it.product_url || ""),
              product_image: String(it.product_image || ""),
              updated_at: new Date().toISOString(),
            };
          });
          var insertQ = table("saved_list_items");
          return request(
            insertQ,
            {
              method: "POST",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify(rows),
            },
            ownerHash
          );
        }
      );
    });
  }

  function deleteSavedList(ownerHash, listId) {
    var delItems =
      table("saved_list_items") +
      "?site_key=eq." +
      encodeURIComponent(cfg.siteKey) +
      "&owner_hash=eq." +
      encodeURIComponent(ownerHash) +
      "&list_id=eq." +
      encodeURIComponent(listId);
    var delList =
      table("saved_lists") +
      "?site_key=eq." +
      encodeURIComponent(cfg.siteKey) +
      "&owner_hash=eq." +
      encodeURIComponent(ownerHash) +
      "&list_id=eq." +
      encodeURIComponent(listId);
    return request(delItems, { method: "DELETE", headers: { Prefer: "return=minimal" } }, ownerHash).then(
      function () {
        return request(delList, { method: "DELETE", headers: { Prefer: "return=minimal" } }, ownerHash);
      }
    );
  }

  function touchListLastUsed(ownerHash, listId) {
    var q =
      table("saved_lists") +
      "?site_key=eq." +
      encodeURIComponent(cfg.siteKey) +
      "&owner_hash=eq." +
      encodeURIComponent(ownerHash) +
      "&list_id=eq." +
      encodeURIComponent(listId);
    return request(
      q,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
      },
      ownerHash
    );
  }

  window.EE_FEATURES_SYNC = {
    version: "2026-04-23-features-sync-v1",
    config: cfg,
    getContext: getContext,
    listFavorites: listFavorites,
    upsertFavorite: upsertFavorite,
    deleteFavorite: deleteFavorite,
    listSavedLists: listSavedLists,
    listSavedListItems: listSavedListItems,
    upsertSavedList: upsertSavedList,
    deleteSavedList: deleteSavedList,
    touchListLastUsed: touchListLastUsed,
  };
})();
