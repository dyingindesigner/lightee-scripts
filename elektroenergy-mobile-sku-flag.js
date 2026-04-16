(() => {
  const STYLE_ID = "ee-native-sku-style-v3";
  const ROOT_SELECTOR = "#products.products-page.products-block";
  const BADGE_CLASS = "flag-sku-native";

  function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #content .flag.${BADGE_CLASS} {
        display: none !important;
      }

      #content #productsTop .flag.${BADGE_CLASS},
      #content .products-top .flag.${BADGE_CLASS},
      #content .top-products .flag.${BADGE_CLASS},
      #content .box-topProducts .flag.${BADGE_CLASS} {
        display: none !important;
      }

      @media (max-width: 991px) {
        #content ${ROOT_SELECTOR} .product .p .p-code {
          display: none !important;
        }

        #content ${ROOT_SELECTOR} .product .p .image {
          position: relative !important;
        }

        #content ${ROOT_SELECTOR} .product .p .image .flag.${BADGE_CLASS} {
          display: inline-block !important;
          position: absolute !important;
          top: clamp(6px, 1.8vw, 9px) !important;
          right: clamp(6px, 1.8vw, 9px) !important;
          z-index: 7 !important;

          border-radius: 0 !important;
          background: #d8f4cf !important;
          color: #0d8a2f !important;
          border: 1px solid #b7dfad !important;

          font-weight: 700 !important;
          line-height: 1.1 !important;
          font-size: clamp(9px, 2.2vw, 10px) !important;
          padding: clamp(3px, 0.9vw, 5px) clamp(6px, 1.6vw, 9px) !important;

          max-width: clamp(7ch, 46%, 18ch) !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          box-sizing: border-box !important;
          pointer-events: none !important;
        }
      }

      @media (max-width: 360px) {
        #content ${ROOT_SELECTOR} .product .p .image .flag.${BADGE_CLASS} {
          top: 6px !important;
          right: 6px !important;
          font-size: clamp(8.5px, 2.4vw, 9.5px) !important;
          padding: 3px 6px !important;
          max-width: clamp(7ch, 50%, 15ch) !important;
        }
      }

      @media (max-width: 330px) {
        #content ${ROOT_SELECTOR} .product .p .image .flag.${BADGE_CLASS} {
          max-width: clamp(6ch, 52%, 13ch) !important;
        }
      }

      @media (min-width: 768px) and (max-width: 991px) {
        #content ${ROOT_SELECTOR} .product .p .image .flag.${BADGE_CLASS} {
          max-width: clamp(10ch, 34%, 20ch) !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function extractSku(card) {
    const micro = card.querySelector('.p-code [data-micro="sku"], [data-micro="sku"]');
    if (micro?.textContent?.trim()) return micro.textContent.trim();

    const txt = (card.querySelector(".p-code")?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    return txt.replace(/^K[oó]d:\s*/i, "").trim();
  }

  function applySkuFlags() {
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;

    root.querySelectorAll(".product .p").forEach((card) => {
      const sku = extractSku(card);
      if (!sku) return;

      const image = card.querySelector(".image");
      if (!image) return;

      let badge = image.querySelector(`.flag.${BADGE_CLASS}`);
      if (!badge) {
        badge = document.createElement("span");
        badge.className = `flag ${BADGE_CLASS}`;
        image.appendChild(badge);
      }

      badge.textContent = sku;
      badge.title = sku;
    });
  }

  function attachObserver() {
    if (window.__eeSkuObserverFinalV3) {
      window.__eeSkuObserverFinalV3.disconnect();
    }

    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        applySkuFlags();
      });
    };

    const root = document.querySelector(ROOT_SELECTOR) || document.body;
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    window.__eeSkuObserverFinalV3 = observer;
  }

  function init() {
    injectStyleOnce();
    applySkuFlags();
    attachObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("load", applySkuFlags, { once: true });
})();