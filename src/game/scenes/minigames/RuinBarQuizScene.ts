// src/game/scenes/minigames/RuinBarQuizScene.ts
// Budapest trivia quiz at Szimpla Kert ruin bar

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';

const QUESTIONS = [
  { question: 'What river runs through Budapest?', options: ['Danube', 'Rhine', 'Vistula', 'Thames'], answer: 0 },
  { question: 'Budapest was formed by merging which two cities?', options: ['Buda & Pest', 'Buda & Wien', 'Pest & Eger', 'Buda & Györ'], answer: 0 },
  { question: 'What is a traditional Hungarian stew called?', options: ['Goulash', 'Borscht', 'Ratatouille', 'Paella'], answer: 0 },
  { question: 'Which bridge is the oldest in Budapest?', options: ['Chain Bridge', 'Liberty Bridge', 'Margaret Bridge', 'Elizabeth Bridge'], answer: 0 },
  { question: 'What is lángos?', options: ['Deep-fried dough', 'A type of sausage', 'A pastry roll', 'A cheese spread'], answer: 0 },
  { question: 'What are "ruin bars" built inside?', options: ['Abandoned buildings', 'Caves', 'Old churches', 'Subway stations'], answer: 0 },
  { question: 'Which empire built the thermal baths?', options: ['Ottoman Empire', 'Roman Empire', 'Austro-Hungarian', 'Byzantine Empire'], answer: 0 },
  { question: 'What currency is used in Hungary?', options: ['Forint', 'Euro', 'Koruna', 'Zloty'], answer: 0 },
];

export class RuinBarQuizScene extends Phaser.Scene {
  private checkpointId!: string;
  private questions!: typeof QUESTIONS;
  private currentQuestion = 0;
  private score = 0;

  constructor() {
    super({ key: 'RuinBarQuizScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.currentQuestion = 0;
    this.score = 0;
    // Shuffle and pick 5
    this.questions = Phaser.Utils.Array.Shuffle([...QUESTIONS]).slice(0, 5);
  }

  create(): void {
    const { width, height } = this.scale;

    // Ruin bar vibe — dark with colorful accents
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Graffiti-style colored rectangles
    for (let i = 0; i < 8; i++) {
      const colors = [0xFF4444, 0x44FF44, 0x4444FF, 0xFFFF44, 0xFF44FF, 0x44FFFF];
      this.add.rectangle(
        Math.random() * width, Math.random() * height,
        20 + Math.random() * 40, 10 + Math.random() * 20,
        Phaser.Utils.Array.GetRandom(colors),
      ).setAlpha(0.08);
    }

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    uiManager.showMinigameOverlay({
      title: 'Ruin Bar Quiz!',
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
      this.scene.start('BudapestOverworldScene');
    });
  }
}
