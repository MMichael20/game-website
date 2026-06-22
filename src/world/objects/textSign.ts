// rishon3d/src/world/objects/textSign.ts
//
// A sign board carrying actual TEXT, rendered to a canvas and used as both the
// color map and the emissive map so the lettering reads as a backlit sign. Used
// for storefront fascias and interior title boards.
//
// Convention: back face at z=0, grows toward +z, centered x=0, base at y=0.
// ~1u = 1m. Deterministic (no Math.random / Date.now).

import * as THREE from "three";
import { tintedBox, tintedMesh } from "./voxel";

export interface TextSignConfig {
  /** The text to render (required). */
  text: string;
  /** Board width in metres (required). */
  w: number;
  /** Board height in metres (default 0.7). */
  h?: number;
  /** Board background color (default dark red). */
  boardColor?: number;
  /** Text fill color as a CSS string (default warm cream). */
  textColor?: string;
  /** Emissive strength of the lit face (default 0.7). */
  glow?: number;
}

/** Render the sign text to a CanvasTexture sized to the board's aspect ratio. */
function makeTextTexture(text: string, w: number, h: number, boardColor: number, textColor: string): THREE.CanvasTexture {
  const pxH = 256;
  const pxW = Math.max(64, Math.round((w / h) * pxH));
  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d")!;

  // Background = board color.
  ctx.fillStyle = "#" + boardColor.toString(16).padStart(6, "0");
  ctx.fillRect(0, 0, pxW, pxH);

  // A bright inner border for the lit-fascia look.
  ctx.strokeStyle = textColor;
  ctx.lineWidth = pxH * 0.04;
  const m = pxH * 0.1;
  ctx.strokeRect(m, m, pxW - m * 2, pxH - m * 2);

  // Fit the text to the board width.
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let fontPx = pxH * 0.55;
  ctx.font = `bold ${fontPx}px Georgia, "Times New Roman", serif`;
  const maxW = pxW * 0.82;
  while (ctx.measureText(text).width > maxW && fontPx > 12) {
    fontPx -= 4;
    ctx.font = `bold ${fontPx}px Georgia, "Times New Roman", serif`;
  }
  ctx.fillText(text, pxW / 2, pxH * 0.54);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * A THREE.Group: an opaque board box plus a lit face plane that shows the text
 * (used as both map and emissiveMap so the lettering glows).
 */
export function makeTextSignMesh(cfg: TextSignConfig): THREE.Group {
  const { text, w } = cfg;
  const h = cfg.h ?? 0.7;
  const boardColor = cfg.boardColor ?? 0x7a1f1f;
  const textColor = cfg.textColor ?? "#fff3da";
  const glow = cfg.glow ?? 0.7;
  const depth = 0.14;

  const group = new THREE.Group();
  group.add(tintedMesh(tintedBox(w, h, depth, 0, h / 2, depth / 2, boardColor)));

  const tex = makeTextTexture(text, w, h, boardColor, textColor);
  const faceMat = new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: glow,
    roughness: 0.6,
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), faceMat);
  face.position.set(0, h / 2, depth + 0.011);
  group.add(face);

  return group;
}
