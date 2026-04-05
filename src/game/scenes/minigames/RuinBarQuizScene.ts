// src/game/scenes/minigames/RuinBarQuizScene.ts
// Budapest trivia quiz at Szimpla Kert ruin bar

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
}

const QUESTIONS: QuizQuestion[] = [
  { question: 'What river runs through Budapest?', options: ['Danube', 'Rhine', 'Vistula', 'Thames'], answer: 0 },
  { question: 'Budapest was formed by merging which two cities?', options: ['Buda & Pest', 'Buda & Wien', 'Pest & Eger', 'Buda & Györ'], answer: 0 },
  { question: 'What is a traditional Hungarian stew called?', options: ['Goulash', 'Borscht', 'Ratatouille', 'Paella'], answer: 0 },
  { question: 'Which bridge is the oldest in Budapest?', options: ['Chain Bridge', 'Liberty Bridge', 'Margaret Bridge', 'Elizabeth Bridge'], answer: 0 },
  { question: 'What is lángos?', options: ['Deep-fried dough', 'A type of sausage', 'A pastry roll', 'A cheese spread'], answer: 0 },
  { question: 'What are "ruin bars" built inside?', options: ['Abandoned buildings', 'Caves', 'Old churches', 'Subway stations'], answer: 0 },
  { question: 'Which empire built the thermal baths?', options: ['Ottoman Empire', 'Roman Empire', 'Austro-Hungarian', 'Byzantine Empire'], answer: 0 },
  { question: 'What currency is used in Hungary?', options: ['Forint', 'Euro', 'Koruna', 'Zloty'], answer: 0 },
];

const TIMER_DURATION = 10; // seconds per question
const TIMER_WARNING = 3;   // seconds remaining to play warning SFX

export class RuinBarQuizScene extends Phaser.Scene {
  private checkpointId!: string;
  private questions!: QuizQuestion[];
  private currentQuestion = 0;
  private score = 0;
  private streak = 0;
  private bestStreak = 0;

  // Timer state
  private timerBar!: Phaser.GameObjects.Rectangle;
  private timerBarBg!: Phaser.GameObjects.Rectangle;
  private timerEvent!: Phaser.Time.TimerEvent;
  private timerRemaining = TIMER_DURATION;
  private timerWarningPlayed = false;
  private isAnswering = false; // lock to prevent double-answers

  // Flash overlay
  private flashOverlay!: Phaser.GameObjects.Rectangle;

