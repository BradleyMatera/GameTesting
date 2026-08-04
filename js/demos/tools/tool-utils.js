export const qs = (root, selector) => root.querySelector(selector);
export const qsa = (root, selector) => [...root.querySelectorAll(selector)];
export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const deepClone = value => structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
export const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

export function safeJsonParse(text) {
  try { return { value: JSON.parse(text), error: null }; }
  catch (error) { return { value: null, error }; }
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export function downloadText(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function createStorage(key) {
  return {
    save(value) { localStorage.setItem(key, JSON.stringify(value)); },
    load() { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; },
    clear() { localStorage.removeItem(key); },
    has() { return localStorage.getItem(key) !== null; }
  };
}

export function createHistory(initialValue, onChange, maxEntries = 80) {
  let entries = [deepClone(initialValue)];
  let index = 0;
  const notify = () => onChange?.(deepClone(entries[index]), api.status());
  const api = {
    current() { return deepClone(entries[index]); },
    push(value) {
      entries = entries.slice(0, index + 1);
      entries.push(deepClone(value));
      if (entries.length > maxEntries) entries.shift();
      index = entries.length - 1;
      notify();
    },
    replace(value) { entries[index] = deepClone(value); notify(); },
    reset(value) { entries = [deepClone(value)]; index = 0; notify(); },
    undo() { if (index > 0) { index--; notify(); return true; } return false; },
    redo() { if (index < entries.length - 1) { index++; notify(); return true; } return false; },
    status() { return { canUndo: index > 0, canRedo: index < entries.length - 1, index, length: entries.length }; }
  };
  return api;
}

export function controllerForDom(stage, reset, cleanup, engine, getScene = null) {
  return {
    dispose() { cleanup?.(); stage.replaceChildren(); },
    reset,
    getStats() {
      return {
        engine,
        fps: 'DOM',
        scene: getScene?.() || `${stage.querySelectorAll('button,input,select,textarea').length} interactive controls`
      };
    }
  };
}
