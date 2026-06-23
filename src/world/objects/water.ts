// src/world/objects/water.ts
//
// Shared ANIMATED water-surface material. A MeshStandardMaterial patched via
// onBeforeCompile so flat water discs/slabs shimmer: moving sum-of-sines normal
// ripples drift the specular highlights, and a Fresnel rim adds a glassy sheen.
// Vertex colors + shadows are preserved (additive shimmer, not a recolor). One
// cached instance per variant, like voxelMaterial(), so chunk-merge skips it and
// World.unload never disposes it. Time is a single shared value advanced once per
// frame by tickWaterSurfaces(dt) — no per-mesh double counting, deterministic.
import * as THREE from "three";
import { getMaterial } from "../assets";

// One shared time value for ALL water materials (advanced once per frame).
const clock = { t: 0 };
const mats: THREE.MeshStandardMaterial[] = [];

type UTimeHolder = { uTimeUniform?: { value: number } };

function patch(mat: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: clock.t };
    // expose the live uniform so the per-frame ticker writes straight to it
    (mat.userData as UTimeHolder).uTimeUniform = shader.uniforms.uTime;

    // --- vertex: pass world XZ to the fragment stage ---
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vWaterXZ;",
      )
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\n\tvWaterXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;",
      );

    // --- fragment: animated normal ripples + Fresnel sheen ---
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;\nvarying vec2 vWaterXZ;",
      )
      // perturb the geometric normal BEFORE lighting so specular highlights move
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
        {
          vec2 wp = vWaterXZ;
          float t = uTime;
          // two crossing wave trains + a finer ripple = lively but calm water
          float nx = 0.0, nz = 0.0;
          nx += 0.06 * cos( wp.x * 0.9 + t * 1.1 );
          nz += 0.06 * sin( wp.y * 0.9 + t * 1.3 );
          nx += 0.04 * cos( wp.x * 1.7 - wp.y * 1.1 + t * 1.7 );
          nz += 0.04 * sin( wp.y * 1.7 + wp.x * 1.1 + t * 1.5 );
          nx += 0.025 * cos( wp.x * 3.3 + t * 2.6 );
          nz += 0.025 * sin( wp.y * 3.1 + t * 2.9 );
          normal = normalize( normal + vec3( nx, 0.0, nz ) );
        }`,
      )
      // add a soft Fresnel rim sheen to emissive (glassy water edge)
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float fres = pow( 1.0 - clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 ), 3.0 );
          totalEmissiveRadiance += vec3( 0.10, 0.16, 0.22 ) * fres;
        }`,
      );
  };
  // a fresh onBeforeCompile needs a new program
  mat.needsUpdate = true;
  mats.push(mat);
  return mat;
}

/** Cached animated water-surface material. One instance per variant. */
export function waterSurfaceMaterial(variant: "opaque" | "translucent"): THREE.MeshStandardMaterial {
  return getMaterial(
    variant === "translucent" ? "waterSurfaceT" : "waterSurfaceO",
    () =>
      patch(
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.22,
          metalness: 0.0,
          ...(variant === "translucent" ? { transparent: true, opacity: 0.62 } : {}),
        }),
      ),
  ) as THREE.MeshStandardMaterial;
}

/** Advance the shared water clock ONCE per frame and push it to every water material. */
export function tickWaterSurfaces(dt: number): void {
  clock.t += dt;
  for (const m of mats) {
    const u = (m.userData as UTimeHolder).uTimeUniform;
    if (u) u.value = clock.t;
  }
}
