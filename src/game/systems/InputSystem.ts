// src/game/systems/InputSystem.ts
import Phaser from 'phaser';
import { TILE_SIZE } from '../../utils/constants';
import { findPath } from './Pathfinder';

export class InputSystem {
  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private mapKey!: Phaser.Input.Keyboard.Key;

  // Freeze state — when frozen, all input returns neutral/false
  private frozen = false;

  // Click-to-move
  private pathWaypoints: Array<{ x: number; y: number }> = [];
  private currentWaypointIndex = 0;
  private clickMarker?: Phaser.GameObjects.Arc;
  private clickPulse?: Phaser.GameObjects.Arc;
  private clickToMoveEnabled = false;
  private walkCheck?: (tileX: number, tileY: number) => boolean;
  private gridW = 0;
  private gridH = 0;
  private getPlayerPos?: () => { x: number; y: number };

  // NPC tap callback — set by scenes to handle tapped world position
  public onWorldTap?: (worldX: number, worldY: number) => boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Keyboard
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: scene.input.keyboard.addKey('W'),
        A: scene.input.keyboard.addKey('A'),
        S: scene.input.keyboard.addKey('S'),
        D: scene.input.keyboard.addKey('D'),
      };
      this.interactKey = scene.input.keyboard.addKey('E');
      this.spaceKey = scene.input.keyboard.addKey('SPACE');
      this.escKey = scene.input.keyboard.addKey('ESC');
      this.mapKey = scene.input.keyboard.addKey('M');
    }
  }

  enableClickToMove(
    walkCheck: (tileX: number, tileY: number) => boolean,
    gridW: number,
    gridH: number,
    getPlayerPos: () => { x: number; y: number },
  ): void {
    this.clickToMoveEnabled = true;
    this.walkCheck = walkCheck;
    this.gridW = gridW;
    this.gridH = gridH;
    this.getPlayerPos = getPlayerPos;

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.clickToMoveEnabled || !this.walkCheck || !this.getPlayerPos) return;
      if (this.frozen) return;
      // Only left-click / primary touch
      if (pointer.button !== 0) return;

      // Convert screen coords to world coords
      const cam = this.scene.cameras.main;
      const worldPoint = cam.getWorldPoint(pointer.x, pointer.y);

      // Let scene handle NPC/special taps first
      if (this.onWorldTap?.(worldPoint.x, worldPoint.y)) return;

      // Atomic cancel: clear existing waypoints + markers BEFORE running A*
      // so a re-click never leaves the player committed to the old path for
      // one more frame.
      this.cancelPath();

      const goalTileX = Math.floor(worldPoint.x / TILE_SIZE);
      const goalTileY = Math.floor(worldPoint.y / TILE_SIZE);

      // Get player's current tile
      const playerPos = this.getPlayerPos();
      const startTileX = Math.floor(playerPos.x / TILE_SIZE);
      const startTileY = Math.floor(playerPos.y / TILE_SIZE);

      // Run pathfinding
      const path = findPath(startTileX, startTileY, goalTileX, goalTileY, this.walkCheck, this.gridW, this.gridH);

      // Always show pulse at click for tactile feedback — even on failed paths.
      this.spawnClickPulse(worldPoint.x, worldPoint.y);

      if (path.length < 2) return;

      // Convert tile path to world-pixel waypoints (tile centers)
      this.pathWaypoints = path.map(t => ({
        x: t.x * TILE_SIZE + TILE_SIZE / 2,
        y: t.y * TILE_SIZE + TILE_SIZE / 2,
      }));
      this.currentWaypointIndex = 1; // skip first waypoint (current position)

      // Persistent destination marker (cleared on arrival or re-click, NOT on a timer)
      const dest = this.pathWaypoints[this.pathWaypoints.length - 1];
      this.clickMarker = this.scene.add.circle(dest.x, dest.y, 5, 0xffffff, 0.75)
        .setStrokeStyle(2, 0xffffff, 1)
        .setDepth(1000);
    });
  }

  private cancelPath(): void {
    this.pathWaypoints = [];
    this.currentWaypointIndex = 0;
    this.clearClickMarker();
  }

  private clearClickMarker(): void {
    this.clickMarker?.destroy();
    this.clickMarker = undefined;
  }

  // Spawns a short-lived expanding ring at (x,y) for click feedback. Inner
  // radius starts at 8 and tweens to 22 over 350ms while fading — visible
  // enough to feel responsive, short enough not to distract.
  private spawnClickPulse(x: number, y: number): void {
    // Stop any previous pulse so rapid clicks don't stack tweens.
    if (this.clickPulse) {
      this.scene.tweens.killTweensOf(this.clickPulse);
      this.clickPulse.destroy();
      this.clickPulse = undefined;
    }
    const pulse = this.scene.add.circle(x, y, 8, 0xffffff, 0)
      .setStrokeStyle(2, 0xffffff, 0.85)
      .setDepth(1001);
    this.clickPulse = pulse;
    this.scene.tweens.add({
      targets: pulse,
      radius: 22,
      strokeAlpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.clickPulse === pulse) this.clickPulse = undefined;
        pulse.destroy();
      },
    });
  }

  freeze(): void {
    this.frozen = true;
  }

  unfreeze(): void {
    this.frozen = false;
  }

  get isFrozen(): boolean {
    return this.frozen;
  }

  getDirection(): { x: number; y: number } {
    if (this.frozen) return { x: 0, y: 0 };

    let x = 0;
    let y = 0;

    // Keyboard
    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;
    }

    // If manual input detected, cancel any active click-to-move path
    if (x !== 0 || y !== 0) {
      if (this.pathWaypoints.length > 0) this.cancelPath();
      return { x, y };
    }

    // Click-to-move: follow waypoints
    if (this.pathWaypoints.length > 0 && this.currentWaypointIndex < this.pathWaypoints.length && this.getPlayerPos) {
      const target = this.pathWaypoints[this.currentWaypointIndex];
      const playerPos = this.getPlayerPos();
      const dx = target.x - playerPos.x;
      const dy = target.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 4) {
        // Reached waypoint, advance
        this.currentWaypointIndex++;
        if (this.currentWaypointIndex >= this.pathWaypoints.length) {
          this.cancelPath();
          return { x: 0, y: 0 };
        }
        // Recurse to get direction to next waypoint
        return this.getDirection();
      }

      // Normalize direction toward waypoint
      return { x: dx / dist, y: dy / dist };
    }

    return { x, y };
  }

  isInteractPressed(): boolean {
    if (this.frozen) return false;
    return this.interactKey?.isDown || this.spaceKey?.isDown || false;
  }

  isBackPressed(): boolean {
    if (this.frozen) return false;
    return this.escKey?.isDown || false;
  }

  isMapPressed(): boolean {
    if (this.frozen) return false;
    return this.mapKey?.isDown || false;
  }

  update(): void {
    // Reserved for future per-frame input processing
  }

  destroy(): void {
    this.cancelPath();
    if (this.clickPulse) {
      this.scene.tweens.killTweensOf(this.clickPulse);
      this.clickPulse.destroy();
      this.clickPulse = undefined;
    }
  }
}
