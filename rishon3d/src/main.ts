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
  const game = new Game(engine.scene, physics, input, world, follow, engine.camera, hud, minimap);

  // step physics before game logic each frame
  engine.add({ update: (dt) => physics.step(dt) });
  engine.add(game);
  engine.add(follow);

  hud.setHint("WASD / Arrows move - Mouse look - Scroll zoom - Space brake - E enter/exit - M map - Esc pause");

  // GTA-style camera: capture the pointer so mouse movement orbits the camera.
  const canvas = engine.renderer.domElement;
  const lockPointer = () => {
    const p = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
    if (p && typeof p.catch === "function") p.catch(() => {}); // ignore lock rejections (e.g. headless)
  };

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
      if (engine["running"] ?? true) { input.clear(); engine.stop(); menu.showPause(); }
    }
    if (e.code === "KeyM" && started) minimap.toggle();
  });
  window.addEventListener("blur", () => input.clear());
}

boot();
