export class Hud {
  private hint = document.createElement("div");
  private prompt = document.createElement("div");

  constructor(container: HTMLElement) {
    this.hint.style.cssText =
      "position:fixed;left:12px;bottom:12px;color:#fff;font-family:system-ui,sans-serif;" +
      "font-size:14px;opacity:0.8;text-shadow:0 1px 2px #000;z-index:5;";
    this.prompt.style.cssText =
      "position:fixed;left:50%;top:60%;transform:translateX(-50%);color:#fff;" +
      "font-family:system-ui,sans-serif;font-size:20px;padding:8px 16px;border-radius:6px;" +
      "background:rgba(0,0,0,0.5);z-index:5;display:none;";
    container.append(this.hint, this.prompt);
  }

  setHint(text: string): void { this.hint.textContent = text; }

  setPrompt(text: string | null): void {
    if (text) { this.prompt.textContent = text; this.prompt.style.display = "block"; }
    else { this.prompt.style.display = "none"; }
  }
}
