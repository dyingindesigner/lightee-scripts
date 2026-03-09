(function () {

  const style = document.createElement('style');
  style.innerHTML = `
  #shipping-slovakia-only-notice {
    margin-top: 14px !important;
    margin-bottom: 8px !important;
  }

  .shipping-slovakia-only-notice-inner {
    padding: 12px 14px !important;
    border: 1px solid #f1b5b5 !important;
    border-radius: 10px !important;
    background: linear-gradient(180deg, #fff5f5 0%, #ffecec 100%) !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  .shipping-slovakia-only-notice-text strong {
    display: block !important;
    font-size: 14px !important;
    line-height: 1.35 !important;
    margin-bottom: 4px !important;
    color: #a61b1b !important;
    font-weight: 700 !important;
  }

  .shipping-slovakia-only-notice-text span {
    display: block !important;
    font-size: 13px !important;
    line-height: 1.45 !important;
    color: #7a2c2c !important;
  }

  @media (max-width: 768px) {
    .shipping-slovakia-only-notice-inner {
      padding: 10px 12px !important;
    }

    .shipping-slovakia-only-notice-text strong {
      font-size: 13px !important;
    }

    .shipping-slovakia-only-notice-text span {
      font-size: 12px !important;
    }
  }

  @media (max-width: 480px) {
    .shipping-slovakia-only-notice-inner {
      padding: 9px 10px !important;
    }

    .shipping-slovakia-only-notice-text strong {
      font-size: 12.5px !important;
    }

    .shipping-slovakia-only-notice-text span {
      font-size: 11.5px !important;
    }
  }
  `;
  document.head.appendChild(style);

  function insertSlovakiaShippingNotice() {
    const shippingBox = document.querySelector('#order-shipping-methods');
    if (!shippingBox) return;

    if (document.querySelector('#shipping-slovakia-only-notice')) return;

    const notice = document.createElement('div');
    notice.id = 'shipping-slovakia-only-notice';

    notice.innerHTML = `
      <div class="shipping-slovakia-only-notice-inner">
        <div class="shipping-slovakia-only-notice-text">
          <strong>Doručujeme iba v rámci Slovenska</strong>
          <span>Objednávky odosielame len na adresy a odberné miesta v SR.</span>
        </div>
      </div>
    `;

    shippingBox.insertAdjacentElement('afterend', notice);
  }

  function initNotice() {
    insertSlovakiaShippingNotice();
    setTimeout(insertSlovakiaShippingNotice, 300);
    setTimeout(insertSlovakiaShippingNotice, 1000);
  }

  document.addEventListener('DOMContentLoaded', initNotice);

  const observer = new MutationObserver(function () {
    insertSlovakiaShippingNotice();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

})();
