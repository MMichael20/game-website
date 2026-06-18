// rishon3d/src/core/Engine.ts
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { DAY, sunPosition } from "./sky";

export interface Tickable { update(dt: number): void }

export class Engine {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();
  private tickables: Tickable[] = [];
  private running = false;
  private readonly onResize = () => this.resize();

  constructor(private container: HTMLElement) {
    const sunDir = sunPosition(1);

    // Sky dome: physically-based scattering tuned to a bright clear midday.
    const sky = new Sky();
    sky.scale.setScalar(10000);
    const u = sky.material.uniforms;
    u.turbidity.value = DAY.turbidity;
    u.rayleigh.value = DAY.rayleigh;
    u.mieCoefficient.value = DAY.mieCoefficient;
    u.mieDirectionalG.value = DAY.mieDirectionalG;
    u.sunPosition.value.copy(sunDir);
    this.scene.add(sky);

    // No fog: distant districts stay crisp and colorful in the daytime look.
    this.scene.fog = null;

    this.camera = new THREE.PerspectiveCamera(60, this.aspect(), 0.1, 1000);
    this.camera.position.set(0, 8, 14);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Neutral tone mapping keeps saturated flat colors punchy (no ACES desat).
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = DAY.exposure;
    container.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGround, DAY.hemiIntensity);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(DAY.sunColor, DAY.sunIntensity);
    sun.position.copy(sunPosition(120));
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 100;
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.far = 400;
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(DAY.ambientColor, DAY.ambientIntensity));

    window.addEventListener("resize", this.onResize);
  }

  private aspect(): number {
    return this.container.clientWidth / Math.max(1, this.container.clientHeight);
  }

  add(t: Tickable): void { this.tickables.push(t); }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    for (const t of this.tickables) t.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private resize(): void {
    this.camera.aspect = this.aspect();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener("resize", this.onResize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
