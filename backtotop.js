document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("backToTop");
  const header = document.querySelector(".header-top");

  if (!btn || !header) return;

  // ZOBRAZENIE ŠÍPKY PRI SCROLLE
  window.addEventListener("scroll", function () {
    if (window.scrollY > 300) {
      btn.classList.add("visible");
    } else {
      btn.classList.remove("visible");
    }
  });

  // SCROLL NA HEADER
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    header.scrollIntoView({ behavior: "smooth" });
  });
});
