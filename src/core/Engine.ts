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
  // Soft ~60 fps cap: on high-refresh displays we skip extra animation frames so
  // the GPU/CPU don't render more than we need. The small epsilon keeps a true
  // 60 Hz display from accidentally halving to 30 fps on timing jitter.
  private acc = 0;
  private shadowTick = 0;
  private static readonly MIN_FRAME = 1 / 60 - 0.001;

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

    this.camera = new THREE.PerspectiveCamera(60, this.aspect(), 0.3, 1000);
    this.camera.position.set(0, 8, 14);

    // preserveDrawingBuffer lets the canvas be read back (toDataURL) for the
    // screenshot-based visual verification this project relies on; it does not
    // change what is rendered.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // We drive shadow refreshes manually (see frame()) instead of every frame.
    this.renderer.shadowMap.autoUpdate = false;
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
    this.acc += dt;
    // Skip this refresh tick until ~1/60 s of work has accumulated (caps fps).
    if (this.acc < Engine.MIN_FRAME) return;
    const step = Math.min(this.acc, 0.05);
    this.acc = 0;
    // Refresh sun shadows on every other rendered frame: the sun is static and
    // entities move slowly, so 30 Hz shadows are imperceptible but halve the
    // shadow pass (a second draw of every shadow caster) — a real CPU+GPU win.
    this.renderer.shadowMap.needsUpdate = (this.shadowTick++ & 1) === 0;
    for (const t of this.tickables) t.update(step);
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
