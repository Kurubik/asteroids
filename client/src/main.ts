import { Game } from './game/Game.js';
import './main.css';

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.pause();
    } else {
      game.resume();
    }
  });

  // Handle window focus/blur
  window.addEventListener('focus', () => game.resume());
  window.addEventListener('blur', () => game.pause());

  // Handle window resize
  window.addEventListener('resize', () => game.resize());

  // Handle beforeunload
  window.addEventListener('beforeunload', (event) => {
    game.destroy();
  });

  // Make game globally accessible for debugging
  (window as any).game = game;
});