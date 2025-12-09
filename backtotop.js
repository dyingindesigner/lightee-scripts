<script>
window.addEventListener("scroll", function () {
  const btn = document.getElementById("backToTop");

  if (window.scrollY > 300) {
    btn.classList.add("visible");
  } else {
    btn.classList.remove("visible");
  }
});

document.getElementById("backToTop").addEventListener("click", function (e) {
  e.preventDefault();
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});
</script>
