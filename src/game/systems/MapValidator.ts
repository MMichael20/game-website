// src/game/systems/MapValidator.ts
// Dev-only validator for OverworldScene configs. Surfaces placement bugs
// (checkpoints on non-walkable tiles, NPCs inside buildings, missing textures)
// that previously needed to be fixed reactively after player reports — see
// commits 400e166, ad52823, 945e94f.
//
// Tree-shaken from production builds: the only call site is guarded by
// `import.meta.env.DEV`.

import Phaser from 'phaser';
import { TILE_SIZE } from '../../utils/constants';
import type { OverworldConfig } from '../scenes/OverworldScene';

export interface ValidationIssue {
  kind: 'out-of-bounds' | 'non-walkable' | 'missing-texture';
  detail: string;
}

/**
 * Runs a handful of cheap checks against an OverworldConfig and the scene's
 * loaded texture cache. Does NOT throw — returns a list of issues for the
 * caller to log. Empty array means nothing to complain about.
 */
export function validateOverworld(
  scene: Phaser.Scene,
  config: OverworldConfig,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { mapWidth, mapHeight, walkCheck } = config;

  const worldInBounds = (px: number, py: number) =>
    px >= 0 && px < mapWidth * TILE_SIZE && py >= 0 && py < mapHeight * TILE_SIZE;

  const tileInBounds = (tx: number, ty: number) =>
    tx >= 0 && tx < mapWidth && ty >= 0 && ty < mapHeight;

  // 1. Spawn point must be walkable
  const spawnTileX = Math.floor(config.spawnX / TILE_SIZE);
  const spawnTileY = Math.floor(config.spawnY / TILE_SIZE);
  if (!worldInBounds(config.spawnX, config.spawnY)) {
    issues.push({
      kind: 'out-of-bounds',
      detail: `spawn point (${config.spawnX}, ${config.spawnY}) is outside the ${mapWidth}x${mapHeight} map`,
    });
  } else if (!walkCheck(spawnTileX, spawnTileY)) {
    issues.push({
      kind: 'non-walkable',
      detail: `spawn tile (${spawnTileX}, ${spawnTileY}) is not walkable`,
    });
  }

  // 2. Every checkpoint zone center must be walkable (otherwise the player
  //    can approach but never stand on the trigger point)
  for (const zone of config.checkpointZones) {
    if (!worldInBounds(zone.centerX, zone.centerY)) {
      issues.push({
        kind: 'out-of-bounds',
        detail: `checkpoint '${zone.id}' center (${zone.centerX}, ${zone.centerY}) is outside the map`,
      });
      continue;
    }
    const tx = Math.floor(zone.centerX / TILE_SIZE);
    const ty = Math.floor(zone.centerY / TILE_SIZE);
    if (!walkCheck(tx, ty)) {
      issues.push({
        kind: 'non-walkable',
        detail: `checkpoint '${zone.id}' center tile (${tx}, ${ty}) is not walkable`,
      });
    }
  }

  // 3. NPCs must stand on walkable tiles
  for (const npc of config.npcs) {
    if (!tileInBounds(npc.tileX, npc.tileY)) {
      issues.push({
        kind: 'out-of-bounds',
        detail: `npc '${npc.id}' tile (${npc.tileX}, ${npc.tileY}) is outside the map`,
      });
      continue;
    }
    if (!walkCheck(npc.tileX, npc.tileY)) {
      issues.push({
        kind: 'non-walkable',
        detail: `npc '${npc.id}' tile (${npc.tileX}, ${npc.tileY}) is not walkable`,
      });
    }
  }

  // 4. Terrain texture must actually be in the cache (catches cascade failures
  //    like d5ba9fe where createCanvas returned undefined and the map drew
  //    as green boxes)
  if (config.terrainTextureKey && !scene.textures.exists(config.terrainTextureKey)) {
    issues.push({
      kind: 'missing-texture',
      detail: `terrain texture '${config.terrainTextureKey}' is not in the texture cache`,
    });
  }

  return issues;
}

/**
 * Logs issues to console.warn with the scene key as prefix. Cheap no-op if
 * the issue list is empty. Kept separate from validateOverworld so tests
 * (when we have them) can assert against the raw list.
 */
export function reportIssues(sceneKey: string, issues: ValidationIssue[]): void {
  if (issues.length === 0) return;
  // eslint-disable-next-line no-console
  console.warn(
    `[MapValidator] ${sceneKey}: ${issues.length} issue(s)\n` +
      issues.map((i) => `  - [${i.kind}] ${i.detail}`).join('\n'),
  );
}
