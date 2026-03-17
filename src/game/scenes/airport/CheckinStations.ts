// src/game/scenes/airport/CheckinStations.ts
import Phaser from 'phaser';
import { tileToWorld } from '../../data/mapLayout';
import { TILE_SIZE } from '../../../utils/constants';
import { Player } from '../../entities/Player';
import { Partner } from '../../entities/Partner';
import { uiManager } from '../../../ui/UIManager';

function showDialogAsync(lines: string[]): Promise<void> {
  return new Promise(resolve => {
    uiManager.showNPCDialog(lines, () => {
      uiManager.hideNPCDialog();
      resolve();
    });
  });
}

export interface StationDef {
  id: string;
  triggerTileX: number;
  triggerTileY: number;
}

/** Scene interface for accessing player/partner from station sequences */
interface AirportScene extends Phaser.Scene {
  player: Player;
  partner: Partner;
}

// Stations in order — trigger tiles for the 80x22 layout
// Layout flows left-to-right: check-in → passport → security → duty free/food/terminal → gate
export const STATIONS: StationDef[] = [
  { id: 'ticket-counter',     triggerTileX: 4,  triggerTileY: 14 },  // Agent at (4,13)
  { id: 'luggage-checkin',    triggerTileX: 13, triggerTileY: 14 },  // Agent at (12,13), right of belt
  { id: 'passport-control',   triggerTileX: 22, triggerTileY: 17 },  // Agent at (22,16)
  { id: 'security-screening', triggerTileX: 30, triggerTileY: 17 },  // Agent at (30,16)
  { id: 'boarding-gate',      triggerTileX: 76, triggerTileY: 13 },  // Agent at (76,12)
];

/** Create a temporary sprite at given position, starts invisible */
function tempSprite(
  scene: Phaser.Scene,
  x: number, y: number,
  texture: string,
  depth = 20,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, texture).setDepth(depth).setAlpha(0);
}

/** Promisified tween */
function tweenAsync(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  return new Promise(resolve => {
    scene.tweens.add({ ...config, onComplete: () => resolve() });
  });
}

/** Promisified delay */
function delayAsync(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise(resolve => {
    scene.time.delayedCall(ms, resolve);
  });
}

/** Camera pan and zoom to a tile position. Returns an async restore function. */
async function focusCamera(
  scene: Phaser.Scene,
  tileX: number, tileY: number,
  zoomBoost = 0.3,
): Promise<() => Promise<void>> {
  const cam = scene.cameras.main;
  const origZoom = cam.zoom;
  const target = tileToWorld(tileX, tileY);
  cam.stopFollow();
  cam.zoomTo(origZoom + zoomBoost, 300, 'Sine.easeInOut');
  await new Promise<void>(resolve => {
    cam.pan(target.x, target.y, 300, 'Sine.easeInOut', false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1) resolve();
    });
  });

  return async () => {
    const as = scene as unknown as AirportScene;
    cam.zoomTo(origZoom, 300, 'Sine.easeInOut');
    await delayAsync(scene, 100);
    if (as.player?.sprite) {
      cam.startFollow(as.player.sprite, true, 0.1, 0.1);
    }
    await delayAsync(scene, 220);
  };
}

// ── Station 1: Ticket Counter ───────────────────────────────────────────

