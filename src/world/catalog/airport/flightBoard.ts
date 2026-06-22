// src/world/catalog/airport/flightBoard.ts
//
// "flightBoard" — a large FIDS departures board with CanvasTexture flight data.
// Mounted high (no collider). Front face +z. BASE y=0 is the mount base.
// LOCAL space: centered x=z=0. ~1u = 1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, mergeTinted, tintedMesh,
} from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult } from "../../system/types";

// ─── Flight data ─────────────────────────────────────────────────────────────
const FLIGHT_DATA = [
  { time: "08:40", dest: "LONDON LHR",   gate: "B7",  status: "Boarding"    },
  { time: "09:15", dest: "NEW YORK JFK",  gate: "C2",  status: "On time"     },
  { time: "09:30", dest: "PARIS CDG",    gate: "A4",  status: "Delayed"     },
  { time: "10:05", dest: "BERLIN BER",   gate: "B3",  status: "Gate Closed" },
  { time: "10:20", dest: "BANGKOK BKK",  gate: "C9",  status: "On time"     },
  { time: "10:45", dest: "ATHENS ATH",   gate: "A1",  status: "Boarding"    },
  { time: "11:00", dest: "ROME FCO",     gate: "B2",  status: "On time"     },
  { time: "11:25", dest: "DUBAI DXB",    gate: "C5",  status: "On time"     },
  { time: "12:00", dest: "TOKYO NRT",    gate: "A8",  status: "On time"     },
  { time: "12:35", dest: "AMSTERDAM AMS", gate: "C1", status: "Boarding"    },
  { time: "13:10", dest: "SYDNEY SYD",   gate: "B5",  status: "Delayed"     },
  { time: "13:50", dest: "MADRID MAD",   gate: "A3",  status: "On time"     },
];

function statusColor(status: string): string {
  if (status === "Boarding")    return "#4caf50";
  if (status === "Delayed")     return "#f2c14e";
  if (status === "Gate Closed") return "#e0524a";
  return "#dfe7ee";  // On time
}

function makeFIDSTexture(rows: number): THREE.CanvasTexture {
  const PX_W = 1024;
  const PX_H = 512;
  const canvas = document.createElement("canvas");
  canvas.width  = PX_W;
  canvas.height = PX_H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#10161c";
  ctx.fillRect(0, 0, PX_W, PX_H);

  // Header bar
  const HEADER_H = 52;
  ctx.fillStyle = "#1a2a3a";
  ctx.fillRect(0, 0, PX_W, HEADER_H);

  // Header text
  ctx.fillStyle = "#8ab4cc";
  ctx.font = "bold 22px 'Courier New', monospace";
  ctx.fillText("TIME",         30,  34);
  ctx.fillText("DESTINATION", 200,  34);
  ctx.fillText("GATE",        680,  34);
  ctx.fillText("STATUS",      800,  34);

  // Separator line under header
  ctx.fillStyle = "#2a4a6a";
  ctx.fillRect(0, HEADER_H, PX_W, 2);

  // Data rows
  const clampedRows = Math.min(rows, FLIGHT_DATA.length);
  const rowH = (PX_H - HEADER_H) / Math.max(clampedRows, 1);

  for (let i = 0; i < clampedRows; i++) {
    const fd = FLIGHT_DATA[i % FLIGHT_DATA.length];
    const rowY = HEADER_H + i * rowH;
    const textY = rowY + rowH * 0.62;

    // Alternate row tint
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(0, rowY, PX_W, rowH);
    }

    // Row separator
    ctx.fillStyle = "#1e2e3e";
    ctx.fillRect(0, rowY + rowH - 1, PX_W, 1);

    // Text — font size scaled to row height
    const fontSize = Math.max(14, Math.min(22, rowH * 0.52));
    ctx.font = `${fontSize}px 'Courier New', monospace`;

    // TIME (amber dot-matrix)
    ctx.fillStyle = "#f0b020";
    ctx.fillText(fd.time, 30, textY);

    // DESTINATION (amber)
    ctx.fillStyle = "#f5c84a";
    ctx.fillText(fd.dest, 200, textY);

    // GATE
    ctx.fillStyle = "#f0b020";
    ctx.fillText(fd.gate, 690, textY);

    // STATUS — filled colored cell at the right end with dark text on top
    const cellW = 150, cellX = PX_W - cellW - 12;
    const cellH = rowH - 8;
    ctx.fillStyle = statusColor(fd.status);
    ctx.fillRect(cellX, rowY + 4, cellW, cellH);
    ctx.fillStyle = "#10161c";
    ctx.font = `bold ${fontSize * 0.8}px 'Courier New', monospace`;
    ctx.fillText(fd.status, cellX + 8, textY);
    ctx.font = `${fontSize}px 'Courier New', monospace`;

    // Left accent bar with status color
    ctx.fillStyle = statusColor(fd.status);
    ctx.fillRect(0, rowY + 2, 4, rowH - 4);
  }

  // Outer frame highlight
  ctx.strokeStyle = "#2a4a6a";
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, PX_W - 4, PX_H - 4);

  // "DEPARTURES" label in top-left corner of header
  ctx.fillStyle = "#4a9ac8";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.fillText("▶  DEPARTURES", PX_W - 260, 24);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const BOARD_DARK  = 0x10161c;
