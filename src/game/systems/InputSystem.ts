// src/game/systems/InputSystem.ts
import Phaser from 'phaser';
import { TILE_SIZE, isTouchDevice } from '../../utils/constants';
import { findPath } from './Pathfinder';

export class InputSystem {
  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // Virtual joystick state
  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickThumb?: Phaser.GameObjects.Arc;
  private joystickDirection = { x: 0, y: 0 };
  private joystickRadius = 50;
  private touchEnabled = false;
  private actionPressed = false;

  // Action button
  private actionButton?: Phaser.GameObjects.Arc;
  private actionButtonLabel?: Phaser.GameObjects.Text;

  // Click-to-move
  private pathWaypoints: Array<{ x: number; y: number }> = [];
  private currentWaypointIndex = 0;
  private clickMarker?: Phaser.GameObjects.Arc;
  private clickToMoveEnabled = false;
  private walkCheck?: (tileX: number, tileY: number) => boolean;
  private gridW = 0;
  private gridH = 0;
  private getPlayerPos?: () => { x: number; y: number };

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
    }

    if (isTouchDevice()) {
      this.setTouchEnabled(true);
    }
  }

  setTouchEnabled(enabled: boolean): void {
    this.touchEnabled = enabled;
    if (enabled) {
      this.createVirtualJoystick();
      this.createActionButton();
    } else {
      this.destroyVirtualJoystick();
      this.destroyActionButton();
    }
  }

  private createVirtualJoystick(): void {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const baseX = 80;
    const baseY = cam.height - 80;

    this.joystickBase = scene.add.circle(baseX, baseY, this.joystickRadius, 0x000000, 0.3)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive();

    this.joystickThumb = scene.add.circle(baseX, baseY, 20, 0xffffff, 0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    // Touch events on the base
    this.joystickBase.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.updateJoystickPosition(pointer);
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.joystickBase && this.isInJoystickZone(pointer)) {
        this.updateJoystickPosition(pointer);
      }
    });

    scene.input.on('pointerup', () => {
      this.resetJoystick();
    });
  }

  private isInJoystickZone(pointer: Phaser.Input.Pointer): boolean {
    if (!this.joystickBase) return false;
    const dx = pointer.x - this.joystickBase.x;
    const dy = pointer.y - this.joystickBase.y;
    return Math.sqrt(dx * dx + dy * dy) < this.joystickRadius * 2;
  }

  private updateJoystickPosition(pointer: Phaser.Input.Pointer): void {
    if (!this.joystickBase || !this.joystickThumb) return;

    const dx = pointer.x - this.joystickBase.x;
    const dy = pointer.y - this.joystickBase.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, this.joystickRadius);
    const angle = Math.atan2(dy, dx);

    this.joystickThumb.x = this.joystickBase.x + Math.cos(angle) * clampedDist;
    this.joystickThumb.y = this.joystickBase.y + Math.sin(angle) * clampedDist;

    // Normalize to -1..1
    this.joystickDirection.x = (Math.cos(angle) * clampedDist) / this.joystickRadius;
    this.joystickDirection.y = (Math.sin(angle) * clampedDist) / this.joystickRadius;

    // Apply deadzone
    if (Math.abs(this.joystickDirection.x) < 0.2) this.joystickDirection.x = 0;
    if (Math.abs(this.joystickDirection.y) < 0.2) this.joystickDirection.y = 0;
  }

  private resetJoystick(): void {
    if (this.joystickBase && this.joystickThumb) {
      this.joystickThumb.x = this.joystickBase.x;
      this.joystickThumb.y = this.joystickBase.y;
    }
    this.joystickDirection = { x: 0, y: 0 };
  }

  private destroyVirtualJoystick(): void {
    this.joystickBase?.destroy();
    this.joystickThumb?.destroy();
    this.joystickBase = undefined;
    this.joystickThumb = undefined;
  }

  private createActionButton(): void {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const btnX = cam.width - 60;
    const btnY = cam.height - 80;

    this.actionButton = scene.add.circle(btnX, btnY, 28, 0x000000, 0.3)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive();

    this.actionButtonLabel = scene.add.text(btnX, btnY, 'E', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    this.actionButton.on('pointerdown', () => {
      this.actionPressed = true;
    });
  }

  private destroyActionButton(): void {
    this.actionButton?.destroy();
    this.actionButtonLabel?.destroy();
    this.actionButton = undefined;
    this.actionButtonLabel = undefined;
  }

  enableClickToMove(
    walkCheck: (tileX: number, tileY: number) => boolean,
    gridW: number,
    gridH: number,
    getPlayerPos: () => { x: number; y: number },
  ): void {
    if (isTouchDevice()) return; // touch devices use joystick

    this.clickToMoveEnabled = true;
    this.walkCheck = walkCheck;
    this.gridW = gridW;
    this.gridH = gridH;
    this.getPlayerPos = getPlayerPos;

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.clickToMoveEnabled || !this.walkCheck || !this.getPlayerPos) return;

      // Convert screen coords to world coords
      const cam = this.scene.cameras.main;
      const worldPoint = cam.getWorldPoint(pointer.x, pointer.y);
      const goalTileX = Math.floor(worldPoint.x / TILE_SIZE);
      const goalTileY = Math.floor(worldPoint.y / TILE_SIZE);

      // Get player's current tile
      const playerPos = this.getPlayerPos();
      const startTileX = Math.floor(playerPos.x / TILE_SIZE);
      const startTileY = Math.floor(playerPos.y / TILE_SIZE);

      // Run pathfinding
      const path = findPath(startTileX, startTileY, goalTileX, goalTileY, this.walkCheck, this.gridW, this.gridH);
      if (path.length === 0) return;

      // Convert tile path to world-pixel waypoints (tile centers)
      this.pathWaypoints = path.map(t => ({
        x: t.x * TILE_SIZE + TILE_SIZE / 2,
        y: t.y * TILE_SIZE + TILE_SIZE / 2,
      }));
      this.currentWaypointIndex = 1; // skip first waypoint (current position)

      // Show click marker at destination
      this.clearClickMarker();
      const dest = this.pathWaypoints[this.pathWaypoints.length - 1];
      this.clickMarker = this.scene.add.circle(dest.x, dest.y, 4, 0xffffff, 0.6)
        .setDepth(1000);
      this.scene.tweens.add({
        targets: this.clickMarker,
        alpha: 0,
        duration: 1500,
        ease: 'Linear',
        onComplete: () => this.clearClickMarker(),
      });
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

  getDirection(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    // Keyboard
    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;
    }

    // Virtual joystick overrides if active
    if (this.touchEnabled && (this.joystickDirection.x !== 0 || this.joystickDirection.y !== 0)) {
      x = this.joystickDirection.x;
      y = this.joystickDirection.y;
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
    const keyboard = this.interactKey?.isDown || this.spaceKey?.isDown || false;
    const touch = this.actionPressed;
    this.actionPressed = false; // consume
    return keyboard || touch;
  }

  isBackPressed(): boolean {
    return this.escKey?.isDown || false;
  }

  update(): void {
    // Reserved for future per-frame input processing
  }

  destroy(): void {
    this.destroyVirtualJoystick();
    this.destroyActionButton();
    this.cancelPath();
  }
}
