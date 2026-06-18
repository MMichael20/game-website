import * as THREE from "three";
import type { Tickable } from "../core/Engine";
import { FollowCamera } from "../core/FollowCamera";
import type { Input } from "../core/Input";
import type { Physics } from "../core/Physics";
import { Character } from "../entities/Character";
import { Car } from "../entities/Car";
import { Npc } from "../entities/Npc";
import { Animal } from "../entities/Animal";
import { NpcCar } from "../entities/NpcCar";
import type { World } from "../world/World";
import { nextMode, canEnter, type Mode } from "./InteractionSystem";
import { buildingRects, type Rect } from "./wander";
import { EntityManager } from "./EntityManager";
import { planPopulations } from "./populate";
import type { Hud } from "../ui/Hud";
import type { Minimap } from "../ui/Minimap";
import { safeExitPosition } from "./exit";
import { formatSpeed } from "../ui/format";
import { RideCar } from "../entities/RideCar";
import { nextTaxiPhase, type TaxiPhase } from "./taxi";
import { Phone } from "../ui/Phone";

const ENTER_RADIUS = 3.5;

export class Game implements Tickable {
  private character: Character;
  private car: Car;
  private mode: Mode = "onFoot";
  private entities: EntityManager;
  private rects: Rect[];
  private bounds: number;
  private summon: RideCar;
  private summonPhase: TaxiPhase = "idle";
  private pickup = { x: 0, z: 0 };
  private phone: Phone;

  constructor(
    scene: THREE.Scene,
    physics: Physics,
    private input: Input,
    world: World,
    private follow: FollowCamera,
    camera: THREE.Camera,
    private hud: Hud,
    private minimap: Minimap,
    container: HTMLElement,
    private lockPointer: () => void,
  ) {
    this.character = new Character(scene, physics, input, world.playerSpawn, camera);
    this.car = new Car(scene, physics, input, world.carSpawn);
    const rects = buildingRects(world.map.buildings, 1.5);
    const bounds = world.map.ground.size / 2 - 2;
    this.rects = rects;
    this.bounds = bounds;
    this.summon = new RideCar(scene);
    this.phone = new Phone(container);
    this.phone.onCallCar(() => this.callCar());
    const palettes = [
      { skin: 0xe8b98a, shirt: 0x9b59b6, pants: 0x40313f },
      { skin: 0xf0c9a0, shirt: 0x27ae60, pants: 0x1e5c3a },
      { skin: 0xd9a066, shirt: 0xe67e22, pants: 0x7a431a },
      { skin: 0xf2d2b6, shirt: 0x2980b9, pants: 0x1f3f57 },
      { skin: 0xe8b98a, shirt: 0xc0392b, pants: 0x5a1f1a },
      { skin: 0xf0c9a0, shirt: 0xf1c40f, pants: 0x6b5a12 },
    ];
    this.entities = new EntityManager(() => camera.position, 140);

    // Hand-authored downtown NPCs (kept for character).
    world.npcSpawns.forEach((s, i) => {
      this.entities.add(new Npc(scene, s, palettes[i % palettes.length], { bounds, rects }));
    });

    // Procedurally placed life across the whole city.
    const pop = planPopulations(world.map, 1234, { pedestrians: 28, cats: 8, dogs: 8 });
    pop.pedestrians.forEach((s, i) => {
      this.entities.add(new Npc(scene, s, palettes[i % palettes.length], { bounds, rects }));
    });
    pop.cats.forEach((s) => this.entities.add(new Animal(scene, s, "cat", { bounds, rects })));
    pop.dogs.forEach((s) => this.entities.add(new Animal(scene, s, "dog", { bounds, rects })));

    const carColors = [0x2980b9, 0xf1c40f, 0x27ae60, 0xe67e22, 0x8e44ad, 0xecf0f1];
    pop.carRoutes.forEach((route, i) => {
      this.entities.add(new NpcCar(scene, route, carColors[i % carColors.length], 6 + (i % 3)));
    });
    this.car.enabled = false;
    this.character.enabled = true;
    this.follow.setTarget(this.character.object, 10, 1.6);
  }

  get phoneOpen(): boolean { return this.phone.isOpen; }
  closePhone(): void { this.phone.close(); this.lockPointer(); }

