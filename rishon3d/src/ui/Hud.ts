let hudStyleInjected = false;
function injectHudStyle(): void {
  if (hudStyleInjected || document.getElementById("r3d-hud-style")) { hudStyleInjected = true; return; }
  const s = document.createElement("style");
  s.id = "r3d-hud-style";
  s.textContent = [
    // Bottom-left control chips: a compact inline-flex row of key+label pills,
    // low z so it never blocks gameplay.
    ".r3d-hint{position:fixed;left:12px;bottom:12px;display:flex;flex-wrap:wrap;gap:5px;",
    "max-width:60vw;font-family:system-ui,sans-serif;z-index:4;}",
    ".r3d-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;",
    "background:rgba(10,12,24,0.5);color:#dfe4f0;font-size:11px;letter-spacing:.2px;",
    "text-shadow:0 1px 2px #000;}",
    ".r3d-chip b{font-family:ui-monospace,monospace;font-size:10px;font-weight:700;color:#0c0e18;",
    "background:#dfe4f0;border-radius:4px;padding:1px 5px;line-height:1.3;}",
    ".r3d-prompt{position:fixed;left:50%;top:78%;transform:translateX(-50%);color:#fff;",
    "font-family:system-ui,sans-serif;font-size:14px;font-weight:600;padding:5px 12px;",
    "border-radius:8px;background:rgba(0,0,0,0.55);box-shadow:0 2px 10px rgba(0,0,0,0.4);z-index:5;}",
    ".r3d-speedo{position:fixed;right:14px;bottom:14px;color:#ffe9a8;",
    "font-family:ui-monospace,monospace;font-size:17px;font-weight:700;padding:5px 11px;",
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

  // Compact control chips: [key, label] pairs rendered as small key+label pills.
  setChips(items: Array<[string, string]>): void {
    this.hint.innerHTML = items
      .map(([key, label]) => `<span class="r3d-chip"><b>${key}</b>${label}</span>`)
      .join("");
  }

  setPrompt(text: string | null): void {
    if (text) { this.prompt.textContent = text; this.prompt.style.display = "block"; }
    else { this.prompt.style.display = "none"; }
  }

  setSpeed(text: string | null): void {
    if (text) { this.speedo.textContent = text; this.speedo.style.display = "block"; }
    else { this.speedo.style.display = "none"; }
  }
}
