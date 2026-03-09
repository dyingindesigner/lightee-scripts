(function () {

  const style = document.createElement('style');
  style.innerHTML = `
  #shipping-slovakia-only-notice {
    margin-top: 14px;
    margin-bottom: 8px;
  }

  .shipping-slovakia-only-notice-inner {
    padding: 12px 14px;
    border: 1px solid #d9d9d9;
    border-radius: 10px;
    background: #f6f6f6;
    width: 100%;
    box-sizing: border-box;
  }

  .shipping-slovakia-only-notice-text strong {
    display: block;
    font-size: 14px;
    line-height: 1.35;
    margin-bottom: 4px;
    color: #3b3b3b;
  }

  .shipping-slovakia-only-notice-text span {
    display: block;
    font-size: 13px;
    line-height: 1.45;
    color: #666;
  }

  @media (max-width: 768px) {
    .shipping-slovakia-only-notice-inner {
      padding: 10px 12px;
    }

    .shipping-slovakia-only-notice-text strong {
      font-size: 13px;
    }

    .shipping-slovakia-only-notice-text span {
      font-size: 12px;
    }
  }

  @media (max-width: 480px) {
    .shipping-slovakia-only-notice-inner {
      padding: 9px 10px;
    }

    .shipping-slovakia-only-notice-text strong {
      font-size: 12.5px;
    }

    .shipping-slovakia-only-notice-text span {
      font-size: 11.5px;
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
