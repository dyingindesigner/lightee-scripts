document.addEventListener("DOMContentLoaded", function () {
  const slider = document.querySelector("#products-4");
  if (!slider) return;

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
    slider.scrollBy({ left: slider.clientWidth, behavior: "smooth" });
  });

  prevBtn.addEventListener("click", () => {
    slider.scrollBy({ left: -slider.clientWidth, behavior: "smooth" });
  });
});