const FRAME_COLOR = 0x2a3a4a;
const MOUNT_COLOR = PALETTE.steelDark;

interface FlightBoardParams {
  w: number;
  h: number;
  rows: number;
  hung: boolean;
  alt: number;
}

defineObject("flightBoard", {
  params: { w: 6, h: 3, rows: 8, hung: false, alt: 12 } as FlightBoardParams,
  build(p: FlightBoardParams): ObjectResult {
    const { w, h, rows, hung, alt } = p;
    const depth = 0.2;
    const mountH = 0.5;  // mount/drop length

    const parts: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();

    // ── Board body (dark box) ───────────────────────────────────────────────
    // hung=false: board sits ABOVE a mount post, base y=0 at the post foot.
    // hung=true:  board hangs from a ceiling attach point at y=alt.
    const attachY = hung ? alt : 0;
    const boardBotY = hung ? attachY - mountH - h : mountH;
    const boardMidY = boardBotY + h / 2;
    parts.push(tintedBox(w, h, depth, 0, boardMidY, 0, BOARD_DARK));

    // Frame border (slightly larger, steel color)
    const frameBorderT = 0.06;
    parts.push(tintedBox(w + frameBorderT * 2, frameBorderT, depth + 0.02, 0, boardBotY, 0, FRAME_COLOR));
    parts.push(tintedBox(w + frameBorderT * 2, frameBorderT, depth + 0.02, 0, boardBotY + h, 0, FRAME_COLOR));
    parts.push(tintedBox(frameBorderT, h + frameBorderT * 2, depth + 0.02, -w / 2, boardMidY, 0, FRAME_COLOR));
    parts.push(tintedBox(frameBorderT, h + frameBorderT * 2, depth + 0.02,  w / 2, boardMidY, 0, FRAME_COLOR));
    // Corner accent caps
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      parts.push(tintedBox(0.14, 0.14, depth + 0.04,
        sx * (w / 2), boardBotY + (sy > 0 ? h : 0), 0, PALETTE.steelLight));
    }

    // ── Mount ──────────────────────────────────────────────────────────────
    if (hung) {
      // Two drop-rods from the ceiling (y=attachY) down to the board top.
      const topY = boardBotY + h;       // = attachY - mountH
      for (const sx of [-1, 1]) {
        parts.push(tintedBox(0.07, mountH, 0.07, sx * w * 0.32, attachY - mountH / 2, 0, MOUNT_COLOR));
      }
      // Ceiling attach plate + top bracket bar across the board
      parts.push(tintedBox(w * 0.72, 0.08, 0.12, 0, attachY - 0.04, 0, MOUNT_COLOR));
      parts.push(tintedBox(w * 0.72, 0.08, 0.1, 0, topY + 0.02, -depth / 2 + 0.04, MOUNT_COLOR));
    } else {
      // Center post + bracket below the board.
      parts.push(tintedBox(0.12, mountH, 0.12, 0, mountH / 2, -depth / 2 + 0.06, MOUNT_COLOR));
      parts.push(tintedBox(w * 0.4, 0.08, 0.08, 0, mountH - 0.04, -depth / 2 + 0.04, MOUNT_COLOR));
      for (const sx of [-1, 1]) {
        parts.push(tintedBox(0.05, mountH * 0.7, 0.05,
          sx * w * 0.15, mountH * 0.35, -depth / 2 + 0.04, MOUNT_COLOR));
      }
    }

    // ── Status indicator LED strip on bottom edge ───────────────────────────
    const ledColors = [0x4caf50, 0xf2c14e, 0xe0524a, 0x4caf50, 0x3ca8e8, 0x4caf50, 0xf2c14e, 0x4caf50];
    const nLeds = Math.min(ledColors.length, 8);
    for (let i = 0; i < nLeds; i++) {
      const lx = -w / 2 + (i + 0.5) * (w / nLeds);
      parts.push(tintedBox(0.08, 0.08, 0.04, lx, boardBotY - 0.06, depth / 2 + 0.02, ledColors[i]));
    }

    // ── Emissive FIDS face ─────────────────────────────────────────────────
    const fidsTex = makeFIDSTexture(rows);
    const fidsMat = new THREE.MeshStandardMaterial({
      map: fidsTex,
      emissive: 0xffffff,
      emissiveMap: fidsTex,
      emissiveIntensity: 0.85,
      roughness: 0.5,
    });
    const fidsMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 0.08, h - 0.06),
      fidsMat,
    );
    fidsMesh.position.set(0, boardMidY, depth / 2 + 0.012);
    group.add(fidsMesh);

    // ── Merge opaque geometry ───────────────────────────────────────────────
    const opaqueMesh = tintedMesh(mergeTinted(parts));
    opaqueMesh.castShadow = true;
    group.add(opaqueMesh);

    return {
      mesh: group,
      // No colliders — board is mounted high, not a walk-blocker
      colliders: [],
      obstacles: [],
    };
  },
});
