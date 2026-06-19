# Rishon 3D (spike)

A small browser 3D vertical slice: walk, enter a car, drive around a procedurally
generated city inspired by Rishon LeZion. Built to evaluate a 3D direction for the
game. Throwaway-able.

## What is in the world

- **Multiple districts**: a hand-authored downtown core plus four procedural satellite
  districts (north, east, south, west), each with its own building palette, height
  range, and density. Arterial roads connect them to the core.
- **NPC traffic**: kinematic cars loop around each district on rectangular routes.
  They are purely decorative (no physics collision) but make the city feel alive.
- **Wildlife**: cats and dogs wander the streets using the same wander logic as the
  pedestrian NPCs, just at smaller scale and speed.
- **Instanced props**: trees and bushes across all districts are rendered in a single
  draw call each via InstancedMesh, keeping draw-call count flat as the city grows.

## Run
    cd rishon3d
    npm install
    npm run dev
    # open the printed localhost URL, click Start

## Controls
- WASD / Arrows: move (on foot or driving)
- Mouse: orbit camera (click canvas to capture pointer)
- Scroll: zoom
- E: enter / exit the car (stand near it)
- Space: brake (in car)
- Esc: pause

## Test
    npm test           # vitest unit tests (pure logic)
    npm run build      # tsc --noEmit + vite build
    npm run test:smoke # playwright boot/render smoke test

## Stack
Three.js (rendering) + Rapier (physics, @dimforge/rapier3d-compat) + Vite + TypeScript.
World geometry is procedural primitives. The map is assembled in `src/world/worldData.ts`
from a hand-authored core (`src/world/rishonMap.ts`) and procedural district data
(`src/world/cityGen.ts`). All pure logic (timestep, culling, path-following, population
planning) is three.js-free and covered by vitest unit tests.
