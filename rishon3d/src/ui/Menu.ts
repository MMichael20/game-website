// The title / pause menu for H&M Adventures. The title screen shows the concept-
// art block (public/title.png) behind a darkened scrim, the game name, a tagline,
// the controls legend and a Start button.

let menuStyleInjected = false;
function injectMenuStyle(): void {
  if (menuStyleInjected || document.getElementById("r3d-menu-style")) { menuStyleInjected = true; return; }
  const s = document.createElement("style");
  s.id = "r3d-menu-style";
  s.textContent = [
    "@keyframes r3dFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}",
    "@keyframes r3dPop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}",
    ".r3d-menu{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;",
    "font-family:system-ui,sans-serif;color:#eaeaf0;z-index:10;background:#0a0c18;}",
    // title screen gets the concept-art background + scrim
    ".r3d-menu.r3d-title-bg{",
    "background:linear-gradient(180deg,rgba(8,10,22,.30),rgba(8,10,22,.78)),",
    "url('/title.png') center/cover no-repeat;}",
    ".r3d-card{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;",
    "padding:30px 40px;border-radius:18px;animation:r3dPop .45s ease both;",
    "background:rgba(10,14,26,.55);backdrop-filter:blur(3px);",
    "border:1px solid rgba(255,255,255,.12);box-shadow:0 18px 60px rgba(0,0,0,.5);}",
    ".r3d-kicker{margin:0;font-size:13px;letter-spacing:5px;text-transform:uppercase;",
    "color:#9fd0ff;opacity:.9;}",
    ".r3d-title{font-size:clamp(38px,7vw,68px);margin:0;letter-spacing:3px;font-weight:800;line-height:1;",
    "background:linear-gradient(180deg,#ffe9b0,#ff9d3d);-webkit-background-clip:text;",
    "background-clip:text;color:transparent;text-shadow:0 4px 22px rgba(255,150,50,.35);}",
    ".r3d-tag{margin:2px 0 4px;opacity:.9;font-size:15px;}",
    ".r3d-legend{display:grid;grid-template-columns:repeat(2,minmax(140px,auto));gap:6px 24px;",
    "font-size:13px;opacity:.85;margin:6px 0 10px;}",
    ".r3d-legend span{white-space:nowrap;}",
    ".r3d-legend b{color:#ffd27a;font-weight:700;margin-right:6px;}",
    ".r3d-btn{padding:13px 46px;font-size:17px;font-weight:700;letter-spacing:1px;border:0;",
    "border-radius:11px;cursor:pointer;color:#fff;",
    "background:linear-gradient(180deg,#3a86d6,#2767ad);box-shadow:0 6px 18px rgba(40,110,190,.45);",
    "transition:transform .08s ease,filter .15s ease;}",
    ".r3d-btn:hover{filter:brightness(1.1);}",
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
    this.root.classList.add("r3d-title-bg");
    this.root.innerHTML = [
      '<div class="r3d-card">',
      '<p class="r3d-kicker">A voxel neighborhood</p>',
      '<h1 class="r3d-title">H&amp;M ADVENTURES</h1>',
      '<p class="r3d-tag">Walk your block, drive the streets, live the little city.</p>',
      '<div class="r3d-legend">',
      "<span><b>WASD</b>Move</span><span><b>Mouse</b>Look</span>",
      "<span><b>E</b>Drive / Exit</span><span><b>P</b>Phone</span>",
      "<span><b>M</b>Map</span><span><b>Space</b>Brake</span>",
      "<span><b>Esc</b>Pause</span><span><b>F3</b>Debug</span>",
      "</div>",
      '<button class="r3d-btn" id="r3d-start">Start Game</button>',
      "</div>",
    ].join("");
    (this.root.querySelector("#r3d-start") as HTMLButtonElement).onclick = () => this.startCb();
    this.root.style.display = "flex";
  }

  showPause(): void {
    this.root.classList.remove("r3d-title-bg");
    this.root.innerHTML = [
      '<div class="r3d-card">',
      '<h2 class="r3d-title" style="font-size:30px">Paused</h2>',
      '<button class="r3d-btn" id="r3d-resume">Resume</button>',
      "</div>",
    ].join("");
    (this.root.querySelector("#r3d-resume") as HTMLButtonElement).onclick = () => this.startCb();
    this.root.style.display = "flex";
  }

  hide(): void { this.root.style.display = "none"; }
}
