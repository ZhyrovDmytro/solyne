const comparison = document.querySelector("#comparison");
const slider = document.querySelector("#compare");
slider?.addEventListener("input", () => {
  comparison?.style.setProperty("--split", `${100 - Number(slider.value)}%`);
});
