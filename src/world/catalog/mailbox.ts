// src/world/catalog/mailbox.ts
//
// Residential mailbox on a post.
// Post + box body + red flag. No params. No collider (small prop).

import { defineObject } from "../system/registry";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";

// Part dimensions — positions derived from these.
const POST_H = 1.0;
const POST_W = 0.1;
const POST_Y = POST_H / 2;  // base at y=0

const BOX_W = 0.45;
const BOX_H = 0.30;
const BOX_D = 0.22;
// How far the box overlaps the post top (keeps them visually joined, no gap).
const BOX_OVERLAP = 0.05;
// Box sits on top of post, slightly overlapping so there is no visible seam.
const BOX_Y = POST_H + BOX_H / 2 - BOX_OVERLAP;

const FLAG_W = 0.04;
const FLAG_H = 0.18;
const FLAG_D = 0.16;
// How far the flag rises above the box center (flag door sits mid-height on the side).
const FLAG_RISE = 0.07;
// Flag mounts on the right side of the box body, at mid-box height.
const FLAG_X = BOX_W / 2 + FLAG_W / 2;
const FLAG_Y = BOX_Y + FLAG_RISE;  // slightly above box center

defineObject("mailbox", {
  params: {},
  build(_p: Record<string, never>) {
    const parts = [
      // Post
      tintedBox(POST_W, POST_H, POST_W, 0, POST_Y, 0, 0x6b4226),
      // Box body
      tintedBox(BOX_W, BOX_H, BOX_D, 0, BOX_Y, 0, 0x9aa0a6),
      // Red flag on right side
      tintedBox(FLAG_W, FLAG_H, FLAG_D, FLAG_X, FLAG_Y, 0, 0xe0524a),
    ];

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;

    return {
      mesh,
      obstacles: [{ x: 0, z: 0, w: 0.5, d: 0.3 }],
    };
  },
});
