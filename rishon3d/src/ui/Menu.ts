let menuStyleInjected = false;
function injectMenuStyle(): void {
  if (menuStyleInjected || document.getElementById("r3d-menu-style")) { menuStyleInjected = true; return; }
  const s = document.createElement("style");
  s.id = "r3d-menu-style";
  s.textContent = [
    "@keyframes r3dFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
    ".r3d-menu{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;",
    "font-family:system-ui,sans-serif;color:#eaeaf0;z-index:10;",
    "background:radial-gradient(120% 120% at 50% 20%,#2a2740 0%,#15131f 55%,#0a0c18 100%);}",
    ".r3d-card{display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;",
    "padding:36px 44px;animation:r3dFade .5s ease both;}",
    ".r3d-title{font-size:54px;margin:0;letter-spacing:3px;",
    "background:linear-gradient(180deg,#ffe9b0,#ffae57);-webkit-background-clip:text;",
    "background-clip:text;color:transparent;text-shadow:0 2px 16px rgba(255,160,60,0.25);}",
    ".r3d-tag{margin:0;opacity:0.82;font-size:16px;}",
    ".r3d-legend{display:grid;grid-template-columns:repeat(2,minmax(140px,auto));gap:6px 24px;",
    "font-size:13px;opacity:0.82;margin:4px 0 8px;}",
    ".r3d-legend span{white-space:nowrap;}",
    ".r3d-legend b{color:#ffd27a;font-weight:700;margin-right:6px;}",
    ".r3d-btn{padding:12px 40px;font-size:20px;border:0;border-radius:10px;cursor:pointer;",
    "background:#2e6fb0;color:#fff;transition:transform .08s ease,background .15s ease;}",
    ".r3d-btn:hover{background:#3a86d6;}",
    ".r3d-btn:active{transform:scale(0.96);}",
  ].join("");
  document.head.appendChild(s);
  menuStyleInjected = true;
}

export class Menu {
  private root = document.createElement("div");
  private startCb: () => void = () => {};

  constructor(container: HTMLElement) {
    injectMenuStyle();
    this.root.className = "r3d-menu";
    container.appendChild(this.root);
  }

  onStart(cb: () => void): void { this.startCb = cb; }

  showTitle(): void {
    this.root.innerHTML = [
      '<div class="r3d-card">',
      '<h1 class="r3d-title">Rishon 3D</h1>',
      '<p class="r3d-tag">Drive and wander a living city at golden hour.</p>',
      '<div class="r3d-legend">',
      "<span><b>WASD</b>Move</span><span><b>Mouse</b>Look</span>",
      "<span><b>E</b>Drive / Exit</span><span><b>T</b>Call taxi</span>",
      "<span><b>M</b>Map</span><span><b>Space</b>Brake</span>",
      "<span><b>Esc</b>Pause</span>",
      "</div>",
      '<button class="r3d-btn" id="r3d-start">Start</button>',
      "</div>",
    ].join("");
    (this.root.querySelector("#r3d-start") as HTMLButtonElement).onclick = () => this.startCb();
    this.root.style.display = "flex";
  }

  showPause(): void {
    this.root.innerHTML = [
      '<div class="r3d-card">',
      '<h2 class="r3d-title" style="font-size:36px">Paused</h2>',
      '<button class="r3d-btn" id="r3d-resume">Resume</button>',
      "</div>",
    ].join("");
    (this.root.querySelector("#r3d-resume") as HTMLButtonElement).onclick = () => this.startCb();
    this.root.style.display = "flex";
  }

  hide(): void { this.root.style.display = "none"; }
}
