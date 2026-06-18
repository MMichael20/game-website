import * as THREE from "three";

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
    const haze = new THREE.Color(0xe7c9a0);
    this.scene.background = haze;
    this.scene.fog = new THREE.Fog(haze, 55, 190);

    this.camera = new THREE.PerspectiveCamera(60, this.aspect(), 0.1, 1000);
    this.camera.position.set(0, 8, 14);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffe6c2, 0x4a4036, 0.7);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffd2a1, 2.2);
    sun.position.set(38, 26, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 80;
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.far = 200;
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0x335066, 0.25));

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
