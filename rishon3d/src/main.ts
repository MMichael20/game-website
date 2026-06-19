import * as THREE from "three";
import { Engine } from "./core/Engine";
import { Input } from "./core/Input";
import { Physics } from "./core/Physics";
import { FollowCamera } from "./core/FollowCamera";
import { World } from "./world/World";
import { validateMap } from "./world/rishonMap";
import { RISHON_MAP } from "./world/worldData";
import { Game } from "./game/Game";
import { Menu } from "./ui/Menu";
import { Hud } from "./ui/Hud";
import { Minimap } from "./ui/Minimap";
import { makeHumanoid } from "./entities/Humanoid";
import { OBJECT_LIBRARY, tintedMesh } from "./world/objects";

async function boot() {
  const container = document.getElementById("app")!;
  const errors = validateMap(RISHON_MAP);
  if (errors.length) console.error("map invalid", errors);

  await Physics.init();
  const physics = new Physics();
  const engine = new Engine(container);
  const world = new World(engine.scene, physics, RISHON_MAP);
  const follow = new FollowCamera(engine.camera);
  const input = new Input();
  const hud = new Hud(container);
  const minimap = new Minimap(container, RISHON_MAP);
  // GTA-style camera: capture the pointer so mouse movement orbits the camera.
  const canvas = engine.renderer.domElement;
  const lockPointer = () => {
    const p = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
    if (p && typeof p.catch === "function") p.catch(() => {}); // ignore lock rejections (e.g. headless)
  };

  // DEV-only aerial screenshot mode: open with #view=<x>,<z> to park the camera
  // over (x,z) and render the static scene (no follow/game), for inspecting
  // distant landmarks (airport, restaurant street, transit station).
  // #view=<x>,<z>[,<height>][,<dist>] — optional height/dist allow a close
  // ground-level 3/4 framing (e.g. #view=95,103,8,18) for inspecting props, not
  // just the default high aerial (40,50) used for distant landmarks.
  const viewMatch = location.hash.match(
    /^#view=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?(?:,(\d+(?:\.\d+)?))?/,
  );
  if (import.meta.env.DEV && viewMatch) {
    const tx = parseFloat(viewMatch[1]);
    const tz = parseFloat(viewMatch[2]);
    const h = viewMatch[3] ? parseFloat(viewMatch[3]) : 40;
    const dist = viewMatch[4] ? parseFloat(viewMatch[4]) : 50;
    engine.camera.position.set(tx, h, tz + dist);
    engine.camera.lookAt(tx, h <= 15 ? 2 : 6, tz);
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
    engine.start();
    return;
  }

  const game = new Game(engine.scene, physics, input, world, follow, engine.camera, hud, minimap, container, lockPointer);

  // step physics before game logic each frame
  engine.add({ update: (dt) => physics.step(dt) });
  engine.add(game);
  engine.add(follow);

  hud.setChips([
    ["WASD", "Move"],
    ["Mouse", "Look"],
    ["E", "Drive"],
    ["P", "Phone"],
    ["M", "Map"],
    ["Esc", "Pause"],
  ]);

  const menu = new Menu(container);
  let started = false;
  const begin = () => { menu.hide(); engine.start(); started = true; lockPointer(); };
  menu.onStart(begin);
  menu.showTitle();

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
  });
  window.addEventListener("blur", () => input.clear());
}

boot();
