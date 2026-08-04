export const qs = (root, selector) => root.querySelector(selector);
export const qsa = (root, selector) => [...root.querySelectorAll(selector)];
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
export const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function seeded(seed = 1) {
  let value = Number(seed) || 1;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

export function createRunGuard() {
  let generation = 0;
  return {
    begin() { generation += 1; return generation; },
    cancel() { generation += 1; },
    active(token) { return token === generation; },
    async wait(token, milliseconds) {
      await new Promise(resolve => setTimeout(resolve, milliseconds));
      return token === generation;
    },
  };
}

export function formatDuration(seconds = 0) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export function domController(stage, reset, cleanup, engine, sceneLabel) {
  return {
    dispose() { cleanup?.(); },
    reset,
    getStats() {
      return {
        engine,
        fps: 'STATE',
        scene: typeof sceneLabel === 'function' ? sceneLabel() : sceneLabel,
      };
    },
  };
}

export function appendLog(root, selector, message, tone = '', max = 12) {
  const list = qs(root, selector);
  if (!list) return;
  const item = document.createElement('li');
  item.dataset.tone = tone;
  item.innerHTML = `<time>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time> ${escapeHtml(message)}`;
  list.prepend(item);
  while (list.children.length > max) list.lastElementChild.remove();
}