  // Streak text
  private streakText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'RuinBarQuizScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.currentQuestion = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.isAnswering = false;
  }

  create(): void {
    const { width, height } = this.scale;

    // Ruin bar vibe -- dark with colorful accents
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Graffiti-style colored rectangles (static decoration)
    for (let i = 0; i < 8; i++) {
      const colors = [0xFF4444, 0x44FF44, 0x4444FF, 0xFFFF44, 0xFF44FF, 0x44FFFF];
      this.add.rectangle(
        Math.random() * width, Math.random() * height,
        20 + Math.random() * 40, 10 + Math.random() * 20,
        Phaser.Utils.Array.GetRandom(colors),
      ).setAlpha(0.08);
    }

    // Neon sign ambiance -- 4 pulsing neon rectangles
    this.createNeonSigns(width, height);

    // Timer bar background
    const barWidth = width * 0.6;
    const barHeight = 10;
    const barY = 52;
    this.timerBarBg = this.add.rectangle(width / 2, barY, barWidth, barHeight, 0x333344)
      .setDepth(10);
    this.timerBar = this.add.rectangle(
      width / 2 - barWidth / 2, barY, barWidth, barHeight, 0x44FF88,
    ).setOrigin(0, 0.5).setDepth(11);

    // Flash overlay (covers full screen, starts invisible)
    this.flashOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0xFFFFFF)
      .setAlpha(0).setDepth(100);

    // Streak text
    this.streakText = this.add.text(width / 2, 74, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#FFD700',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(15).setAlpha(0);

    // Shuffle questions and pick 5
    this.questions = Phaser.Utils.Array.Shuffle([...QUESTIONS]).slice(0, 5);

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    uiManager.showMinigameOverlay({
      title: 'Ruin Bar Quiz!',
      score: 0,
      progress: `1/${this.questions.length}`,
      onExit: () => {
        this.cleanupTimer();
        uiManager.hideQuizQuestion();
        this.endGame();
      },
    });

    this.showQuestion();
  }

  private createNeonSigns(width: number, height: number): void {
    const neonColors = [0xFF2266, 0x22FF88, 0x6622FF, 0xFFAA22];
    const neonPositions = [
      { x: width * 0.12, y: height * 0.15, w: 50, h: 14 },
      { x: width * 0.88, y: height * 0.22, w: 40, h: 12 },
      { x: width * 0.08, y: height * 0.78, w: 55, h: 10 },
      { x: width * 0.92, y: height * 0.85, w: 35, h: 16 },
    ];

    neonPositions.forEach((pos, i) => {
      const neon = this.add.rectangle(pos.x, pos.y, pos.w, pos.h, neonColors[i])
        .setAlpha(0.05);

      this.tweens.add({
        targets: neon,
        alpha: 0.12,
        duration: 1200 + i * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  /**
   * Shuffle options for the current question and return the shuffled options
   * plus the new correct answer index.
   */
  private shuffleOptions(q: QuizQuestion): { options: string[]; correctIndex: number } {
    const correctAnswer = q.options[q.answer];
    const shuffled = Phaser.Utils.Array.Shuffle([...q.options]);
    const correctIndex = shuffled.indexOf(correctAnswer);
    return { options: shuffled, correctIndex };
  }

  private showQuestion(): void {
    this.isAnswering = false;
    const q = this.questions[this.currentQuestion];
    const { options, correctIndex } = this.shuffleOptions(q);

    // Store shuffled correct index for this round
    (this as any)._currentCorrectIndex = correctIndex;
    (this as any)._currentShuffledOptions = options;

    // Reset and start timer
    this.startTimer();

    uiManager.showQuizQuestion(q.question, options, (index: number) => {
      if (this.isAnswering) return; // prevent double-tap
      this.isAnswering = true;
      this.cleanupTimer();
      this.handleAnswer(index);
    });
  }

  // ---- Timer ----

  private startTimer(): void {
    this.timerRemaining = TIMER_DURATION;
    this.timerWarningPlayed = false;

    const { width } = this.scale;
    const barWidth = width * 0.6;
    this.timerBar.width = barWidth;
    this.timerBar.fillColor = 0x44FF88;

    this.timerEvent = this.time.addEvent({
      delay: 100, // tick every 100ms for smooth bar
      callback: () => {
        this.timerRemaining -= 0.1;
        const fraction = Math.max(0, this.timerRemaining / TIMER_DURATION);
        this.timerBar.width = barWidth * fraction;

        // Color shift: green -> yellow -> red
        if (fraction > 0.5) {
          this.timerBar.fillColor = 0x44FF88;
        } else if (fraction > 0.25) {
          this.timerBar.fillColor = 0xFFDD44;
        } else {
          this.timerBar.fillColor = 0xFF4444;
        }

        // Warning SFX at 3 seconds
        if (!this.timerWarningPlayed && this.timerRemaining <= TIMER_WARNING) {
          this.timerWarningPlayed = true;
          audioManager.playSFX('mg_timer_warning');
        }

        // Time's up
        if (this.timerRemaining <= 0) {
          this.cleanupTimer();
          if (!this.isAnswering) {
            this.isAnswering = true;
            this.handleTimerExpiry();
          }
        }
      },
      loop: true,
    });
  }

  private cleanupTimer(): void {
    if (this.timerEvent) {
      this.timerEvent.destroy();
    }
  }

  private handleTimerExpiry(): void {
    const correctIndex = (this as any)._currentCorrectIndex as number;
    const options = (this as any)._currentShuffledOptions as string[];

    // Break streak
    this.streak = 0;
    this.updateStreakDisplay();

    // Orange flash + "Too slow!" text
    this.screenFlash(0xFF8800, 0.15);
    this.showFloatingText('Too slow!', '#FF8800');
    audioManager.playSFX('mg_wrong');

    uiManager.showQuizFeedback(false, options[correctIndex]);
    uiManager.updateMinigameOverlay({
      score: this.score,
      progress: `${this.currentQuestion + 1}/${this.questions.length}`,
    });

    this.time.delayedCall(1500, () => {
      uiManager.hideQuizQuestion();
      this.advanceQuestion();
    });
  }

  // ---- Answer handling ----

  private handleAnswer(index: number): void {
    const correctIndex = (this as any)._currentCorrectIndex as number;
    const options = (this as any)._currentShuffledOptions as string[];
    const correct = index === correctIndex;

    if (correct) {
      // Streak
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;

      // Score: base * streak multiplier + time bonus
      const baseScore = Math.round(100 * (1 + this.streak * 0.5));
      const timeBonus = Math.round(Math.max(0, this.timerRemaining) * 10);
      const questionScore = baseScore + timeBonus;
      this.score += questionScore;

      audioManager.playSFX('mg_correct');
      this.screenFlash(0x00FF00, 0.15);
      this.spawnSparkles();
      this.showFloatingText(`+${questionScore}`, '#44FF88');
      this.updateStreakDisplay();
    } else {
      // Break streak
      if (this.streak > 0) {
        this.cameras.main.shake(150, 0.008);
      }
      this.streak = 0;

      audioManager.playSFX('mg_wrong');
      this.screenFlash(0xFF0000, 0.15);
      this.cameras.main.shake(150, 0.008);
      this.updateStreakDisplay();
    }

    uiManager.showQuizFeedback(correct, options[correctIndex]);
    uiManager.updateMinigameOverlay({
      score: this.score,
      progress: `${this.currentQuestion + 1}/${this.questions.length}`,
    });

    this.time.delayedCall(1500, () => {
      uiManager.hideQuizQuestion();
      this.advanceQuestion();
    });
  }

  private advanceQuestion(): void {
    this.currentQuestion++;

    if (this.currentQuestion < this.questions.length) {
      uiManager.updateMinigameOverlay({
        progress: `${this.currentQuestion + 1}/${this.questions.length}`,
      });
      this.showQuestion();
    } else {
      this.endGame();
    }
  }

  // ---- Visual juice ----

  private screenFlash(color: number, peakAlpha: number): void {
    this.flashOverlay.fillColor = color;
    this.flashOverlay.setAlpha(peakAlpha);
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
    });
  }

  private spawnSparkles(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const sparkle = this.add.rectangle(cx, cy, 6, 6, 0xFFFF88).setDepth(90);

      this.tweens.add({
        targets: sparkle,
        x: cx + Math.cos(angle) * (60 + Math.random() * 40),
        y: cy + Math.sin(angle) * (60 + Math.random() * 40),
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 500 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  private showFloatingText(text: string, color: string): void {
    const { width } = this.scale;
    const floater = this.add.text(width / 2, 100, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color,
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(95);

    this.tweens.add({
      targets: floater,
      y: floater.y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => floater.destroy(),
    });
  }

  private updateStreakDisplay(): void {
    if (this.streak >= 2) {
      this.streakText.setText(`Streak x${this.streak}!`);
      this.streakText.setAlpha(1);

      // Punch scale animation
      this.streakText.setScale(1.4);
      this.tweens.add({
        targets: this.streakText,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
    } else {
      // Fade out streak text
      this.tweens.add({
        targets: this.streakText,
        alpha: 0,
        duration: 200,
      });
    }
  }

  // ---- End game ----

  private getScoreTier(score: number): string {
    if (score >= 800) return 'Quiz Master!';
    if (score >= 600) return 'Budapest Expert!';
    if (score >= 400) return 'Ruin Bar Regular';
    if (score >= 200) return 'Curious Tourist';
    return 'First Time Visitor';
  }

  private endGame(): void {
    this.cleanupTimer();
    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    const title = this.getScoreTier(this.score);
    uiManager.showMinigameResult(title, this.score, () => {
      uiManager.hideDialog();
      this.scene.start('BudapestOverworldScene');
    });
  }
}
