// src/game/scenes/minigames/QuizScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';
import type { QuizConfig } from '../../data/checkpoints';

export class QuizScene extends Phaser.Scene {
  private checkpointId!: string;
  private questions!: QuizConfig['questions'];
  private currentQuestion = 0;
  private score = 0;

  constructor() {
    super({ key: 'QuizScene' });
  }

  init(data: { checkpointId: string; config: QuizConfig }): void {
    this.checkpointId = data.checkpointId;
    this.questions = data.config.questions;
    this.currentQuestion = 0;
    this.score = 0;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x2a1a3a);

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    uiManager.showMinigameOverlay({
      title: 'Quiz Time!',
      score: 0,
      progress: `1/${this.questions.length}`,
      onExit: () => {
        uiManager.hideQuizQuestion();
        this.endGame();
      },
    });

    this.showQuestion();
  }

  private showQuestion(): void {
    const q = this.questions[this.currentQuestion];
    uiManager.showQuizQuestion(q.question, q.options, (index: number) => {
      this.handleAnswer(index);
    });
  }

  private handleAnswer(index: number): void {
    const q = this.questions[this.currentQuestion];
    const correct = index === q.answer;

    if (correct) {
      this.score += 100;
      audioManager.playSFX('mg_correct');
    } else {
      audioManager.playSFX('mg_wrong');
    }

    uiManager.showQuizFeedback(correct, q.options[q.answer]);
    uiManager.updateMinigameOverlay({
      score: this.score,
      progress: `${this.currentQuestion + 1}/${this.questions.length}`,
    });

    this.time.delayedCall(1500, () => {
      uiManager.hideQuizQuestion();
      this.currentQuestion++;

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

  private endGame(): void {
    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    uiManager.showMinigameResult('Quiz Complete!', this.score, () => {
      uiManager.hideDialog();
      this.scene.start('WorldScene');
    });
  }
}
