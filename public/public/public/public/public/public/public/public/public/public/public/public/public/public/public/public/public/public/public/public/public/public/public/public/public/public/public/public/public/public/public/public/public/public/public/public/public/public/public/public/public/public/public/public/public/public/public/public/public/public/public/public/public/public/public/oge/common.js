// == Тема (light/dark) ==
export function toggleThemeInit(key = 'pref-theme') {
  const root = document.documentElement;
  const btn = document.getElementById('themeBtn');

  function apply(mode) {
    root.classList.toggle('dark', mode === 'dark');
    try { localStorage.setItem(key, mode); } catch {}
  }

  let saved = 'light';
  try { saved = localStorage.getItem(key) || 'light'; } catch {}
  apply(saved);

  btn?.addEventListener('click', () => {
    let curr = 'light';
    try { curr = localStorage.getItem(key) || 'light'; } catch {}
    apply(curr === 'dark' ? 'light' : 'dark');
  });
}

// == Безопасная навигация (защита от дабл-кликов) ==
export function navigateOnce(url) {
  if (navigateOnce.lock) return;
  navigateOnce.lock = true;
  window.location.href = url;
}
navigateOnce.lock = false;

// == Форматирование времени (мм:сс) ==
export function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const r = String(s % 60).padStart(2, '0');
  return `${m}:${r}`;
}

// == Предпочтение уменьшенного движения ==
function prefersReducedMotion() {
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

// == Константы ОГЭ ==
export function getExamType() { return 'oge'; }
export function getTaskCount() { return 3; }
function getPrefixesToClear() { return ['oge1_','oge2_','oge3_']; }

/**
 * == Таймер подготовки (унифицированный, rAF) ==
 * API:
 *   startPrepareTimer({
 *     barEl,        // HTMLElement — полоса прогресса (width %)
 *     timeEl,       // HTMLElement — текст времени (MM:SS)
 *     totalMs,      // число — общее время, мс
 *     nextUrl,      // строка — куда перейти по завершению
 *     key,          // строка — ключ в sessionStorage для endTime
 *     textEveryMs?, // частота обновления текста (по умолчанию 250)
 *     persist?,     // сохранять endTime (по умолчанию true)
 *     useRAF?,      // rAF (по умолчанию true)
 *   })
 */
export function startPrepareTimer(opts) {
  const {
    barEl, timeEl, totalMs, nextUrl, key,
    textEveryMs = 250, persist = true, useRAF = true,
  } = opts;

  if (!barEl || !timeEl || !totalMs || !nextUrl || !key) {
    console.warn('[startPrepareTimer] Missing required options.');
  }

  // убираем CSS-инерцию
  try { barEl.style.transition = 'none'; } catch {}

  const reduced = prefersReducedMotion();

  // получаем/создаём время окончания
  let endTime = persist ? sessionStorage.getItem(key) : null;
  if (!endTime) {
    endTime = Date.now() + totalMs;
    if (persist) { try { sessionStorage.setItem(key, String(endTime)); } catch {} }
  } else {
    endTime = parseInt(endTime, 10);
  }

  function setProgress(leftMs) {
    const pct = Math.max(0, Math.min(100, (leftMs / totalMs) * 100));
    barEl.style.width = `${pct}%`;
  }
  function setTime(leftMs) { timeEl.textContent = fmtTime(leftMs); }

  let rafId = null, ivId = null, lastTextAt = 0;

  function stop() {
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    if (ivId != null)  { clearInterval(ivId);        ivId = null;  }
  }

  function finish() {
    stop();
    if (persist) { try { sessionStorage.removeItem(key); } catch {} }
    navigateOnce(nextUrl);
  }

  function frame() {
    const now = Date.now();
    const left = Math.max(0, endTime - now);
    setProgress(left);
    if (!lastTextAt || now - lastTextAt >= textEveryMs) { setTime(left); lastTextAt = now; }
    if (left <= 0) return finish();
    rafId = requestAnimationFrame(frame);
  }

  function tick() {
    const now = Date.now();
    const left = Math.max(0, endTime - now);
    setProgress(left);
    if (!lastTextAt || now - lastTextAt >= textEveryMs) { setTime(left); lastTextAt = now; }
    if (left <= 0) finish();
  }

  // старт
  setProgress(totalMs);
  setTime(totalMs);

  if (useRAF && typeof requestAnimationFrame === 'function' && !reduced) {
    rafId = requestAnimationFrame(frame);
  } else {
    const step = Math.max(50, Math.min(1000 / 30, textEveryMs)); // ~20–30 FPS
    ivId = setInterval(tick, step);
  }

  return stop;
}

// == Инициализация режима экзамена из URL (?exam=1&variant=N)
export function examModeInit() {
  try {
    const qs = new URLSearchParams(location.search);
    const isExam = qs.get('exam') === '1';

    // фиксируем тип экзамена
    sessionStorage.setItem('exam_type', 'oge');

    // устанавливаем exam_flow/variant только если есть ?exam=1
    if (isExam) {
      sessionStorage.setItem('exam_flow', '1');
      const v = (qs.get('variant') || '').replace(/\D+/g, '');
      if (v) sessionStorage.setItem('exam_variant', v);
    }
  } catch {}
}

// == Полная очистка состояния экзамена (включая ключи задач) ==
export function clearExamState() {
  try {
    ['exam_flow','exam_variant','exam_started_at','exams_payload','exams_state']
      .forEach(k => sessionStorage.removeItem(k));

    const prefixes = getPrefixesToClear();
    Object.keys(sessionStorage).forEach(k => {
      if (prefixes.some(p => k.startsWith(p))) {
        sessionStorage.removeItem(k);
      }
    });
  } catch {}
}
