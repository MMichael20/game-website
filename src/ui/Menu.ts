// The title / pause menu for H&M Adventures. Gamey, arcade-style: a chunky
// extruded logo over the concept-art background, and a tactile PLAY button that
// physically presses down. No control legend — the game teaches itself.

import { makeQualitySelector } from "./qualitySelector";

let menuStyleInjected = false;
function injectMenuStyle(): void {
  if (menuStyleInjected || document.getElementById("r3d-menu-style")) { menuStyleInjected = true; return; }
  const s = document.createElement("style");
  s.id = "r3d-menu-style";
  s.textContent = [
    "@keyframes r3dPop{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}",
    // The logo gently bobs (keeps its -2deg tilt) so the title feels alive.
    "@keyframes r3dBob{0%,100%{transform:rotate(-2deg) translateY(0)}50%{transform:rotate(-2deg) translateY(-9px)}}",

    ".r3d-menu{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;",
    "font-family:system-ui,sans-serif;color:#eaeaf0;z-index:10;background:#0a0c18;}",
    // title screen gets the concept-art background + a top-light / bottom-dark scrim
    ".r3d-menu.r3d-title-bg{",
    "background:radial-gradient(120% 90% at 50% 0%,rgba(111,183,255,.22),rgba(8,12,28,0) 55%),",
    "linear-gradient(180deg,rgba(8,12,28,.25),rgba(8,12,28,.74)),",
    "url('/title.png') center/cover no-repeat;}",

    // hero stack — floats directly on the art, no frosted card
    ".r3d-hero{display:flex;flex-direction:column;align-items:center;gap:22px;text-align:center;",
    "padding:24px;animation:r3dPop .5s cubic-bezier(.2,.9,.3,1.2) both;}",

    // blocky eyebrow tag with a hard drop-edge
    ".r3d-badge{display:inline-block;font:800 13px/1 ui-monospace,monospace;letter-spacing:5px;",
    "text-transform:uppercase;color:#08131c;background:#7fe0ff;padding:7px 15px;border-radius:6px;",
    "box-shadow:0 4px 0 #1c6a8c;transform:rotate(-2deg);}",

    // chunky extruded arcade logo: gradient fill + dark stroke + hard block shadow
    ".r3d-title{margin:0;font:900 clamp(46px,10vw,104px)/.86 \"Arial Black\",\"Helvetica Neue\",system-ui,sans-serif;",
    "letter-spacing:2px;text-transform:uppercase;color:#ffd23f;",
    "background:linear-gradient(180deg,#ffe684 0%,#ffb02e 52%,#ff7a1a 100%);",
    "-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;",
    "-webkit-text-stroke:3px #16112c;",
    "filter:drop-shadow(0 6px 0 #16112c) drop-shadow(0 15px 16px rgba(0,0,0,.55));",
    "animation:r3dBob 3.4s ease-in-out infinite;}",

    ".r3d-tag{margin:0;max-width:30ch;font:600 16px/1.45 system-ui,sans-serif;color:#eaf2ff;",
    "text-shadow:0 2px 8px rgba(0,0,0,.75);}",

    // signature: a tactile 3D button. The hard offset shadow IS the button's side;
    // :active sinks it so it reads as a real physical press.
    ".r3d-play{position:relative;border:0;cursor:pointer;margin-top:4px;",
    "font:900 clamp(24px,4vw,32px)/1 \"Arial Black\",system-ui,sans-serif;letter-spacing:3px;",
    "text-transform:uppercase;color:#0f3318;padding:20px 70px;border-radius:16px;",
    "background:linear-gradient(180deg,#8fe85c,#54c238);",
    "box-shadow:0 9px 0 #2e7d21,0 18px 24px rgba(0,0,0,.45);",
    "transition:transform .06s ease,box-shadow .06s ease,filter .12s ease;}",
    ".r3d-play:hover{filter:brightness(1.07) saturate(1.05);}",
    ".r3d-play:active{transform:translateY(7px);box-shadow:0 2px 0 #2e7d21,0 8px 14px rgba(0,0,0,.4);}",
    ".r3d-play:focus-visible{outline:3px solid #fff;outline-offset:4px;}",
    // blue variant for the pause/resume action
    ".r3d-play.r3d-blue{color:#0a2238;background:linear-gradient(180deg,#69b8ff,#2f86e6);",
    "box-shadow:0 9px 0 #1d5aa6,0 18px 24px rgba(0,0,0,.45);}",
    ".r3d-play.r3d-blue:active{box-shadow:0 2px 0 #1d5aa6,0 8px 14px rgba(0,0,0,.4);}",

    "@media (prefers-reduced-motion:reduce){.r3d-title{animation:none;transform:rotate(-2deg)}",
    ".r3d-hero{animation:none}.r3d-play{transition:none}}",
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
      '<div class="r3d-hero">',
      '<span class="r3d-badge">Voxel City</span>',
      '<h1 class="r3d-title">H&amp;M<br>Adventures</h1>',
      '<p class="r3d-tag">Walk your block, drive the streets, catch a plane.</p>',
      '<button class="r3d-play" id="r3d-start">Play</button>',
      "</div>",
    ].join("");
    (this.root.querySelector("#r3d-start") as HTMLButtonElement).onclick = () => this.startCb();
    this.root.querySelector(".r3d-hero")?.appendChild(makeQualitySelector());
    this.root.style.display = "flex";
  }

  showPause(): void {
    this.root.classList.remove("r3d-title-bg");
    this.root.innerHTML = [
      '<div class="r3d-hero">',
      '<h2 class="r3d-title" style="font-size:clamp(40px,7vw,72px)">Paused</h2>',
      '<button class="r3d-play r3d-blue" id="r3d-resume">Resume</button>',
      "</div>",
    ].join("");
    (this.root.querySelector("#r3d-resume") as HTMLButtonElement).onclick = () => this.startCb();
    this.root.querySelector(".r3d-hero")?.appendChild(makeQualitySelector());
    this.root.style.display = "flex";
  }

  hide(): void { this.root.style.display = "none"; }
}
