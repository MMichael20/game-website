// A full-screen black layer for map-switch transitions. It owns no animation
// logic: Game ramps its opacity 0..1 from frame dt while a transition runs.

let injected = false;
function injectStyle(): void {
  if (injected) return;
  injected = true;
  const s = document.createElement("style");
  s.textContent = ".r3d-fade{position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:60;}";
  document.head.appendChild(s);
}

export class FadeOverlay {
  private el: HTMLDivElement;
  constructor(container: HTMLElement) {
    injectStyle();
    this.el = document.createElement("div");
    this.el.className = "r3d-fade";
    container.appendChild(this.el);
  }
  setOpacity(a: number): void {
    this.el.style.opacity = String(Math.max(0, Math.min(1, a)));
  }
}
