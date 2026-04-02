(function () {
    var PHONE_ID = "custom-registration-phone";

    function isVisible(el) {
        if (!el) return false;
        if (!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)) return false;
        var style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
    }

    function createPhoneGroup() {
        var wrapper = document.createElement("div");
        wrapper.className = "form-group phone-form-group js-phone-form-group js-validated-element-wrapper smart-label-wrapper ee-phone-inserted";
        wrapper.innerHTML = `
            <label for="${PHONE_ID}">
                <span class="required-asterisk">Telefón *</span>
            </label>
            <div class="phone-combined-input" style="display:flex;gap:8px;align-items:stretch;">
                <select name="phoneCode" class="js-phone-code form-control" style="max-width:160px;">
                    <option value='{"phoneCode":"+421","countryCode":"SK","countryId":"151"}' selected>Slovensko +421</option>
                </select>
                <input
                    type="tel"
                    value=""
                    name="phone"
                    id="${PHONE_ID}"
                    class="form-control js-phone-form-control js-validate js-validate-phone js-validate-required"
                    autocomplete="tel"
                    inputmode="tel"
                    required
                >
            </div>
            <div class="js-validator-msg msg-error" data-type="validatorRequired" style="display:none;">Povinné pole</div>
        `;

        var input = wrapper.querySelector('input[name="phone"]');
        var error = wrapper.querySelector('.js-validator-msg');

        function validate() {
            var ok = !!(input.value || "").trim();
            error.style.display = ok ? "none" : "block";
            input.classList.toggle("error", !ok);
            return ok;
        }

        input.addEventListener("blur", validate);
        input.addEventListener("input", validate);
        wrapper._validatePhoneField = validate;

        return wrapper;
    }

    function getVisibleBirthdate() {
        var birthdates = document.querySelectorAll('#register-form input[name="birthdate"]');
        for (var i = 0; i < birthdates.length; i++) {
            if (isVisible(birthdates[i])) return birthdates[i];
        }
        return null;
    }

    function getSectionRoot(birthdate) {
        if (!birthdate) return null;

        var group = birthdate.closest('.form-group');
        if (!group) return null;

        var node = group.parentElement;
        while (node && node.id !== "register-form") {
            if (node.querySelectorAll('.form-group').length >= 3 && isVisible(node)) {
                return node;
            }
            node = node.parentElement;
        }

        return group.parentElement || birthdate.closest('#register-form');
    }

    function hasVisiblePhone(root) {
        if (!root) return false;
        var phones = root.querySelectorAll('input[name="phone"], input[type="tel"]');
        for (var i = 0; i < phones.length; i++) {
            if (isVisible(phones[i])) return true;
        }
        return false;
    }

    function injectPhone() {
        var birthdate = getVisibleBirthdate();
        if (!birthdate) return;

        var birthdateGroup = birthdate.closest('.form-group');
        if (!birthdateGroup || !isVisible(birthdateGroup)) return;

        var root = getSectionRoot(birthdate);
        if (!root || !isVisible(root)) return;

        if (root.querySelector('.ee-phone-inserted')) return;
        if (hasVisiblePhone(root)) return;

        var phoneGroup = createPhoneGroup();
        birthdateGroup.after(phoneGroup);

        var form = birthdate.closest('form');
        if (form && !form.dataset.eePhoneBound) {
            form.dataset.eePhoneBound = "1";
            form.addEventListener("submit", function (e) {
                var visibleCustomPhone = document.querySelector('#' + PHONE_ID);
                if (!visibleCustomPhone || !isVisible(visibleCustomPhone)) return;

                var wrap = visibleCustomPhone.closest('.ee-phone-inserted');
                if (wrap && wrap._validatePhoneField && !wrap._validatePhoneField()) {
                    e.preventDefault();
                    e.stopPropagation();
                    visibleCustomPhone.focus();
                }
            }, true);
        }

        console.log("[ee-phone] phone inserted into visible retail section");
    }

    function boot() {
        injectPhone();
        setTimeout(injectPhone, 400);
        setTimeout(injectPhone, 1200);
        setTimeout(injectPhone, 2500);

        var observer = new MutationObserver(function () {
            injectPhone();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "style"]
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
