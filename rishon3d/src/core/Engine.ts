import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { DUSK, sunPosition } from "./sky";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export interface Tickable { update(dt: number): void }

export class Engine {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private clock = new THREE.Clock();
  private tickables: Tickable[] = [];
  private running = false;
  private readonly onResize = () => this.resize();

  constructor(private container: HTMLElement) {
    const sunDir = sunPosition(1);

    // Sky dome: physically-based Rayleigh/Mie sunset glow, replaces the flat
    // background color. Driven entirely by DUSK so sky + lights stay in sync.
    const sky = new Sky();
    sky.scale.setScalar(10000);
    const u = sky.material.uniforms;
    u.turbidity.value = DUSK.turbidity;
    u.rayleigh.value = DUSK.rayleigh;
    u.mieCoefficient.value = DUSK.mieCoefficient;
    u.mieDirectionalG.value = DUSK.mieDirectionalG;
    u.sunPosition.value.copy(sunDir);
    this.scene.add(sky);

    // Warm haze so distant districts melt into the horizon glow.
    this.scene.fog = new THREE.Fog(DUSK.fogColor, DUSK.fogNear, DUSK.fogFar);

    this.camera = new THREE.PerspectiveCamera(60, this.aspect(), 0.1, 1000);
    this.camera.position.set(0, 8, 14);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = DUSK.exposure;
    container.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight(DUSK.hemiSky, DUSK.hemiGround, DUSK.hemiIntensity);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(DUSK.sunColor, DUSK.sunIntensity);
    sun.position.copy(sunPosition(120)); // far, along the sun direction -> long shadows
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 100; // widened for the long dusk shadows
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.far = 400;
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(DUSK.ambientColor, DUSK.ambientIntensity));

    // Postprocessing: subtle bloom so lit windows / streetlights / sun glow at dusk.
    // RenderPass -> UnrealBloomPass -> OutputPass; OutputPass applies tone mapping
    // (reads renderer.toneMapping/exposure), so tone mapping is NOT double-applied.
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // UnrealBloomPass(resolution, strength, radius, threshold) — tuned for tasteful dusk glow.
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.8, 0.6, 0.5);
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());

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
    this.composer.render();
  }

  private resize(): void {
    this.camera.aspect = this.aspect();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener("resize", this.onResize);
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
