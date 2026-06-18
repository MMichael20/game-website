let hudStyleInjected = false;
function injectHudStyle(): void {
  if (hudStyleInjected || document.getElementById("r3d-hud-style")) { hudStyleInjected = true; return; }
  const s = document.createElement("style");
  s.id = "r3d-hud-style";
  s.textContent = [
    ".r3d-hint{position:fixed;left:12px;bottom:12px;color:#fff;font-family:system-ui,sans-serif;",
    "font-size:13px;letter-spacing:.2px;padding:6px 10px;border-radius:6px;",
    "background:rgba(10,12,24,0.45);text-shadow:0 1px 2px #000;z-index:5;}",
    ".r3d-prompt{position:fixed;left:50%;top:62%;transform:translateX(-50%);color:#fff;",
    "font-family:system-ui,sans-serif;font-size:18px;font-weight:600;padding:8px 18px;",
    "border-radius:8px;background:rgba(0,0,0,0.55);box-shadow:0 2px 10px rgba(0,0,0,0.4);z-index:5;}",
    ".r3d-speedo{position:fixed;right:14px;bottom:14px;color:#ffe9a8;",
    "font-family:ui-monospace,monospace;font-size:22px;font-weight:700;padding:6px 12px;",
    "border-radius:8px;background:rgba(10,12,24,0.55);border:1px solid rgba(255,210,120,0.35);z-index:6;}",
  ].join("");
  document.head.appendChild(s);
  hudStyleInjected = true;
}

export class Hud {
  private hint = document.createElement("div");
  private prompt = document.createElement("div");
  private speedo = document.createElement("div");

  constructor(container: HTMLElement) {
    injectHudStyle();
    this.hint.className = "r3d-hint";
    this.prompt.className = "r3d-prompt";
    this.speedo.className = "r3d-speedo";
    this.prompt.style.display = "none";
    this.speedo.style.display = "none";
    container.append(this.hint, this.prompt, this.speedo);
  }

  setHint(text: string): void { this.hint.textContent = text; }

  setPrompt(text: string | null): void {
    if (text) { this.prompt.textContent = text; this.prompt.style.display = "block"; }
    else { this.prompt.style.display = "none"; }
  }

  setSpeed(text: string | null): void {
    if (text) { this.speedo.textContent = text; this.speedo.style.display = "block"; }
    else { this.speedo.style.display = "none"; }
  }
}
