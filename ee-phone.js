(function () {
    var INSERTED_CLASS = "ee-phone-retail";
    var PHONE_ID = "ee-retail-phone";
    var PHONE_CODE_ID = "ee-retail-phone-code";

    function isVisible(el) {
        if (!el) return false;
        var style = window.getComputedStyle(el);
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) &&
            style.display !== "none" &&
            style.visibility !== "hidden";
    }

    function getForm() {
        return document.querySelector("#register-form");
    }

    function getRetailBirthdateGroup(form) {
        var birthdate = form && form.querySelector('input[name="birthdate"]');
        return birthdate ? birthdate.closest(".form-group") : null;
    }

    function getOriginalPhoneInput(form) {
        return form && form.querySelector('#additionalInformation input[name="phone"]');
    }

    function getOriginalPhoneCode(form) {
        return form && form.querySelector('#additionalInformation select[name="phoneCode"]');
    }

    function getWholesaleRadio(form) {
        return form && form.querySelector('#velkoobchodny-odberatel');
    }

    function isWholesaleSelected(form) {
        var wholesale = getWholesaleRadio(form);
        return !!(wholesale && wholesale.checked);
    }

    function ensureError(wrapper) {
        var error = wrapper.querySelector('.js-validator-msg[data-type="validatorRequired"]');
        if (!error) {
            error = document.createElement("div");
            error.className = "js-validator-msg msg-error";
            error.setAttribute("data-type", "validatorRequired");
            error.textContent = "Povinné pole";
            error.style.display = "none";
            wrapper.appendChild(error);
        }
        return error;
    }

    function createRetailPhoneGroup(form) {
        var originalPhoneCode = getOriginalPhoneCode(form);
        var selectedValue = originalPhoneCode && originalPhoneCode.value
            ? originalPhoneCode.value
            : '{"phoneCode":"+421","countryCode":"SK","countryId":"151"}';

        var wrapper = document.createElement("div");
        wrapper.className = "form-group phone-form-group js-validated-element-wrapper smart-label-wrapper " + INSERTED_CLASS;

        wrapper.innerHTML = `
            <label for="${PHONE_ID}">
                <span class="required-asterisk">Telefón *</span>
            </label>
            <div class="phone-combined-input" style="display:flex;gap:8px;align-items:stretch;">
                <select id="${PHONE_CODE_ID}" class="js-phone-code form-control" style="max-width:180px;">
                    <option value='{"phoneCode":"+421","countryCode":"SK","countryId":"151"}'>Slovensko +421</option>
                </select>
                <input
                    type="tel"
                    id="${PHONE_ID}"
                    class="form-control js-validate js-validate-phone js-validate-required"
                    autocomplete="tel"
                    inputmode="tel"
                    required
                >
            </div>
        `;

        var retailInput = wrapper.querySelector("#" + PHONE_ID);
        var retailCode = wrapper.querySelector("#" + PHONE_CODE_ID);
        var originalInput = getOriginalPhoneInput(form);
        var error = ensureError(wrapper);

        retailCode.value = selectedValue;
        if (originalInput && originalInput.value) {
            retailInput.value = originalInput.value;
        }

        function syncToOriginal() {
            if (originalInput) {
                originalInput.value = retailInput.value || "";
                originalInput.classList.add("js-validate", "js-validate-phone", "js-validate-required");
                originalInput.classList.remove("js-validation-suspended");
                originalInput.required = true;
            }
            if (originalPhoneCode) {
                originalPhoneCode.value = retailCode.value;
            }
        }

        function validate() {
            syncToOriginal();
            var ok = !!(retailInput.value || "").trim();
            error.style.display = ok ? "none" : "block";
            retailInput.classList.toggle("error", !ok);
            return ok;
        }

        retailInput.addEventListener("input", validate);
        retailInput.addEventListener("blur", validate);
        retailCode.addEventListener("change", syncToOriginal);

        wrapper._validateRetailPhone = validate;
        wrapper._syncRetailPhone = syncToOriginal;

        return wrapper;
    }

    function insertRetailPhone() {
        var form = getForm();
        if (!form) return;

        var birthdateGroup = getRetailBirthdateGroup(form);
        if (!birthdateGroup) return;

        var existingRetail = form.querySelector("." + INSERTED_CLASS);
        if (!existingRetail) {
            existingRetail = createRetailPhoneGroup(form);
            birthdateGroup.after(existingRetail);
        }

        if (!existingRetail.dataset.eePhoneSubmitBound) {
            existingRetail.dataset.eePhoneSubmitBound = "1";
            form.addEventListener("submit", function (e) {
                var retailBlock = form.querySelector("." + INSERTED_CLASS);
                if (!retailBlock || !isVisible(retailBlock)) return;
                if (!retailBlock._validateRetailPhone || !retailBlock._validateRetailPhone()) {
                    e.preventDefault();
                    e.stopPropagation();
                    var input = retailBlock.querySelector("#" + PHONE_ID);
                    if (input) input.focus();
                }
            }, true);
        }
    }

    function updateVisibility() {
        var form = getForm();
        if (!form) return;

        var retailBlock = form.querySelector("." + INSERTED_CLASS);
        var originalPhoneGroup = form.querySelector('#additionalInformation .phone-form-group');
        var wholesale = isWholesaleSelected(form);

        if (retailBlock) {
            retailBlock.style.display = wholesale ? "none" : "";
        }

        if (originalPhoneGroup) {
            originalPhoneGroup.style.display = wholesale ? "" : "none";
        }
    }

    function boot() {
        insertRetailPhone();
        updateVisibility();

        setTimeout(function () {
            insertRetailPhone();
            updateVisibility();
        }, 400);

        setTimeout(function () {
            insertRetailPhone();
            updateVisibility();
        }, 1200);

        setTimeout(function () {
            insertRetailPhone();
            updateVisibility();
        }, 2500);

        var observer = new MutationObserver(function () {
            insertRetailPhone();
            updateVisibility();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "style", "checked"]
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
