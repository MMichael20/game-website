export class Menu {
  private root = document.createElement("div");
  private startCb: () => void = () => {};

  constructor(container: HTMLElement) {
    this.root.style.cssText =
      "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;" +
      "flex-direction:column;gap:20px;background:rgba(10,12,24,0.92);color:#eaeaf0;" +
      "font-family:system-ui,sans-serif;z-index:10;";
    container.appendChild(this.root);
  }

  onStart(cb: () => void): void { this.startCb = cb; }

  showTitle(): void {
    this.root.innerHTML = "";
    const h = document.createElement("h1");
    h.textContent = "Rishon 3D";
    h.style.cssText = "font-size:48px;margin:0;letter-spacing:2px;";
    const sub = document.createElement("p");
    sub.textContent = "WASD / Arrows to move - E to enter/exit car - Esc to pause";
    sub.style.opacity = "0.8";
    const btn = this.button("Start");
    btn.onclick = () => this.startCb();
    this.root.append(h, sub, btn);
    this.root.style.display = "flex";
  }

  showPause(): void {
    this.root.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = "Paused";
    const btn = this.button("Resume");
    btn.onclick = () => this.startCb();
    this.root.append(h, btn);
    this.root.style.display = "flex";
  }

  hide(): void { this.root.style.display = "none"; }

  private button(label: string): HTMLButtonElement {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText =
      "padding:12px 32px;font-size:20px;border:0;border-radius:8px;cursor:pointer;" +
      "background:#2e6fb0;color:white;";
    return b;
  }
}
