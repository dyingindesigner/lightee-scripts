// homepage-carousel.js
(function () {
  function initCarousel() {
    const block = document.querySelector("#products-4");
    if (!block || block.classList.contains("hp-carousel-ready")) return !!block;

    // nájdeme pôvodné produkty (len priame deti)
    const products = Array.from(block.children).filter(el =>
      el.classList.contains("product")
    );
    if (!products.length) return false;

    // vytvoríme nový "track" pre carousel
    const track = document.createElement("div");
    track.className = "hp-carousel-track";

    // presunieme produkty do tracku
    products.forEach(p => track.appendChild(p));
    block.appendChild(track);

    // označíme ako hotové
    block.classList.add("hp-carousel-ready");

    // inline štýly – aby to Shoptet už neprebil
    block.style.position = "relative";

    track.style.display = "flex";
    track.style.flexWrap = "nowrap";
    track.style.overflowX = "auto";
    track.style.scrollBehavior = "smooth";
    track.style.gap = "20px";
    track.style.padding = "20px 0 40px";

    products.forEach(card => {
      card.style.flex = "0 0 30%";
      card.style.maxWidth = "30%";
      card.style.minWidth = "30%";
      card.style.boxSizing = "border-box";
      card.style.float = "none";
      card.style.transform = "scale(0.9)";
    });

    // vytvoríme šípky
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "‹";
    prevBtn.className = "carousel-btn carousel-prev";

    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "›";
    nextBtn.className = "carousel-btn carousel-next";

    block.appendChild(prevBtn);
    block.appendChild(nextBtn);

    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: track.clientWidth * 0.9, behavior: "smooth" });
    });

    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: -track.clientWidth * 0.9, behavior: "smooth" });
    });

    return true;
  }

  // spustíme po načítaní stránky + niekoľko pokusov (pre prípad, že Shoptet
  // niečo dorenderuje neskôr)
  window.addEventListener("load", function () {
    let tries = 0;
    const timer = setInterval(() => {
      if (initCarousel() || ++tries > 20) {
        clearInterval(timer);
      }
    }, 300);
  });
})();
