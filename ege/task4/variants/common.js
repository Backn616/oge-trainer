// == Тема ==
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

// == Безопасная навигация ==
export function navigateOnce(url) {
  if (navigateOnce.lock) return;
  navigateOnce.lock = true;
  window.location.href = url;
}

// == Форматирование времени ==
export function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const r = String(s % 60).padStart(2, '0');
  return `${m}:${r}`;
}

// == Таймер подготовки ==
export function startPrepareTimer(opts) {
  const { barEl, timeEl, totalMs, nextUrl, key } = opts;

  // Если времени конца ещё нет в sessionStorage → задаём
  let endTime = sessionStorage.getItem(key);
  if (!endTime) {
    endTime = Date.now() + totalMs;
    sessionStorage.setItem(key, endTime);
  } else {
    endTime = parseInt(endTime, 10);
  }

  function tick() {
    const left = Math.max(0, endTime - Date.now());
    timeEl.textContent = fmtTime(left);
    barEl.style.width = `${(left / totalMs) * 100}%`;

    if (left <= 0) {
      clearInterval(timerId);
      navigateOnce(nextUrl);
    }
  }

  tick();
  const timerId = setInterval(tick, 500);
}
