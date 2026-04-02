(function () {
    var INSERTED_CLASS = "ee-phone-retail";
    var PHONE_ID = "ee-retail-phone";
    var PHONE_CODE_ID = "ee-retail-phone-code";

    function getForm() {
        return document.querySelector("#register-form");
    }

    function getBirthdateGroup(form) {
        var birthdate = form && form.querySelector('input[name="birthdate"]');
        return birthdate ? birthdate.closest(".form-group") : null;
    }

    function getRetailPhoneGroup(form) {
        return form && form.querySelector("." + INSERTED_CLASS);
    }

    function getOriginalPhoneGroup(form) {
        return form && form.querySelector("#additionalInformation .phone-form-group");
    }

    function getOriginalPhoneInput(form) {
        return form && form.querySelector('#additionalInformation input[name="phone"]');
    }

    function getOriginalPhoneCode(form) {
        return form && form.querySelector('#additionalInformation select[name="phoneCode"]');
    }

    function getWholesaleRadio(form) {
        return form && form.querySelector("#velkoobchodny-odberatel");
    }

    function isWholesaleSelected(form) {
        var wholesale = getWholesaleRadio(form);
        return !!(wholesale && wholesale.checked);
    }

    function buildFallbackRetailGroup() {
        var wrapper = document.createElement("div");
        wrapper.className = "form-group phone-form-group js-phone-form-group js-validated-element-wrapper smart-label-wrapper " + INSERTED_CLASS;

        wrapper.innerHTML = `
            <label for="${PHONE_ID}">
                <span class="required-asterisk">Telefón *</span>
            </label>
            <div class="phone-combined-input">
                <select id="${PHONE_CODE_ID}" name="eeRetailPhoneCode" class="js-phone-code">
                    <option value='{"phoneCode":"+421","countryCode":"SK","countryId":"151"}' selected>Slovensko +421</option>
                    <option value='{"phoneCode":"+420","countryCode":"CZ","countryId":"58"}'>Česko +420</option>
                    <option value='{"phoneCode":"+36","countryCode":"HU","countryId":"99"}'>Maďarsko +36</option>
                    <option value='{"phoneCode":"+49","countryCode":"DE","countryId":"82"}'>Nemecko +49</option>
                    <option value='{"phoneCode":"+48","countryCode":"PL","countryId":"164"}'>Poľsko +48</option>
                    <option value='{"phoneCode":"+43","countryCode":"AT","countryId":"14"}'>Rakúsko +43</option>
                </select>
                <input
                    type="tel"
                    id="${PHONE_ID}"
                    name="eeRetailPhone"
                    class="form-control js-phone-form-control js-validate js-validate-phone js-validate-required"
                    autocomplete="tel"
                    inputmode="tel"
                    required
                >
            </div>
            <div class="js-validator-msg msg-error" data-type="validatorRequired" style="display:none;">Povinné pole</div>
        `;

        return wrapper;
    }

    function enhanceRetailGroupFromOriginal(form, retailGroup) {
        var originalGroup = getOriginalPhoneGroup(form);
        if (!originalGroup || !retailGroup || retailGroup.dataset.eeEnhanced === "1") return;

        var retailSelect = retailGroup.querySelector("#" + PHONE_CODE_ID);
        var retailInput = retailGroup.querySelector("#" + PHONE_ID);

        var originalSelect = originalGroup.querySelector('select[name="phoneCode"]');
        var originalLabel = originalGroup.querySelector("label");
        var originalError = originalGroup.querySelector('.js-validator-msg[data-type="validatorRequired"]');

        if (originalLabel) {
            var retailLabel = retailGroup.querySelector("label");
            if (retailLabel) {
                retailLabel.innerHTML = originalLabel.innerHTML;
                retailLabel.setAttribute("for", PHONE_ID);
            }
        }

        if (originalSelect && retailSelect) {
            var newSelect = originalSelect.cloneNode(true);
            newSelect.id = PHONE_CODE_ID;
            newSelect.name = "eeRetailPhoneCode";
            retailSelect.replaceWith(newSelect);
        }

        if (originalError) {
            var retailError = retailGroup.querySelector('.js-validator-msg[data-type="validatorRequired"]');
            if (retailError) {
                retailError.className = originalError.className;
                retailError.innerHTML = originalError.innerHTML;
                retailError.style.display = "none";
            }
        }

        if (retailInput) {
            retailInput.className = "form-control js-phone-form-control js-validate js-validate-phone js-validate-required";
        }

        retailGroup.dataset.eeEnhanced = "1";
    }

    function syncRetailToOriginal(form) {
        var retailGroup = getRetailPhoneGroup(form);
        if (!retailGroup) return;

        var retailInput = retailGroup.querySelector("#" + PHONE_ID);
        var retailCode = retailGroup.querySelector("#" + PHONE_CODE_ID);
        var originalInput = getOriginalPhoneInput(form);
        var originalCode = getOriginalPhoneCode(form);

        if (originalInput && retailInput) {
            originalInput.value = retailInput.value || "";
            originalInput.required = true;
        }

        if (originalCode && retailCode) {
            originalCode.value = retailCode.value;
        }
    }

    function validateRetail(form) {
        var retailGroup = getRetailPhoneGroup(form);
        if (!retailGroup || isWholesaleSelected(form)) return true;

        var retailInput = retailGroup.querySelector("#" + PHONE_ID);
        var error = retailGroup.querySelector('.js-validator-msg[data-type="validatorRequired"]');

        syncRetailToOriginal(form);

        var ok = !!(retailInput && retailInput.value && retailInput.value.trim());

        if (error) {
            error.style.display = ok ? "none" : "block";
        }
        if (retailInput) {
            retailInput.classList.toggle("error", !ok);
        }

        return ok;
    }

    function ensureRetailPhone() {
        var form = getForm();
        if (!form) return;

        var birthdateGroup = getBirthdateGroup(form);
        if (!birthdateGroup) return;

        var retailGroup = getRetailPhoneGroup(form);
        if (!retailGroup) {
            retailGroup = buildFallbackRetailGroup();
            birthdateGroup.after(retailGroup);

            retailGroup.addEventListener("input", function () {
                validateRetail(form);
            });

            retailGroup.addEventListener("change", function () {
                syncRetailToOriginal(form);
            });
        }

        enhanceRetailGroupFromOriginal(form, retailGroup);

        if (!form.dataset.eePhoneSubmitBound) {
            form.dataset.eePhoneSubmitBound = "1";
            form.addEventListener("submit", function (e) {
                if (!validateRetail(form)) {
                    e.preventDefault();
                    e.stopPropagation();
                    var input = form.querySelector("#" + PHONE_ID);
                    if (input) input.focus();
                }
            }, true);
        }
    }

    function updateVisibility() {
        var form = getForm();
        if (!form) return;

        var retailGroup = getRetailPhoneGroup(form);
        var originalGroup = getOriginalPhoneGroup(form);
        var wholesale = isWholesaleSelected(form);

        if (retailGroup) {
            retailGroup.style.display = wholesale ? "none" : "";
        }

        if (originalGroup) {
            originalGroup.style.display = wholesale ? "" : "none";
        }

        if (!wholesale) {
            syncRetailToOriginal(form);
        }
    }

    function run() {
        ensureRetailPhone();
        updateVisibility();
    }

    function boot() {
        run();
        setTimeout(run, 300);
        setTimeout(run, 1000);
        setTimeout(run, 2000);

        new MutationObserver(function () {
            run();
        }).observe(document.body, {
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
