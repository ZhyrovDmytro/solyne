const comparison = document.querySelector("#comparison");
const control = document.querySelector("#compare");
let pointer = null;
let position = 50;

function setPosition(value) {
  position = Math.max(0, Math.min(100, value));
  comparison.style.setProperty("--split", `${position}%`);
  control.setAttribute("aria-valuenow", String(Math.round(position)));
  control.setAttribute("aria-valuetext", `${Math.round(position)}% original photo`);
}

function move(event) {
  const bounds = control.getBoundingClientRect();
  if (bounds.width > 0) setPosition((event.clientX - bounds.left) / bounds.width * 100);
}

control?.addEventListener("pointerdown", event => {
  if (event.button !== 0 || pointer !== null) return;
  pointer = event.pointerId;
  control.setPointerCapture(pointer);
  control.focus({ preventScroll: true });
  move(event);
});
control?.addEventListener("pointermove", event => {
  if (event.pointerId === pointer) move(event);
});
control?.addEventListener("pointerup", event => {
  if (event.pointerId !== pointer) return;
  move(event);
  pointer = null;
  control.releasePointerCapture(event.pointerId);
});
control?.addEventListener("pointercancel", () => { pointer = null; });
control?.addEventListener("lostpointercapture", () => { pointer = null; });
control?.addEventListener("keydown", event => {
  const steps = { ArrowLeft: -2, ArrowDown: -2, ArrowRight: 2, ArrowUp: 2, PageDown: -10, PageUp: 10 };
  if (!(event.key in steps) && event.key !== "Home" && event.key !== "End") return;
  event.preventDefault();
  setPosition(event.key === "Home" ? 0 : event.key === "End" ? 100 : position + steps[event.key]);
});
