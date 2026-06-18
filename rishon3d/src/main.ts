import { Engine } from "./core/Engine";
import { Input } from "./core/Input";
import { Physics } from "./core/Physics";
import { FollowCamera } from "./core/FollowCamera";
import { World } from "./world/World";
import { RISHON_MAP, validateMap } from "./world/rishonMap";
import { Game } from "./game/Game";
import { Menu } from "./ui/Menu";
import { Hud } from "./ui/Hud";

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
  const game = new Game(engine.scene, physics, input, world, follow, engine.camera, hud);

  // step physics before game logic each frame
  engine.add({ update: (dt) => physics.step(dt) });
  engine.add(game);
  engine.add(follow);

  hud.setHint("WASD / Arrows move - Space brake - E enter/exit - Esc pause");

  const menu = new Menu(container);
  let started = false;
  const begin = () => { menu.hide(); engine.start(); started = true; };
  menu.onStart(begin);
  menu.showTitle();

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && started) {
      if (engine["running"] ?? true) { input.clear(); engine.stop(); menu.showPause(); }
    }
  });
  window.addEventListener("blur", () => input.clear());
}

boot();
