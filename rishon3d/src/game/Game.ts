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
import type { Hud } from "../ui/Hud";

const ENTER_RADIUS = 3.5;

export class Game implements Tickable {
  private character: Character;
  private car: Car;
  private mode: Mode = "onFoot";

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
    const npcColors = [0x9b59b6, 0x27ae60, 0xe67e22];
    world.npcSpawns.forEach((s, i) => new Npc(scene, s, npcColors[i % npcColors.length]));
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
    this.input.endFrame();
  }
}
