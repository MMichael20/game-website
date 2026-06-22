import { makeQualitySelector } from "./qualitySelector";

let phoneStyleInjected = false;
function injectPhoneStyle(): void {
  if (phoneStyleInjected || document.getElementById("r3d-phone-style")) { phoneStyleInjected = true; return; }
  const s = document.createElement("style");
  s.id = "r3d-phone-style";
  s.textContent = [
    "@keyframes r3dPhoneIn{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:none}}",
    ".r3d-phone-back{position:fixed;inset:0;display:none;align-items:center;justify-content:center;",
    "background:rgba(8,6,16,0.55);backdrop-filter:blur(2px);z-index:9;font-family:system-ui,sans-serif;}",
    ".r3d-phone{width:clamp(220px,68vw,248px);height:auto;aspect-ratio:1/2;max-height:72vh;",
    "border-radius:32px;padding:11px;",
    "background:linear-gradient(160deg,#1b1830,#0c0a16);box-shadow:0 20px 60px rgba(0,0,0,.6),inset 0 0 0 2px #2a2740;",
    "animation:r3dPhoneIn .28s ease both;display:flex;flex-direction:column;}",
    ".r3d-phone-screen{flex:1;border-radius:22px;overflow:hidden;display:flex;flex-direction:column;",
    "background:linear-gradient(180deg,#3b2a44 0%,#7a4a55 42%,#e0a070 100%);}",
    ".r3d-phone-status{display:flex;justify-content:space-between;align-items:center;padding:10px 15px 3px;",
    "color:#fff;font-size:11px;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,.35);}",
    ".r3d-phone-status .r3d-dots{letter-spacing:2px;opacity:.85;}",
    ".r3d-phone-grid{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:12px 8px;",
    "align-content:start;padding:18px 14px;}",
    ".r3d-app{display:flex;flex-direction:column;align-items:center;gap:5px;border:0;background:none;",
    "cursor:pointer;color:#fff;font-size:10px;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,.4);}",
    ".r3d-app .r3d-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;",
    "box-shadow:0 4px 10px rgba(0,0,0,.3);transition:transform .08s ease;}",
    ".r3d-app:active .r3d-icon{transform:scale(.92);}",
    ".r3d-app.r3d-soon{opacity:.45;cursor:default;}",
    ".r3d-icon-car{background:linear-gradient(150deg,#3aa0ff,#1f6fd6);}",
    ".r3d-icon-dim{background:linear-gradient(150deg,#5a5470,#3a3550);}",
    // a tiny CSS car silhouette so we avoid emoji/icon assets
    ".r3d-car-glyph{width:23px;height:11px;border-radius:4px 4px 2px 2px;background:#fff;position:relative;}",
    ".r3d-car-glyph::before{content:'';position:absolute;left:4px;top:-5px;width:14px;height:7px;",
    "border-radius:5px 5px 0 0;background:#fff;}",
    ".r3d-car-glyph::after{content:'';position:absolute;left:2px;bottom:-3px;width:19px;height:0;",
    "box-shadow:2px 0 0 2px #16131f,16px 0 0 2px #16131f;}",
    ".r3d-icon-set{background:linear-gradient(150deg,#9aa7c4,#5f6a86);}",
    // Settings sub-view (Graphics quality) — swaps in over the app grid.
    ".r3d-phone-set{flex:1;display:none;flex-direction:column;align-items:center;justify-content:center;",
    "gap:16px;padding:18px 14px;color:#fff;}",
    ".r3d-set-title{font-size:18px;font-weight:800;letter-spacing:1px;text-shadow:0 1px 2px rgba(0,0,0,.4);}",
    ".r3d-set-note{font-size:11px;opacity:.85;text-align:center;line-height:1.5;text-shadow:0 1px 2px rgba(0,0,0,.4);}",
    ".r3d-set-back{cursor:pointer;border:0;background:rgba(255,255,255,.2);color:#fff;",
    "font:700 13px system-ui,sans-serif;padding:9px 24px;border-radius:10px;}",
    ".r3d-phone-home{height:22px;display:flex;align-items:center;justify-content:center;}",
    ".r3d-phone-home .bar{width:92px;height:4px;border-radius:3px;background:rgba(255,255,255,.6);}",
    ".r3d-phone-hint{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);color:#eaeaf0;",
    "font-size:12px;opacity:.7;}",
  ].join("");
  document.head.appendChild(s);
  phoneStyleInjected = true;
}

