// ege/common.js

// == Тумблер темы ==
export function toggleThemeInit(key = 'pref-theme') {
  const root = document.documentElement;
  const btn = document.getElementById('themeBtn');

  function apply(mode) {
    root.classList.toggle('dark', mode === 'dark');
    localStorage.setItem(key, mode);
  }

  apply(localStorage.getItem(key) || 'light');

  btn?.addEventListener('click', () => {
    const curr = localStorage.getItem(key) || 'light';
    apply(curr === 'dark' ? 'light' : 'dark');
  });
}

// == Безопасная навигация (чтобы не было повторных переходов) ==
export function navigateOnce(url) {
  if (navigateOnce.lock) return;
  navigateOnce.lock = true;
  location.href = url;
}

// == Формат времени (мм:сс) ==
export function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const r = String(s % 60).padStart(2, '0');
  return `${m}:${r}`;
}

// == Безопасная остановка записи + переход (для Safari) ==
export function safeStop(mediaRecorder, streamRef, nextUrl) {
  try { if (mediaRecorder?.state === 'recording') mediaRecorder.stop(); } catch {}
  try { streamRef?.getTracks()?.forEach(t => t.stop()); } catch {}
  navigateOnce(nextUrl);
}
