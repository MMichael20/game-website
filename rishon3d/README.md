# Rishon 3D (spike)

A small browser 3D vertical slice: walk, enter a car, drive around a few blocks of
Rishon LeZion. Built to evaluate a 3D direction for the game. Throwaway-able.

## Run
    cd rishon3d
    npm install
    npm run dev
    # open the printed localhost URL, click Start

## Controls
- WASD / Arrows: move (on foot or driving)
- E: enter / exit the car (stand near it)
- Space: brake (in car)
- Esc: pause

## Test
    npm test           # vitest unit tests (pure logic)
    npm run build      # tsc --noEmit + vite build
    npm run test:smoke # playwright boot/render smoke test

## Stack
Three.js (rendering) + Rapier (physics, @dimforge/rapier3d-compat) + Vite + TypeScript.
World geometry is procedural primitives; the map is data-driven in `src/world/rishonMap.ts`.
