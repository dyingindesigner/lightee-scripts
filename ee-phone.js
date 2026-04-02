(function () {
    function makePhoneRequired(phoneGroup) {
        if (!phoneGroup) return;
        var phoneInput = phoneGroup.querySelector('input[name="phone"]');
        if (!phoneInput) return;
        phoneInput.required = true;
        phoneInput.classList.add("js-validate", "js-validate-phone", "js-validate-required");
        phoneInput.classList.remove("js-validation-suspended");
        var label = phoneGroup.querySelector("label");
        if (label && !/\*/.test(label.textContent)) {
            label.innerHTML = '<span class="required-asterisk">Telefón *</span>';
        }
        var error = phoneGroup.querySelector('.js-validator-msg[data-type="validatorRequired"]');
        if (!error) {
            error = document.createElement("div");
            error.className = "js-validator-msg msg-error";
            error.setAttribute("data-type", "validatorRequired");
            error.textContent = "Povinné pole";
            error.style.display = "none";
            phoneGroup.appendChild(error);
        }
        function validatePhone() {
            var ok = !!(phoneInput.value || "").trim();
            error.style.display = ok ? "none" : "block";
            phoneInput.classList.toggle("error", !ok);
            return ok;
        }
        if (!phoneInput.dataset.eePhoneBound) {
            phoneInput.dataset.eePhoneBound = "1";
            phoneInput.addEventListener("blur", validatePhone);
            phoneInput.addEventListener("input", validatePhone);
            var form = phoneInput.closest("form");
            if (form && !form.dataset.eePhoneSubmitBound) {
                form.dataset.eePhoneSubmitBound = "1";
                form.addEventListener("submit", function (e) {
                    if (!validatePhone()) {
                        e.preventDefault();
                        e.stopPropagation();
                        phoneInput.focus();
                    }
                }, true);
            }
        }
    }
    function moveExistingPhone() {
        var form = document.querySelector("#register-form");
        if (!form) return;
        var birthdate = form.querySelector('input[name="birthdate"]');
        var birthdateGroup = birthdate && birthdate.closest(".form-group");
        if (!birthdateGroup) return;
        var phoneGroup = form.querySelector("#additionalInformation .phone-form-group") ||
                         form.querySelector(".phone-form-group");
        if (!phoneGroup) return;
        if (!phoneGroup.classList.contains("ee-phone-moved")) {
            birthdateGroup.after(phoneGroup);
            phoneGroup.classList.add("ee-phone-moved");
        }
        phoneGroup.style.display = "";
        phoneGroup.classList.remove("js-hidden");
        makePhoneRequired(phoneGroup);
    }
    function boot() {
        moveExistingPhone();
        setTimeout(moveExistingPhone, 400);
        setTimeout(moveExistingPhone, 1200);
        setTimeout(moveExistingPhone, 2500);
        var observer = new MutationObserver(function () {
            moveExistingPhone();
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
