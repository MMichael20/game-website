import * as THREE from "three";
import { Engine } from "./core/Engine";
import { Input } from "./core/Input";
import { Physics } from "./core/Physics";
import { FollowCamera } from "./core/FollowCamera";
import { World } from "./world/World";
import { SkyTraffic } from "./world/SkyTraffic";
import { validateMap } from "./world/rishonMap";
import { RISHON_MAP } from "./world/worldData";
import { Game } from "./game/Game";
import { Menu } from "./ui/Menu";
import { Hud } from "./ui/Hud";
import { FadeOverlay } from "./ui/FadeOverlay";
import { Minimap } from "./ui/Minimap";
import { makeHumanoid } from "./entities/Humanoid";
import { OBJECT_LIBRARY, tintedMesh } from "./world/objects";
import { DebugOverlay } from "./ui/DebugOverlay";
import { VirtualControls } from "./ui/VirtualControls";
import { getQuality, registerQualityApplier } from "./core/quality";

// Loading screen control (the static #r3d-loading overlay in index.html). We
// toggle it rather than remove it so it can cover BOTH waits: the initial boot,
// and the post-"Start" first-frame shader compile (which otherwise shows a black
// canvas). Idempotent — safe to call from any path.
function showLoading(): void {
  const el = document.getElementById("r3d-loading");
  if (!el) return;
  el.style.display = "flex";
  void el.offsetWidth; // force reflow so the opacity transition runs from 0
  el.classList.remove("r3d-hide");
}
function hideLoading(): void {
  const el = document.getElementById("r3d-loading");
  if (!el) return;
  el.classList.add("r3d-hide");
  // After the fade, drop it out of the layout so it can't eat clicks on the menu.
  window.setTimeout(() => { if (el.classList.contains("r3d-hide")) el.style.display = "none"; }, 400);
}

