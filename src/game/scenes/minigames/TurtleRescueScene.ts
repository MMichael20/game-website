import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';

const TOTAL_TURTLES = 10;
const TURTLE_SPEED = 4000;       // ms to cross screen
const OBSTACLE_INTERVAL = 1200;  // ms between obstacle spawns
const LANE_COUNT = 5;
const SPAWN_DELAY = 1000;        // ms between turtle spawns

export class TurtleRescueScene extends Phaser.Scene {
  private saved = 0;
  private lost = 0;
  private spawned = 0;
  private gameOver = false;
  private returnScene = 'SunBeachScene';
  private returnX?: number;
  private returnY?: number;
  private obstacles: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: 'TurtleRescueScene' });
  }

  init(data: { returnScene?: string; returnX?: number; returnY?: number }) {
    this.returnScene = data.returnScene ?? 'SunBeachScene';
    this.returnX = data.returnX;
    this.returnY = data.returnY;
    this.saved = 0;
    this.lost = 0;
    this.spawned = 0;
    this.gameOver = false;
    this.obstacles = [];
  }

  create() {
    const { width, height } = this.scale;

    // Background: sand at top, ocean at bottom
    this.add.rectangle(width / 2, height * 0.3, width, height * 0.6, 0xF4D03F).setDepth(0); // sand
    this.add.rectangle(width / 2, height * 0.8, width, height * 0.4, 0x5DADE2).setDepth(0); // ocean

    // Ocean goal line
    const goalY = height * 0.65;
    this.add.rectangle(width / 2, goalY, width, 4, 0x2E86C1).setDepth(1);

    // Label
    this.add.text(width / 2, goalY + 8, 'OCEAN', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(1);

    // Nest area at top
    this.add.rectangle(width / 2, 20, width, 40, 0xD4B030).setDepth(0);
    this.add.text(width / 2, 12, 'NEST', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#8B6914',
    }).setOrigin(0.5, 0).setDepth(1);

    // Score overlay
    uiManager.showMinigameOverlay({
      title: 'Turtle Rescue',
      score: 0,
      maxScore: TOTAL_TURTLES,
      onExit: () => this.endGame(),
    });

    // Start spawning turtles
    this.spawnNextTurtle();

    // Spawn obstacles periodically
    this.time.addEvent({
      delay: OBSTACLE_INTERVAL,
      callback: () => {
        if (!this.gameOver) this.spawnObstacle();
      },
      loop: true,
    });
  }

  private spawnNextTurtle(): void {
    if (this.spawned >= TOTAL_TURTLES || this.gameOver) return;

    const { width, height } = this.scale;
    const goalY = height * 0.65;
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const laneWidth = (width - 60) / LANE_COUNT;
    const x = 30 + lane * laneWidth + laneWidth / 2;

    const turtle = this.add.image(x, 35, 'mini-baby-turtle').setDepth(5);
    this.spawned++;

    const turtleBlocked = { value: false };

    // Turtle waddles toward ocean
    this.tweens.add({
      targets: turtle,
      y: goalY + 20,
      duration: TURTLE_SPEED + Phaser.Math.Between(-500, 500),
      ease: 'Linear',
      onUpdate: () => {
        if (turtleBlocked.value || this.gameOver) return;
        // Check collision with active obstacles
        for (const obs of this.obstacles) {
          if (!obs.active) continue;
          const dx = Math.abs(turtle.x - obs.x);
          const dy = Math.abs(turtle.y - obs.y);
          if (dx < 18 && dy < 14) {
            // Turtle blocked!
            turtleBlocked.value = true;
            this.tweens.killTweensOf(turtle);
            turtle.setTint(0xff0000);
            this.time.delayedCall(500, () => {
              if (turtle.scene) turtle.destroy();
            });
            this.lost++;
            this.checkEnd();
            return;
          }
        }
      },
      onComplete: () => {
        if (turtleBlocked.value) return;
        // Turtle reached ocean — saved!
        turtle.destroy();
        this.saved++;
        uiManager.updateMinigameOverlay({ score: this.saved });
        this.checkEnd();
      },
    });

    // Spawn next turtle after delay
    this.time.delayedCall(SPAWN_DELAY, () => this.spawnNextTurtle());
  }

  private spawnObstacle(): void {
    const { width, height } = this.scale;
    const goalY = height * 0.65;
    const obstacleTypes = ['mini-crab', 'mini-seagull', 'mini-driftwood-obstacle'];
    const type = Phaser.Utils.Array.GetRandom(obstacleTypes);
    const x = Phaser.Math.Between(40, width - 40);
    const y = Phaser.Math.Between(60, goalY - 30);

    const obs = this.add.image(x, y, type).setDepth(3).setInteractive();
    this.obstacles.push(obs);

    // Tap/click to clear obstacle
    obs.on('pointerdown', () => {
      obs.disableInteractive();
      obs.active = false;
      this.tweens.add({
        targets: obs,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 200,
        onComplete: () => {
          obs.destroy();
          // Remove from array
          const idx = this.obstacles.indexOf(obs);
          if (idx >= 0) this.obstacles.splice(idx, 1);
        },
      });
    });

    // Auto-remove after 5 seconds if not clicked
    this.time.delayedCall(5000, () => {
      if (obs.active && obs.scene) {
        obs.active = false;
        obs.destroy();
        const idx = this.obstacles.indexOf(obs);
        if (idx >= 0) this.obstacles.splice(idx, 1);
      }
    });
  }

  private checkEnd(): void {
    if (this.saved + this.lost >= TOTAL_TURTLES) {
      this.endGame();
    }
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.tweens.killAll();
    this.time.removeAllEvents();
    uiManager.hideMinigameOverlay();

    uiManager.showDialog({
      title: 'Turtle Rescue Complete!',
      message: `You saved ${this.saved} out of ${TOTAL_TURTLES} baby turtles!`,
      buttons: [{
        label: 'Back to Beach',
        onClick: () => {
          uiManager.hideDialog();
          this.scene.start(this.returnScene, {
            returnX: this.returnX,
            returnY: this.returnY,
          });
        },
      }],
    });
  }
}