export async function playTicketCounter(scene: Phaser.Scene): Promise<void> {
  const restore = await focusCamera(scene, 4, 13);
  await showDialogAsync(["Welcome to Witchy Airlines! Let's get you booked for Maui."]);

  // Departure board overlay — positioned at camera viewport center
  const cam = scene.cameras.main;
  const center = cam.getWorldPoint(cam.width / 2, cam.height / 2);
  const cx = center.x;
  const cy = center.y;

  const board = tempSprite(scene, cx, cy - 20, 'prop-departure-board', 100);
  board.setScale(0.5);
  await tweenAsync(scene, { targets: board, alpha: 1, scale: 1, duration: 400, ease: 'Back.easeOut' });
  await delayAsync(scene, 1200);

  // Highlight Maui row — flash effect
  const highlight = scene.add.rectangle(cx, cy - 32, 120, 18, 0x33CC33, 0.3).setDepth(101);
  await tweenAsync(scene, { targets: highlight, alpha: 0.6, duration: 200, yoyo: true, repeat: 1 });
  highlight.destroy();
  await delayAsync(scene, 400);

  // Board fades out
  await tweenAsync(scene, { targets: board, alpha: 0, scale: 0.8, duration: 300 });
  board.destroy();

  // Boarding pass slides across counter from agent to player
  const counterPos = tileToWorld(4, 13);
  const pass = tempSprite(scene, counterPos.x + 20, counterPos.y, 'prop-boarding-pass', 20);
  pass.setAlpha(1).setScale(0.5);
  await tweenAsync(scene, { targets: pass, x: counterPos.x - 10, duration: 400, ease: 'Sine.easeOut' });
  await delayAsync(scene, 300);

  // Show enlarged boarding pass briefly (centered in viewport)
  const bigPass = tempSprite(scene, cx, cy, 'prop-boarding-pass', 100);
  bigPass.setScale(0.5);
  await tweenAsync(scene, { targets: bigPass, alpha: 1, scale: 2.5, duration: 400, ease: 'Back.easeOut' });
  await delayAsync(scene, 1000);
  await tweenAsync(scene, { targets: bigPass, alpha: 0, duration: 400 });
  bigPass.destroy();
  pass.destroy();

  await restore();
}

// ── Station 2: Luggage Check-In ─────────────────────────────────────────

export async function playLuggageCheckin(scene: Phaser.Scene): Promise<void> {
  const as = scene as unknown as AirportScene;
  const restore = await focusCamera(scene, 12, 13);
  await showDialogAsync(["Place your luggage on the belt, we'll take care of it!"]);
  const beltPos = tileToWorld(12, 14);
  const playerPos = as.player.getPosition();

  // Suitcase slides from player to belt
  const suitcase = tempSprite(scene, playerPos.x, playerPos.y, 'prop-suitcase', 20);
  suitcase.setAlpha(1).setScale(1);
  await tweenAsync(scene, {
    targets: suitcase,
    x: beltPos.x, y: beltPos.y,
    duration: 600, ease: 'Sine.easeInOut',
  });

  // Scale display appears above belt
  const scale = tempSprite(scene, beltPos.x, beltPos.y - TILE_SIZE, 'prop-scale-display', 25);
  await tweenAsync(scene, { targets: scale, alpha: 1, duration: 300 });
  await delayAsync(scene, 800);

  // Checkmark on scale
  const check = tempSprite(scene, beltPos.x + 20, beltPos.y - TILE_SIZE, 'prop-checkmark', 26);
  await tweenAsync(scene, { targets: check, alpha: 1, duration: 200 });
  await delayAsync(scene, 400);
  check.destroy();
  scale.destroy();

  // Tag slaps onto suitcase
  const tag = tempSprite(scene, beltPos.x + 12, beltPos.y - 10, 'prop-luggage-tag', 21);
  tag.setScale(2);
  await tweenAsync(scene, { targets: tag, alpha: 1, scale: 1, y: beltPos.y, duration: 200, ease: 'Bounce.easeOut' });
  await delayAsync(scene, 300);

  // Other suitcases already on belt join the conveyor
  const otherCase1 = tempSprite(scene, beltPos.x - 20, beltPos.y, 'prop-suitcase', 19);
  otherCase1.setAlpha(0.7).setScale(0.8).setTint(0x8888ff);  // Blue tint
  const otherCase2 = tempSprite(scene, beltPos.x - 40, beltPos.y, 'prop-suitcase', 19);
  otherCase2.setAlpha(0.7).setScale(0.9).setTint(0xff8888);  // Red tint

  // Suitcase rolls away down the belt with the other cases
  await tweenAsync(scene, {
    targets: [suitcase, tag, otherCase1, otherCase2],
    x: beltPos.x - 200, alpha: 0,
    duration: 800, ease: 'Sine.easeIn',
  });
  suitcase.destroy();
  tag.destroy();
  otherCase1.destroy();
  otherCase2.destroy();

  // Remove suitcase textures from player and partner
  as.player.restoreTexture(scene);
  as.partner.restoreTexture(scene);

  await restore();
}

