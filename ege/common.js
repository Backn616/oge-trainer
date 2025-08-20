// ege/common.js

export function toggleThemeInit(key = 'pref-theme'){
  const root = document.documentElement;
  const btn = document.getElementById('themeBtn');
  const apply = (mode) => {
    root.classList.toggle('dark', mode === 'dark');
    try{ localStorage.setItem(key, mode); }catch{}
  };
  try{
    apply(localStorage.getItem(key) || 'light');
  }catch{
    apply('light');
  }
  btn?.addEventListener('click', ()=>{
    const curr = (localStorage.getItem(key) || 'light');
    apply(curr === 'dark' ? 'light' : 'dark');
  });
}

export function navigateOnce(url){
  if (navigateOnce.lock) return;
  navigateOnce.lock = true;
  location.href = url;
}

// снимаем «замок» при возврате из BFCache
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', () => { navigateOnce.lock = false; });
}

export function fmtTime(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const m = String(Math.floor(s/60)).padStart(2,'0');
  const r = String(s%60).padStart(2,'0');
  return `${m}:${r}`;
}

/**
 * Стартует дедлайн-таймер с прогресс-полосой, устойчив к BFCache.
 * opts: {
 *   totalMs: number,
 *   barSel: string,  // селектор полосы
 *   timeSel: string, // селектор текста времени
 *   deadlineKey: string, // ключ в sessionStorage
 *   onEnd: () => void
 * }
 */
export function startDeadlineProgress(opts){
  const { totalMs, barSel, timeSel, deadlineKey, onEnd } = opts;
  const bar = document.querySelector(barSel);
  const timeEl = document.querySelector(timeSel);

  let deadline = Number(sessionStorage.getItem(deadlineKey));
  if (!deadline) {
    deadline = Date.now() + totalMs;
    try{ sessionStorage.setItem(deadlineKey, String(deadline)); }catch{}
  }

  function tick(){
    const stored = Number(sessionStorage.getItem(deadlineKey)) || deadline;
    if (stored) deadline = stored;

    const left = Math.max(0, deadline - Date.now());
    if (timeEl) timeEl.textContent = fmtTime(left);
    if (bar) bar.style.width = `${(left / totalMs) * 100}%`;

    if (left <= 0) {
      try{ sessionStorage.removeItem(deadlineKey); }catch{}
      onEnd?.();
    } else {
      requestAnimationFrame(tick);
    }
  }

  // перезапуск при возврате из BFCache
  window.addEventListener('pageshow', (e) => { if (e.persisted) requestAnimationFrame(tick); });
  requestAnimationFrame(tick);
}
