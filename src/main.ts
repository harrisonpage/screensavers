import { screensaverFactories } from './screensavers';
import { createTerminalUI } from './terminal';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('terminal');
  if (!container) return;
  createTerminalUI(container, screensaverFactories);
});
