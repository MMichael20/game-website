// Dev-only character turnaround: renders the humanoid at four angles on a neutral
// background with the game's DAY lighting, for comparing against the reference
// turnaround in assets/design-examples. Served at /turnaround.html by `npm run dev`.
import * as THREE from "three";
import { makeHumanoid } from "./entities/Humanoid";
import { DAY, sunPosition } from "./core/sky";
import { createComposer } from "./core/postfx";

const app = document.getElementById("app")!;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdedede);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = DAY.exposure;
app.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.25, 10);
camera.lookAt(0, 1.0, 0);

scene.add(new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGround, DAY.hemiIntensity));
const sun = new THREE.DirectionalLight(DAY.sunColor, DAY.sunIntensity);
sun.position.copy(sunPosition(20));
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
scene.add(sun);
scene.add(new THREE.AmbientLight(DAY.ambientColor, DAY.ambientIntensity));

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0xd2d2d2 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const palette = { skin: 0xf0c9a0, shirt: 0x2e6fb0, pants: 0x274060, hair: 0x4a3526 };
const xs = [-3.3, -1.1, 1.1, 3.3];
const rots = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
xs.forEach((x, i) => {
  const { group } = makeHumanoid(palette);
  group.position.set(x, 0, 0);
  group.rotation.y = rots[i];
  group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  scene.add(group);
});

// Render through the shared post-processing pipeline (GTAO + bloom + SMAA) so the
// turnaround preview matches the in-game look exactly.
const composer = createComposer(renderer, scene, camera, window.innerWidth, window.innerHeight);
function draw(): void { composer.render(0); }
draw();
addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  draw();
});