  // Called from the phone's "Call Car" app: your own car drives to you.
  private callCar(): void {
    this.phone.close();
    this.lockPointer();
    if (this.summonPhase !== "idle" || this.mode !== "onFoot") return;
    const p = { x: this.character.position.x, z: this.character.position.z };
    this.pickup = { x: p.x, z: p.z };
    this.summon.spawnAt(safeExitPosition({ x: p.x + 25, z: p.z }, this.rects, this.bounds));
    this.summonPhase = nextTaxiPhase("idle", "call"); // -> "toPickup"
  }

  update(dt: number): void {
    // While the phone is up, freeze gameplay; P (or Esc, via main) closes it.
    if (this.phone.isOpen) {
      if (this.input.justPressed("KeyP")) this.closePhone();
      this.input.endFrame();
      return;
    }

    const ePressed = this.input.justPressed("KeyE");
    const pPos = { x: this.character.position.x, z: this.character.position.z };
    const cPos = { x: this.car.position.x, z: this.car.position.z };

    // Open the phone (on foot only).
    if (this.input.justPressed("KeyP") && this.mode === "onFoot") {
      this.phone.open();
      this.input.endFrame();
      return;
    }

    // --- Summoned car: your own car drives to you, then you get in and drive it ---
    let summonConsumedE = false;
    if (this.summonPhase === "toPickup") {
      if (this.summon.driveTo(this.pickup, dt)) {
        this.summonPhase = nextTaxiPhase("toPickup", "arrivedPickup"); // -> "waiting"
      }
    } else if (this.summonPhase === "waiting") {
      const near = Math.hypot(pPos.x - this.summon.position.x, pPos.z - this.summon.position.z) <= 5;
      if (ePressed && near && this.mode === "onFoot") {
        // Hand off from the kinematic stand-in to the real drivable car at its pose.
        this.car.teleportTo(this.summon.position.x, this.summon.position.z, this.summon.heading);
        this.summon.setVisible(false);
        this.summonPhase = "idle";
        summonConsumedE = true;
        this.mode = "driving";
        this.character.enabled = false;
        this.character.object.visible = false;
        this.car.enabled = true;
        this.follow.setTarget(this.car.object, 11, 1.4);
      }
    }

    // --- Own car enter/exit (walk-up), suppressed when E was consumed by the summon ---
    const eForCar = ePressed && !summonConsumedE;
    const newMode = nextMode(this.mode, eForCar, pPos, cPos, ENTER_RADIUS);
    if (newMode !== this.mode) {
      this.mode = newMode;
      if (this.mode === "driving") {
        // Driving off cancels a pending summon so it isn't left stranded.
        if (this.summonPhase === "toPickup" || this.summonPhase === "waiting") {
          this.summonPhase = "idle";
          this.summon.setVisible(false);
        }
        this.character.enabled = false;
        this.character.object.visible = false;
        this.car.enabled = true;
        this.follow.setTarget(this.car.object, 11, 1.4);
      } else {
        this.car.enabled = false;
        const exit = safeExitPosition(cPos, this.rects, this.bounds);
        this.character.setPosition(exit.x, exit.z);
        this.character.object.visible = true;
        this.character.enabled = true;
        this.follow.setTarget(this.character.object, 10, 1.6);
      }
    }

    // --- HUD prompt ---
    if (this.summonPhase === "toPickup") {
      this.hud.setPrompt("Your car is on its way...");
    } else if (this.summonPhase === "waiting") {
      this.hud.setPrompt("Press E to get in");
    } else if (this.mode === "onFoot" && canEnter("onFoot", pPos, cPos, ENTER_RADIUS)) {
      this.hud.setPrompt("Press E to drive");
    } else if (this.mode === "driving") {
      this.hud.setPrompt("Press E to exit");
    } else if (this.mode === "onFoot") {
      this.hud.setPrompt("Press P for phone");
    } else {
      this.hud.setPrompt(null);
    }

    this.character.update(dt);
    this.car.update(dt);
    this.entities.update(dt);
    this.minimap.update(pPos, cPos, this.mode);
    this.hud.setSpeed(this.mode === "driving" ? formatSpeed(this.car.speed) : null);
    this.input.endFrame();
  }
}
