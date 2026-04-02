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

    function getOriginalPhoneGroup(form) {
        return form && form.querySelector("#additionalInformation .phone-form-group");
    }

    function getOriginalPhoneInput(form) {
        return form && form.querySelector('#additionalInformation input[name="phone"]');
    }

    function getOriginalPhoneCode(form) {
        return form && form.querySelector('#additionalInformation select[name="phoneCode"]');
    }

    function getRetailPhoneGroup(form) {
        return form && form.querySelector("." + INSERTED_CLASS);
    }

    function getWholesaleRadio(form) {
        return form && form.querySelector("#velkoobchodny-odberatel");
    }

    function isWholesaleSelected(form) {
        var wholesale = getWholesaleRadio(form);
        return !!(wholesale && wholesale.checked);
    }

    function setRequiredError(group, visible) {
        var error = group && group.querySelector('.js-validator-msg[data-type="validatorRequired"]');
        if (error) {
            error.style.display = visible ? "block" : "none";
        }
    }

    function createRetailPhoneGroup(form) {
        var originalGroup = getOriginalPhoneGroup(form);
        if (!originalGroup) return null;

        var clone = originalGroup.cloneNode(true);
        var cloneInput = clone.querySelector('input[name="phone"], input#phone');
        var cloneCode = clone.querySelector('select[name="phoneCode"]');
        var cloneLabel = clone.querySelector('label');

        clone.classList.add(INSERTED_CLASS);

        if (cloneLabel) {
            cloneLabel.setAttribute("for", PHONE_ID);
        }

        if (cloneInput) {
            cloneInput.id = PHONE_ID;
            cloneInput.name = "eeRetailPhone";
            cloneInput.value = "";
            cloneInput.required = true;
            cloneInput.autocomplete = "tel";
        }

        if (cloneCode) {
            cloneCode.id = PHONE_CODE_ID;
            cloneCode.name = "eeRetailPhoneCode";
        }

        setRequiredError(clone, false);

        var originalInput = getOriginalPhoneInput(form);
        var originalCode = getOriginalPhoneCode(form);

        if (cloneInput && originalInput && originalInput.value) {
            cloneInput.value = originalInput.value;
        }

        if (cloneCode && originalCode && originalCode.value) {
            cloneCode.value = originalCode.value;
        }

        function syncToOriginal() {
            if (originalInput && cloneInput) {
                originalInput.value = cloneInput.value || "";
                originalInput.required = true;
            }
            if (originalCode && cloneCode) {
                originalCode.value = cloneCode.value;
            }
        }

        function validate() {
            if (isWholesaleSelected(form)) {
                setRequiredError(clone, false);
                return true;
            }
            syncToOriginal();
            var ok = !!(cloneInput && cloneInput.value && cloneInput.value.trim());
            setRequiredError(clone, !ok);
            if (cloneInput) {
                cloneInput.classList.toggle("error", !ok);
            }
            return ok;
        }

        if (cloneInput) {
            cloneInput.addEventListener("input", validate);
            cloneInput.addEventListener("blur", validate);
        }

        if (cloneCode) {
            cloneCode.addEventListener("change", syncToOriginal);
        }

        clone._syncRetailPhone = syncToOriginal;
        clone._validateRetailPhone = validate;

        return clone;
    }

    function ensureRetailPhone() {
        var form = getForm();
        if (!form) return;

        var birthdateGroup = getBirthdateGroup(form);
        if (!birthdateGroup) return;

        var retailGroup = getRetailPhoneGroup(form);
        if (!retailGroup) {
            retailGroup = createRetailPhoneGroup(form);
            if (!retailGroup) return;
            birthdateGroup.after(retailGroup);
        }

        if (!form.dataset.eePhoneSubmitBound) {
            form.dataset.eePhoneSubmitBound = "1";
            form.addEventListener("submit", function (e) {
                var retail = getRetailPhoneGroup(form);
                if (!retail || isWholesaleSelected(form)) return;
                if (retail._validateRetailPhone && !retail._validateRetailPhone()) {
                    e.preventDefault();
                    e.stopPropagation();
                    var input = retail.querySelector("#" + PHONE_ID);
                    if (input) input.focus();
                }
            }, true);
        }
    }

    function updatePhoneVisibility() {
        var form = getForm();
        if (!form) return;

        var retailGroup = getRetailPhoneGroup(form);
        var originalGroup = getOriginalPhoneGroup(form);
        var wholesale = isWholesaleSelected(form);

        if (retailGroup) {
            retailGroup.style.display = wholesale ? "none" : "";
            if (!wholesale && retailGroup._syncRetailPhone) {
                retailGroup._syncRetailPhone();
            }
        }

        if (originalGroup) {
            originalGroup.style.display = wholesale ? "" : "none";
        }
    }

    function run() {
        ensureRetailPhone();
        updatePhoneVisibility();
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
