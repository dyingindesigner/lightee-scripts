(function () {
    var insertedForms = new WeakSet();
    function createPhoneGroup() {
        var wrapper = document.createElement("div");
        wrapper.className = "form-group phone-form-group js-phone-form-group js-validated-element-wrapper smart-label-wrapper";
        wrapper.innerHTML = `
            <label for="custom-registration-phone">
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
                    id="custom-registration-phone"
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
    function findInsertTarget(form) {
        var birthdate = form.querySelector('input[name="birthdate"]');
        if (birthdate && birthdate.closest(".form-group")) {
            return birthdate.closest(".form-group");
        }
        var candidates = [
            'input[name="email"]',
            'input[type="email"]',
            'input[name="surname"]',
            'input[name="name"]',
            'input[name="billingSurname"]',
            'input[name="billingName"]'
        ];
        for (var i = 0; i < candidates.length; i++) {
            var el = form.querySelector(candidates[i]);
            if (el && el.closest(".form-group")) {
                return el.closest(".form-group");
            }
        }
        return null;
    }
    function shouldSkipForm(form) {
        if (!form) return true;
        if (insertedForms.has(form)) return true;
        if (form.querySelector('input[name="phone"]')) return true;
        return false;
    }
    function enhanceForm(form) {
        if (shouldSkipForm(form)) return;
        var target = findInsertTarget(form);
        if (!target) return;
        var phoneGroup = createPhoneGroup();
        target.after(phoneGroup);
        insertedForms.add(form);
        form.addEventListener("submit", function (e) {
            var phoneInput = form.querySelector('#custom-registration-phone');
            var phoneWrap = phoneInput && phoneInput.closest('.phone-form-group');
            if (!phoneInput || !phoneWrap || !phoneWrap._validatePhoneField) return;
            if (!phoneWrap._validatePhoneField()) {
                e.preventDefault();
                e.stopPropagation();
                phoneInput.focus();
            }
        }, true);
    }
    function scanForms() {
        var forms = document.querySelectorAll("form");
        forms.forEach(function (form) {
            if (!form.querySelector('input[name="birthdate"]')) return;
            enhanceForm(form);
        });
    }
    function boot() {
        scanForms();
        var observer = new MutationObserver(function () {
            scanForms();
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
