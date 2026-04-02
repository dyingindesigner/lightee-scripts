(function () {
    var INSERTED_CLASS = "ee-phone-retail";
    var PHONE_ID = "ee-retail-phone";
    var PHONE_CODE_ID = "ee-retail-phone-code";

    var FALLBACK_COUNTRIES = [
        { name: "Slovensko", countryCode: "SK", phoneCode: "+421", countryId: "151", preferred: true, flag: "🇸🇰" },
        { name: "Česko", countryCode: "CZ", phoneCode: "+420", countryId: "58", preferred: true, flag: "🇨🇿" },
        { name: "Maďarsko", countryCode: "HU", phoneCode: "+36", countryId: "99", preferred: false, flag: "🇭🇺" },
        { name: "Nemecko", countryCode: "DE", phoneCode: "+49", countryId: "82", preferred: false, flag: "🇩🇪" },
        { name: "Poľsko", countryCode: "PL", phoneCode: "+48", countryId: "164", preferred: false, flag: "🇵🇱" },
        { name: "Rakúsko", countryCode: "AT", phoneCode: "+43", countryId: "14", preferred: false, flag: "🇦🇹" }
    ];

    function getForm() {
        return document.querySelector("#register-form");
    }

    function getBirthdateGroup(form) {
        var birthdate = form && form.querySelector('input[name="birthdate"]');
        return birthdate ? birthdate.closest(".form-group") : null;
    }

    function getRetailGroup(form) {
        return form && form.querySelector("." + INSERTED_CLASS);
    }

    function getRetailInput(form) {
        return form && form.querySelector("#" + PHONE_ID);
    }

    function getRetailSelect(form) {
        return form && form.querySelector("#" + PHONE_CODE_ID);
    }

    function getOriginalGroup(form) {
        return form && form.querySelector("#additionalInformation .phone-form-group");
    }

    function getOriginalInput(form) {
        return form && form.querySelector('#additionalInformation input[name="phone"]');
    }

    function getOriginalSelect(form) {
        return form && form.querySelector('#additionalInformation select[name="phoneCode"]');
    }

    function getWholesaleRadio(form) {
        return form && form.querySelector("#velkoobchodny-odberatel");
    }

    function isWholesaleSelected(form) {
        var wholesale = getWholesaleRadio(form);
        return !!(wholesale && wholesale.checked);
    }

    function parseOptions(select) {
        var out = [];
        if (!select) return out;

        var options = select.querySelectorAll("option");
        for (var i = 0; i < options.length; i++) {
            try {
                var value = JSON.parse(options[i].value);
                out.push({
                    name: (options[i].textContent || "").replace(/\s+/g, " ").trim().replace(/\s*\+\d+$/, ""),
                    countryCode: value.countryCode,
                    phoneCode: value.phoneCode,
                    countryId: value.countryId,
                    preferred: i < 2,
                    flag: flagEmoji(value.countryCode)
                });
            } catch (e) {}
        }
        return out;
    }

    function flagEmoji(countryCode) {
        if (!countryCode || countryCode.length !== 2) return "🏳";
        var code = countryCode.toUpperCase();
        return String.fromCodePoint(code.charCodeAt(0) + 127397) +
               String.fromCodePoint(code.charCodeAt(1) + 127397);
    }

    function optionValue(item) {
        return JSON.stringify({
            phoneCode: item.phoneCode,
            countryCode: item.countryCode,
            countryId: item.countryId
        });
    }

    function buildFlagsMarkup(countries) {
        var items = countries.map(function (item, index) {
            var classes = ["country-flag"];
            if (index === 0) classes.push("selected");
            if (item.preferred) classes.push("country-flag-preferred");

            return (
                '<div class="' + classes.join(" ") + '"' +
                ' data-rel="' + item.countryCode + '"' +
                ' data-dial="' + item.phoneCode.replace("+", "") + '"' +
                ' data-country-name="' + item.name.toLowerCase() + '"' +
                ' tabindex="0">' +
                    '<span class="shp-flag" aria-hidden="true" style="display:flex;align-items:center;justify-content:center;font-size:20px;">' + item.flag + '</span>' +
                    '<span class="shp-flag-label">' +
                        '<span class="shp-flag-name">' + item.name + '</span>' +
                        item.phoneCode +
                    '</span>' +
                '</div>'
            );
        }).join("");

        return (
            '<div class="country-flags" tabindex="0">' +
                '<div class="country-flags-inner">' +
                    items +
                '</div>' +
            '</div>'
        );
    }

    function buildSelectMarkup(countries) {
        return (
            '<select id="' + PHONE_CODE_ID + '" name="phoneCode" class="js-phone-code">' +
            countries.map(function (item, index) {
                return '<option value=\'' + optionValue(item) + '\'' + (index === 0 ? " selected" : "") + '>' +
                    item.name + " " + item.phoneCode +
                '</option>';
            }).join("") +
            '</select>'
        );
    }

    function buildRetailGroup(countries) {
        var wrapper = document.createElement("div");
        wrapper.className = "form-group phone-form-group js-phone-form-group js-validated-element-wrapper smart-label-wrapper " + INSERTED_CLASS;

        wrapper.innerHTML =
            '<label for="' + PHONE_ID + '"><span class="required-asterisk">Telefón *</span></label>' +
            '<div class="phone-combined-input">' +
                buildFlagsMarkup(countries) +
                buildSelectMarkup(countries) +
                '<input type="tel" id="' + PHONE_ID + '" name="phone" class="form-control js-phone-form-control js-validate js-validate-phone js-validate-required" autocomplete="tel" inputmode="tel" required>' +
            '</div>' +
            '<div class="js-validator-msg msg-error" data-type="validatorRequired" style="display:none;">Povinné pole</div>';

        return wrapper;
    }

    function reinitPhoneFlags(group) {
        if (!group || !window.shoptet || !shoptet.phoneInput) return;

        var flags = group.querySelector(".country-flags");
        if (flags) {
            flags.classList.remove("initialized");
        }

        if (typeof shoptet.phoneInput.interconnectFlagsWithSelect === "function") {
            shoptet.phoneInput.interconnectFlagsWithSelect();
        }
    }

    function ensureRetailGroup() {
        var form = getForm();
        if (!form) return;

        var birthdateGroup = getBirthdateGroup(form);
        if (!birthdateGroup) return;

        var retailGroup = getRetailGroup(form);
        if (retailGroup) return retailGroup;

        var countries = parseOptions(getOriginalSelect(form));
        if (!countries.length) countries = FALLBACK_COUNTRIES.slice();

        retailGroup = buildRetailGroup(countries);
        birthdateGroup.after(retailGroup);
        reinitPhoneFlags(retailGroup);

        return retailGroup;
    }

    function syncFromOriginalIfAvailable() {
        var form = getForm();
        if (!form) return;

        var originalSelect = getOriginalSelect(form);
        var retailGroup = getRetailGroup(form);
        var retailSelect = getRetailSelect(form);

        if (!retailGroup || !originalSelect || retailGroup.dataset.eeOptionsSynced === "1") return;

        var countries = parseOptions(originalSelect);
        if (!countries.length) return;

        var combined = retailGroup.querySelector(".phone-combined-input");
        var input = getRetailInput(form);
        if (!combined || !input) return;

        combined.innerHTML =
            buildFlagsMarkup(countries) +
            buildSelectMarkup(countries) +
            input.outerHTML;

        retailGroup.dataset.eeOptionsSynced = "1";
        reinitPhoneFlags(retailGroup);
    }

    function toggleMode() {
        var form = getForm();
        if (!form) return;

        var retailGroup = getRetailGroup(form);
        var retailInput = getRetailInput(form);
        var retailSelect = getRetailSelect(form);
        var originalGroup = getOriginalGroup(form);
        var originalInput = getOriginalInput(form);
        var originalSelect = getOriginalSelect(form);
        var wholesale = isWholesaleSelected(form);

        if (retailGroup) {
            retailGroup.style.display = wholesale ? "none" : "";
        }

        if (retailInput) {
            retailInput.disabled = wholesale;
        }

        if (retailSelect) {
            retailSelect.disabled = wholesale;
        }

        if (originalGroup) {
            originalGroup.style.display = wholesale ? "" : "none";
        }

        if (originalInput) {
            originalInput.disabled = !wholesale;
        }

        if (originalSelect) {
            originalSelect.disabled = !wholesale;
        }
    }

    function validateRetail() {
        var form = getForm();
        if (!form || isWholesaleSelected(form)) return true;

        var input = getRetailInput(form);
        var group = getRetailGroup(form);
        var error = group && group.querySelector('.js-validator-msg[data-type="validatorRequired"]');

        var ok = !!(input && input.value && input.value.trim());

        if (error) {
            error.style.display = ok ? "none" : "block";
        }
        if (input) {
            input.classList.toggle("error", !ok);
        }

        return ok;
    }

    function bindOnce(form) {
        if (form.dataset.eePhoneBound === "1") return;
        form.dataset.eePhoneBound = "1";

        form.addEventListener("submit", function (e) {
            if (!validateRetail()) {
                e.preventDefault();
                e.stopPropagation();
                var input = getRetailInput(form);
                if (input) input.focus();
            }
        }, true);

        form.addEventListener("input", function (e) {
            if (e.target && e.target.id === PHONE_ID) {
                validateRetail();
            }
        });

        form.addEventListener("change", function () {
            toggleMode();
            syncFromOriginalIfAvailable();
        });
    }

    function run() {
        var form = getForm();
        if (!form) return;

        ensureRetailGroup();
        syncFromOriginalIfAvailable();
        toggleMode();
        bindOnce(form);
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