// A simple smartphone overlay. v1 has one working app, "Call Car"; the other
// tiles are placeholders for things we'll add later (map, contacts, etc.).
export class Phone {
  private back = document.createElement("div");
  private callCb: () => void = () => {};
  isOpen = false;

  constructor(container: HTMLElement) {
    injectPhoneStyle();
    this.back.className = "r3d-phone-back";
    this.back.innerHTML = [
      '<div class="r3d-phone">',
      '<div class="r3d-phone-screen">',
      '<div class="r3d-phone-status"><span>6:45</span><span class="r3d-dots">. . .  ▮</span></div>',
      '<div class="r3d-phone-grid" id="r3d-home-view">',
      '<button class="r3d-app" id="r3d-app-car"><span class="r3d-icon r3d-icon-car"><span class="r3d-car-glyph"></span></span>Call Car</button>',
      '<button class="r3d-app r3d-soon" disabled><span class="r3d-icon r3d-icon-dim"></span>Map</button>',
      '<button class="r3d-app r3d-soon" disabled><span class="r3d-icon r3d-icon-dim"></span>Contacts</button>',
      '<button class="r3d-app r3d-soon" disabled><span class="r3d-icon r3d-icon-dim"></span>Music</button>',
      '<button class="r3d-app r3d-soon" disabled><span class="r3d-icon r3d-icon-dim"></span>Photos</button>',
      '<button class="r3d-app" id="r3d-app-set"><span class="r3d-icon r3d-icon-set"></span>Settings</button>',
      "</div>",
      '<div class="r3d-phone-set" id="r3d-set-view">',
      '<div class="r3d-set-title">Settings</div>',
      '<div class="r3d-set-note">Lower = smoother on phones.<br>Antialiasing applies after reload.</div>',
      '<button class="r3d-set-back" id="r3d-set-back">Back</button>',
      "</div>",
      '<div class="r3d-phone-home"><div class="bar"></div></div>',
      "</div>",
      "</div>",
      '<div class="r3d-phone-hint">P or Esc to close</div>',
    ].join("");
    container.appendChild(this.back);
    (this.back.querySelector("#r3d-app-car") as HTMLButtonElement).onclick = () => this.callCb();

    // Settings app: swap the app grid for a Graphics-quality picker (and back).
    const home = this.back.querySelector("#r3d-home-view") as HTMLElement;
    const setView = this.back.querySelector("#r3d-set-view") as HTMLElement;
    const showSettings = (on: boolean) => {
      home.style.display = on ? "none" : "grid";
      setView.style.display = on ? "flex" : "none";
    };
    // Mount the shared quality selector above the explanatory note.
    setView.insertBefore(makeQualitySelector(), setView.querySelector(".r3d-set-note"));
    (this.back.querySelector("#r3d-app-set") as HTMLButtonElement).onclick = () => showSettings(true);
    (this.back.querySelector("#r3d-set-back") as HTMLButtonElement).onclick = () => showSettings(false);
    this.showSettings = showSettings;
  }

  // Reset to the app grid whenever the phone reopens (set in the constructor).
  private showSettings: (on: boolean) => void = () => {};

  onCallCar(cb: () => void): void { this.callCb = cb; }

  open(): void {
    this.isOpen = true;
    this.showSettings(false); // always reopen on the app grid, not a left-open sub-view
    this.back.style.display = "flex";
    document.exitPointerLock?.();
  }

  close(): void {
    this.isOpen = false;
    this.back.style.display = "none";
  }
}
