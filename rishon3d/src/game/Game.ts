import * as THREE from "three";
import type { Tickable } from "../core/Engine";
import { FollowCamera } from "../core/FollowCamera";
import type { Input } from "../core/Input";
import type { Physics } from "../core/Physics";
import { Character } from "../entities/Character";
import { Car } from "../entities/Car";
import { Npc } from "../entities/Npc";
import type { World } from "../world/World";
import { nextMode, canEnter, type Mode } from "./InteractionSystem";
import { buildingRects } from "./wander";
import type { Hud } from "../ui/Hud";

const ENTER_RADIUS = 3.5;

export class Game implements Tickable {
  private character: Character;
  private car: Car;
  private mode: Mode = "onFoot";
  private npcs: Npc[] = [];

  constructor(
    scene: THREE.Scene,
    physics: Physics,
    private input: Input,
    world: World,
    private follow: FollowCamera,
    camera: THREE.Camera,
    private hud: Hud,
  ) {
    this.character = new Character(scene, physics, input, world.playerSpawn, camera);
    this.car = new Car(scene, physics, input, world.carSpawn);
    const rects = buildingRects(world.map.buildings, 1.5);
    const bounds = world.map.ground.size / 2 - 2;
    const palettes = [
      { skin: 0xe8b98a, shirt: 0x9b59b6, pants: 0x40313f },
      { skin: 0xf0c9a0, shirt: 0x27ae60, pants: 0x1e5c3a },
      { skin: 0xd9a066, shirt: 0xe67e22, pants: 0x7a431a },
      { skin: 0xf2d2b6, shirt: 0x2980b9, pants: 0x1f3f57 },
      { skin: 0xe8b98a, shirt: 0xc0392b, pants: 0x5a1f1a },
      { skin: 0xf0c9a0, shirt: 0xf1c40f, pants: 0x6b5a12 },
    ];
    world.npcSpawns.forEach((s, i) => {
      this.npcs.push(new Npc(scene, s, palettes[i % palettes.length], { bounds, rects }));
    });
    this.car.enabled = false;
    this.character.enabled = true;
    this.follow.setTarget(this.character.object, new THREE.Vector3(0, 6, 9));
  }

  update(dt: number): void {
    const ePressed = this.input.justPressed("KeyE");
    const pPos = { x: this.character.position.x, z: this.character.position.z };
    const cPos = { x: this.car.position.x, z: this.car.position.z };
    const newMode = nextMode(this.mode, ePressed, pPos, cPos, ENTER_RADIUS);

    if (newMode !== this.mode) {
      this.mode = newMode;
      if (this.mode === "driving") {
        this.character.enabled = false;
        this.character.object.visible = false;
        this.car.enabled = true;
        this.follow.setTarget(this.car.object, new THREE.Vector3(0, 5, 9));
      } else {
        this.car.enabled = false;
        this.character.setPosition(this.car.position.x + 2.5, this.car.position.z);
        this.character.object.visible = true;
        this.character.enabled = true;
        this.follow.setTarget(this.character.object, new THREE.Vector3(0, 6, 9));
      }
    }

    // prompt
    if (this.mode === "onFoot" && canEnter("onFoot", pPos, cPos, ENTER_RADIUS)) {
      this.hud.setPrompt("Press E to drive");
    } else if (this.mode === "driving") {
      this.hud.setPrompt("Press E to exit");
    } else {
      this.hud.setPrompt(null);
    }

    this.character.update(dt);
    this.car.update(dt);
    for (const n of this.npcs) n.update(dt);
    this.input.endFrame();
  }
}
