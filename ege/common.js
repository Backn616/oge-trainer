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
navigateOnce.lock = false; // явное начальное состояние

// == Форматирование времени ==
export function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const r = String(s % 60).padStart(2, '0');
  return `${m}:${r}`;
}

// == Утилита: prefers-reduced-motion ==
function prefersReducedMotion() {
  try {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * == Таймер подготовки (унифицированный, rAF) ==
 * API совместим с прежним:
 *   startPrepareTimer({
 *     barEl,        // HTMLElement — полоса прогресса (width %)
 *     timeEl,       // HTMLElement — текст времени (MM:SS)
 *     totalMs,      // число — общее время, мс
 *     nextUrl,      // строка — куда переходить по завершению
 *     key,          // строка — ключ в sessionStorage для сохранения endTime
 *   })
 *
 * Доп. параметры (необязательные):
 *   textEveryMs:  число, частота обновления текста (по умолчанию 250)
 *   persist:      boolean, сохранять endTime в sessionStorage (по умолчанию true)
 *   useRAF:       boolean, использовать requestAnimationFrame (по умолчанию true)
 *
 * Возвращает функцию stop(), чтобы руками остановить таймер при необходимости.
 */
export function startPrepareTimer(opts) {
  const {
    barEl,
    timeEl,
    totalMs,
    nextUrl,
    key,
    textEveryMs = 250,
    persist = true,
    useRAF = true,
  } = opts;

  if (!barEl || !timeEl || !totalMs || !nextUrl || !key) {
    console.warn('[startPrepareTimer] Missing required options.');
  }

  // Визуально убираем возможную CSS-инерцию ширины,
  // чтобы не спорила с покадровым обновлением.
  try {
    barEl.style.transition = 'none';
  } catch {}

  const reduced = prefersReducedMotion();

  // Получаем/создаём время окончания.
  let endTime = persist ? sessionStorage.getItem(key) : null;
  if (!endTime) {
    endTime = Date.now() + totalMs;
    if (persist) {
      try { sessionStorage.setItem(key, String(endTime)); } catch {}
    }
  } else {
    endTime = parseInt(endTime, 10);
  }

  // Первичный рендер.
  function setProgress(leftMs) {
    const pct = Math.max(0, Math.min(100, (leftMs / totalMs) * 100));
    barEl.style.width = `${pct}%`;
  }
  function setTime(leftMs) { timeEl.textContent = fmtTime(leftMs); }

  // Состояние цикла.
  let rafId = null;
  let ivId = null;
  let lastTextAt = 0;

  function finish() {
    stop();
    // Очистим сохранённое endTime, чтобы при следующем заходе таймер стартовал "с нуля".
    if (persist) {
      try { sessionStorage.removeItem(key); } catch {}
    }
    navigateOnce(nextUrl);
  }

  function frame(nowTs) {
    const now = Date.now(); // для стабильности при восстановлении/свертывании
    const left = Math.max(0, endTime - now);

    // Ширину обновляем каждый тик (даже при reduced-motion — без анимации просто мгновенно).
    setProgress(left);

    // Текст обновляем не чаще textEveryMs (уменьшаем «болтливость» для скринридеров).
    if (!lastTextAt || now - lastTextAt >= textEveryMs) {
      setTime(left);
      lastTextAt = now;
    }

    if (left <= 0) {
      finish();
      return;
    }

    rafId = requestAnimationFrame(frame);
  }

  function tick() {
    const now = Date.now();
    const left = Math.max(0, endTime - now);
    setProgress(left);

    if (!lastTextAt || now - lastTextAt >= textEveryMs) {
      setTime(left);
      lastTextAt = now;
    }

    if (left <= 0) {
      finish();
    }
  }

  // Запуск
  setProgress(totalMs);
  setTime(totalMs);

  if (useRAF && typeof requestAnimationFrame === 'function' && !reduced) {
    rafId = requestAnimationFrame(frame);
  } else {
    // Фолбэк на setInterval или при reduced-motion
    const step = Math.max(50, Math.min(1000 / 30, textEveryMs)); // 20–30 FPS достаточно
    ivId = setInterval(tick, step);
  }

  // Стоппер
  function stop() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (ivId != null) {
      clearInterval(ivId);
      ivId = null;
    }
  }

  return stop;
}
