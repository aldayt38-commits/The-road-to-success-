(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = document.getElementById("app");

  const storeKey = "tareeq-najah-v2";
  const MOE = "https://www.moe.edu.ps/gaza/subjects";
  const defaults = {
    student: { name: "طالب", city: "غزة" },
    progress: {},
    chats: {},
    lastQuiz: {},
    theme: "day",
    bookmarks: [],
    notes: {},
    streak: { days: 0, last: null },
    cardIndex: 0,
    cardFlip: false,
    autoSpeak: false
  };
  function load() {
    try {
      return JSON.parse(localStorage.getItem(storeKey) || localStorage.getItem("tareeq-najah-v1")) || {};
    } catch {
      return {};
    }
  }
  function save(s) {
    localStorage.setItem(storeKey, JSON.stringify(s));
  }

  let S = Object.assign({}, defaults, load());
  if (!S.student) S.student = { name: "طالب", city: "غزة" };
  if (S.theme !== "day" && S.theme !== "night") S.theme = "day";
  let pendingAttach = null;
  let deferredInstall = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e;
  });

  function persist() {
    save(S);
  }
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", S.theme === "day" ? "day" : "night");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", S.theme === "day" ? "#ffffff" : "#0e1624");
  }
  function toggleTheme() {
    S.theme = S.theme === "day" ? "night" : "day";
    persist();
    applyTheme();
    render();
  }
  async function installApp() {
    if (deferredInstall) {
      deferredInstall.prompt();
      try {
        await deferredInstall.userChoice;
      } catch (e) {}
      deferredInstall = null;
      return;
    }
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    toast(isiOS ? "شارك → إضافة إلى الشاشة الرئيسية" : "من قائمة المتصفح: إضافة إلى الشاشة الرئيسية");
  }

  function stripSpeak(html) {
    return String(html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1100);
  }
  function speakText(text) {
    if (!window.speechSynthesis) {
      toast("المتصفح ما بيدعم القراءة الصوتية");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }
  function startMic() {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) {
      toast("الإدخال الصوتي يشتغل على كروم / إيدج");
      return;
    }
    const r = new Rec();
    r.lang = "ar-SA";
    r.interimResults = false;
    const btn = $("#btnmics");
    if (btn) btn.classList.add("live");
    r.onresult = (e) => {
      const t = e.results[0][0].transcript;
      const ta = $("#askq");
      if (ta) ta.value = t;
      sendChat(t);
    };
    r.onend = () => {
      if (btn) btn.classList.remove("live");
    };
    r.onerror = () => {
      toast("ما التقطت الصوت — اسمح بالميكروفون");
      if (btn) btn.classList.remove("live");
    };
    r.start();
    toast("احكِ الآن…");
  }

  function route() {
    const h = (location.hash || "#/dash").replace(/^#/, "");
    const parts = h.split("/").filter(Boolean);
    return { page: parts[0] || "dash", id: parts[1], extra: parts[2] };
  }

  function go(path) {
    location.hash = path.startsWith("#") ? path : "#/" + path.replace(/^\//, "");
  }

  function initials(name) {
    return (name || "ط")
      .split(" ")
      .slice(0, 2)
      .map((x) => x[0])
      .join("");
  }

  function lessonsOf(sid) {
    return window.LESSONS.filter((l) => l.subject === sid);
  }
  function lessonById(id) {
    return window.LESSONS.find((l) => l.id === id);
  }
  function subjectById(id) {
    return window.SUBJECTS.find((s) => s.id === id);
  }

  function doneCount(sid) {
    return lessonsOf(sid).filter((l) => S.progress[l.id]?.done).length;
  }
  function pct(sid) {
    const all = lessonsOf(sid).length || 1;
    return Math.round((doneCount(sid) / all) * 100);
  }
  function overall() {
    const all = window.LESSONS.length;
    const d = window.LESSONS.filter((l) => S.progress[l.id]?.done).length;
    return { d, all, p: Math.round((d / all) * 100) };
  }

  function bumpStreak() {
    const day = new Date().toISOString().slice(0, 10);
    const st = S.streak || { days: 0, last: null };
    if (st.last === day) {
      S.streak = st;
      return;
    }
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    st.days = st.last === y ? (st.days || 0) + 1 : 1;
    st.last = day;
    S.streak = st;
  }

  function markDone(id) {
    S.progress[id] = Object.assign({}, S.progress[id], { done: true, at: Date.now() });
    bumpStreak();
    persist();
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function packOf(topic, L) {
    const V = window.VIDEOS;
    if (V) return L ? V.forLesson(L) : V.pack(topic || "");
    return { ytAll: "#", ytPal: "#", gOpen: "#", gPal: "#", elearn: "https://elearn.edu.ps/c11s/" };
  }

  function appLink() {
    return location.href.split("#")[0];
  }
  async function shareApp() {
    const url = appLink();
    const title = "طريق النجاح";
    const text = "منصة الصف الحادي عشر علمي — قطاع غزة";
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("تم نسخ الرابط — الصقه في واتساب");
    } catch {
      prompt("انسخ الرابط وابعثه:", url);
    }
  }
  function waShare() {
    const msg = "طريق النجاح — حادي عشر علمي غزة\n" + appLink();
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank", "noopener");
  }

  function viewWelcome() {
    go("/dash");
    return "";
  }

  const NAV = [
    { id: "dash", icon: "⌂", label: "الرئيسية" },
    { id: "subjects", icon: "▣", label: "المواد" },
    { id: "packs", icon: "☰", label: "الرزم" },
    { id: "chat", icon: "✦", label: "رفيق" },
    { id: "videos", icon: "▶", label: "شروح يوتيوب" },
    { id: "exams", icon: "✎", label: "الاختبارات" },
    { id: "cards", icon: "◇", label: "بطاقات" },
    { id: "schedule", icon: "◷", label: "الجدول" },
    { id: "progress", icon: "◉", label: "تقدّمي" }
  ];
  const MOBILE = [
    { id: "dash", icon: "⌂", label: "رئيسية" },
    { id: "packs", icon: "▣", label: "رزم" },
    { id: "chat", icon: "ر", label: "رفيق" },
    { id: "exams", icon: "✎", label: "اختبار" },
    { id: "more", icon: "⋯", label: "المزيد" }
  ];

  function shell(inner, active, mode) {
    const tabOn = (id) =>
      active === id ||
      (id === "more" && ["more", "subjects", "videos", "cards", "schedule", "progress"].indexOf(active) >= 0)
        ? "on"
        : "";
    return `
    <div class="app-shell ${mode === "chat" ? "is-chat" : ""}">
      <header class="topbar">
        <a class="brand" href="#/dash">
          <img src="assets/logo.png" alt="شعار طريق النجاح" />
          <div>
            <h1>طريق النجاح</h1>
            <small>حادي عشر علمي · غزة</small>
          </div>
        </a>
        <div class="top-actions">
          <button class="icon-round" id="btn-theme" type="button" title="نهاري / ليلي">${S.theme === "day" ? "☾" : "☀"}</button>
          <button class="icon-round" id="btn-install" type="button" title="نزّل التطبيق">↓</button>
        </div>
      </header>
      <main class="content ${mode === "chat" ? "content-chat" : ""}">${
        navigator.onLine || mode === "chat"
          ? ""
          : `<div class="offline-bar">وضع بدون نت — الدروس ورفيق والاختبارات شغّالين. يوتيوب وجوجل بدهم نت.</div>`
      }${inner}</main>
      <nav class="mobile-nav">
        ${MOBILE.map(
          (n) =>
            `<button class="${tabOn(n.id)}" data-go="${n.id}">${n.icon}<span>${n.label}</span></button>`
        ).join("")}
      </nav>
    </div>`;
  }

  function viewMore() {
    return `
      <div class="page-head"><h2>المزيد</h2><p>التطبيق والأقسام الأخرى</p></div>
      <div class="card install-box">
        <h3>تثبيت على الجوال</h3>
        <p class="muted">الرزم والدروس ورفيق المحلي والاختبارات تشتغل بدون نت. يوتيوب وجوجل يحتاجوا نت.</p>
        <button class="btn-primary" id="btn-install" type="button">إضافة للشاشة الرئيسية</button>
      </div>
      <div class="card theme-row">
        <p style="margin-bottom:8px"><b>المظهر</b></p>
        <button class="btn-blue" id="btn-theme" type="button">${S.theme === "day" ? "الوضع الليلي" : "الوضع النهاري"}</button>
      </div>
      <div class="more-list">
        <button class="choice" data-go="subjects">المواد</button>
        <button class="choice" data-go="cards">بطاقات المصطلحات</button>
        <button class="choice" data-go="schedule">الجدول الأسبوعي</button>
        <button class="choice" data-go="progress">تقدّمي</button>
        <button class="choice" data-go="videos">شروح يوتيوب (نت)</button>
        <a class="choice" href="${MOE}" target="_blank" rel="noopener">رزم الوزارة PDF (نت)</a>
        <button class="choice" id="btn-share" type="button">شارك الرابط</button>
      </div>`;
  }

  function viewDash() {
    const cont = window.LESSONS.find((l) => !S.progress[l.id]?.done) || window.LESSONS[0];
    const cs = subjectById(cont.subject);
    return `
      <div class="page-head">
        <h2>مرحباً</h2>
        <p>حادي عشر علمي · قطاع غزة</p>
      </div>
      <div class="card continue-card">
        <p class="muted">متابعة الدراسة · ${cs.name}</p>
        <h3>${cont.title}</h3>
        <p class="muted">${cont.summary}</p>
        <button class="btn-primary" data-go="lesson/${cont.id}">متابعة آخر درس</button>
      </div>
      <p class="sec">المواد</p>
      <div class="subj-grid">${subjectCards(window.SUBJECTS)}</div>
      <div style="margin-top:14px">
        <button class="btn-blue" data-go="chat">اسأل رفيق</button>
      </div>
    `;
  }

  function subjectCards(list) {
    return list
      .map((s) => {
        const n = lessonsOf(s.id).length;
        const p = pct(s.id);
        return `
        <article class="subj-tile" data-go="subject/${s.id}">
          <div class="s-icon" style="background:${s.color}">${s.icon}</div>
          <b>${s.name}</b>
          <span class="muted">${n} دروس${p ? " · " + p + "%" : ""}</span>
        </article>`;
      })
      .join("");
  }

  function viewSubjects() {
    return `
      <div class="page-head"><h2>المواد</h2><p>حسب رزم الحادي عشر علمي — غزة</p></div>
      <div class="subj-grid">${subjectCards(window.SUBJECTS)}</div>
      <p class="muted" style="margin-top:16px">${window.META.note}</p>`;
  }

  function viewSubject(id) {
    const s = subjectById(id);
    if (!s) return `<p>المادة غير موجودة.</p>`;
    const lessons = lessonsOf(id);
    const units = [];
    lessons.forEach((l) => {
      const k = s.id + "-" + l.sem + "-" + l.unit;
      let u = units.find((x) => x.k === k);
      if (!u) {
        u = { k, sem: l.sem, unit: l.unit, title: l.unitTitle, items: [] };
        units.push(u);
      }
      u.items.push(l);
    });
    return `
      <div class="page-head">
        <p class="muted"><a href="#/subjects">المواد</a></p>
        <h2>${s.name}</h2>
        <p>${s.book}</p>
      </div>
      <div class="card" style="margin-bottom:12px">
        <b>${pct(s.id)}% من دروس المادة</b>
        <div class="progress-mini"><i style="width:${pct(s.id)}%"></i></div>
      </div>
      <button class="btn-primary" data-go="chat/${s.id}" style="margin-bottom:12px">اسأل رفيق في ${s.short}</button>
      ${units
        .map(
          (u, i) => `
        <details class="unit-acc" ${i === 0 ? "open" : ""}>
          <summary>
            <span>الفصل ${u.sem === 1 ? "الأول" : "الثاني"} · الوحدة ${u.unit}: ${u.title}</span>
            <span class="tag">${u.items.length} دروس</span>
          </summary>
          <div class="unit-body">
            ${u.items
              .map((l) => {
                const done = S.progress[l.id]?.done;
                return `<div class="lesson-row" data-go="lesson/${l.id}">
                  <span class="dot ${done ? "done" : ""}"></span>
                  <div style="flex:1">
                    <b>${l.title}</b>
                    <div class="muted">${l.summary}</div>
                  </div>
                  <span class="muted">${l.minutes} د</span>
                </div>`;
              })
              .join("")}
          </div>
        </details>`
        )
        .join("")}
      <p class="sec">اختبارات المادة</p>
      ${window.QUIZZES.filter((q) => q.subject === id)
        .map(
          (q) =>
            `<button class="choice" data-go="exam/${q.id}">${q.title}${
              S.lastQuiz[q.id] != null ? " · آخر درجة " + S.lastQuiz[q.id] + "%" : ""
            }</button>`
        )
        .join("") || "<p class='muted'>لا اختبار بعد.</p>"}
    `;
  }

  function viewLesson(id) {
    const L = lessonById(id);
    if (!L) return `<p>الدرس غير موجود.</p>`;
    const s = subjectById(L.subject);
    const all = lessonsOf(L.subject);
    const idx = all.findIndex((x) => x.id === id);
    const prev = all[idx - 1];
    const next = all[idx + 1];
    const done = S.progress[id]?.done;
    const starred = (S.bookmarks || []).includes(id);
    const p = packOf(L.title, L);
    return `
      <p class="muted"><a href="#/subject/${s.id}">${s.name}</a> · الفصل ${L.sem} · الوحدة ${L.unit}</p>
      <div class="page-head">
        <div><h2>${L.title}</h2><p>${L.unitTitle} · ${L.minutes} دقيقة</p></div>
        <span class="tag">${done ? "مكتمل" : "قيد الدراسة"}</span>
      </div>
      <div class="lesson-layout">
        <div>
          <div class="lesson-block prose">
            <h3>الشرح</h3>
            ${L.html}
          </div>
          ${
            L.terms && L.terms.length
              ? `<div class="lesson-block"><h3>التعريف</h3>${L.terms
                  .map((t) => `<div class="term"><b>${t.t}</b><span>${t.d}</span></div>`)
                  .join("")}</div>`
              : ""
          }
          ${
            L.formulas && L.formulas.length
              ? `<div class="lesson-block"><h3>القانون</h3>${L.formulas
                  .map((f) => `<div class="formula">${f.expr}</div><p class="muted">${f.name}</p>`)
                  .join("")}</div>`
              : ""
          }
          <div class="lesson-block prose">
            <h3>مثال</h3>
            ${
              L.example
                ? `<p><b>المسألة:</b> ${L.example.q}</p><ol>${L.example.steps
                    .map((st) => `<li>${st}</li>`)
                    .join("")}</ol><div class="callout"><b>الإجابة:</b> ${L.example.ans}</div>`
                : "<p class='muted'>تدرّب من الشرح ثم اسأل رفيق.</p>"
            }
          </div>
          <div class="lesson-block">
            <h3>سؤال تدريبي</h3>
            <ul>${(L.objectives || []).map((o) => `<li>${o}</li>`).join("")}</ul>
            ${
              L.mistakes && L.mistakes.length
                ? `<div class="callout warn"><b>أخطاء شائعة:</b> ${L.mistakes[0]}</div>`
                : ""
            }
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            <button class="tab on" id="btn-done">${done ? "أُنجز ✓" : "علّم كمكتمل"}</button>
            <button class="tab" id="btn-star">${starred ? "★ محفوظ" : "☆ احفظ"}</button>
            <button class="tab" data-go="chat/${s.id}">اسأل رفيق</button>
            ${prev ? `<button class="tab" data-go="lesson/${prev.id}">السابق</button>` : ""}
            ${next ? `<button class="tab" data-go="lesson/${next.id}">التالي</button>` : ""}
          </div>
        </div>
        <aside>
          <div class="card" style="margin-bottom:12px">
            <b>من الرزمة</b>
            <p class="muted">${s.book}</p>
            <p>${L.summary}</p>
          </div>
          <details class="unit-acc" style="margin-bottom:12px">
            <summary><span>شرح يوتيوب (يحتاج نت)</span></summary>
            <div class="unit-body">
              <a class="choice" href="${p.ytPal}" target="_blank" rel="noopener">يوتيوب · المنهاج الفلسطيني</a>
            </div>
          </details>
          <div class="card" style="margin-bottom:12px">
            <b>ملاحظتي على الدرس</b>
            <textarea class="note-box" id="lesson-note" placeholder="اكتب فكرة أو سؤال…">${escapeHtml(
              S.notes[id] || ""
            )}</textarea>
          </div>
          <div class="card">
            <b>دروس الوحدة</b>
            ${all
              .filter((x) => x.unit === L.unit && x.sem === L.sem)
              .map(
                (x) =>
                  `<div class="lesson-row" data-go="lesson/${x.id}"><span class="dot ${
                    S.progress[x.id]?.done ? "done" : ""
                  }"></span><span>${x.title}</span></div>`
              )
              .join("")}
          </div>
        </aside>
      </div>`;
  }

  function chatKey(sid) {
    return sid || "all";
  }

  function welcomeChat() {
    return {
      role: "ai",
      html: `<p>أنا <b>رفيق</b>. بدرّس من الرزمة على جهازك.</p>
        <p>اسأل تعريف أو شرح أو مسألة — بدون مفتاح وبدون نت.</p>`
    };
  }

  function viewPacks() {
    if (window.buildPageMap) window.buildPageMap();
    return `
      <div class="page-head">
        <h2>الرزم</h2>
        <p>افتح المادة صفحة بصفحة. عدد الدروس من الفهرس داخل المنصة.</p>
      </div>
      <div class="subj-grid">
        ${window.SUBJECTS.map((s) => {
          const n = lessonsOf(s.id).length;
          return `<article class="subj-tile" data-go="pack/${s.id}">
            <div class="s-icon" style="background:${s.color}">${s.icon}</div>
            <b>${s.name}</b>
            <span class="muted">${n} دروس</span>
          </article>`;
        }).join("")}
      </div>`;
  }

  function viewPack(id, pageStr) {
    if (window.buildPageMap) window.buildPageMap();
    const s = subjectById(id);
    if (!s) return "<p>الرزمة غير موجودة.</p>";
    const page = Math.max(1, Number(pageStr) || 1);
    const rec = window.lessonAtPage ? window.lessonAtPage(id, page) : null;
    const L = rec ? lessonById(rec.lesson) : lessonsOf(id)[0];
    const prev = Math.max(1, page - 1);
    const next = page + 1;
    return `
      <p class="muted"><a href="#/packs">كل الرزم</a> / ${s.name}</p>
      <div class="page-head">
        <div>
          <h2>رزمة ${s.name}</h2>
          <p>${s.book} · صفحة ${page} من الفصل ${rec ? rec.sem : 1} (ترقيم طريق النجاح)</p>
        </div>
        <button class="tab on" data-go="chat/${s.id}">اسأل رفيق عن هالصفحة</button>
      </div>
      <div class="card book-nav">
        <button class="tab" data-go="pack/${id}/${prev}">→ الصفحة السابقة</button>
        <form id="pagejump" data-sid="${id}" style="display:flex;gap:8px;align-items:center">
          <span>صفحة</span>
          <input name="p" type="number" min="1" value="${page}" />
          <button class="tab on" type="submit">افتح</button>
        </form>
        <button class="tab" data-go="pack/${id}/${next}">الصفحة التالية ←</button>
      </div>
      <div class="lesson-layout">
        <div class="card prose">
          ${
            L
              ? `<span class="tag">الوحدة ${L.unit} · ${L.unitTitle}</span>
                 <h3 style="margin-top:10px">${L.title}</h3>
                 <p class="muted">هذي الصفحة تقابل الدرس المقرر في الرزمة (صفحات ${rec.from}–${rec.to}).</p>
                 ${L.html}
                 <div class="callout"><b>مثال:</b> ${L.example ? L.example.q + " → " + L.example.ans : "راجع الشرح."}</div>`
              : "<p>لا محتوى لهالصفحة.</p>"
          }
        </div>
        <aside class="card">
          <b>فهرس الرزمة</b>
          ${(window.PAGE_MAP[id] || [])
            .map(
              (r) =>
                `<div class="lesson-row" data-go="pack/${id}/${r.from}">
                  <span class="muted">ص ${r.from}</span>
                  <span>${r.title}</span>
                </div>`
            )
            .join("")}
        </aside>
      </div>`;
  }

  function viewChat(sid) {
    const s = sid ? subjectById(sid) : null;
    const key = chatKey(sid);
    S.chats[key] = S.chats[key] || [welcomeChat()];
    const msgs = S.chats[key];
    const sug = (window.SUGGESTIONS[sid] || window.SUGGESTIONS.all).slice(0, 4);
    return `
      <div class="chat-page">
        <section class="chat-stage">
          <header class="chat-head">
            <div>
              <h2><span class="rafiq-dot">ر</span> رفيق</h2>
              <p>${s ? s.name : "كل الرزم"} · بدون نت</p>
            </div>
            <div style="display:flex;gap:6px">
              <button class="tab" id="newchat" type="button">جديد</button>
              <button class="tab ${S.autoSpeak ? "on" : ""}" id="autospeak" type="button">${S.autoSpeak ? "صوت ✓" : "صوت"}</button>
            </div>
          </header>
          <div class="subj-scroll">
            <button type="button" class="${!sid ? "on" : ""}" data-go="chat">الكل</button>
            ${window.SUBJECTS.map(
              (x) =>
                `<button type="button" class="${sid === x.id ? "on" : ""}" data-go="chat/${x.id}">${x.short}</button>`
            ).join("")}
          </div>
          <div class="msgs" id="msgs">
            ${msgs.map(renderMsg).join("")}
            <div class="suggest">${sug.map((q) => `<button type="button" class="ask-chip">${q}</button>`).join("")}</div>
          </div>
          <div class="composer-dock">
            <div class="composer-tools">
              <input id="filepdf" type="file" accept="application/pdf" hidden />
              <input id="fileimg" type="file" accept="image/*" hidden />
              <button class="icon-btn" type="button" id="btnmics">ميك</button>
              <button class="icon-btn" type="button" id="btnpdf">PDF</button>
              <button class="icon-btn" type="button" id="btnimg">صورة</button>
              <span id="attachbox" class="attach-chip hidden"></span>
            </div>
            <form class="composer" id="askform">
              <textarea name="q" id="askq" rows="2" placeholder="${
                s ? "سؤال في " + s.name + "…" : "اشرح / عرّف / حلّ / افتح صفحة…"
              }"></textarea>
              <button type="submit">إرسال</button>
            </form>
          </div>
        </section>
      </div>`;
  }

  function renderMsg(m, i) {
    if (m.role === "user") {
      return `<div class="msg user"><div class="bubble">${escapeHtml(m.text)}</div></div>`;
    }
    return `<div class="msg ai">
      <div class="bubble">
        <div class="ai-head"><span class="rafiq-dot">ر</span><b>رفيق</b>
          <button type="button" class="icon-btn speak-one" data-si="${i}">اقرأ</button>
        </div>
        ${m.html}
      </div>
    </div>`;
  }

  function viewVideos() {
    const V = window.VIDEOS;
    if (!V) {
      return `<div class="page-head"><h2>مكتبة شروح يوتيوب</h2><p>هالقسم بدّه نت أول مرة. الدروس ورفيق شغّالين بدون نت.</p></div>`;
    }
    return `
      <div class="page-head">
        <div>
          <h2>مكتبة شروح يوتيوب</h2>
          <p>كل فيديوهات الشرح لحادي عشر علمي — ابحث عن أي درس، أو افتح مادة كاملة.</p>
        </div>
        <button class="tab on" data-go="chat">اسأل رفيق يفتحها لك</button>
      </div>
      <form class="card" id="ytsearch" style="margin-bottom:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input name="q" required placeholder="مثال: قوانين نيوتن / المتجهات / قانون هس / hope and wish" style="flex:1;min-width:220px;padding:11px 12px;border-radius:12px;border:1px solid var(--line);background:var(--input);color:var(--ink)" />
        <button class="tab on" type="submit">كل فيديوهات يوتيوب</button>
      </form>
      <div class="grid-3" style="margin-bottom:18px">
        ${(V.universe || [])
          .map((u) => {
            const p = V.pack(u.q);
            return `<a class="card subject-card" href="${p.ytAll}" target="_blank" rel="noopener">
              <h3>${u.label}</h3>
              <p class="muted">يفتح نتائج يوتيوب لكل الشروح</p>
              <span class="tag">يوتيوب</span>
            </a>`;
          })
          .join("")}
      </div>
      <h3 style="margin:8px 0 12px;color:var(--gold-2)">حسب دروس الرزمة</h3>
      ${window.SUBJECTS.map((s) => {
        return `<details class="unit-acc">
          <summary><span>${s.icon} ${s.name}</span><span class="tag">${lessonsOf(s.id).length} دروس</span></summary>
          <div class="unit-body">
            ${lessonsOf(s.id)
              .map((L) => {
                const p = V.forLesson(L);
                return `<div class="vid-row">
                  <div><b>${L.title}</b><div class="muted">${L.unitTitle}</div></div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <a class="icon-btn" href="${p.ytAll}" target="_blank" rel="noopener">كل الشروح</a>
                    <a class="icon-btn" href="${p.ytPal}" target="_blank" rel="noopener">منهاج فلسطين</a>
                    <a class="icon-btn" href="${p.gOpen}" target="_blank" rel="noopener">جوجل مفتوح</a>
                  </div>
                </div>`;
              })
              .join("")}
          </div>
        </details>`;
      }).join("")}
      <p class="muted" style="margin-top:14px">رفيق ما «يشاهد» الفيديو ثانية بثانية؛ بجاوبك من الرزمة، وبهالروابط بتسمع صوت الأستاذ. صفّله اللي فهمته من الفيديو وبربطه بالكتاب.</p>`;
  }

  function allTerms(sid) {
    const pool = sid ? lessonsOf(sid) : window.LESSONS;
    const out = [];
    pool.forEach((L) => {
      (L.terms || []).forEach((t) => out.push({ t: t.t, d: t.d, lesson: L }));
    });
    return out;
  }

  function viewCards(sid) {
    const terms = allTerms(sid);
    if (!terms.length) return "<p>لا بطاقات.</p>";
    const i = Math.abs(S.cardIndex || 0) % terms.length;
    const item = terms[i];
    const s = subjectById(item.lesson.subject);
    return `
      <div class="page-head">
        <div>
          <h2>بطاقات المصطلحات</h2>
          <p>من الرزمة — اقلب البطاقة واحفظ التعريف الوزاري.</p>
        </div>
        <span class="tag">${i + 1} / ${terms.length}</span>
      </div>
      <div class="chips" style="margin-bottom:14px">
        <button class="chip" data-go="cards">الكل</button>
        ${window.SUBJECTS.map(
          (x) => `<button class="chip" data-go="cards/${x.id}">${x.short}</button>`
        ).join("")}
      </div>
      <div class="flip-card" id="flip">
        ${
          S.cardFlip
            ? `<p class="muted">${escapeHtml(item.t)}</p><b style="font-size:22px">${escapeHtml(item.d)}</b>
               <p class="muted" style="margin-top:12px">${s.name} · ${item.lesson.title}</p>`
            : `<b>${escapeHtml(item.t)}</b><p class="muted">اضغط لقلب البطاقة — التعريف بالفصحى زي الكتاب</p>`
        }
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;justify-content:center;flex-wrap:wrap">
        <button class="tab" id="card-prev">السابق</button>
        <button class="tab on" id="card-next">التالي</button>
        <button class="tab" data-go="lesson/${item.lesson.id}">افتح الدرس</button>
      </div>`;
  }

  function viewExams() {
    return `
      <div class="page-head"><div><h2>اختبارات الرزم</h2><p>أسئلة بأسلوب الكتاب الوزاري، مع مؤقّت وتفسير فوري بعد التسليم.</p></div></div>
      <div class="grid-3">
        ${window.QUIZZES.map((q) => {
          const s = subjectById(q.subject);
          const last = S.lastQuiz[q.id];
          return `<article class="card subject-card" data-go="exam/${q.id}">
            <div class="s-icon" style="background:${s.color}">${s.icon}</div>
            <h3>${q.title}</h3>
            <p class="muted">${s.name} · ${q.questions.length} أسئلة</p>
            <p class="muted">${last != null ? "آخر نتيجة " + last + "%" : "لم تُختبَر بعد"}</p>
          </article>`;
        }).join("")}
      </div>`;
  }

  function viewExam(id) {
    const Q = window.QUIZZES.find((x) => x.id === id);
    if (!Q) return "<p>الاختبار غير موجود.</p>";
    const s = subjectById(Q.subject);
    return `
      <p class="muted"><a href="#/exams">الاختبارات</a> / ${s.name}</p>
      <div class="page-head"><div><h2>${Q.title}</h2><p>${Q.questions.length} أسئلة اختيار من متعدد · 20 دقيقة</p></div></div>
      <div class="exam-bar card">
        <span>المؤقّت يبدأ مع فتح الصفحة</span>
        <span class="timer" id="exam-timer">20:00</span>
      </div>
      <form class="card" id="quizform" data-qid="${Q.id}">
        ${Q.questions
          .map(
            (item, i) => `
          <fieldset style="border:0;margin-bottom:18px">
            <legend style="font-weight:800">${i + 1}. ${item.q}</legend>
            ${item.choices
              .map(
                (c, j) =>
                  `<label class="choice"><input type="radio" name="q${i}" value="${j}" required /> ${c}</label>`
              )
              .join("")}
          </fieldset>`
          )
          .join("")}
        <button class="tab on" type="submit">تسليم الإجابات</button>
      </form>
      <div id="quizresult"></div>`;
  }

  function viewSchedule() {
    const days = window.SCHEDULE.days;
    return `
      <div class="page-head"><div><h2>جدول أسبوعي مقترح</h2><p>توزيع حصص تقريبي لصف 11 علمي في مدارس غزة — يمكنك المذاكرة وفقه على المنصة.</p></div></div>
      <div style="overflow:auto">
        <table class="table">
          <thead><tr><th>الحصة</th>${days.map((d) => `<th>${d}</th>`).join("")}</tr></thead>
          <tbody>
            ${window.SCHEDULE.periods
              .map((p) => {
                const keys = ["sun", "mon", "tue", "wed", "thu"];
                return `<tr><td>${p.t}</td>${keys
                  .map((k) => {
                    const s = subjectById(p[k]);
                    return `<td><span class="cell-sub" style="background:${s.color}">${s.short}</span></td>`;
                  })
                  .join("")}</tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      <p class="muted" style="margin-top:12px">الجدول تنظيم للمذاكرة وليس بديلاً عن برنامج مدرستك الفعلي.</p>`;
  }

  function viewProgress() {
    const o = overall();
    const stars = (S.bookmarks || [])
      .map((id) => lessonById(id))
      .filter(Boolean);
    return `
      <div class="page-head">
        <div>
          <h2>تقدّمك</h2>
          <p>محفوظ على هالجوال · ${(S.streak && S.streak.days) || 0} أيام مذاكرة</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="tab" id="btn-export" type="button">تصدير</button>
          <label class="tab">استيراد<input id="file-import" type="file" accept="application/json" hidden /></label>
        </div>
      </div>
      <div class="card" style="margin-bottom:14px;text-align:center">
        <svg class="score-ring" viewBox="0 0 36 36">
          <path d="M18 2.6a15.4 15.4 0 1 1 0 30.8 15.4 15.4 0 1 1 0-30.8" fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="3"/>
          <path d="M18 2.6a15.4 15.4 0 1 1 0 30.8 15.4 15.4 0 1 1 0-30.8" fill="none" stroke="#3b9ad6" stroke-width="3"
            stroke-dasharray="${o.p},100" stroke-linecap="round"/>
        </svg>
        <h3>${o.p}% من دروس الرزم</h3>
        <p class="muted">${o.d} من ${o.all}</p>
      </div>
      <div class="grid-3">
        ${window.SUBJECTS.map((s) => {
          const p = pct(s.id);
          return `<div class="card"><b>${s.name}</b>
            <div class="progress-mini"><i style="width:${p}%"></i></div>
            <p class="muted">${doneCount(s.id)}/${lessonsOf(s.id).length} · ${p}%</p></div>`;
        }).join("")}
      </div>
      <p class="sec">دروس محفوظة</p>
      ${
        stars.length
          ? stars
              .map((L) => {
                const s = subjectById(L.subject);
                return `<div class="lesson-row" data-go="lesson/${L.id}"><span class="s-icon" style="background:${s.color};width:32px;height:32px;font-size:14px">${s.icon}</span><b>${L.title}</b></div>`;
              })
              .join("")
          : "<p class='muted'>احفظ درساً بنجمة من صفحة الشرح.</p>"
      }`;
  }

  function viewSearch(q) {
    const n = (q || "").trim();
    if (n.length < 2) return `<div class="page-head"><h2>البحث</h2></div><p>اكتب حرفين على الأقل.</p>`;
    const ans = window.Rafiq.ask(n, null);
    const hits = window.LESSONS.filter((L) =>
      (L.title + L.summary + L.keywords.join(" ")).includes(n)
    ).slice(0, 12);
    const p = packOf(n);
    return `
      <div class="page-head"><h2>نتائج</h2><p>${escapeHtml(n)}</p></div>
      <div class="card" style="margin-bottom:12px">${ans.html}</div>
      <p class="sec">دروس مطابقة</p>
      ${hits
        .map((L) => {
          const s = subjectById(L.subject);
          return `<div class="lesson-row" data-go="lesson/${L.id}"><div class="s-icon" style="background:${s.color};width:32px;height:32px;font-size:14px">${s.icon}</div><div><b>${L.title}</b><div class="muted">${s.name} · ${L.unitTitle}</div></div></div>`;
        })
        .join("") || "<p class='muted'>لا دروس بالعنوان، راجع إجابة رفيق أعلاه.</p>"}`;
  }

  function render() {
    try {
    if (!window.LESSONS || !window.SUBJECTS || !window.LESSONS.length) {
      app.innerHTML =
        `<div class="app-shell"><main class="content"><div class="page-head"><h2>المنصة لسه ما تحمّلت</h2><p>افتح الموقع وأنت متصل بالنت مرة واحدة، وبعدها الدروس ورفيق والاختبارات يشتغلوا بدون نت.</p></div></main></div>`;
      return;
    }
    applyTheme();
    const r = route();
    if (r.page === "welcome") {
      go("/dash");
      return;
    }
    let html = "";
    let active = r.page;
    let mode = "";
    if (r.page === "dash") html = viewDash();
    else if (r.page === "subjects") html = viewSubjects();
    else if (r.page === "subject") {
      html = viewSubject(r.id);
      active = r.id;
    } else if (r.page === "lesson") html = viewLesson(r.id);
    else if (r.page === "packs") {
      html = viewPacks();
      active = "packs";
    } else if (r.page === "pack") {
      html = viewPack(r.id, r.extra);
      active = "packs";
    } else if (r.page === "chat") {
      html = viewChat(r.id);
      active = "chat";
      mode = "chat";
    } else if (r.page === "more") {
      html = viewMore();
      active = "more";
    } else if (r.page === "videos") html = viewVideos();
    else if (r.page === "cards") {
      html = viewCards(r.id);
      active = "cards";
    } else if (r.page === "exams") html = viewExams();
    else if (r.page === "exam") html = viewExam(r.id);
    else if (r.page === "schedule") html = viewSchedule();
    else if (r.page === "progress") html = viewProgress();
    else if (r.page === "search") html = viewSearch(decodeURIComponent(r.id || ""));
    else html = viewDash();

    app.innerHTML = shell(html, active, mode);
    bind();
    if (r.page === "chat") {
      const box = $("#msgs");
      if (box) box.scrollTop = box.scrollHeight;
    }
    } catch (err) {
      app.innerHTML =
        `<div class="app-shell"><main class="content"><div class="page-head"><h2>صار خطأ بالعرض</h2><p>حدّث الصفحة. إذا أنت بدون نت، افتح الموقع مرة وأنت متصل حتى يتخزّن.</p></div></main></div>`;
    }
  }

  function bind() {
    document.querySelectorAll("#btn-theme").forEach((b) => b.addEventListener("click", toggleTheme));
    document.querySelectorAll("#btn-install").forEach((b) => b.addEventListener("click", installApp));
    document.querySelectorAll("[data-go]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        go("/" + el.getAttribute("data-go"));
      });
    });
    document.querySelectorAll("#btn-share").forEach((b) => {
      b.addEventListener("click", () => shareApp());
    });
    const wa = $("#btn-wa");
    if (wa) wa.addEventListener("click", waShare);
    const copyBtn = $("#btn-copy");
    if (copyBtn)
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(appLink());
          toast("تم نسخ الرابط");
        } catch {
          prompt("انسخ الرابط:", appLink());
        }
      });
    const qs = $("#qsearch");
    if (qs)
      qs.addEventListener("keydown", (e) => {
        if (e.key === "Enter") go("/search/" + encodeURIComponent(qs.value.trim()));
      });

    document.querySelectorAll("#ltabs .tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#ltabs .tab").forEach((b) => b.classList.remove("on"));
        btn.classList.add("on");
        ["explain", "terms", "ex", "err"].forEach((k) => {
          const p = document.getElementById("panel-" + k);
          if (p) p.classList.toggle("hidden", k !== btn.dataset.tab);
        });
      });
    });
    const bd = $("#btn-done");
    if (bd)
      bd.addEventListener("click", () => {
        const id = route().id;
        markDone(id);
        toast("أُضيف إلى إنجازك");
        render();
      });
    const star = $("#btn-star");
    if (star)
      star.addEventListener("click", () => {
        const id = route().id;
        S.bookmarks = S.bookmarks || [];
        if (S.bookmarks.includes(id)) S.bookmarks = S.bookmarks.filter((x) => x !== id);
        else S.bookmarks.push(id);
        persist();
        render();
      });
    const note = $("#lesson-note");
    if (note)
      note.addEventListener("change", () => {
        S.notes = S.notes || {};
        S.notes[route().id] = note.value;
        persist();
        toast("انحفظت الملاحظة");
      });

    document.querySelectorAll(".ask-chip").forEach((b) => {
      b.addEventListener("click", () => sendChat(b.textContent));
    });
    const af = $("#askform");
    if (af) {
      af.addEventListener("submit", (e) => {
        e.preventDefault();
        const t = (af.q && af.q.value ? af.q.value : "").trim();
        if (t) sendChat(t);
        af.reset();
        const ta = $("#askq");
        if (ta) ta.style.height = "56px";
      });
    }
    const ta = $("#askq");
    if (ta) {
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (af) af.requestSubmit();
        }
      });
      ta.addEventListener("input", () => {
        ta.style.height = "56px";
        ta.style.height = Math.min(160, ta.scrollHeight) + "px";
      });
    }
    const nc = $("#newchat");
    if (nc)
      nc.addEventListener("click", () => {
        const key = chatKey(route().id);
        S.chats[key] = [welcomeChat()];
        persist();
        if (window.Rafiq) window.Rafiq.reset();
        render();
      });
    const mic = $("#btnmics");
    if (mic) mic.addEventListener("click", startMic);
    const as = $("#autospeak");
    if (as)
      as.addEventListener("click", () => {
        S.autoSpeak = !S.autoSpeak;
        persist();
        render();
      });
    document.querySelectorAll(".speak-one").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = chatKey(route().id);
        const m = (S.chats[key] || [])[Number(b.dataset.si)];
        if (m && m.html) speakText(stripSpeak(m.html));
      });
    });

    const bp = $("#btnpdf");
    const bi = $("#btnimg");
    const fp = $("#filepdf");
    const fi = $("#fileimg");
    if (bp && fp) {
      bp.addEventListener("click", () => fp.click());
      fp.addEventListener("change", () => {
        if (fp.files[0]) handleFile(fp.files[0], "pdf");
      });
    }
    if (bi && fi) {
      bi.addEventListener("click", () => fi.click());
      fi.addEventListener("change", () => {
        if (fi.files[0]) handleFile(fi.files[0], "img");
      });
    }

    const pj = $("#pagejump");
    if (pj)
      pj.addEventListener("submit", (e) => {
        e.preventDefault();
        go("/pack/" + pj.dataset.sid + "/" + (pj.p.value || 1));
      });

    const ex = $("#btn-export");
    if (ex)
      ex.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "tareeq-najah-progress.json";
        a.click();
        toast("تم حفظ التقدم على الملف");
      });
    const imp = $("#file-import");
    if (imp)
      imp.addEventListener("change", () => {
        const f = imp.files && imp.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const payload = JSON.parse(reader.result);
            const data = payload.data || payload;
            if (!data || typeof data !== "object") throw new Error("bad");
            S = Object.assign({}, defaults, data);
            if (!S.student) S.student = { name: "طالب", city: "غزة" };
            persist();
            toast("تم الاستيراد");
            go("/dash");
          } catch {
            toast("ملف غير صالح");
          }
        };
        reader.readAsText(f);
      });

    const ytf = $("#ytsearch");
    if (ytf)
      ytf.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = new FormData(ytf).get("q");
        const p = packOf(q);
        window.open(p.ytAll, "_blank", "noopener");
        sendChat("كل فيديوهات يوتيوب لشرح " + q);
      });

    const flip = $("#flip");
    if (flip)
      flip.addEventListener("click", () => {
        S.cardFlip = !S.cardFlip;
        render();
      });
    const cn = $("#card-next");
    if (cn)
      cn.addEventListener("click", () => {
        S.cardIndex = (S.cardIndex || 0) + 1;
        S.cardFlip = false;
        persist();
        render();
      });
    const cp = $("#card-prev");
    if (cp)
      cp.addEventListener("click", () => {
        S.cardIndex = (S.cardIndex || 0) - 1;
        S.cardFlip = false;
        persist();
        render();
      });

    if (window.__examT && !$("#exam-timer")) {
      clearInterval(window.__examT);
      window.__examT = null;
    }
    const qf = $("#quizform");
    if (qf)
      qf.addEventListener("submit", (e) => {
        e.preventDefault();
        if (window.__examT) clearInterval(window.__examT);
        gradeQuiz(qf);
      });
    const timerEl = $("#exam-timer");
    if (timerEl && qf) {
      let left = 20 * 60;
      const tick = () => {
        const m = Math.floor(Math.max(left, 0) / 60);
        const s = Math.max(left, 0) % 60;
        timerEl.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
        if (left-- <= 0) {
          clearInterval(window.__examT);
          toast("انتهى الوقت — تسليم تلقائي");
          qf.requestSubmit();
        }
      };
      if (window.__examT) clearInterval(window.__examT);
      tick();
      window.__examT = setInterval(tick, 1000);
    }
  }

  function showAttach(name) {
    const box = $("#attachbox");
    if (!box) return;
    box.classList.remove("hidden");
    box.textContent = "مرفق: " + name;
  }

  async function handleFile(file, kind) {
    if (!navigator.onLine && ((kind === "pdf" && !window.pdfjsLib) || (kind === "image" && !window.Tesseract))) {
      toast("قراءة الصورة/PDF بدها نت أول مرة. الدروس ورفيق شغّالين بدون نت.");
      return;
    }
    toast("قاعد أقرأ الملف…");
    try {
      let text = "";
      if (kind === "pdf") text = await extractPdf(file);
      else text = await extractImage(file);
      pendingAttach = { name: file.name, text, kind };
      showAttach(file.name);
      toast("تم. اكتب لخصلي أو حلّي أو اضغط إرسال");
    } catch (err) {
      toast("ما قدرت أقرأ الملف. جرّب صورة أوضح أو PDF نصي");
    }
  }

  async function extractPdf(file) {
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let out = "";
    const n = Math.min(pdf.numPages, 12);
    for (let i = 1; i <= n; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it) => it.str).join(" ") + "\n";
    }
    return out.slice(0, 12000);
  }

  async function extractImage(file) {
    if (!window.Tesseract) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const url = URL.createObjectURL(file);
    const res = await window.Tesseract.recognize(url, "ara+eng");
    URL.revokeObjectURL(url);
    return (res.data && res.data.text) || "";
  }

  async function sendChat(text) {
    const r = route();
    const onChat = r.page === "chat";
    const sid = onChat ? r.id : null;
    const key = chatKey(sid);
    S.chats[key] = S.chats[key] || [];
    const attach = pendingAttach;
    pendingAttach = null;
    const label = attach ? text + "  [" + attach.name + "]" : text;
    S.chats[key].push({ role: "user", text: label });
    persist();
    if (!onChat) go("/chat" + (sid ? "/" + sid : ""));
    else render();
    const local = window.Rafiq.ask(text, {
      subject: sid || null,
      attachmentText: attach && attach.text,
      attachmentName: attach && attach.name
    });
    const html = local.html;
    S.chats[key].push({ role: "ai", html, sources: local.sources });
    if (S.chats[key].length > 40) S.chats[key] = S.chats[key].slice(-40);
    persist();
    if (S.autoSpeak) speakText(stripSpeak(html));
    render();
  }

  function gradeQuiz(form) {
    const id = form.dataset.qid;
    const Q = window.QUIZZES.find((x) => x.id === id);
    let ok = 0;
    const fd = new FormData(form);
    const review = Q.questions.map((item, i) => {
      const pick = Number(fd.get("q" + i));
      const good = pick === item.a;
      if (good) ok++;
      return { item, pick, good };
    });
    const pctScore = Math.round((ok / Q.questions.length) * 100);
    S.lastQuiz[id] = pctScore;
    persist();
    const box = $("#quizresult");
    box.innerHTML = `
      <div class="card" style="margin-top:14px">
        <h3>النتيجة: ${ok} / ${Q.questions.length} (${pctScore}%)</h3>
        ${review
          .map(
            (r, i) => `
          <p style="margin-top:10px"><b>${i + 1}. ${r.item.q}</b></p>
          <p class="${r.good ? "muted" : ""}">${r.good ? "إجابتك صحيحة." : "إجابتك: " + (r.item.choices[r.pick] || "—")}</p>
          <div class="callout">${r.item.choices[r.item.a]} — ${r.item.exp}</div>`
          )
          .join("")}
      </div>`;
    box.scrollIntoView({ behavior: "smooth" });
    toast(pctScore >= 70 ? "أحسنت، مستوى جيد" : "راجع الشرح ثم أعد المحاولة");
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("online", render);
  window.addEventListener("offline", render);
  render();
})();