// ── Station 3: Passport Control ─────────────────────────────────────────

export async function playPassportControl(scene: Phaser.Scene): Promise<void> {
  const as = scene as unknown as AirportScene;
  const restore = await focusCamera(scene, 22, 16);
  await showDialogAsync(['Passport please... everything looks good!']);
  const deskPos = tileToWorld(22, 16);  // desk at (22,18)
  const playerPos = as.player.getPosition();

  // Passport slides from player to officer
  const passport = tempSprite(scene, playerPos.x, playerPos.y, 'prop-passport', 20);
  passport.setAlpha(1).setScale(0.8);
  await tweenAsync(scene, {
    targets: passport,
    x: deskPos.x, y: deskPos.y,
    duration: 500, ease: 'Sine.easeInOut',
  });

  // Officer inspects (brief pause)
  await delayAsync(scene, 600);

  // Stamp comes down onto passport
  const stamp = tempSprite(scene, deskPos.x, deskPos.y - 30, 'prop-stamp', 22);
  stamp.setAlpha(1).setScale(1.5);
  await tweenAsync(scene, {
    targets: stamp,
    y: deskPos.y, scale: 1,
    duration: 200, ease: 'Bounce.easeOut',
  });

  // Brief screen shake for impact
  scene.cameras.main.shake(100, 0.005);
  await delayAsync(scene, 300);

  // Stamp fades
  await tweenAsync(scene, { targets: stamp, alpha: 0, duration: 200 });
  stamp.destroy();

  // Passport slides back to player
  await tweenAsync(scene, {
    targets: passport,
    x: playerPos.x, y: playerPos.y,
    duration: 500, ease: 'Sine.easeInOut',
  });
  await tweenAsync(scene, { targets: passport, alpha: 0, duration: 200 });
  passport.destroy();

  await restore();
}

// ── Station 4: Security Screening ───────────────────────────────────────

