// src/game/scenes/budapest/BudapestOverworldScene.ts
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { tileToWorld, CheckpointZone } from '../../data/mapLayout';
import { saveCurrentScene, getVisitedCheckpoints, loadGameState } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
import { WaterEffectSystem } from '../../systems/WaterEffectSystem';
import { audioManager } from '../../../audio/AudioManager';
import { FootstepSurface, SFXId } from '../../../audio/audioTypes';
import { BUDAPEST_SURFACE_MAP } from '../../../audio/audioData';
import {
  BUDAPEST_WIDTH, BUDAPEST_HEIGHT, budapestTileGrid, isBudapestWalkable,
  BUDAPEST_NPCS, BUDAPEST_CHECKPOINT_ZONES, BUDAPEST_DECORATIONS, BUDAPEST_BUILDINGS,
  getBudapestTileType, BudapestTileType,
} from './budapestMap';

/**
 * Suggested exploration order — highlights the "next" dot on the minimap.
 * NOT mandatory, just a gentle nudge for players who want guidance.
 */
const SUGGESTED_PATH: string[] = [
  'bp_parliament',
  'bp_chain_bridge',
  'bp_fishermans_bastion',
  'bp_eye',
  'bp_danube_cruise',
  'bp_guard_escape',
  'bp_indian_restaurant',
  'bp_langos_stand',
  'bp_spice_market',
  'bp_tram_dash',
  'bp_opera',
  'bp_ruin_bar_quiz',
  'bp_jazz_seat',
  'bp_jewish_quarter',
  'bp_danube_kayak',
  'bp_rooftop_chase',
  'bp_liberty_bridge',
  'bp_gellert_hill',
  'bp_chimney_cake',
  'bp_margaret_bridge',
  'bp_thermal_baths',
];

/** Category color map for on-map checkpoint markers (Phaser hex) */
const CHECKPOINT_CATEGORY: Record<string, number> = {};
[
  'bp_parliament', 'bp_chain_bridge', 'bp_fishermans_bastion',
  'bp_liberty_bridge', 'bp_margaret_bridge', 'bp_gellert_hill',
  'bp_opera', 'bp_thermal_baths',
].forEach(id => { CHECKPOINT_CATEGORY[id] = 0xFFD700; }); // Landmarks — gold
[
  'bp_indian_restaurant', 'bp_langos_stand', 'bp_ruin_bar_quiz',
  'bp_tram_dash', 'bp_spice_market', 'bp_guard_escape',
  'bp_jazz_seat', 'bp_rooftop_chase', 'bp_danube_kayak', 'bp_chimney_cake',
].forEach(id => { CHECKPOINT_CATEGORY[id] = 0xDA70D6; }); // Minigames — magenta
[
  'bp_eye', 'bp_jewish_quarter', 'bp_danube_cruise', 'bp_airbnb',
].forEach(id => { CHECKPOINT_CATEGORY[id] = 0x00CED1; }); // Attractions — cyan
[
  'bp_tram_stop_north', 'bp_tram_stop_south', 'bp_fast_travel',
].forEach(id => { CHECKPOINT_CATEGORY[id] = 0x4A90D9; }); // Transport — blue
[
  'bp_restaurant_1', 'bp_restaurant_2',
].forEach(id => { CHECKPOINT_CATEGORY[id] = 0x66BB6A; }); // Food — green

interface PigeonCluster {
  cx: number;
  cy: number;
  birds: Phaser.GameObjects.Image[];
  scattered: boolean;
}

interface LampGlow {
  glow: Phaser.GameObjects.Arc;
  outerGlow: Phaser.GameObjects.Arc;
  worldX: number;
  worldY: number;
}

