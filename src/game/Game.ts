import * as THREE from "three";
import type { Tickable } from "../core/Engine";
import { FollowCamera } from "../core/FollowCamera";
import type { Input } from "../core/Input";
import type { Physics } from "../core/Physics";
import { Character } from "../entities/Character";
import { Car } from "../entities/Car";
import { nearestPoi, poiPrompt } from "./interactions";
import type { World } from "../world/World";
import { MAPS } from "../world/maps";
import type { Portal } from "../world/system/types";
import type { FadeOverlay } from "../ui/FadeOverlay";
import { nextMode, canEnter, type Mode } from "./InteractionSystem";
import type { Rect } from "./wander";
import { EntityManager } from "./EntityManager";
import type { Hud } from "../ui/Hud";
import type { Minimap } from "../ui/Minimap";
import { safeExitPosition } from "./exit";
import { formatSpeed } from "../ui/format";
import { RideCar } from "../entities/RideCar";
import { nextTaxiPhase, type TaxiPhase } from "./taxi";
import { Phone } from "../ui/Phone";
import { DebugOverlay } from "../ui/DebugOverlay";
import { locationPois } from "../world/locations";
import { assetCounts } from "../world/assets";

const ENTER_RADIUS = 3.5;

// Nearest-POI HUD anchor reads the location-registry projection, keeping the
// registry the single source for on-foot prompts.
const POIS = locationPois();

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
  private debug: DebugOverlay;
  private lookDir = new THREE.Vector3();
  private fps = 0;

  // Map-switch transition: a fade-out/swap/fade-in state machine, frozen like the
  // phone while it runs. FADE is the seconds of each half (out, then in).
  private transition: "idle" | "out" | "in" = "idle";
  private tT = 0;
  private pendingPortal: Portal | null = null;
  private static readonly FADE = 0.45;
  // Where the car was parked when we left the city, so it's still there on return.
  private savedCarPose: { x: number; z: number; yaw: number } | null = null;
  private readonly _euler = new THREE.Euler();

  constructor(
    private renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    physics: Physics,
    private input: Input,
    private world: World,
    private follow: FollowCamera,
    private camera: THREE.Camera,
    private hud: Hud,
    private minimap: Minimap,
    container: HTMLElement,
    private lockPointer: () => void,
    private fade: FadeOverlay,
  ) {
    this.character = new Character(scene, physics, input, world.playerSpawn, camera);
    this.car = new Car(scene, physics, input, world.carSpawn);
    // Park the spawned car in its right-hand lane facing along the road (drive on
    // the right), instead of the default +z heading.
    this.car.teleportTo(world.carSpawn.x, world.carSpawn.z, world.carSpawnYaw);
    const rects: Rect[] = [];
    const gc = world.groundCenter;
    const bounds = Math.max(Math.abs(gc.x), Math.abs(gc.z)) + world.groundSize / 2 - 2;
    this.rects = rects;
    this.bounds = bounds;
    this.summon = new RideCar(scene);
    this.phone = new Phone(container);
    this.phone.onCallCar(() => this.callCar());
    this.debug = new DebugOverlay(container, import.meta.env.DEV);
    this.entities = new EntityManager(() => camera.position, 90);

    this.car.enabled = false;
    this.character.enabled = true;
    this.follow.setTarget(this.character.object, 8, 1.6, this.character.rigidBody);
  }

  get phoneOpen(): boolean { return this.phone.isOpen; }
  closePhone(): void { this.phone.close(); this.character.setPhonePose(false); this.lockPointer(); }

  // Called from the phone's "Call Car" app: your own car drives to you.
  private callCar(): void {
    this.phone.close();
    this.character.setPhonePose(false);
    this.lockPointer();
    if (this.summonPhase !== "idle" || this.mode !== "onFoot") return;
    const p = { x: this.character.position.x, z: this.character.position.z };
    this.pickup = { x: p.x, z: p.z };
    this.summon.spawnAt(safeExitPosition({ x: p.x + 25, z: p.z }, this.rects, this.bounds));
    this.summonPhase = nextTaxiPhase("idle", "call"); // -> "toPickup"
  }

  update(dt: number): void {
    // Exponentially-smoothed FPS for the debug HUD.
    if (dt > 0) this.fps += ((1 / dt) - this.fps) * 0.1;

    // --- Map-switch transition: ramp the fade, swap worlds at full black, freeze
    // gameplay throughout (mirrors the phone freeze below). ---
    if (this.transition !== "idle") {
      this.tT += dt;
      const k = Math.min(1, this.tT / Game.FADE);
      if (this.transition === "out") {
        this.fade.setOpacity(k);
        if (k >= 1 && this.pendingPortal) {
          this.doSwap(this.pendingPortal);
          this.transition = "in";
          this.tT = 0;
        }
      } else {
        this.fade.setOpacity(1 - k);
        if (k >= 1) {
          this.fade.setOpacity(0);
          this.transition = "idle";
          this.pendingPortal = null;
        }
      }
      this.input.endFrame();
      return;
    }

    // Phone raise/lower animation ticks every frame — even while the phone UI is up
    // and the rest of gameplay is frozen — so the motion plays on open AND close.
    this.character.tickPhone(dt);

    // While the phone is up, freeze gameplay; P (or Esc, via main) closes it.
    if (this.phone.isOpen) {
      if (this.input.justPressed("KeyP")) this.closePhone();
      this.input.endFrame();
      return;
    }

    const ePressed = this.input.justPressed("KeyE");
    const pPos = { x: this.character.position.x, z: this.character.position.z };
    const cPos = { x: this.car.position.x, z: this.car.position.z };

    // --- Map portals: stand on one, press E, fade out and switch worlds. ---
    let nearPortal: Portal | null = null;
    if (this.mode === "onFoot") {
      for (const p of this.world.portals) {
        if (Math.hypot(pPos.x - p.x, pPos.z - p.z) <= p.r) { nearPortal = p; break; }
      }
      if (nearPortal && ePressed) {
        this.transition = "out";
        this.tT = 0;
        this.pendingPortal = nearPortal;
        this.input.endFrame();
        return;
      }
    }

    // Open the phone (on foot only).
    if (this.input.justPressed("KeyP") && this.mode === "onFoot") {
      this.phone.open();
      this.character.setPhonePose(true);
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
        this.follow.setTarget(this.car.object, 14, 1.5, this.car.rigidBody);
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
        this.follow.setTarget(this.car.object, 14, 1.5, this.car.rigidBody);
      } else {
        this.car.enabled = false;
        const exit = safeExitPosition(cPos, this.rects, this.bounds);
        this.character.setPosition(exit.x, exit.z);
        this.character.object.visible = true;
        this.character.enabled = true;
        this.follow.setTarget(this.character.object, 8, 1.6, this.character.rigidBody);
      }
    }

    // --- HUD prompt ---
    const poi = this.mode === "onFoot" ? nearestPoi(pPos) : null;
    if (this.mode === "onFoot" && nearPortal) {
      this.hud.setPrompt(nearPortal.prompt);
    } else if (this.summonPhase === "toPickup") {
      this.hud.setPrompt("Your car is on its way...");
    } else if (this.summonPhase === "waiting") {
      this.hud.setPrompt("Press E to get in");
    } else if (this.mode === "onFoot" && canEnter("onFoot", pPos, cPos, ENTER_RADIUS)) {
      this.hud.setPrompt("Press E to drive");
    } else if (this.mode === "driving") {
      this.hud.setPrompt("Press E to exit");
    } else if (this.mode === "onFoot" && poi) {
      this.hud.setPrompt(poiPrompt(poi));
    } else if (this.mode === "onFoot") {
      this.hud.setPrompt("Press P for phone");
    } else {
      this.hud.setPrompt(null);
    }

    this.character.update(dt);
    this.car.update(dt);
    this.entities.update(dt);
    this.world.cullDetails(this.camera.position.x, this.camera.position.z);
    this.minimap.update(pPos, cPos, this.mode);
    this.hud.setSpeed(this.mode === "driving" ? formatSpeed(this.car.speed) : null);
    this.updateDebug();
    this.input.endFrame();
  }

  // Performed at full black: tear down the current world, build the target, drop
  // the player at the portal's spawn, and re-aim the camera. The car is drivable
  // only in the city; elsewhere it is parked far away and hidden.
  private doSwap(portal: Portal): void {
    const target = MAPS[portal.to];

    // Leaving the city for a car-less map: remember where the car is parked so
    // it's waiting in the same spot when we come back.
    if (this.world.currentId === "city" && !target.hasCar) {
      this._euler.setFromQuaternion(this.car.object.quaternion, "YXZ");
      this.savedCarPose = { x: this.car.position.x, z: this.car.position.z, yaw: this._euler.y };
    }

    this.world.unload();
    this.world.load(target);

    this.mode = "onFoot";
    this.character.enabled = true;
    this.character.object.visible = true;
    this.character.setPosition(portal.toSpawn.x, portal.toSpawn.z);

    if (target.hasCar && target.carSpawn) {
      // Restore the car where we parked it (if saved), else its default spawn.
      const pose = target.id === "city" && this.savedCarPose
        ? this.savedCarPose
        : { x: target.carSpawn.x, z: target.carSpawn.z, yaw: target.carSpawnYaw ?? 0 };
      this.car.enabled = false;
      this.car.teleportTo(pose.x, pose.z, pose.yaw);
      this.car.object.visible = true;
      if (target.id === "city") this.savedCarPose = null;
    } else {
      // Car-less map: hide it and park its body far away so it can't block anyone.
      this.car.enabled = false;
      this.car.object.visible = false;
      this.car.teleportTo(99999, 99999, 0);
    }

    // Re-aim + snap the follow camera while the screen is black (no visible pan).
    this.follow.setTarget(this.character.object, 8, 1.6, this.character.rigidBody);
  }

  toggleDebug(): void { this.debug.toggle(); }

  private updateDebug(): void {
    const p = this.mode === "driving" ? this.car.position : this.character.position;
    this.camera.getWorldDirection(this.lookDir);
    // nearest POI by raw distance (not radius-gated), so the overlay always anchors.
    let nearest: { label: string; x: number; z: number; dist: number } | null = null;
    for (const poi of POIS) {
      const d = Math.hypot(p.x - poi.x, p.z - poi.z);
      if (!nearest || d < nearest.dist) nearest = { label: poi.label, x: poi.x, z: poi.z, dist: d };
    }
    const renderInfo = this.renderer.info.render;
    const ac = assetCounts();
    this.debug.update({
      player: { x: p.x, z: p.z },
      look: { x: this.lookDir.x, z: this.lookDir.z },
      nearest,
      mode: this.mode,
      perf: { fps: this.fps, calls: renderInfo.calls, tris: renderInfo.triangles, geoms: ac.geometries, mats: ac.materials },
    });
  }
}