async function boot() {
  const container = document.getElementById("app")!;
  const errors = validateMap(RISHON_MAP);
  if (errors.length) console.error("map invalid", errors);

  await Physics.init();
  const physics = new Physics();
  // Graphics quality: phones default to "low" (smooth out of the box); the choice is
  // persisted and changed live from the pause menu / phone Settings app.
  const engine = new Engine(container, getQuality());
  registerQualityApplier((q) => engine.setQuality(q));
  const world = new World(engine.scene, physics);
  const follow = new FollowCamera(engine.camera, physics);
  const input = new Input();
  const hud = new Hud(container);
  const fade = new FadeOverlay(container);
  const minimap = new Minimap(container, RISHON_MAP);
  // GTA-style camera: capture the pointer so mouse movement orbits the camera.
  const canvas = engine.renderer.domElement;
  // Touch vs mouse is decided LIVE, not once at boot. Many Windows PCs report touch
  // capability (maxTouchPoints>0 / ontouchstart) yet are driven by a mouse, which
  // wrongly showed the on-screen joystick. We seed from the primary-pointer media
  // query, then flip on the pointerType actually used: a real touch shows the
  // controls, a mouse hides them (so hybrid touch+mouse PCs behave correctly too).
  // `?touch` / `#touch` forces touch mode for testing on a desktop.
  const forceTouch = /[?#].*\btouch\b/.test(location.href);
  let touchMode = forceTouch || matchMedia("(pointer: coarse)").matches;
  window.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") touchMode = true;
    else if (e.pointerType === "mouse" && !forceTouch) touchMode = false;
  });
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && !forceTouch) touchMode = false;
  });
  // No pointer lock while in touch mode — look comes from the look-zone, and
  // requestPointerLock just rejects on a phone.
  const lockPointer = () => {
    if (touchMode) return;
    const p = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
    if (p && typeof p.catch === "function") p.catch(() => {}); // ignore lock rejections (e.g. headless)
  };

  // DEV-only aerial screenshot mode: open with #view=<x>,<z> to park the camera
  // over (x,z) and render the static scene (no follow/game), for inspecting
  // distant landmarks (airport, restaurant street, transit station).
  // #view=<x>,<z>[,<height>][,<dist>] — optional height/dist allow a close
  // ground-level 3/4 framing (e.g. #view=95,103,8,18) for inspecting props, not
  // just the default high aerial (40,50) used for distant landmarks. A NEGATIVE
  // dist parks the camera on the -z side of the target (looking south), e.g.
  // #view=74,119,7,-15 to inspect a north-facing facade like the house front.
  const viewMatch = location.hash.match(
    /^#view=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?(?:,(-?\d+(?:\.\d+)?))?/,
  );
  if (import.meta.env.DEV && viewMatch) {
    const tx = parseFloat(viewMatch[1]);
    const tz = parseFloat(viewMatch[2]);
    const h = viewMatch[3] ? parseFloat(viewMatch[3]) : 40;
    const dist = viewMatch[4] ? parseFloat(viewMatch[4]) : 50;
    engine.camera.position.set(tx, h, tz + dist);
    engine.camera.lookAt(tx, h <= 15 ? 2 : 6, tz);
    DebugOverlay.viewCaption(container, tx, tz, h, dist);
    hideLoading();
    engine.start();
    return;
  }

  // DEV-only character preview: #char shows humanoids (front / side / back) for
  // inspecting the model (face, hair, backpack) without driving the camera.
  if (import.meta.env.DEV && location.hash.startsWith("#char")) {
    const palettes = [
      { skin: 0xf0c9a0, shirt: 0x2e6fb0, pants: 0x274060 }, // player
      { skin: 0xe0b48a, shirt: 0x7a4a9a, pants: 0x303848 },
      { skin: 0xc98a5a, shirt: 0xc0392b, pants: 0x2a2a30 },
    ];
    const yaws = [0, Math.PI / 2, Math.PI]; // front, side, back
    palettes.forEach((p, i) => {
      const h = makeHumanoid(p);
      h.group.position.set((i - 1) * 1.7, 0, 0);
      h.group.rotation.y = yaws[i];
      engine.scene.add(h.group);
    });
    engine.camera.position.set(0, 1.4, 4.2);
    engine.camera.lookAt(0, 1.15, 0);
    hideLoading();
    engine.start();
    return;
  }

  // DEV-only object-library catalog: #objects lays out every reusable object
  // (with recolored variants) on pedestals so the library can be inspected at a
  // glance. Static scene (no follow/game), mirrors the #char preview.
  if (import.meta.env.DEV && location.hash.startsWith("#objects")) {
    // hide the city (built before the route checks) so the catalog reads against
    // a clean backdrop; keep the lights so the objects are lit.
    engine.scene.children.forEach((c) => {
      if (!(c as THREE.Object3D & { isLight?: boolean }).isLight) c.visible = false;
    });
    const COL = 1.9, ROW = 2.4;
    const maxCols = Math.max(...OBJECT_LIBRARY.map((e) => e.variants.length));
    OBJECT_LIBRARY.forEach((entry, ri) => {
      entry.variants.forEach((v, vi) => {
        const mesh = tintedMesh(v.geo());
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const s = 1.4 / maxDim;
        mesh.scale.setScalar(s);
        const x = (vi - (maxCols - 1) / 2) * COL;
        const z = (ri - (OBJECT_LIBRARY.length - 1) / 2) * ROW;
        const ped = new THREE.Mesh(
          new THREE.CylinderGeometry(0.62, 0.72, 0.3, 16),
          new THREE.MeshStandardMaterial({ color: 0xece8df }),
        );
        ped.position.set(x, 0.15, z);
        ped.receiveShadow = true;
        engine.scene.add(ped);
        mesh.position.set(x, 0.3 - box.min.y * s, z);
        engine.scene.add(mesh);
      });
    });
    engine.camera.position.set(0, 7.5, OBJECT_LIBRARY.length * ROW * 0.7 + 6);
    engine.camera.lookAt(0, 0.6, 0);
    hideLoading();
    engine.start();
    return;
  }

  const game = new Game(engine.renderer, engine.scene, physics, input, world, follow, engine.camera, hud, minimap, container, lockPointer, fade);

  // Ambient air traffic: a few airliners flying circuits high overhead. Added
  // straight to the scene + tick list (not the per-map world group) so they
  // persist across the city↔airport switch. registerCatalog() already ran in
  // the World constructor above, so the "airliner" kind is available to build.
  const skyTraffic = new SkyTraffic();
  engine.scene.add(skyTraffic.group);

  // step physics before game logic each frame
  engine.add({ update: (dt) => physics.step(dt) });
  engine.add(game);
  engine.add(follow);
  engine.add(skyTraffic);

  // No control-legend chips: the game teaches itself, and contextual prompts
  // (e.g. "Press E to drive") still appear via hud.setPrompt when relevant.

  // Transient on-screen note for the dev perf hotkeys (F4-F7), so the new state
  // is visible while pointer-locked without opening the console.
  const toastEl = document.createElement("div");
  toastEl.style.cssText =
    "position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:8;" +
    "pointer-events:none;font:13px ui-monospace,Consolas,monospace;color:#eaffea;" +
    "background:rgba(10,16,22,0.8);border:1px solid rgba(120,255,160,0.4);" +
    "border-radius:6px;padding:6px 12px;opacity:0;transition:opacity .15s;";
  container.appendChild(toastEl);
  let toastTimer = 0;
  const perfToast = (label: string) => {
    toastEl.textContent = label;
    toastEl.style.opacity = "1";
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toastEl.style.opacity = "0"; }, 1400);
  };

  const menu = new Menu(container);
  let started = false;
  let primed = false; // has the first world frame rendered at least once?

  // On-screen joystick + drag-look + action buttons. Always created, but only shown
  // while in touch mode (and in play, phone closed) — on a mouse PC they stay hidden.
  engine.add(new VirtualControls(container, input, follow, () => started && !game.phoneOpen && touchMode));
  const begin = () => {
    menu.hide();
    started = true;
    if (!primed) {
      // First start: the first render compiles all shaders (a black-screen stall),
      // so keep the loading screen up until that frame lands, THEN reveal + lock.
      showLoading();
      engine.onFirstFrame = () => { primed = true; hideLoading(); lockPointer(); };
    } else {
      lockPointer(); // resume from pause — already primed, no stall, no loader
    }
    engine.start();
  };
  menu.onStart(begin);
  menu.showTitle();
  hideLoading(); // world is built and the title is up — drop the loading screen

  // Re-acquire pointer lock if the user clicks back into the canvas while playing.
  canvas.addEventListener("click", () => { if (started) lockPointer(); });
  window.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas) follow.addOrbit(e.movementX, e.movementY);
  });
  window.addEventListener("wheel", (e) => { if (started) follow.zoom(e.deltaY); }, { passive: true });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && started) {
      if (game.phoneOpen) { game.closePhone(); return; }
      if (engine["running"] ?? true) { input.clear(); engine.stop(); menu.showPause(); }
    }
    if (e.code === "KeyM" && started) minimap.toggle();
    if (e.code === "F3") game.toggleDebug();
    // Dev perf levers — watch the F3 fps readout as you toggle each to find the
    // real bottleneck. F4 shadows on/off, F5 render resolution, F6 shadow-map
    // size, F7 shadow refresh cadence. preventDefault so F5 doesn't reload the tab.
    if (e.code === "F4") { e.preventDefault(); perfToast(engine.toggleShadows()); }
    if (e.code === "F5") { e.preventDefault(); perfToast(engine.cyclePixelRatio()); }
    if (e.code === "F6") { e.preventDefault(); perfToast(engine.cycleShadowSize()); }
    if (e.code === "F7") { e.preventDefault(); perfToast(engine.cycleShadowEvery()); }
  });
  window.addEventListener("blur", () => input.clear());
}

boot();
