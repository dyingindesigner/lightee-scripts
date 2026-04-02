(function () {
    var FORM_MARKER = "data-ee-phone-enhanced";

    function log() {
        try { console.log.apply(console, ["[ee-phone]"].concat([].slice.call(arguments))); } catch (e) {}
    }

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
        var error = wrapper.querySelector(".js-validator-msg");

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

    function getInsertTarget(form) {
        var selectors = [
            'input[name="birthdate"]',
            'input[id*="birth"]',
            'input[name*="birth"]',
            'input[name="email"]',
            'input[type="email"]',
            'input[name="surname"]',
            'input[name="name"]',
            'input[name="billingSurname"]',
            'input[name="billingName"]'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var el = form.querySelector(selectors[i]);
            if (el) {
                var group = el.closest(".form-group") || el.closest(".co-box") || el.parentElement;
                if (group) return group;
            }
        }

        return null;
    }

    function isRegistrationForm(form) {
        if (!form) return false;
        var text = (form.innerText || "").toLowerCase();
        return (
            text.indexOf("dátum narodenia") > -1 ||
            text.indexOf("meno a priezvisko") > -1 ||
            text.indexOf("registrova") > -1 ||
            text.indexOf("registrácia") > -1
        );
    }

    function enhanceForm(form) {
        if (!form || form.getAttribute(FORM_MARKER) === "1") return;
        if (!isRegistrationForm(form)) return;

        var existingPhone = form.querySelector('input[name="phone"], input[type="tel"]');
        if (existingPhone) {
            log("phone already exists in form, skipping");
            form.setAttribute(FORM_MARKER, "1");
            return;
        }

        var target = getInsertTarget(form);
        if (!target) {
            log("no insert target found");
            return;
        }

        var phoneGroup = createPhoneGroup();
        target.after(phoneGroup);
        form.setAttribute(FORM_MARKER, "1");
        log("phone inserted");

        form.addEventListener("submit", function (e) {
            var phoneInput = form.querySelector("#custom-registration-phone");
            var phoneWrap = phoneInput && phoneInput.closest(".phone-form-group");
            if (!phoneInput || !phoneWrap || !phoneWrap._validatePhoneField) return;

            if (!phoneWrap._validatePhoneField()) {
                e.preventDefault();
                e.stopPropagation();
                phoneInput.focus();
                log("blocked submit, phone empty");
            }
        }, true);
    }

    function scan() {
        var forms = document.querySelectorAll("form");
        for (var i = 0; i < forms.length; i++) {
            enhanceForm(forms[i]);
        }
    }

    function boot() {
        scan();
        setTimeout(scan, 500);
        setTimeout(scan, 1500);
        setTimeout(scan, 3000);

        var observer = new MutationObserver(function () {
            scan();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        log("booted");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
