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
 * API:
 *   startPrepareTimer({
 *     barEl,        // HTMLElement — полоса прогресса (width %)
 *     timeEl,       // HTMLElement — текст времени (MM:SS)
 *     totalMs,      // число — общее время, мс
 *     nextUrl,      // строка — куда переходить по завершению
 *     key,          // строка — ключ в sessionStorage для endTime
 *     textEveryMs?, // частота обновления текста (по умолчанию 250)
 *     persist?,     // сохранять endTime (по умолчанию true)
 *     useRAF?,      // rAF (по умолчанию true)
 *   })
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

  // Уберём возможную CSS-инерцию ширины
  try { barEl.style.transition = 'none'; } catch {}

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

  function setProgress(leftMs) {
    const pct = Math.max(0, Math.min(100, (leftMs / totalMs) * 100));
    barEl.style.width = `${pct}%`;
  }
  function setTime(leftMs) { timeEl.textContent = fmtTime(leftMs); }

  let rafId = null;
  let ivId = null;
  let lastTextAt = 0;

  function finish() {
    stop();
    if (persist) {
      try { sessionStorage.removeItem(key); } catch {}
    }
    navigateOnce(nextUrl);
  }

  function frame() {
    const now = Date.now();
    const left = Math.max(0, endTime - now);

    setProgress(left);

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

  // Старт
  setProgress(totalMs);
  setTime(totalMs);

  if (useRAF && typeof requestAnimationFrame === 'function' && !reduced) {
    rafId = requestAnimationFrame(frame);
  } else {
    const step = Math.max(50, Math.min(1000 / 30, textEveryMs)); // 20–30 FPS достаточно
    ivId = setInterval(tick, step);
  }

  function stop() {
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    if (ivId != null)  { clearInterval(ivId);       ivId = null;  }
  }

  return stop;
}

// == Инициализация режима экзамена из URL (?exam=1&variant=N) ==
export function examModeInit() {
  try {
    const qs = new URLSearchParams(location.search);
    const isExam = qs.get('exam') === '1';

    // ВАЖНО: только УСТАНАВЛИВАЕМ флаг, НО НЕ СБРАСЫВАЕМ, если параметра нет.
    if (isExam) {
      sessionStorage.setItem('exam_flow', '1');
      const v = (qs.get('variant') || '').replace(/\D+/g, '');
      if (v) sessionStorage.setItem('exam_variant', v);
    }
    // Если ?exam не пришёл — ничего не делаем, чтобы не потерять режим между шагами.
  } catch {}
}

// == Явная очистка экзамен-состояния (удобно вызывать при выходе на главную) ==
export function clearExamState() {
  try {
    ['exam_flow','exam_variant','exam_started_at','exams_payload','exams_state']
      .forEach(k => sessionStorage.removeItem(k));
    ['ege1_','ege2_','ege3_','ege4_'].forEach(prefix=>{
      Object.keys(sessionStorage).forEach(k=>{
        if (k.startsWith(prefix)) sessionStorage.removeItem(k);
      });
    });
  } catch {}
}
