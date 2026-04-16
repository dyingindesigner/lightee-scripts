(() => {
  const STYLE_ID = "ee-native-sku-style-final";
  const ROOT_SELECTOR = "#products.products-page.products-block";

  function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #content #productsTop .flag.flag-sku,
      #content .products-top .flag.flag-sku,
      #content .top-products .flag.flag-sku,
      #content .box-topProducts .flag.flag-sku {
        display: none !important;
      }

      @media (max-width: 991px) {
        #content ${ROOT_SELECTOR} .product .p .p-code {
          display: none !important;
        }

        #content ${ROOT_SELECTOR} .product .p .image .flags.flags-default {
          display: flex !important;
          align-items: center !important;
          flex-wrap: nowrap !important;
          gap: clamp(4px, 1.1vw, 6px) !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        #content ${ROOT_SELECTOR} .product .p .image .flags.flags-default .flag.flag-sku {
          margin-left: auto !important;
          border-radius: 0 !important;
          background: #d8f4cf !important;
          color: #0d8a2f !important;
          border: 1px solid #b7dfad !important;
          font-weight: 700 !important;
          line-height: 1.1 !important;
          font-size: clamp(9px, 2.2vw, 10px) !important;
          padding: clamp(3px, 0.9vw, 5px) clamp(6px, 1.6vw, 9px) !important;
          max-width: clamp(8ch, 40vw, 18ch) !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
      }

      @media (max-width: 360px) {
        #content ${ROOT_SELECTOR} .product .p .image .flags.flags-default .flag.flag-sku {
          font-size: clamp(8.5px, 2.4vw, 9.5px) !important;
          padding: 3px 6px !important;
          max-width: clamp(7ch, 46vw, 16ch) !important;
        }
      }

      @media (max-width: 330px) {
        #content ${ROOT_SELECTOR} .product .p .image .flags.flags-default .flag.flag-sku {
          max-width: clamp(7ch, 50vw, 15ch) !important;
        }
      }

      @media (min-width: 768px) and (max-width: 991px) {
        #content ${ROOT_SELECTOR} .product .p .image .flags.flags-default .flag.flag-sku {
          max-width: clamp(10ch, 34vw, 20ch) !important;
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

      let flags = image.querySelector(".flags.flags-default");
      if (!flags) {
        flags = document.createElement("div");
        flags.className = "flags flags-default";
        image.appendChild(flags);
      }

      let badge = flags.querySelector(".flag.flag-sku");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "flag flag-sku";
        flags.appendChild(badge);
      }

      badge.textContent = sku;
      badge.title = sku;
      badge.style.borderRadius = "0";
    });
  }

  function init() {
    injectStyleOnce();
    applySkuFlags();

    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        applySkuFlags();
      });
    };

    if (window.__eeSkuObserverFinal) {
      window.__eeSkuObserverFinal.disconnect();
    }

    const root = document.querySelector(ROOT_SELECTOR) || document.body;
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    window.__eeSkuObserverFinal = observer;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("load", applySkuFlags, { once: true });
})();