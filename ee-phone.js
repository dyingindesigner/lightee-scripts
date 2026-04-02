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

    function makeEl(tag, className, text) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (typeof text === "string") el.textContent = text;
        return el;
    }

    function buildFlagsNode(countries) {
        var flags = makeEl("div", "country-flags");
        flags.setAttribute("tabindex", "0");

        var inner = makeEl("div", "country-flags-inner");
        flags.appendChild(inner);

        countries.forEach(function (item, index) {
            var cls = "country-flag";
            if (index === 0) cls += " selected";
            if (item.preferred) cls += " country-flag-preferred";

            var flagItem = makeEl("div", cls);
            flagItem.setAttribute("data-rel", item.countryCode);
            flagItem.setAttribute("data-dial", item.phoneCode.replace("+", ""));
            flagItem.setAttribute("data-country-name", item.name.toLowerCase());
            flagItem.setAttribute("tabindex", "0");

            var flagIcon = makeEl("span", "shp-flag");
            flagIcon.setAttribute("aria-hidden", "true");
            flagIcon.style.display = "flex";
            flagIcon.style.alignItems = "center";
            flagIcon.style.justifyContent = "center";
            flagIcon.style.fontSize = "20px";
            flagIcon.textContent = item.flag;

            var label = makeEl("span", "shp-flag-label");
            var labelName = makeEl("span", "shp-flag-name", item.name);
            label.appendChild(labelName);
            label.appendChild(document.createTextNode(item.phoneCode));

            flagItem.appendChild(flagIcon);
            flagItem.appendChild(label);
            inner.appendChild(flagItem);
        });

        return flags;
    }

    function buildSelectNode(countries) {
        var select = makeEl("select", "js-phone-code");
        select.id = PHONE_CODE_ID;
        select.name = "phoneCode";

        countries.forEach(function (item, index) {
            var option = document.createElement("option");
            option.value = optionValue(item);
            option.textContent = item.name + " " + item.phoneCode;
            if (index === 0) option.selected = true;
            select.appendChild(option);
        });

        return select;
    }

    function buildInputNode() {
        var input = makeEl("input", "form-control js-phone-form-control js-validate js-validate-phone js-validate-required");
        input.type = "tel";
        input.id = PHONE_ID;
        input.name = "phone";
        input.autocomplete = "tel";
        input.required = true;
        input.setAttribute("inputmode", "tel");
        return input;
    }

    function buildErrorNode() {
        var error = makeEl("div", "js-validator-msg msg-error", "Zadajte telefónne číslo.");
        error.setAttribute("data-type", "validatorRequired");
        error.style.display = "none";
        return error;
    }

    function buildRetailGroup(countries) {
        var wrapper = makeEl("div", "form-group phone-form-group js-phone-form-group js-validated-element-wrapper smart-label-wrapper " + INSERTED_CLASS);

        var label = document.createElement("label");
        label.setAttribute("for", PHONE_ID);

        var required = makeEl("span", "required-asterisk", "Telefón *");
        label.appendChild(required);

        var combined = makeEl("div", "phone-combined-input");
        combined.appendChild(buildFlagsNode(countries));
        combined.appendChild(buildSelectNode(countries));
        combined.appendChild(buildInputNode());

        wrapper.appendChild(label);
        wrapper.appendChild(combined);
        wrapper.appendChild(buildErrorNode());

        return wrapper;
    }

    function reinitPhoneFlags(group) {
        if (!group || !window.shoptet || !shoptet.phoneInput) return;

        var flags = group.querySelector(".country-flags");
        if (flags) flags.classList.remove("initialized");

        if (typeof shoptet.phoneInput.interconnectFlagsWithSelect === "function") {
            shoptet.phoneInput.interconnectFlagsWithSelect();
        }

        if (window.shoptet && shoptet.scripts && typeof shoptet.scripts.signalCustomEvent === "function") {
            try {
                shoptet.scripts.signalCustomEvent("ShoptetPhoneCodeChange", getRetailInput(getForm()));
            } catch (e) {}
        }
    }

    function ensureRetailGroup() {
        var form = getForm();
        if (!form) return null;

        var birthdateGroup = getBirthdateGroup(form);
        if (!birthdateGroup) return null;

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
        if (!retailGroup || !originalSelect || retailGroup.dataset.eeOptionsSynced === "1") return;

        var countries = parseOptions(originalSelect);
        if (!countries.length) return;

        var combined = retailGroup.querySelector(".phone-combined-input");
        var existingInput = getRetailInput(form);
        if (!combined || !existingInput) return;

        combined.innerHTML = "";
        combined.appendChild(buildFlagsNode(countries));
        combined.appendChild(buildSelectNode(countries));

        existingInput.id = PHONE_ID;
        existingInput.name = "phone";
        existingInput.className = "form-control js-phone-form-control js-validate js-validate-phone js-validate-required";
        existingInput.required = true;
        combined.appendChild(existingInput);

        retailGroup.dataset.eeOptionsSynced = "1";
        reinitPhoneFlags(retailGroup);
    }

    function syncRetailToOriginal() {
        var form = getForm();
        if (!form) return;

        var retailInput = getRetailInput(form);
        var retailSelect = getRetailSelect(form);
        var originalInput = getOriginalInput(form);
        var originalSelect = getOriginalSelect(form);

        if (originalInput && retailInput) {
            originalInput.value = retailInput.value || "";
            originalInput.required = true;
        }

        if (originalSelect && retailSelect) {
            originalSelect.value = retailSelect.value;
            originalSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
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

        if (retailGroup) retailGroup.style.display = wholesale ? "none" : "";
        if (retailInput) retailInput.disabled = wholesale;
        if (retailSelect) retailSelect.disabled = wholesale;

        if (originalGroup) originalGroup.style.display = wholesale ? "" : "none";
        if (originalInput) originalInput.disabled = !wholesale;
        if (originalSelect) originalSelect.disabled = !wholesale;
    }

    function validateRetail() {
        var form = getForm();
        if (!form || isWholesaleSelected(form)) return true;

        var input = getRetailInput(form);
        var group = getRetailGroup(form);
        var error = group && group.querySelector('.js-validator-msg[data-type="validatorRequired"]');
        var ok = !!(input && input.value && input.value.trim());

        if (error) error.style.display = ok ? "none" : "block";
        if (input) input.classList.toggle("error", !ok);

        return ok;
    }

    function bindOnce(form) {
        if (form.dataset.eePhoneBound === "1") return;
        form.dataset.eePhoneBound = "1";

        form.addEventListener("submit", function (e) {
            syncRetailToOriginal();
            if (!validateRetail()) {
                e.preventDefault();
                e.stopPropagation();
                var input = getRetailInput(form);
                if (input) input.focus();
            }
        }, true);

        form.addEventListener("input", function (e) {
            if (e.target && e.target.id === PHONE_ID) {
                syncRetailToOriginal();
                validateRetail();
            }
        });

        form.addEventListener("change", function () {
            syncRetailToOriginal();
            toggleMode();
            syncFromOriginalIfAvailable();
        });
    }

    function run() {
        var form = getForm();
        if (!form) return;

        ensureRetailGroup();
        syncFromOriginalIfAvailable();
        syncRetailToOriginal();
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
