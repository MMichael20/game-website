import { getQuality, setQuality, type QualityLevel } from "../core/quality";

let qsStyleInjected = false;
function injectStyle(): void {
  if (qsStyleInjected || document.getElementById("r3d-qs-style")) { qsStyleInjected = true; return; }
  const s = document.createElement("style");
  s.id = "r3d-qs-style";
  s.textContent = [
    ".r3d-qs{display:flex;flex-direction:column;align-items:center;gap:8px;",
    "font-family:system-ui,sans-serif;color:#eaeaf0;}",
    ".r3d-qs-label{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.8;}",
    ".r3d-qs-row{display:inline-flex;gap:8px;}",
    ".r3d-qs-btn{cursor:pointer;border:2px solid rgba(220,230,255,0.35);background:rgba(20,26,40,0.55);",
    "color:#dfe6f5;font:700 14px/1 system-ui,sans-serif;letter-spacing:1px;padding:9px 16px;border-radius:10px;",
    "transition:transform .06s ease,background .12s ease;}",
    ".r3d-qs-btn:active{transform:translateY(2px);}",
    ".r3d-qs-on{background:linear-gradient(180deg,#69b8ff,#2f86e6);color:#06223c;border-color:#9fd0ff;}",
  ].join("");
  document.head.appendChild(s);
  qsStyleInjected = true;
}

const LABELS: Record<QualityLevel, string> = { low: "Low", medium: "Medium", high: "High" };
const LEVELS: QualityLevel[] = ["low", "medium", "high"];

// A small "GRAPHICS: [Low][Medium][High]" picker. Reads the current level from the
// quality store and calls setQuality() on tap (which persists + applies it live).
// Reused by the pause menu and the phone's Settings app.
export function makeQualitySelector(): HTMLElement {
  injectStyle();
  const wrap = document.createElement("div");
  wrap.className = "r3d-qs";

  const label = document.createElement("div");
  label.className = "r3d-qs-label";
  label.textContent = "Graphics";

  const row = document.createElement("div");
  row.className = "r3d-qs-row";

  const render = () => {
    const active = getQuality();
    row.innerHTML = "";
    for (const l of LEVELS) {
      const b = document.createElement("button");
      b.className = "r3d-qs-btn" + (l === active ? " r3d-qs-on" : "");
      b.textContent = LABELS[l];
      b.onclick = () => { setQuality(l); render(); };
      row.appendChild(b);
    }
  };
  render();

  wrap.append(label, row);
  return wrap;
}
