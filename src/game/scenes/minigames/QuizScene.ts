// src/game/scenes/minigames/QuizScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';
import type { QuizConfig } from '../../data/checkpoints';

const TIMER_SECONDS = 10;
const TIMER_BAR_WIDTH = 200;
const TIMER_BAR_HEIGHT = 10;
const TIMER_WARNING_THRESHOLD = 3;

export class QuizScene extends Phaser.Scene {
  private checkpointId!: string;
  private questions!: QuizConfig['questions'];
  private currentQuestion = 0;
  private score = 0;
  private streak = 0;
  private answering = false;

  // Timer state
  private timerBar: Phaser.GameObjects.Rectangle | null = null;
  private timerBg: Phaser.GameObjects.Rectangle | null = null;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private timerStartTime = 0;
  private timerWarningFired = false;

  // Progress bar
  private progressBarBg: Phaser.GameObjects.Rectangle | null = null;
  private progressBarFill: Phaser.GameObjects.Rectangle | null = null;

  // Ambient question marks
  private floatingMarks: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'QuizScene' });
  }

  init(data: { checkpointId: string; config: QuizConfig }): void {
    this.checkpointId = data.checkpointId;
    this.questions = data.config.questions;
    this.currentQuestion = 0;
    this.score = 0;
    this.streak = 0;
    this.answering = false;
    this.timerBar = null;
    this.timerBg = null;
    this.timerEvent = null;
    this.timerWarningFired = false;
    this.progressBarBg = null;
    this.progressBarFill = null;
    this.floatingMarks = [];
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x2a1a3a);

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    // Floating question marks for ambiance
    this.createFloatingMarks();

    // Progress bar (below title area)
    const barY = 38;
    const barWidth = width * 0.6;
    const barX = width / 2;
    this.progressBarBg = this.add.rectangle(barX, barY, barWidth, 6, 0x1a0e2a).setDepth(5);
    this.progressBarFill = this.add.rectangle(
      barX - barWidth / 2, barY, 0, 6, 0x8844ff
    ).setOrigin(0, 0.5).setDepth(6);

    uiManager.showMinigameOverlay({
      title: 'Quiz Time!',
      score: 0,
      progress: `1/${this.questions.length}`,
      onExit: () => {
        uiManager.hideQuizQuestion();
        this.destroyTimer();
        this.endGame();
      },
    });

    this.showQuestion();
  }

  update(): void {
    if (!this.timerBar || this.answering) return;

    const elapsed = (this.time.now - this.timerStartTime) / 1000;
    const remaining = Math.max(0, TIMER_SECONDS - elapsed);
    const fraction = remaining / TIMER_SECONDS;

    // Update timer bar width
    this.timerBar.width = TIMER_BAR_WIDTH * fraction;

    // Color transition: green -> yellow -> red
    if (fraction > 0.5) {
      this.timerBar.setFillStyle(0x44cc44);
    } else if (fraction > 0.25) {
      this.timerBar.setFillStyle(0xcccc44);
    } else {
      this.timerBar.setFillStyle(0xcc4444);
    }

    // Timer warning at 3 seconds
    if (!this.timerWarningFired && remaining <= TIMER_WARNING_THRESHOLD && remaining > 0) {
      this.timerWarningFired = true;
      audioManager.playSFX('mg_timer_warning');
    }
  }

  private createFloatingMarks(): void {
    const { width, height } = this.scale;
    for (let i = 0; i < 4; i++) {
      const x = Phaser.Math.Between(30, width - 30);
      const y = Phaser.Math.Between(60, height - 30);
      const mark = this.add.text(x, y, '?', {
        fontSize: `${Phaser.Math.Between(28, 48)}px`,
        color: '#aa88ff',
      }).setAlpha(Phaser.Math.FloatBetween(0.1, 0.15)).setDepth(1);

      this.floatingMarks.push(mark);

      // Slow drifting tween
      this.tweens.add({
        targets: mark,
        x: x + Phaser.Math.Between(-40, 40),
        y: y + Phaser.Math.Between(-30, 30),
        alpha: Phaser.Math.FloatBetween(0.08, 0.18),
        duration: Phaser.Math.Between(4000, 7000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private shuffleOptions(options: string[], answerIndex: number): { shuffled: string[]; newAnswerIndex: number } {
    // Create indexed pairs and shuffle
    const indexed = options.map((opt, i) => ({ text: opt, originalIndex: i }));
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Phaser.Math.Between(0, i);
      [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
    }
    const shuffled = indexed.map(item => item.text);
    const newAnswerIndex = indexed.findIndex(item => item.originalIndex === answerIndex);
    return { shuffled, newAnswerIndex };
  }

  private showQuestion(): void {
    this.answering = false;
    const q = this.questions[this.currentQuestion];

    // Shuffle options
    const { shuffled, newAnswerIndex } = this.shuffleOptions(q.options, q.answer);

    // Create timer bar
    this.createTimer();

    uiManager.showQuizQuestion(q.question, shuffled, (index: number) => {
      if (this.answering) return;
      this.answering = true;
      this.handleAnswer(index, newAnswerIndex, shuffled);
    });
  }

  private createTimer(): void {
    this.destroyTimer();

    const { width } = this.scale;
    const barX = width / 2;
    const barY = 54;

    this.timerBg = this.add.rectangle(barX, barY, TIMER_BAR_WIDTH + 4, TIMER_BAR_HEIGHT + 4, 0x111111).setDepth(10);
    this.timerBar = this.add.rectangle(
      barX - TIMER_BAR_WIDTH / 2, barY, TIMER_BAR_WIDTH, TIMER_BAR_HEIGHT, 0x44cc44
    ).setOrigin(0, 0.5).setDepth(11);

    this.timerStartTime = this.time.now;
    this.timerWarningFired = false;

    // Auto-advance when timer expires
    this.timerEvent = this.time.delayedCall(TIMER_SECONDS * 1000, () => {
      if (!this.answering) {
        this.answering = true;
        this.handleTimerExpiry();
      }
    });
  }

  private destroyTimer(): void {
    if (this.timerBar) { this.timerBar.destroy(); this.timerBar = null; }
    if (this.timerBg) { this.timerBg.destroy(); this.timerBg = null; }
    if (this.timerEvent) { this.timerEvent.destroy(); this.timerEvent = null; }
  }

  private getRemainingSeconds(): number {
    const elapsed = (this.time.now - this.timerStartTime) / 1000;
    return Math.max(0, TIMER_SECONDS - elapsed);
  }

  private handleTimerExpiry(): void {
    const { width, height } = this.scale;
    this.destroyTimer();

    // Break streak
    this.streak = 0;

    audioManager.playSFX('mg_wrong');

    // Orange flash
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xFF8800, 0.15).setDepth(20);
    this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });

    // "Too slow!" floating text
    this.showFloatingText(width / 2, height / 2 - 20, 'Too slow!', '#ff8800');

    const q = this.questions[this.currentQuestion];
    uiManager.showQuizFeedback(false, q.options[q.answer]);
    uiManager.updateMinigameOverlay({
      score: this.score,
      progress: `${this.currentQuestion + 1}/${this.questions.length}`,
    });

    this.advanceAfterDelay();
  }

  private handleAnswer(selectedIndex: number, correctIndex: number, shuffledOptions: string[]): void {
    const { width, height } = this.scale;
    const correct = selectedIndex === correctIndex;

    this.destroyTimer();

    if (correct) {
      const remainingTime = this.getRemainingSeconds();
      const timeBonus = Math.round(remainingTime * 10);
      const streakMultiplier = 1 + this.streak * 0.5;
      const baseScore = Math.round(100 * streakMultiplier);
      const questionScore = baseScore + timeBonus;

      this.streak++;
      this.score += questionScore;

      audioManager.playSFX('mg_correct');

      // Green screen flash
      const flash = this.add.rectangle(width / 2, height / 2, width, height, 0x00FF00, 0.15).setDepth(20);
      this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });

      // Sparkle burst (8 particles from center)
      this.createSparkleBurst(width / 2, height / 2);

      // Floating score text
      this.showFloatingText(width / 2, height / 2 - 20, `+${questionScore}`, '#44ff44');

      // Streak indicator
      if (this.streak >= 2) {
        this.showFloatingText(width / 2, height / 2 + 10, `${this.streak}x Streak!`, '#ffdd44', 20);
      }
    } else {
      audioManager.playSFX('mg_wrong');

      // Red flash
      const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xFF0000, 0.15).setDepth(20);
      this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });

      // Camera shake + streak break
      this.cameras.main.shake(150, 0.008);
      if (this.streak > 0) {
        this.showFloatingText(width / 2, height / 2 + 10, 'Streak lost!', '#ff4444', 18);
      }
      this.streak = 0;
    }

    // The correct answer text from the shuffled array
    const correctAnswerText = shuffledOptions[correctIndex];
    uiManager.showQuizFeedback(correct, correctAnswerText);
    uiManager.updateMinigameOverlay({
      score: this.score,
      progress: `${this.currentQuestion + 1}/${this.questions.length}`,
    });

    this.advanceAfterDelay();
  }

  private advanceAfterDelay(): void {
    this.time.delayedCall(1500, () => {
      uiManager.hideQuizQuestion();
      this.currentQuestion++;

      // Update progress bar
      this.updateProgressBar();

      if (this.currentQuestion < this.questions.length) {
        uiManager.updateMinigameOverlay({
          progress: `${this.currentQuestion + 1}/${this.questions.length}`,
        });
        this.showQuestion();
      } else {
        this.endGame();
      }
    });
  }

  private updateProgressBar(): void {
    if (!this.progressBarFill || !this.progressBarBg) return;
    const totalWidth = this.progressBarBg.width;
    const targetWidth = totalWidth * (this.currentQuestion / this.questions.length);

    this.tweens.add({
      targets: this.progressBarFill,
      width: targetWidth,
      duration: 300,
      ease: 'Power2',
    });
  }

  private createSparkleBurst(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const particle = this.add.rectangle(x, y, 5, 5, 0xFFDD44).setDepth(20);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 500,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private showFloatingText(x: number, y: number, text: string, color: string, size = 24): void {
    const floater = this.add.text(x, y, text, {
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);

    this.tweens.add({
      targets: floater,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => floater.destroy(),
    });
  }

  private getEndTitle(): string {
    const maxPossible = this.questions.length * 100 * 2; // rough estimate with streaks
    const ratio = this.score / (this.questions.length * 100);

    if (ratio >= 2) return 'Quiz Genius!';
    if (ratio >= 1.5) return 'Brilliant!';
    if (ratio >= 1) return 'Great Job!';
    if (ratio >= 0.6) return 'Not Bad!';
    if (ratio >= 0.3) return 'Keep Studying!';
    return 'Better Luck Next Time!';
  }

  private endGame(): void {
    this.destroyTimer();
    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    uiManager.showMinigameResult(this.getEndTitle(), this.score, () => {
      uiManager.hideDialog();
      this.scene.start('WorldScene');
    });
  }
}
