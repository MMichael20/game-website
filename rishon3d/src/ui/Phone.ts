let phoneStyleInjected = false;
function injectPhoneStyle(): void {
  if (phoneStyleInjected || document.getElementById("r3d-phone-style")) { phoneStyleInjected = true; return; }
  const s = document.createElement("style");
  s.id = "r3d-phone-style";
  s.textContent = [
    "@keyframes r3dPhoneIn{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:none}}",
    ".r3d-phone-back{position:fixed;inset:0;display:none;align-items:center;justify-content:center;",
    "background:rgba(8,6,16,0.55);backdrop-filter:blur(2px);z-index:9;font-family:system-ui,sans-serif;}",
    ".r3d-phone{width:300px;height:600px;border-radius:38px;padding:14px;",
    "background:linear-gradient(160deg,#1b1830,#0c0a16);box-shadow:0 20px 60px rgba(0,0,0,.6),inset 0 0 0 2px #2a2740;",
    "animation:r3dPhoneIn .28s ease both;display:flex;flex-direction:column;}",
    ".r3d-phone-screen{flex:1;border-radius:26px;overflow:hidden;display:flex;flex-direction:column;",
    "background:linear-gradient(180deg,#3b2a44 0%,#7a4a55 42%,#e0a070 100%);}",
    ".r3d-phone-status{display:flex;justify-content:space-between;align-items:center;padding:12px 18px 4px;",
    "color:#fff;font-size:13px;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,.35);}",
    ".r3d-phone-status .r3d-dots{letter-spacing:2px;opacity:.85;}",
    ".r3d-phone-grid{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:14px 10px;",
    "align-content:start;padding:22px 18px;}",
    ".r3d-app{display:flex;flex-direction:column;align-items:center;gap:6px;border:0;background:none;",
    "cursor:pointer;color:#fff;font-size:11px;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,.4);}",
    ".r3d-app .r3d-icon{width:54px;height:54px;border-radius:15px;display:flex;align-items:center;justify-content:center;",
    "box-shadow:0 4px 10px rgba(0,0,0,.3);transition:transform .08s ease;}",
    ".r3d-app:active .r3d-icon{transform:scale(.92);}",
    ".r3d-app.r3d-soon{opacity:.45;cursor:default;}",
    ".r3d-icon-car{background:linear-gradient(150deg,#3aa0ff,#1f6fd6);}",
    ".r3d-icon-dim{background:linear-gradient(150deg,#5a5470,#3a3550);}",
    // a tiny CSS car silhouette so we avoid emoji/icon assets
    ".r3d-car-glyph{width:30px;height:14px;border-radius:5px 5px 3px 3px;background:#fff;position:relative;}",
    ".r3d-car-glyph::before{content:'';position:absolute;left:5px;top:-7px;width:18px;height:9px;",
    "border-radius:6px 6px 0 0;background:#fff;}",
    ".r3d-car-glyph::after{content:'';position:absolute;left:3px;bottom:-4px;width:24px;height:0;",
    "box-shadow:3px 0 0 2px #16131f,21px 0 0 2px #16131f;}",
    ".r3d-phone-home{height:26px;display:flex;align-items:center;justify-content:center;}",
    ".r3d-phone-home .bar{width:120px;height:5px;border-radius:3px;background:rgba(255,255,255,.6);}",
    ".r3d-phone-hint{position:fixed;bottom:26px;left:50%;transform:translateX(-50%);color:#eaeaf0;",
    "font-size:13px;opacity:.7;}",
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
      '<div class="r3d-phone-grid">',
      '<button class="r3d-app" id="r3d-app-car"><span class="r3d-icon r3d-icon-car"><span class="r3d-car-glyph"></span></span>Call Car</button>',
      '<button class="r3d-app r3d-soon" disabled><span class="r3d-icon r3d-icon-dim"></span>Map</button>',
      '<button class="r3d-app r3d-soon" disabled><span class="r3d-icon r3d-icon-dim"></span>Contacts</button>',
      '<button class="r3d-app r3d-soon" disabled><span class="r3d-icon r3d-icon-dim"></span>Music</button>',
      '<button class="r3d-app r3d-soon" disabled><span class="r3d-icon r3d-icon-dim"></span>Photos</button>',
      '<button class="r3d-app r3d-soon" disabled><span class="r3d-icon r3d-icon-dim"></span>Soon</button>',
      "</div>",
      '<div class="r3d-phone-home"><div class="bar"></div></div>',
      "</div>",
      "</div>",
      '<div class="r3d-phone-hint">P or Esc to close</div>',
    ].join("");
    container.appendChild(this.back);
    (this.back.querySelector("#r3d-app-car") as HTMLButtonElement).onclick = () => this.callCb();
  }

  onCallCar(cb: () => void): void { this.callCb = cb; }

  open(): void {
    this.isOpen = true;
    this.back.style.display = "flex";
    document.exitPointerLock?.();
  }

  close(): void {
    this.isOpen = false;
    this.back.style.display = "none";
  }
}
