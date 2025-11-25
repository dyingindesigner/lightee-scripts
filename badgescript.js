/* Lightee – UltraSafe Badge System */

(function () {
    console.log("%c[LighteeBadge] Loaded", "color:#0a84ff; font-weight:bold;");

    // CONFIG
    const BADGE_CLASS = "lightee-badge";
    const BADGE_CONTAINER_ID = "lightee-badge-overlay";

    // Create global container ONCE
    function getContainer() {
        let c = document.getElementById(BADGE_CONTAINER_ID);
        if (!c) {
            c = document.createElement("div");
            c.id = BADGE_CONTAINER_ID;
            c.style.position = "absolute";
            c.style.top = "0";
            c.style.left = "0";
            c.style.width = "100%";
            c.style.pointerEvents = "none";
            c.style.zIndex = "99999";
            document.body.appendChild(c);
        }
        return c;
    }

    // Read cart content safely
    function getCartItems() {
        try {
            const dl = window.dataLayer || [];
            const cart = dl.find(e => e.shoptet && e.shoptet.cart);
            return cart ? cart.shoptet.cart : [];
        } catch (e) {
            console.warn("[LighteeBadge] Error reading cart:", e);
            return [];
        }
    }

    // Render all badges
    function renderBadges() {
        const container = getContainer();
        container.innerHTML = ""; // Clear safe overlay

        const products = document.querySelectorAll("button.add-to-cart-button");
        const cart = getCartItems();

        products.forEach(btn => {
            const form = btn.closest("form");
            if (!form) return;

            const priceIdEl = form.querySelector("input[name='priceId']");
            if (!priceIdEl) return;

            const priceId = priceIdEl.value;
            const cartItem = cart.find(i => i.priceId == priceId);

            if (cartItem && cartItem.quantity > 0) {
                const rect = btn.getBoundingClientRect();

                const badge = document.createElement("div");
                badge.className = BADGE_CLASS;
                badge.textContent = cartItem.quantity;

                badge.style.position = "absolute";
                badge.style.top = (rect.top + window.scrollY - 10) + "px";
                badge.style.left = (rect.left + window.scrollX + rect.width - 10) + "px";

                container.appendChild(badge);
            }
        });
    }

    // Run once page loads
    function init() {
        renderBadges();

        // Re-render when Shoptet updates the cart
        document.addEventListener("shoptet.cart.updated", renderBadges);

        // Re-render on scroll & resize (buttons move)
        window.addEventListener("scroll", renderBadges, { passive: true });
        window.addEventListener("resize", renderBadges);
    }

    // Wait until DOM ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
