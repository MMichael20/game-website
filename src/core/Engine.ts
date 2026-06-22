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
  private sun!: THREE.DirectionalLight;
  private readonly onResize = () => this.resize();
  // Live perf levers (toggled by dev hotkeys, see main.ts) so the real bottleneck
  // can be isolated in-game by watching the F3 fps readout.
  private pixelRatioCap = 1.5;
  private shadowSize = 2048;
  private shadowEvery = 2; // refresh sun shadows every Nth rendered frame
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

    // Far plane is 2400 (not 1000) so the high, distant SkyTraffic airliners
    // don't pop in/out at the horizon. The Sky dome renders independently of the
    // far plane (its shader pins depth to far), so this only affects real geometry.
    this.camera = new THREE.PerspectiveCamera(60, this.aspect(), 0.3, 2400);
    this.camera.position.set(0, 8, 14);

    // No logarithmicDepthBuffer: it writes gl_FragDepth on every fragment, which
    // disables the GPU's early-Z rejection — in this overdraw-heavy city (buildings
    // behind buildings behind sky) that made occluded fragments still run the full
    // material+shadow shader, the dominant fill-rate cost. Our 0.3/2400 near/far is
    // a precision range a normal depth buffer handles fine. No preserveDrawingBuffer
    // either: it only existed for canvas read-back (toDataURL screenshots), which
    // this project doesn't do, and it can block driver fast-paths.
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // Cap render resolution at 1.5x device pixels. The scene is fill-rate bound
    // (heavy per-fragment: sky scattering, soft shadows), so on a high-DPI display
    // this is a big FPS win for a slight softening. Live-tunable via cyclePixelRatio.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatioCap));
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
    sun.shadow.mapSize.set(this.shadowSize, this.shadowSize);
    const s = 100;
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.far = 400;
    this.scene.add(sun);
    this.sun = sun;
    this.scene.add(new THREE.AmbientLight(DAY.ambientColor, DAY.ambientIntensity));

    window.addEventListener("resize", this.onResize);
  }

  private aspect(): number {
    return this.container.clientWidth / Math.max(1, this.container.clientHeight);
  }

  // Fired once, right after the FIRST scene render. The first render is where the
  // GPU compiles every shader/shadow program — a synchronous stall that shows as a
  // black canvas. Callers use this to keep a loading screen up until it's over.
  onFirstFrame?: () => void;

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
    // Refresh sun shadows every Nth rendered frame: the sun is static and entities
    // move slowly, so sub-60 Hz shadows are near-imperceptible but cut the shadow
    // pass (a second draw of every shadow caster) — a real CPU+GPU win.
    this.renderer.shadowMap.needsUpdate = (this.shadowTick++ % this.shadowEvery) === 0;
    for (const t of this.tickables) t.update(step);
    this.renderer.render(this.scene, this.camera);
    if (this.onFirstFrame) { const cb = this.onFirstFrame; this.onFirstFrame = undefined; cb(); }
  }

  private resize(): void {
    this.camera.aspect = this.aspect();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  // --- Live perf levers (dev hotkeys) -------------------------------------
  // Each returns a short label describing the new state so the caller can show it.

  // Toggle all sun shadows. Disabling needs a one-time material recompile, so we
  // flag every scene material for update; the resulting hitch is expected.
  toggleShadows(): string {
    const on = !this.renderer.shadowMap.enabled;
    this.renderer.shadowMap.enabled = on;
    this.sun.castShadow = on;
    this.scene.traverse((obj) => {
      const m = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => (x.needsUpdate = true));
      else if (m) m.needsUpdate = true;
    });
    this.renderer.shadowMap.needsUpdate = on;
    return `shadows ${on ? "ON" : "OFF"}`;
  }

  // Cycle the render resolution cap (1.5 -> 1.0 -> 0.75 -> back). Lower = fewer
  // fragments = the cleanest way to confirm a fill-rate bottleneck live.
  cyclePixelRatio(): string {
    const steps = [1.5, 1.0, 0.75];
    const i = (steps.indexOf(this.pixelRatioCap) + 1) % steps.length;
    this.pixelRatioCap = steps[i];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatioCap));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    return `pixelRatio cap ${this.pixelRatioCap}`;
  }

  // Cycle the sun shadow-map resolution (2048 -> 1024 -> 512 -> back).
  cycleShadowSize(): string {
    const steps = [2048, 1024, 512];
    const i = (steps.indexOf(this.shadowSize) + 1) % steps.length;
    this.shadowSize = steps[i];
    this.sun.shadow.mapSize.set(this.shadowSize, this.shadowSize);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null as unknown as THREE.WebGLRenderTarget;
    this.renderer.shadowMap.needsUpdate = true;
    return `shadowMap ${this.shadowSize}`;
  }

  // Cycle how often shadows refresh (every 2nd -> 3rd -> 4th -> 1st frame).
  cycleShadowEvery(): string {
    this.shadowEvery = (this.shadowEvery % 4) + 1;
    return `shadows every ${this.shadowEvery} frame(s)`;
  }

  dispose(): void {
    this.stop();
    window.removeEventListener("resize", this.onResize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
