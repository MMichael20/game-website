// rishon3d/src/core/postfx.ts
// Shared post-processing pipeline so the game Engine and the dev turnaround render
// through ONE chain (no divergence back to the flat look). Order:
//   RenderPass -> GTAOPass -> UnrealBloomPass -> OutputPass -> SMAAPass
// - GTAO grounds every object with soft ambient occlusion (the biggest fidelity win).
// - Bloom is intentionally conservative here (high threshold) so the bright daytime
//   scene does not blow out; it becomes selective + tuned once Tier 3 adds emissive
//   lanterns/signs.
// - OutputPass applies tone mapping (Neutral) + sRGB as the HDR->display step.
// - SMAA re-adds anti-aliasing, since composer targets bypass the renderer's MSAA.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";

export function createComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number,
): EffectComposer {
  const composer = new EffectComposer(renderer);
  composer.setSize(width, height);

  composer.addPass(new RenderPass(scene, camera));

  // Ambient-occlusion grounding. World-space radius tuned for the toy-city scale
  // (characters ~1.8u tall): tight enough for corners/prop bases, broad enough to
  // shade wall bases and window recesses. Tuned further against screenshots.
  const gtao = new GTAOPass(scene, camera, width, height);
  gtao.updateGtaoMaterial({
    radius: 0.7,
    distanceExponent: 1.0,
    thickness: 1.0,
    scale: 1.0,
    samples: 16,
    screenSpaceRadius: false,
  });
  composer.addPass(gtao);

  // Conservative bloom: high threshold so only the brightest highlights glow now.
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.4, 0.4, 0.95);
  composer.addPass(bloom);

  composer.addPass(new OutputPass());

  // Anti-aliasing last, on the tone-mapped sRGB image.
  composer.addPass(new SMAAPass(width, height));

  return composer;
}

export function resizeComposer(composer: EffectComposer, width: number, height: number): void {
  composer.setSize(width, height);
}