export async function playSecurityScreening(scene: Phaser.Scene): Promise<void> {
  const as = scene as unknown as AirportScene;
  // Focus on the security lane (detector at 30,18, conveyor at 31,17)
  const restore = await focusCamera(scene, 30, 16, 0.2);
  await showDialogAsync(['Please place your items in the bin and step through.']);
  const conveyorPos = tileToWorld(31, 15);
  const detectorPos = tileToWorld(30, 16);
  const playerPos = as.player.getPosition();

  // Another passenger's bin goes through first (busy airport feel)
  const otherBin = tempSprite(scene, conveyorPos.x + 30, conveyorPos.y, 'prop-security-bin', 19);
  otherBin.setAlpha(0.7).setTint(0xcccccc);
  await tweenAsync(scene, { targets: otherBin, alpha: 0.7, duration: 200 });
  await tweenAsync(scene, {
    targets: otherBin,
    x: conveyorPos.x - TILE_SIZE * 2, alpha: 0,
    duration: 800, ease: 'Linear',
  });
  otherBin.destroy();
  await delayAsync(scene, 200);

  // Bin appears on conveyor
  const bin = tempSprite(scene, conveyorPos.x + 20, conveyorPos.y, 'prop-security-bin', 20);
  await tweenAsync(scene, { targets: bin, alpha: 1, duration: 300 });

  // Items slide from player into bin
  const items = tempSprite(scene, playerPos.x, playerPos.y, 'prop-small-items', 21);
  items.setAlpha(1);
  await tweenAsync(scene, {
    targets: items,
    x: conveyorPos.x + 20, y: conveyorPos.y,
    duration: 400, ease: 'Sine.easeOut',
  });
  items.destroy();

  // Bin rolls into X-ray (moves left, fades as it enters machine)
  await tweenAsync(scene, {
    targets: bin,
    x: conveyorPos.x - 10, alpha: 0.3,
    duration: 600, ease: 'Linear',
  });

  // Player walks through metal detector — tween a temp sprite, not the actual player physics sprite
  const walkSprite = scene.add.image(playerPos.x, detectorPos.y + TILE_SIZE, as.player.sprite.texture.key, 0).setDepth(20);
  await tweenAsync(scene, {
    targets: walkSprite,
    y: detectorPos.y - TILE_SIZE / 2,
    duration: 600, ease: 'Linear',
  });

  // Metal detector flash green
  const flash = scene.add.rectangle(detectorPos.x, detectorPos.y, TILE_SIZE, TILE_SIZE * 1.5, 0x33FF33, 0.4).setDepth(15);
  await tweenAsync(scene, { targets: flash, alpha: 0, duration: 400 });
  flash.destroy();
  walkSprite.destroy();

  // Bin emerges on other side
  bin.setPosition(conveyorPos.x - TILE_SIZE * 2, conveyorPos.y);
  await tweenAsync(scene, {
    targets: bin,
    x: conveyorPos.x - TILE_SIZE * 3, alpha: 1,
    duration: 500, ease: 'Linear',
  });

  // Items return (fade out toward player)
  const itemsBack = tempSprite(scene, bin.x, bin.y, 'prop-small-items', 21);
  itemsBack.setAlpha(1);
  await tweenAsync(scene, {
    targets: itemsBack,
    x: playerPos.x, y: playerPos.y,
    alpha: 0, duration: 400, ease: 'Sine.easeIn',
  });
  itemsBack.destroy();
  bin.destroy();

  await restore();
}

// ── Station 5: Boarding Gate ────────────────────────────────────────────

export async function playBoardingGate(scene: Phaser.Scene): Promise<void> {
  const as = scene as unknown as AirportScene;
  const restore = await focusCamera(scene, 76, 12);
  await showDialogAsync(['Welcome aboard! Have a wonderful flight to Maui!']);
  const gatePos = tileToWorld(76, 12);  // gate desk at (76,10)
  const playerPos = as.player.getPosition();

  // Boarding pass slides to agent
  const pass = tempSprite(scene, playerPos.x, playerPos.y, 'prop-boarding-pass', 20);
  pass.setAlpha(1).setScale(0.7);
  await tweenAsync(scene, {
    targets: pass,
    x: gatePos.x, y: gatePos.y,
    duration: 500, ease: 'Sine.easeInOut',
  });

  // Scanner line sweeps across pass
  const scanner = tempSprite(scene, gatePos.x - 16, gatePos.y, 'prop-scanner-line', 22);
  scanner.setAlpha(1);
  await tweenAsync(scene, {
    targets: scanner,
    x: gatePos.x + 16,
    duration: 400, ease: 'Linear',
  });
  scanner.destroy();

  // Checkmark above agent
  const check = tempSprite(scene, gatePos.x, gatePos.y - TILE_SIZE, 'prop-checkmark', 25);
  check.setScale(0.5);
  await tweenAsync(scene, { targets: check, alpha: 1, scale: 1.2, duration: 300, ease: 'Back.easeOut' });
  await delayAsync(scene, 500);
  await tweenAsync(scene, { targets: check, alpha: 0, duration: 200 });
  check.destroy();

  // Pass slides back and fades
  await tweenAsync(scene, {
    targets: pass,
    x: playerPos.x, y: playerPos.y, alpha: 0,
    duration: 400, ease: 'Sine.easeIn',
  });
  pass.destroy();

  await restore();
}