export class BudapestOverworldScene extends OverworldScene {
  private waterSystem!: WaterEffectSystem;
  private pigeonClusters: PigeonCluster[] = [];
  private lampGlows: LampGlow[] = [];
  private sceneElapsed = 0;
  private atmosphereTint!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'BudapestOverworldScene' });
  }

  getConfig(): OverworldConfig {
    return {
      mapWidth: BUDAPEST_WIDTH,
      mapHeight: BUDAPEST_HEIGHT,
      tileGrid: budapestTileGrid,
      walkCheck: isBudapestWalkable,
      npcs: BUDAPEST_NPCS,
      checkpointZones: BUDAPEST_CHECKPOINT_ZONES,
      spawnX: 30 * TILE_SIZE + TILE_SIZE / 2,
      spawnY: 21 * TILE_SIZE + TILE_SIZE / 2,
      terrainTextureKey: 'budapest-terrain',
    };
  }

  getLabelMap(): Record<string, string> {
    return {
      bp_eye: 'Budapest Eye',
      bp_airbnb: 'Airbnb',
      bp_jewish_quarter: 'Jewish Quarter',
      bp_tram_stop_north: 'Tram Stop',
      bp_tram_stop_south: 'Tram Stop',
      bp_restaurant_1: 'Goulash House',
      bp_restaurant_2: 'Chimney Cake',
      bp_indian_restaurant: 'Indian Restaurant',
      bp_langos_stand: 'Lángos Stand',
      bp_ruin_bar_quiz: 'Ruin Bar Trivia',
      bp_tram_dash: 'Road Crossing',
      bp_spice_market: 'Spice Market',
      bp_guard_escape: 'Parliament Park',
      bp_jazz_seat: 'Jazz Club',
      bp_rooftop_chase: 'Rooftop View',
      bp_danube_kayak: 'Kayak Rental',
      bp_chimney_cake: 'Chimney Cake',
      bp_parliament: 'Parliament',
      bp_chain_bridge: 'Chain Bridge',
      bp_fishermans_bastion: 'Fisherman\'s Bastion',
      bp_liberty_bridge: 'Liberty Bridge',
      bp_margaret_bridge: 'Margaret Bridge',
      bp_gellert_hill: 'Gellert Hill',
      bp_opera: 'Opera House',
      bp_thermal_baths: 'Thermal Baths',
      bp_danube_cruise: 'Danube Cruise',
      bp_fast_travel: 'Fast Travel',
    };
  }

  create(): void {
    super.create();
    saveCurrentScene('BudapestOverworldScene');

    // Wire up photo album button
    uiManager.setAlbumHandler(() => {
      const visited = getVisitedCheckpoints();
      uiManager.showPhotoAlbum(visited, this.getLabelMap());
    });

    // Set suggested next destination on minimap
    const nextId = this.getNextSuggested();
    this.minimap.setSuggested(nextId);

    // Brief toast hint on load
    if (nextId) {
      const label = this.getLabelMap()[nextId];
      if (label) {
        this.time.delayedCall(1500, () => {
          uiManager.showToast(`Try visiting ${label} next!`, 3000);
        });
      }
    } else {
      // All suggested checkpoints visited — celebrate!
      this.time.delayedCall(1500, () => {
        uiManager.showToast('You\'ve explored all of Budapest! Amazing!', 4000);
      });
    }
  }

  onCreateExtras(): void {
    // Decorations
    BUDAPEST_DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`)
        .setDepth(deco.tileY * 0.1);
    });

    // Buildings
    BUDAPEST_BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`)
        .setDepth((b.tileY + b.tileH) * 0.1 - 0.05);
    });

    // Water system for Danube
    this.waterSystem = new WaterEffectSystem(this, {
      getTileType: getBudapestTileType,
      waterTileValue: BudapestTileType.Water,
      wadingSpeed: 0.8,
      swimmingSpeed: 0.55,
      isDeepWater: () => true,
    });
    this.waterSystem.create();

    // ── Color-coded checkpoint markers on game world ──
    this.addCheckpointMarkers();

    this.addDanubeWaves();
    this.addBoats();
    this.addVehicles();
    this.addPigeons();
    this.addMusicianAnimation();
    this.addLamplightGlow();
    this.addBathSteam();
    this.addBackgroundCityscape();
    this.addForegroundBuildings();
    this.addStreetDetails();
    this.addBuildingShadows();
    this.addEnvironmentalSFX();
    this.addBridgeAtmosphere();
    this.addAtmosphereTint();
  }

  /** Returns the next unvisited checkpoint in the suggested path, or null if all visited */
  private getNextSuggested(): string | null {
    const visited = new Set(getVisitedCheckpoints());
    for (const id of SUGGESTED_PATH) {
      if (!visited.has(id)) return id;
    }
    return null;
  }

  /** Color-coded floating markers above every checkpoint on the game world */
  private addCheckpointMarkers(): void {
    const visited = new Set(getVisitedCheckpoints());

    for (const zone of BUDAPEST_CHECKPOINT_ZONES) {
      const isVisited = visited.has(zone.id);
      const color = CHECKPOINT_CATEGORY[zone.id] ?? 0xAAAAAA;
      const markerY = zone.centerY - 22;

      if (isVisited) {
        // Visited: static small diamond, dimmed
        this.add.polygon(zone.centerX, markerY, [0, -4, 4, 0, 0, 4, -4, 0], color)
          .setDepth(15).setAlpha(0.35);
      } else {
        // Unvisited: pulsing diamond with bob animation
        const diamond = this.add.polygon(zone.centerX, markerY, [0, -5, 5, 0, 0, 5, -5, 0], color)
          .setDepth(15).setAlpha(0.9);

        // Bob up and down
        this.tweens.add({
          targets: diamond,
          y: markerY - 4,
          duration: 1200,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });

        // Pulse alpha
        this.tweens.add({
          targets: diamond,
          alpha: 0.5,
          duration: 800,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      }
    }
  }

  // ── Enhanced 3-layer Danube water with sparkle reflections ──
  private addDanubeWaves(): void {
    // Layer 1: deep current (slowest, lowest alpha)
    for (const wy of [11, 12, 13]) {
      for (let wx = 0; wx < BUDAPEST_WIDTH; wx += 6) {
        const pos = tileToWorld(wx, wy);
        const current = this.add.rectangle(pos.x, pos.y, 24, 4, 0x1A3060)
          .setDepth(-9).setAlpha(0.2);
        this.tweens.add({
          targets: current,
          x: pos.x + 24,
          alpha: 0.08,
          duration: 4000 + Math.random() * 1000,
          ease: 'Sine.easeInOut',
          repeat: -1,
          yoyo: true,
          delay: Math.random() * 2000,
        });
      }
    }

    // Layer 2: surface ripples (all 5 river rows, increased density)
    for (const wy of [10, 11, 12, 13, 14]) {
      for (let wx = 0; wx < BUDAPEST_WIDTH; wx += 4) {
        const pos = tileToWorld(wx, wy);
        const wave = this.add.image(pos.x, pos.y, 'deco-wave-foam')
          .setDepth(-8).setAlpha(0.35);
        this.tweens.add({
          targets: wave,
          x: pos.x + 8,
          alpha: 0.12,
          duration: 1500 + Math.random() * 500,
          ease: 'Sine.easeInOut',
          repeat: -1,
          yoyo: true,
          delay: Math.random() * 1500,
        });
      }
    }

    // Layer 3: sparkle reflections
    this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => this.spawnWaterSparkle(),
    });
  }

  private spawnWaterSparkle(): void {
    const wx = Math.random() * BUDAPEST_WIDTH;
    const wy = 10 + Math.random() * 5;
    const pos = tileToWorld(Math.floor(wx), Math.floor(wy));
    const sparkle = this.add.circle(
      pos.x + Math.random() * TILE_SIZE,
      pos.y + Math.random() * TILE_SIZE,
      1, 0xFFFFFF,
    ).setDepth(-7).setAlpha(0);

    this.tweens.add({
      targets: sparkle,
      alpha: { from: 0, to: 0.7 },
      duration: 400,
      yoyo: true,
      onComplete: () => sparkle.destroy(),
    });
  }

  // ── Danube boats ──
  private addBoats(): void {
    const mapPxW = BUDAPEST_WIDTH * TILE_SIZE;
    const boatDefs = [
      { key: 'budapest-river-boat', y: 12, dir: 1, delay: 0, dur: 50000 },
      { key: 'budapest-barge', y: 11, dir: -1, delay: 15000, dur: 60000 },
      { key: 'budapest-river-boat', y: 13, dir: 1, delay: 30000, dur: 45000 },
    ];

    boatDefs.forEach(d => {
      const worldY = d.y * TILE_SIZE + TILE_SIZE / 2;
      const startX = d.dir > 0 ? -100 : mapPxW + 100;
      const endX = d.dir > 0 ? mapPxW + 100 : -100;
      const boat = this.add.sprite(startX, worldY, d.key).setDepth(-4);
      if (d.dir < 0) boat.setFlipX(true);

      this.time.delayedCall(d.delay, () => {
        this.tweens.add({
          targets: boat,
          x: endX,
          duration: d.dur,
          ease: 'Linear',
          repeat: -1,
          repeatDelay: 8000 + Math.random() * 5000,
          onRepeat: () => { boat.x = startX; },
        });
      });
    });
  }

  // ── Improved vehicles with repeat delays ──
  private addVehicles(): void {
    const mapPxW = BUDAPEST_WIDTH * TILE_SIZE;
    const defs = [
      { key: 'budapest-tram', y: 18, dir: 1, delay: 0, dur: 22000 },
      { key: 'budapest-tram', y: 18, dir: -1, delay: 11000, dur: 24000 },
      { key: 'budapest-bus', y: 17, dir: 1, delay: 5000, dur: 16000 },
      { key: 'budapest-bus', y: 19, dir: -1, delay: 12000, dur: 19000 },
      { key: 'budapest-car-blue', y: 17, dir: 1, delay: 0, dur: 13000 },
      { key: 'budapest-car-red', y: 19, dir: -1, delay: 3000, dur: 11000 },
      { key: 'budapest-car-white', y: 17, dir: 1, delay: 7000, dur: 12000 },
      { key: 'budapest-car-gray', y: 19, dir: -1, delay: 9000, dur: 14000 },
      { key: 'budapest-car-red', y: 16, dir: 1, delay: 2000, dur: 15000 },
      { key: 'budapest-car-blue', y: 16, dir: -1, delay: 8000, dur: 17000 },
      // Extra vehicles for wider map
      { key: 'budapest-car-white', y: 16, dir: 1, delay: 14000, dur: 13000 },
      { key: 'budapest-car-gray', y: 17, dir: -1, delay: 16000, dur: 15000 },
    ];

    defs.forEach(d => {
      const worldY = d.y * TILE_SIZE + TILE_SIZE / 2;
      const startX = d.dir > 0 ? -80 : mapPxW + 80;
      const endX = d.dir > 0 ? mapPxW + 80 : -80;
      const v = this.add.sprite(startX, worldY, d.key).setDepth(-3);
      if (d.dir < 0) v.setFlipX(true);

      this.time.delayedCall(d.delay, () => {
        this.tweens.add({
          targets: v,
          x: endX,
          duration: d.dur,
          ease: 'Linear',
          repeat: -1,
          repeatDelay: 3000 + Math.random() * 5000,
          onRepeat: () => { v.x = startX; },
        });
      });
    });
  }

  // ── Pigeons with scatter behavior ──
  private addPigeons(): void {
    const clusterDefs = [
      { cx: 29, cy: 22, count: 5 },  // Erzsebet Square
      { cx: 10, cy: 15, count: 3 },   // Near Liberty Bridge
      { cx: 52, cy: 15, count: 3 },   // Near Margaret Bridge
    ];

    clusterDefs.forEach(def => {
      const cluster: PigeonCluster = {
        cx: def.cx * TILE_SIZE,
        cy: def.cy * TILE_SIZE,
        birds: [],
        scattered: false,
      };

      for (let i = 0; i < def.count; i++) {
        const px = (def.cx + (Math.random() - 0.5) * 3) * TILE_SIZE;
        const py = (def.cy + (Math.random() - 0.5) * 2) * TILE_SIZE;
        const p = this.add.image(px, py, 'deco-bp-pigeon')
          .setDepth(-6).setAlpha(0.8);
        cluster.birds.push(p);

        this.addPigeonDrift(p, px, py);
      }

      this.pigeonClusters.push(cluster);
    });
  }

  private addPigeonDrift(p: Phaser.GameObjects.Image, px: number, py: number): void {
    this.tweens.add({
      targets: p,
      x: px + (Math.random() - 0.5) * 64,
      y: py + (Math.random() - 0.5) * 32,
      duration: 3000 + Math.random() * 2000,
      ease: 'Sine.easeInOut',
      repeat: -1,
      yoyo: true,
      delay: Math.random() * 2000,
    });
  }

  private scatterPigeons(cluster: PigeonCluster): void {
    cluster.scattered = true;
    audioManager.playSFX('pigeon_coo');

    cluster.birds.forEach(bird => {
      this.tweens.killTweensOf(bird);
      this.tweens.add({
        targets: bird,
        y: bird.y - 60 - Math.random() * 30,
        x: bird.x + (Math.random() - 0.5) * 80,
        alpha: 0,
        duration: 500 + Math.random() * 200,
        ease: 'Quad.easeOut',
      });
    });

    // Respawn after 6-8 seconds
    this.time.delayedCall(6000 + Math.random() * 2000, () => {
      cluster.birds.forEach(bird => {
        const nx = cluster.cx + (Math.random() - 0.5) * 3 * TILE_SIZE;
        const ny = cluster.cy + (Math.random() - 0.5) * 2 * TILE_SIZE;
        bird.setPosition(nx, ny).setAlpha(0);

        this.tweens.add({
          targets: bird,
          alpha: 0.8,
          duration: 800,
          onComplete: () => this.addPigeonDrift(bird, nx, ny),
        });
      });
      cluster.scattered = false;
    });
  }

  // ── Street musician sway + floating music notes ──
  private addMusicianAnimation(): void {
    // Music notes floating from performer area
    const performerPos = tileToWorld(33, 22);
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        const note = this.add.image(
          performerPos.x + (Math.random() - 0.5) * 16,
          performerPos.y,
          'deco-bp-music-note',
        ).setDepth(-4).setAlpha(0.7);

        this.tweens.add({
          targets: note,
          y: performerPos.y - 30 - Math.random() * 20,
          x: note.x + (Math.random() - 0.5) * 24,
          alpha: 0,
          duration: 2500,
          ease: 'Sine.easeOut',
          onComplete: () => note.destroy(),
        });
      },
    });
  }

  // ── Ambient lamplight glow with proximity-based brightness ──
  private addLamplightGlow(): void {
    BUDAPEST_DECORATIONS.filter(d => d.type === 'bp-lamp').forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);

      // Outer ground-level warm glow
      const outerGlow = this.add.circle(pos.x, pos.y - 4, 24, 0xFFEE88)
        .setAlpha(0.06).setDepth(-11);

      // Inner lamplight glow
      const glow = this.add.circle(pos.x, pos.y - 10, 12, 0xFFEE88)
        .setAlpha(0.15).setDepth(-11);

      // Gentle flicker
      this.tweens.add({
        targets: glow,
        alpha: 0.22,
        duration: 2000 + Math.random() * 1000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });

      this.lampGlows.push({ glow, outerGlow, worldX: pos.x, worldY: pos.y });
    });
  }

  // ── Steam rising from thermal baths area ──
  private addBathSteam(): void {
    const bathPos = tileToWorld(8, 36);
    this.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        const steam = this.add.circle(
          bathPos.x + (Math.random() - 0.5) * 96,
          bathPos.y,
          3 + Math.random() * 4,
          0xFFFFFF,
        ).setAlpha(0.25).setDepth(-4);

        this.tweens.add({
          targets: steam,
          y: bathPos.y - 30 - Math.random() * 20,
          alpha: 0,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 2000 + Math.random() * 1000,
          onComplete: () => steam.destroy(),
        });
      },
    });
  }

  // ── Background cityscape for parallax depth ──
  private addBackgroundCityscape(): void {
    const mapW = BUDAPEST_WIDTH * TILE_SIZE;

    // Distant skyline behind the Danube (spans full width, behind the river)
    this.add.image(mapW / 2, 8 * TILE_SIZE, 'bp-bg-city-distant')
      .setDepth(-55).setAlpha(0.5).setScrollFactor(0.85, 0.85);

    // Mid-distance buildings behind Parliament plaza area
    this.add.image(23 * TILE_SIZE, 14 * TILE_SIZE, 'bp-bg-city-mid')
      .setDepth(-54).setAlpha(0.4).setScrollFactor(0.9, 0.9);

    // Distant skyline behind the southern park area
    this.add.image(mapW / 2, 37 * TILE_SIZE, 'bp-bg-city-distant')
      .setDepth(-55).setAlpha(0.4).setScrollFactor(0.85, 0.85);

    // Mid-distance behind Erzsebet Square / Eye area
    this.add.image(32 * TILE_SIZE, 20 * TILE_SIZE, 'bp-bg-city-mid')
      .setDepth(-54).setAlpha(0.35).setScrollFactor(0.9, 0.9);
  }

  // ── Foreground building tops for urban canyon effect ──
  private addForegroundBuildings(): void {
    // Along the main road (y=17-19): northern building facades
    const mainRoadNorth = [
      { tex: 'bp-fg-building-top-1', x: 5, y: 15 },
      { tex: 'bp-fg-building-top-2', x: 8, y: 15 },
      { tex: 'bp-fg-building-top-3', x: 11, y: 15 },
      { tex: 'bp-fg-building-top-1', x: 14, y: 15 },
      { tex: 'bp-fg-building-top-4', x: 32, y: 15 },
      { tex: 'bp-fg-building-top-2', x: 35, y: 15 },
      { tex: 'bp-fg-building-top-1', x: 38, y: 15 },
      { tex: 'bp-fg-building-top-3', x: 55, y: 15 },
      { tex: 'bp-fg-building-top-4', x: 58, y: 15 },
      { tex: 'bp-fg-building-top-2', x: 61, y: 15 },
    ];

    // Southern building facades
    const mainRoadSouth = [
      { tex: 'bp-fg-building-top-3', x: 5, y: 20 },
      { tex: 'bp-fg-building-top-1', x: 8, y: 20 },
      { tex: 'bp-fg-building-top-4', x: 11, y: 20 },
      { tex: 'bp-fg-building-top-2', x: 14, y: 20 },
      { tex: 'bp-fg-building-top-1', x: 32, y: 20 },
      { tex: 'bp-fg-building-top-3', x: 35, y: 20 },
      { tex: 'bp-fg-building-top-2', x: 38, y: 20 },
      { tex: 'bp-fg-building-top-4', x: 55, y: 20 },
      { tex: 'bp-fg-building-top-1', x: 58, y: 20 },
      { tex: 'bp-fg-building-top-3', x: 61, y: 20 },
    ];

    // Andrassy Avenue western side
    const andrassyWest = [
      { tex: 'bp-fg-building-side-1', x: 39, y: 22 },
      { tex: 'bp-fg-building-side-2', x: 39, y: 25 },
    ];

    // Andrassy Avenue eastern side
    const andrassyEast = [
      { tex: 'bp-fg-building-side-1', x: 58, y: 22, flip: true },
      { tex: 'bp-fg-building-side-2', x: 58, y: 25, flip: true },
    ];

    // Southern restaurant/shop streets
    const southStreet = [
      { tex: 'bp-fg-building-top-2', x: 10, y: 27 },
      { tex: 'bp-fg-building-top-1', x: 13, y: 27 },
      { tex: 'bp-fg-building-top-4', x: 16, y: 27 },
      { tex: 'bp-fg-building-top-3', x: 19, y: 27 },
      { tex: 'bp-fg-building-top-1', x: 22, y: 27 },
    ];

    // Jewish Quarter approach (narrow streets)
    const jqApproach = [
      { tex: 'bp-fg-building-side-2', x: 44, y: 27 },
      { tex: 'bp-fg-building-side-1', x: 44, y: 30 },
      { tex: 'bp-fg-building-side-1', x: 53, y: 27, flip: true },
      { tex: 'bp-fg-building-side-2', x: 53, y: 30, flip: true },
    ];

    const allFg = [...mainRoadNorth, ...mainRoadSouth, ...andrassyWest, ...andrassyEast, ...southStreet, ...jqApproach];

    allFg.forEach(def => {
      const worldX = def.x * TILE_SIZE + TILE_SIZE / 2;
      const worldY = def.y * TILE_SIZE + TILE_SIZE / 2;
      const img = this.add.image(worldX, worldY, def.tex)
        .setDepth(100)
        .setAlpha(0.85);
      if ((def as any).flip) img.setFlipX(true);
    });
  }

  // ── Street details: awnings, signs, balconies ──
  private addStreetDetails(): void {
    // Awnings over sidewalks
    const awnings = [
      { tex: 'bp-street-awning-1', x: 10, y: 28 },
      { tex: 'bp-street-awning-2', x: 13, y: 28 },
      { tex: 'bp-street-awning-1', x: 20, y: 28 },
      { tex: 'bp-street-awning-2', x: 23, y: 28 },
      { tex: 'bp-street-awning-1', x: 46, y: 23 },
      { tex: 'bp-street-awning-2', x: 49, y: 23 },
      { tex: 'bp-street-awning-1', x: 52, y: 23 },
    ];

    awnings.forEach(a => {
      const pos = tileToWorld(a.x, a.y);
      this.add.image(pos.x, pos.y, a.tex)
        .setDepth(55)
        .setAlpha(0.9);
    });

    // Hanging signs outside shops/businesses
    const signs = [
      { tex: 'bp-hanging-sign-1', x: 36, y: 21 },
      { tex: 'bp-hanging-sign-2', x: 39, y: 21 },
      { tex: 'bp-hanging-sign-1', x: 46, y: 21 },
      { tex: 'bp-hanging-sign-2', x: 49, y: 21 },
      { tex: 'bp-hanging-sign-1', x: 12, y: 29 },
      { tex: 'bp-hanging-sign-2', x: 21, y: 29 },
    ];

    signs.forEach(s => {
      const pos = tileToWorld(s.x, s.y);
      this.add.image(pos.x, pos.y - 8, s.tex)
        .setDepth(12)
        .setAlpha(0.85);
    });

    // Balcony overhangs along main road and Andrassy
    const balconies = [
      { tex: 'bp-balcony-overhang-1', x: 6, y: 16 },
      { tex: 'bp-balcony-overhang-2', x: 10, y: 16 },
      { tex: 'bp-balcony-overhang-1', x: 33, y: 16 },
      { tex: 'bp-balcony-overhang-2', x: 37, y: 16 },
      { tex: 'bp-balcony-overhang-1', x: 56, y: 16 },
      { tex: 'bp-balcony-overhang-2', x: 60, y: 16 },
      { tex: 'bp-balcony-overhang-1', x: 43, y: 22 },
      { tex: 'bp-balcony-overhang-2', x: 47, y: 22 },
      { tex: 'bp-balcony-overhang-1', x: 51, y: 22 },
      { tex: 'bp-balcony-overhang-2', x: 55, y: 22 },
    ];

    balconies.forEach(b => {
      const pos = tileToWorld(b.x, b.y);
      this.add.image(pos.x, pos.y, b.tex)
        .setDepth(20)
        .setAlpha(0.8);
    });
  }

  // ── Building shadows on streets for depth ──
  private addBuildingShadows(): void {
    // Main road shadows (from northern buildings, shadow falls south)
    for (let x = 3; x < BUDAPEST_WIDTH - 3; x += 3) {
      const tile = budapestTileGrid[17]?.[x];
      if (tile === undefined) continue;
      if (tile === BudapestTileType.Road || tile === BudapestTileType.TramTrack) {
        const pos = tileToWorld(x, 17);
        this.add.rectangle(
          pos.x, pos.y - TILE_SIZE * 0.3,
          TILE_SIZE * 3, TILE_SIZE * 0.8,
          0x000000,
        ).setDepth(-2).setAlpha(0.08);
      }
    }

    // Andrassy Avenue shadows (from western buildings, shadow falls east)
    for (let y = 22; y <= 25; y++) {
      const pos = tileToWorld(42, y);
      this.add.rectangle(
        pos.x, pos.y,
        TILE_SIZE * 2, TILE_SIZE,
        0x000000,
      ).setDepth(-2).setAlpha(0.06);
    }
  }

  // ── Environmental sound effects with randomized intervals ──
  private addEnvironmentalSFX(): void {
    this.scheduleRepeatingSFX('tram_bell', 15000, 10000);
    this.scheduleRepeatingSFX('boat_horn', 25000, 15000);
    this.scheduleRepeatingSFX('pigeon_coo', 8000, 6000);
  }

  /** Self-rescheduling SFX so each interval is independently randomized */
  private scheduleRepeatingSFX(sfxKey: SFXId, minDelay: number, variance: number): void {
    const fire = () => {
      audioManager.playSFX(sfxKey);
      this.time.delayedCall(minDelay + Math.random() * variance, fire);
    };
    this.time.delayedCall(minDelay + Math.random() * variance, fire);
  }

  protected getFootstepSurface(): FootstepSurface | null {
    const pos = this.player.getPosition();
    const tileX = Math.floor(pos.x / TILE_SIZE);
    const tileY = Math.floor(pos.y / TILE_SIZE);
    const tileType = getBudapestTileType(tileX, tileY);
    // Don't play footsteps in water
    if (tileType === BudapestTileType.Water || tileType === BudapestTileType.WaterShallow) {
      return null;
    }
    return BUDAPEST_SURFACE_MAP[tileType] ?? 'stone';
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();

    switch (zone.id) {
      case 'bp_eye':
        this.fadeToScene('BudapestEyeScene');
        break;

      case 'bp_airbnb':
        this.fadeToScene('BudapestAirbnbLobbyScene', { returnX: pos.x, returnY: pos.y });
        break;

      case 'bp_jewish_quarter':
        this.fadeToScene('JewishQuarterScene');
        break;

      case 'bp_tram_stop_north':
      case 'bp_tram_stop_south':
        this.fadeToScene('BudapestTransportScene', { returnX: pos.x, returnY: pos.y });
        break;

      case 'bp_danube_cruise':
        this.fadeToScene('DanubeCruiseScene');
        break;

      case 'bp_thermal_baths':
        this.fadeToScene('ThermalBathScene');
        break;

      case 'bp_restaurant_1':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Welcome to Goulash House!', 'Try our famous Hungarian goulash!', 'The lángos with sour cream is incredible today.'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;

      case 'bp_restaurant_2':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Budapest\'s best chimney cake shop!', 'Cinnamon, chocolate, or walnut?', 'Fresh off the spit — enjoy!'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;

      case 'bp_indian_restaurant':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          [
            'Welcome to Curry Palace!',
            'Our waiter has hidden the curry bowl...',
            'Can you find it?',
          ],
          () => {
            uiManager.hideNPCDialog();
            this.inputSystem.unfreeze();
            this.fadeToScene('CurryHuntScene', { checkpointId: 'bp_indian_restaurant' });
          },
        );
        break;

      case 'bp_langos_stand':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Fresh lángos! Hot from the oil!', 'Catch the toppings!'],
          () => {
            uiManager.hideNPCDialog();
            this.inputSystem.unfreeze();
            this.fadeToScene('LangosCatchScene', { checkpointId: 'bp_langos_stand' });
          },
        );
        break;

      case 'bp_ruin_bar_quiz':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Welcome to Szimpla Kert!', 'Think you know Budapest? Let\'s find out!'],
          () => {
            uiManager.hideNPCDialog();
            this.inputSystem.unfreeze();
            this.fadeToScene('RuinBarQuizScene', { checkpointId: 'bp_ruin_bar_quiz' });
          },
        );
        break;

      case 'bp_tram_dash':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Careful! Trams and cars everywhere!', 'Cross the road as many times as you can!'],
          () => {
            uiManager.hideNPCDialog();
            this.inputSystem.unfreeze();
            this.fadeToScene('TramDashScene', { checkpointId: 'bp_tram_dash' });
          },
        );
        break;

      case 'bp_spice_market':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Welcome to the Great Market Hall!', 'Match the Hungarian spices!'],
          () => {
            uiManager.hideNPCDialog();
            this.inputSystem.unfreeze();
            this.fadeToScene('PaprikaSortScene', { checkpointId: 'bp_spice_market' });
          },
        );
        break;

      case 'bp_parliament':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['The Hungarian Parliament Building.', 'Neo-Gothic masterpiece, completed in 1904.', 'It houses the Holy Crown of Hungary.'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;

      case 'bp_chain_bridge':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['The Széchenyi Chain Bridge.', 'First permanent bridge across the Danube, built in 1849.', 'It connects Buda and Pest — two cities that became one.'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;

      case 'bp_liberty_bridge':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['The Liberty Bridge — Szabadság híd.', 'Art Nouveau ironwork, painted green.', 'One of the most beautiful bridges in all of Europe.'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;

      case 'bp_margaret_bridge':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Margaret Bridge.', 'It leads to Margaret Island — a green oasis in the Danube.', 'Perfect for a romantic stroll together.'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;

      case 'bp_gellert_hill':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Gellért Hill — the Citadella viewpoint.', 'From up here, you can see the entire city.', 'The Danube, Parliament, everything...', 'I wish we could freeze this view.'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;

      case 'bp_opera':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['The Hungarian State Opera House.', 'Neo-Renaissance masterpiece on Andrássy Avenue.', 'The acoustics are said to rival La Scala.'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;

      case 'bp_fast_travel': {
        this.inputSystem.freeze();
        const destinations = [
          { label: 'Home Town', scene: 'WorldScene', data: { returnFromInterior: true, returnX: 496, returnY: 208 } },
          { label: 'Airport', scene: 'AirportInteriorScene', data: { returnX: 496, returnY: 208 } },
          { label: 'Maui', scene: 'MauiOverworldScene', data: { returnFromInterior: true } },
          { label: 'Jewish Quarter', scene: 'JewishQuarterScene', data: { returnFromInterior: true } },
        ];
        uiManager.showDialog({
          title: 'Fast Travel',
          message: 'Where do you want to go?',
          buttons: [
            ...destinations.map(dest => ({
              label: dest.label,
              onClick: () => {
                uiManager.hideDialog();
                this.inputSystem.unfreeze();
                this.cameras.main.fadeOut(300, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                  this.scene.start(dest.scene, dest.data ?? {});
                });
              },
            })),
            {
              label: 'Cancel',
              onClick: () => {
                uiManager.hideDialog();
                this.inputSystem.unfreeze();
              },
            },
          ],
        });
        break;
      }

      case 'bp_guard_escape':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Hey! No photos this close to Parliament!', 'The guards are coming — RUN!'],
          () => {
            uiManager.hideNPCDialog();
            this.inputSystem.unfreeze();
            this.fadeToScene('GuardEscapeScene', { checkpointId: 'bp_guard_escape' });
          },
        );
        break;

      case 'bp_jazz_seat':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Welcome to the Budapest Jazz Club!', 'It\'s packed tonight... better find a seat fast!'],
          () => {
            uiManager.hideNPCDialog();
            this.inputSystem.unfreeze();
            this.fadeToScene('JazzSeatScene', { checkpointId: 'bp_jazz_seat' });
          },
        );
        break;

      case 'bp_rooftop_chase':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Oh no! A stray cat just grabbed your scarf!', 'After it — across the rooftops!'],
          () => {
            uiManager.hideNPCDialog();
            this.inputSystem.unfreeze();
            this.fadeToScene('RooftopChaseScene', { checkpointId: 'bp_rooftop_chase' });
          },
        );
        break;

      case 'bp_danube_kayak':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Want to try kayaking on the Danube?', 'Dodge the tour boats and collect coins!'],
          () => {
            uiManager.hideNPCDialog();
            this.inputSystem.unfreeze();
            this.fadeToScene('DanubeKayakScene', { checkpointId: 'bp_danube_kayak' });
          },
        );
        break;

      case 'bp_chimney_cake':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Fresh kürtőskalács! Hot off the spit!', 'Stack the layers perfectly for the best cake!'],
          () => {
            uiManager.hideNPCDialog();
            this.inputSystem.unfreeze();
            this.fadeToScene('ChimneyCakeScene', { checkpointId: 'bp_chimney_cake' });
          },
        );
        break;

      case 'bp_fishermans_bastion': {
        // Enhanced viewpoint moment
        this.inputSystem.freeze();
        const cam = this.cameras.main;
        const origZoom = cam.zoom;
        this.tweens.add({
          targets: cam,
          zoom: origZoom * 0.75,
          duration: 1000,
          ease: 'Sine.easeInOut',
        });
        uiManager.showNPCDialog(
          ['Fisherman\'s Bastion — seven towers for seven tribes.', 'From up here, you can see the entire city.', 'The Danube, Parliament, everything...', 'I wish we could freeze this view.'],
          () => {
            uiManager.hideNPCDialog();
            this.tweens.add({
              targets: cam,
              zoom: origZoom,
              duration: 800,
              ease: 'Sine.easeInOut',
              onComplete: () => this.inputSystem.unfreeze(),
            });
          },
        );
        break;
      }
    }

    // Update suggested destination on minimap after any checkpoint visit
    this.time.delayedCall(500, () => {
      this.minimap.setSuggested(this.getNextSuggested());
    });
  }

  // ── Bridge wind particles ──
  private addBridgeAtmosphere(): void {
    const bridges = [
      { x1: 8, x2: 12, y1: 10, y2: 14 },   // Liberty
      { x1: 28, x2: 32, y1: 10, y2: 14 },   // Chain
      { x1: 50, x2: 54, y1: 10, y2: 14 },   // Margaret
    ];

    bridges.forEach(bridge => {
      const cx = ((bridge.x1 + bridge.x2) / 2) * TILE_SIZE;
      const cy = ((bridge.y1 + bridge.y2) / 2) * TILE_SIZE;
      const w = (bridge.x2 - bridge.x1 + 1) * TILE_SIZE;

      // Wind particles drifting across the bridge
      this.time.addEvent({
        delay: 400,
        loop: true,
        callback: () => {
          const px = cx + (Math.random() - 0.5) * w;
          const py = cy + (Math.random() - 0.5) * TILE_SIZE * 3;
          const particle = this.add.circle(px, py, 1, 0xFFFFFF)
            .setAlpha(0.3).setDepth(-5);

          this.tweens.add({
            targets: particle,
            x: px + 30 + Math.random() * 20,
            alpha: 0,
            duration: 1200 + Math.random() * 600,
            ease: 'Sine.easeOut',
            onComplete: () => particle.destroy(),
          });
        },
      });

      // Decorative chain/cable lines between bridge pillars
      const topY = bridge.y1 * TILE_SIZE + TILE_SIZE / 2;
      const botY = bridge.y2 * TILE_SIZE + TILE_SIZE / 2;
      for (let x = bridge.x1 + 1; x < bridge.x2; x++) {
        const wx = x * TILE_SIZE + TILE_SIZE / 2;
        // Top rail
        this.add.rectangle(wx, topY - 4, TILE_SIZE, 1, 0x8B7355)
          .setAlpha(0.5).setDepth(-4);
        // Bottom rail
        this.add.rectangle(wx, botY + 4, TILE_SIZE, 1, 0x8B7355)
          .setAlpha(0.5).setDepth(-4);
      }
    });
  }

  // ── Time-based atmosphere tinting ──
  private addAtmosphereTint(): void {
    const mapW = BUDAPEST_WIDTH * TILE_SIZE;
    const mapH = BUDAPEST_HEIGHT * TILE_SIZE;
    this.atmosphereTint = this.add.rectangle(mapW / 2, mapH / 2, mapW, mapH, 0xFFD080)
      .setDepth(200).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.waterSystem.update(this.player, this.partner);

    const playerPos = this.player.getPosition();

    // Pigeon scatter: check player proximity to each cluster
    for (const cluster of this.pigeonClusters) {
      if (cluster.scattered) continue;
      const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, cluster.cx, cluster.cy);
      if (dist < TILE_SIZE * 2.5) {
        this.scatterPigeons(cluster);
      }
    }

    // Dynamic lamp glow: brighter near player
    for (const lamp of this.lampGlows) {
      const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, lamp.worldX, lamp.worldY);
      const proximity = Math.max(0, 1 - dist / (TILE_SIZE * 5));
      lamp.outerGlow.setAlpha(0.06 + proximity * 0.12);
      lamp.outerGlow.setRadius(24 + proximity * 12);
    }

    // Atmosphere tint cycle (5 minute cycle)
    this.sceneElapsed += delta;
    const cycle = (this.sceneElapsed % 300000) / 300000; // 0-1 over 5 minutes
    let tintAlpha = 0;
    if (cycle > 0.3 && cycle < 0.5) {
      // Golden hour ramp up
      tintAlpha = (cycle - 0.3) / 0.2 * 0.04;
    } else if (cycle >= 0.5 && cycle < 0.7) {
      // Peak dusk
      tintAlpha = 0.04 + (cycle - 0.5) / 0.2 * 0.02;
    } else if (cycle >= 0.7 && cycle < 0.85) {
      // Fade back
      tintAlpha = 0.06 * (1 - (cycle - 0.7) / 0.15);
    }
    this.atmosphereTint.setAlpha(tintAlpha);
  }

  shutdown(): void {
    this.waterSystem?.shutdown(this.player, this.partner);
    super.shutdown();
  }

  protected onBack(): void {
    // No-op for now
  }
}
