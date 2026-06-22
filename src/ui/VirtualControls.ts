import type { Tickable } from "../core/Engine";
import type { Input } from "../core/Input";
import type { FollowCamera } from "../core/FollowCamera";

let vcStyleInjected = false;
function injectStyle(): void {
  if (vcStyleInjected || document.getElementById("r3d-vc-style")) { vcStyleInjected = true; return; }
  const s = document.createElement("style");
  s.id = "r3d-vc-style";
  s.textContent = [
    // Root sits above the HUD (z4-6), below the Phone (z9) and Menu (z10), so when
    // those full-screen overlays are up the controls receive no touches.
    ".r3d-vc-root{position:fixed;inset:0;z-index:7;pointer-events:none;",
    "font-family:system-ui,sans-serif;-webkit-user-select:none;user-select:none;display:none;}",
    // Full-area look zone (lowest child): one-finger drag orbits, two-finger pinch zooms.
    ".r3d-vc-look{position:absolute;inset:0;pointer-events:auto;touch-action:none;}",
    // Joystick base (bottom-left) on top of the look zone.
    ".r3d-vc-joy{position:absolute;left:26px;bottom:26px;width:132px;height:132px;border-radius:50%;",
    "background:rgba(20,26,40,0.32);border:2px solid rgba(220,230,255,0.35);",
    "pointer-events:auto;touch-action:none;}",
    ".r3d-vc-thumb{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;",
    "border-radius:50%;background:rgba(230,238,255,0.6);box-shadow:0 2px 8px rgba(0,0,0,0.4);",
    "pointer-events:none;transition:transform .03s linear;}",
    // Action buttons (bottom-right).
    ".r3d-vc-btns{position:absolute;right:22px;bottom:30px;display:flex;flex-direction:column;",
    "gap:14px;align-items:center;}",
    ".r3d-vbtn{pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;",
    "width:72px;height:72px;border-radius:50%;border:2px solid rgba(220,230,255,0.4);",
    "background:rgba(20,26,40,0.42);color:#eef2ff;font-size:13px;font-weight:700;letter-spacing:.5px;",
    "text-shadow:0 1px 2px #000;}",
    ".r3d-vbtn-on{background:rgba(90,150,240,0.6);transform:scale(0.94);}",
  ].join("");
  document.head.appendChild(s);
  vcStyleInjected = true;
}

// On-screen touch controls for mobile: a left analog joystick (writes Input.move),
// a full-screen look zone (drag = orbit, pinch = zoom via FollowCamera), and three
// action buttons that push the same key codes the keyboard uses (Run/E/Phone). It
// never touches game logic — only the existing input sinks.
export class VirtualControls implements Tickable {
  private root = document.createElement("div");
  private base = document.createElement("div");
  private thumb = document.createElement("div");
  private visible = false;

  // Joystick: the single touch currently driving it (by identifier), or null.
  private joyId: number | null = null;
  // Look zone: every touch that started on it, keyed by identifier, with its last pos.
  private lookTouches = new Map<number, { x: number; y: number }>();
  private pinchDist: number | null = null;

  constructor(
    container: HTMLElement,
    private input: Input,
    private follow: FollowCamera,
    private isActive: () => boolean,
  ) {
    injectStyle();
    this.root.className = "r3d-vc-root";

    const look = document.createElement("div");
    look.className = "r3d-vc-look";
    this.wireLook(look);

    this.base.className = "r3d-vc-joy";
    this.thumb.className = "r3d-vc-thumb";
    this.base.appendChild(this.thumb);
    this.wireJoystick();

    const btns = document.createElement("div");
    btns.className = "r3d-vc-btns";
    // E maps to the "Press E" prompts (enter/exit, portals); Run holds Shift; Phone toggles P.
    btns.append(
      this.makeButton("E", "KeyE"),
      this.makeButton("RUN", "ShiftLeft"),
      this.makeButton("PHONE", "KeyP"),
    );

    // Look zone first (lowest), then joystick + buttons on top so they catch their region.
    this.root.append(look, this.base, btns);
    container.appendChild(this.root);
  }

  update(_dt: number): void {
    const active = this.isActive();
    if (active === this.visible) return;
    this.visible = active;
    this.root.style.display = active ? "block" : "none";
    if (!active) this.resetJoy(); // drop any held movement when the controls hide
  }

  // --- Look zone: drag to orbit, pinch to zoom ---
  private wireLook(look: HTMLElement): void {
    look.addEventListener("touchstart", (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        this.lookTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
      this.pinchDist = this.lookTouches.size >= 2 ? this.pinch() : null;
      e.preventDefault();
    }, { passive: false });

    look.addEventListener("touchmove", (e: TouchEvent) => {
      const single = this.lookTouches.size === 1;
      for (const t of Array.from(e.changedTouches)) {
        const prev = this.lookTouches.get(t.identifier);
        if (!prev) continue;
        if (single) this.follow.addOrbit(t.clientX - prev.x, t.clientY - prev.y);
        prev.x = t.clientX; prev.y = t.clientY;
      }
      if (this.lookTouches.size >= 2) {
        const d = this.pinch();
        if (this.pinchDist != null) this.follow.zoom(-(d - this.pinchDist));
        this.pinchDist = d;
      }
      e.preventDefault();
    }, { passive: false });

    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) this.lookTouches.delete(t.identifier);
      this.pinchDist = this.lookTouches.size >= 2 ? this.pinch() : null;
    };
    look.addEventListener("touchend", end);
    look.addEventListener("touchcancel", end);
  }

  private pinch(): number {
    const p = Array.from(this.lookTouches.values());
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  // --- Joystick: writes Input.move (camera-relative consumption lives in Character/Car) ---
  private wireJoystick(): void {
    this.base.addEventListener("touchstart", (e: TouchEvent) => {
      if (this.joyId !== null) return;
      const t = e.changedTouches[0];
      this.joyId = t.identifier;
      this.moveJoy(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });

    this.base.addEventListener("touchmove", (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joyId) { this.moveJoy(t.clientX, t.clientY); e.preventDefault(); }
      }
    }, { passive: false });

    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joyId) this.resetJoy();
      }
    };
    this.base.addEventListener("touchend", end);
    this.base.addEventListener("touchcancel", end);
  }

  private moveJoy(px: number, py: number): void {
    const r = this.base.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const R = r.width / 2;
    let dx = px - cx, dy = py - cy;
    const len = Math.hypot(dx, dy);
    if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; } // clamp to the base radius
    this.thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    this.input.move.x = dx / R;   // +right
    this.input.move.y = -dy / R;  // screen-up = forward
  }

  private resetJoy(): void {
    this.joyId = null;
    this.thumb.style.transform = "translate(0px, 0px)";
    this.input.move.x = 0;
    this.input.move.y = 0;
  }

  // --- Action buttons: hold = key down for the press; works for both hold (Run) and
  // tap (E/Phone) since justPressed survives an immediate release. ---
  private makeButton(label: string, code: string): HTMLElement {
    const b = document.createElement("button");
    b.className = "r3d-vbtn";
    b.textContent = label;
    const press = (e: PointerEvent) => {
      e.preventDefault();
      b.setPointerCapture?.(e.pointerId);
      b.classList.add("r3d-vbtn-on");
      this.input.handleKeyDown(code);
    };
    const release = (e: PointerEvent) => {
      e.preventDefault();
      b.classList.remove("r3d-vbtn-on");
      this.input.handleKeyUp(code);
    };
    b.addEventListener("pointerdown", press);
    b.addEventListener("pointerup", release);
    b.addEventListener("pointercancel", release);
    return b;
  }
}
