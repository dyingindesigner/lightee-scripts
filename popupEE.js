/* ElectroEnergy – registration popup */

(function () {
  if (!window.prestashop) return;

  // Zobraziť LEN neprihláseným
  if (prestashop.customer && prestashop.customer.is_logged) return;

  // Nezobrazovať opakovane
  if (document.cookie.indexOf('ee_register_popup=1') !== -1) return;

  function createPopup() {
    var popup = document.createElement('div');
    popup.id = 'ee-register-popup';

    popup.innerHTML = `
      <div class="popup-box">
        <span class="close">&times;</span>
        <h3>Získajte 5 % zľavu</h3>
        <p>
          Zaregistrujte sa a po registrácii automaticky získate
          <strong>5 % zľavu</strong> na celý sortiment.
        </p>
        <a href="${prestashop.urls.pages.register}" class="btn btn-primary">
          Registrovať sa
        </a>
      </div>
    `;

    document.body.appendChild(popup);

    popup.querySelector('.close').addEventListener('click', function () {
      popup.style.display = 'none';
      document.cookie = 'ee_register_popup=1; path=/; max-age=2592000';
    });

    setTimeout(function () {
      popup.style.display = 'block';
    }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPopup);
  } else {
    createPopup();
  }
})();

