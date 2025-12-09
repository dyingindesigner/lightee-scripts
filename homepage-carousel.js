document.addEventListener("DOMContentLoaded", function () {
  const slider = document.querySelector("#products-4");
  if (!slider) return;

  /* === FORCE INLINE STYLE OVERRIDE (PREBIJE SHOPTET) === */
  slider.style.display = "flex";
  slider.style.flexWrap = "nowrap";
  slider.style.overflowX = "auto";
  slider.style.scrollBehavior = "smooth";
  slider.style.gap = "20px";
  slider.style.width = "100%";

  const products = slider.querySelectorAll(".product");

  products.forEach((item) => {
    item.style.float = "none";
    item.style.display = "block";
    item.style.flex = "0 0 30%";
    item.style.maxWidth = "30%";
    item.style.minWidth = "30%";
    item.style.boxSizing = "border-box";
    item.style.transform = "scale(0.9)";
  });

  /* === VYTVORENIE ŠÍPOK === */
  const prevBtn = document.createElement("button");
  prevBtn.innerHTML = "‹";
  prevBtn.className = "carousel-btn carousel-prev";

  const nextBtn = document.createElement("button");
  nextBtn.innerHTML = "›";
  nextBtn.className = "carousel-btn carousel-next";

  slider.parentElement.style.position = "relative";
  slider.parentElement.appendChild(prevBtn);
  slider.parentElement.appendChild(nextBtn);

  nextBtn.addEventListener("click", () => {
    slider.scrollBy({ left: slider.clientWidth * 0.9, behavior: "smooth" });
  });

  prevBtn.addEventListener("click", () => {
    slider.scrollBy({ left: -slider.clientWidth * 0.9, behavior: "smooth" });
  });
});
