(function () {
  const SPAN = 12;
  function build() {
    const map = {};
    const max = {};
    (window.SUBJECTS || []).forEach((s) => {
      const lessons = (window.LESSONS || []).filter((l) => l.subject === s.id);
      const rows = [];
      [1, 2].forEach((sem) => {
        let p = 1;
        lessons
          .filter((l) => l.sem === sem)
          .forEach((L) => {
            rows.push({ sem, from: p, to: p + SPAN - 1, lesson: L.id, title: L.title, unit: L.unit, unitTitle: L.unitTitle });
            p += SPAN;
          });
        max[s.id + "-" + sem] = Math.max(1, p - 1);
      });
      map[s.id] = rows;
    });
    window.PAGE_MAP = map;
    window.PAGE_MAX = max;
  }
  window.lessonAtPage = function (subject, page, sem) {
    if (!window.PAGE_MAP) build();
    const rows = window.PAGE_MAP[subject] || [];
    const p = Number(page);
    const pool = sem ? rows.filter((r) => r.sem === Number(sem)) : rows;
    const hit = pool.find((r) => p >= r.from && p <= r.to);
    if (hit) return hit;
    return pool[0] || rows[0] || null;
  };
  window.pagesOfLesson = function (lessonId) {
    if (!window.PAGE_MAP) build();
    for (const sid of Object.keys(window.PAGE_MAP)) {
      const r = window.PAGE_MAP[sid].find((x) => x.lesson === lessonId);
      if (r) return r;
    }
    return null;
  };
  window.buildPageMap = build;
  if (window.LESSONS) build();
  else document.addEventListener("DOMContentLoaded", build);
})();
