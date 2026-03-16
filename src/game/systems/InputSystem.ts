// src/game/systems/InputSystem.ts
import Phaser from 'phaser';
import { isTouchDevice } from '../../utils/constants';

export class InputSystem {
  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // Virtual joystick state
  private joystickBase?: Phaser.GameObjects.Circle;
  private joystickThumb?: Phaser.GameObjects.Circle;
  private joystickDirection = { x: 0, y: 0 };
  private joystickRadius = 50;
  private touchEnabled = false;
  private actionPressed = false;

  // Action button
  private actionButton?: Phaser.GameObjects.Circle;
  private actionButtonLabel?: Phaser.GameObjects.Text;

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
  }
}
