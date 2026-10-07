import "@testing-library/jest-dom/vitest";

// jsdom does not implement native dialog methods; real keyboard/modal behavior is
// exercised in the browser journeys. This shim only models open/close state.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event("close")); };
}
