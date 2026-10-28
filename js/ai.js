(function () {
  const TASHKEEL = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
  const STOP = new Set("في من على إلى الى عن مع هذا هذه ذلك تلك التي الذي ما لا لم لن إن أن أو ثم قد كل كما ليس هي هو هم هن انا نحن انت تم يكون تكون كان كانت بين خلال بعد قبل غير ايضا جدا كيف هل".split(" "));

  let CTX = { subject: null, lessons: [], page: null, lastIntent: null, lastQ: "" };

  function norm(s) {
    return String(s || "")
      .replace(TASHKEEL, "")
      .replace(/[إأآا]/g, "ا")
      .replace(/[ىي]/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, " ")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function applyDialect(raw) {
    let t = " " + String(raw || "") + " ";
    const D = window.DIALECT || { map: {}, phrases: [] };
    (D.phrases || []).forEach((p) => {
      t = t.replace(new RegExp(p.from, "gi"), p.to);
    });
    const keys = Object.keys(D.map || {}).sort((a, b) => b.length - a.length);
    keys.forEach((k) => {
      t = t.replace(new RegExp("(^|[\\s،,])" + k + "(?=\\s|$|[\\s،,])", "gi"), "$1" + D.map[k] + " ");
    });
    return t.replace(/\s+/g, " ").trim();
  }

  function tokens(s) {
    return norm(s).split(" ").filter((w) => w.length > 1 && !STOP.has(w));
  }

  function subjOf(s) {
    return (window.SUBJECTS || []).find((x) => x.id === s);
  }
  function lessonById(id) {
    return (window.LESSONS || []).find((l) => l.id === id);
  }
  function lessonsOf(sid) {
    return (window.LESSONS || []).filter((l) => l.subject === sid);
  }

  const SUBJ_ALIASES = [
    ["chemistry", ["كيمياء", "الكيمياء", "كيميا"]],
    ["physics", ["فيزياء", "الفيزياء", "فيزيا"]],
    ["math", ["رياضيات", "الرياضيات", "متجه", "حساب"]],
    ["biology", ["احياء", "علوم حياتيه", "حياتيه", "بيولوجي"]],
    ["arabic", ["عربي", "العربي", "لغه عربيه", "نحو", "مطالعه"]],
    ["english", ["انجليزي", "الانجليزي", "english", "انجلش"]],
    ["islamic", ["اسلاميه", "تربيه اسلاميه", "دين", "فقه"]],
    ["tech", ["تكنولوجيا", "تكنو", "حاسوب", "شبكات", "قواعد بيانات"]]
  ];

  function detectSubjects(q) {
    const n = norm(q);
    const found = [];
    SUBJ_ALIASES.forEach(([id, als]) => {
      if (als.some((a) => n.includes(norm(a)))) found.push(id);
    });
    return found;
  }

  const ORD = {
    الاول: 1, الأولي: 1, اول: 1, "1": 1,
    الثاني: 2, ثاني: 2, "2": 2,
    الثالث: 3, ثالث: 3, "3": 3,
    الرابع: 4, رابع: 4, "4": 4,
    الخامس: 5, خامس: 5, "5": 5,
    السادس: 6, سادس: 6, "6": 6,
    السابع: 7, سابع: 7, "7": 7,
    الثامن: 8, ثامن: 8, "8": 8,
    التاسع: 9, تاسع: 9, "9": 9,
    العاشر: 10, عاشر: 10, "10": 10
  };

  function ordinalsIn(q) {
    const n = norm(q);
    const out = [];
    Object.keys(ORD).forEach((k) => {
      if (n.includes(k)) out.push(ORD[k]);
    });
    return [...new Set(out)].sort((a, b) => a - b);
  }

  function pagesIn(q) {
    const nums = [];
    String(q).replace(/(?:صفح[ةه]|ص)\s*(\d{1,3})/gi, (_, n) => nums.push(Number(n)));
    if (!nums.length) {
      const m = String(q).match(/(\d{1,3})/g);
      if (m && /صفح|رزمه|رزمة|وزمه|كتاب/i.test(q)) nums.push(Number(m[0]));
    }
    return nums;
  }

  function wantsLinks(q) {
    const n = norm(q);
    return /يوتيوب|قناه|فيديو|جوجل|google|ابحث|بحث|مصدر|مصادر|youtube|search/.test(n);
  }

  function intentOf(q) {
    const n = norm(q);
    if (/^(السلام|مرحبا|هلا|اهلين|اهلا|hi|hello|صباح|مساء|كيف حالك|كيفك|شو اخبارك)/.test(n) && n.split(" ").length < 8)
      return "greet";
    if (/شكر|يسلم|تسلم|يعطيك العافيه/.test(n) && n.split(" ").length < 6) return "thanks";
    if (/قاموس|كيف احكي|شو بتقدر|ماذا تستطيع|اوامر|help|مساعده/.test(n)) return "help";
    if (/جوجل|google|ابحث|بحث مفتوح|سيرش|search/.test(n)) return "search";
    if (/يوتيوب|قناه|فيديو|فيديوهات|شرح مصور|youtube/.test(n)) return "youtube";
    if (/افتح/.test(n) && (/صفح|رزمه|رزمة|وزمه|كتاب/.test(n) || /\d/.test(n))) return "open_page";
    if (/لخص|ملخص|اختصر/.test(n)) return "summarize";
    if (/حل |حلّ|اوجد|احسب|مسال/.test(n)) return "solve";
    if (/قارن|فرق/.test(n)) return "compare";
    if (/عرف|ما هو|ما هي|تعريف/.test(n)) return "define";
    if (/اشرح|وضح|فسر/.test(n)) return "explain";
    return "ask";
  }

  function strip(html) {
    return String(html || "")
      .replace(/<div class="formula">([\s\S]*?)<\/div>/g, " ⟨ $1 ⟩ ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function scoreQuery(q, subject) {
    const toks = tokens(q);
    const nq = norm(q);
    return (window.LESSONS || [])
      .filter((L) => L.subject !== "christian")
      .filter((L) => !subject || L.subject === subject)
      .map((L) => {
        const termTxt = (L.terms || []).map((t) => t.t + " " + t.d).join(" ");
        const blob = norm(
          L.title + " " + L.unitTitle + " " + L.summary + " " + termTxt + " " + (L.keywords || []).join(" ") + " " + strip(L.html)
        );
        let s = 0;
        toks.forEach((t) => {
          if ((L.keywords || []).some((k) => norm(k).includes(t) || t.includes(norm(k)))) s += 7;
          if (blob.includes(t)) s += 2;
          if (norm(L.title).includes(t)) s += 8;
        });
        if (nq.length > 8 && blob.includes(nq.slice(0, 24))) s += 6;
        return { L, s };
      })
      .sort((a, b) => b.s - a.s);
  }

  function pickLessonsFromSpeech(q, subjectHint) {
    const subs = detectSubjects(q);
    const sid = subjectHint || subs[0] || CTX.subject;
    const ords = ordinalsIn(q);
    if (sid && ords.length && /درس|وحده|وحدة/.test(norm(q))) {
      const list = lessonsOf(sid);
      if (/وحده|وحدة/.test(norm(q))) {
        return list.filter((l) => ords.includes(l.unit));
      }
      return ords.map((i) => list[i - 1]).filter(Boolean);
    }
    if (sid && /درس/.test(norm(q)) && ords.length) {
      return ords.map((i) => lessonsOf(sid)[i - 1]).filter(Boolean);
    }
    return [];
  }

  function packLinks(topic, lessons, subject) {
    const V = window.VIDEOS;
    const L = lessons && lessons[0];
    const sname = L && subjOf(L.subject) ? subjOf(L.subject).name : subject && subjOf(subject) ? subjOf(subject).name : "";
    if (V) return L ? V.forLesson(L) : V.pack(topic || "", sname);
    const T = window.TEACHERS || {};
    const q = (topic || "") + " " + sname;
    return {
      topic: q,
      ytAll: T.yt ? T.yt(q + " شرح الصف الحادي عشر علمي") : "#",
      ytPal: T.yt ? T.yt(q + " حادي عشر علمي فلسطين المنهج الفلسطيني شرح") : "#",
      gOpen: T.googleOpen ? T.googleOpen(q) : "https://www.google.com/search?q=" + encodeURIComponent(q),
      gPal: T.google ? T.google(q) : "#",
      gPdf: "https://www.google.com/search?q=" + encodeURIComponent(q + " حادي عشر علمي filetype:pdf"),
      elearn: "https://elearn.edu.ps/c11s/"
    };
  }

  function researchHtml(topic, lessons, subject) {
    const p = packLinks(topic, lessons, subject);
    return `<div class="research show">
      <b>إذا بدك تسمع شرح صوت — هون (بدها نت)</b>
      <div class="research-grid">
        <a class="r-card" href="${p.ytPal}" target="_blank" rel="noopener">يوتيوب · المنهاج الفلسطيني</a>
        <a class="r-card" href="${p.gPal}" target="_blank" rel="noopener">جوجل · مقيّد بالمنهاج</a>
      </div>
    </div>`;
  }

  function lessonLink(L) {
    if (!L) return "";
    return `<button class="source" data-go="lesson/${L.id}">افتح الدرس: ${L.title}</button>`;
  }

  function teachLesson(L, mode) {
    const s = subjOf(L.subject);
    const plain = strip(L.html);
    const sentences = plain.split(/[.。؟!]/).map((x) => x.trim()).filter((x) => x.length > 18);
    const def = (L.terms && L.terms[0]) ? L.terms[0] : null;
    const check = def ? `عرّف بجملتك: ${def.t}` : (L.objectives && L.objectives[0]) || "أعد الفكرة بجملتين من عندك.";

    if (mode === "summarize") {
      return `<p class="teach-hook">باختصار من الرزمة:</p>
        <p><b>${L.title}</b> — ${L.summary}</p>
        ${def ? `<p><b>${def.t}:</b> ${def.d}</p>` : ""}
        ${lessonLink(L)}`;
    }

    let html = `<p class="teach-hook">يلا نرتّبها زي الحصة: الفكرة باللهجة، والتعريف زي الكتاب.</p>
      <p class="muted">${s ? s.name : ""} · الوحدة ${L.unit}: ${L.unitTitle}</p>
      <h3>${L.title}</h3>
      <p><b>الفكرة:</b> ${L.summary}</p>`;

    if (def) {
      html += `<div class="teach-block"><b>التعريف (فصحى الكتاب):</b> ${def.t} — ${def.d}</div>`;
    }
    if (sentences[0]) html += `<p>${sentences.slice(0, 3).join(". ")}.</p>`;

    if (L.formulas && L.formulas[0] && mode !== "define") {
      const f = L.formulas[0];
      html += `<p><b>القانون:</b> ${f.name}</p><div class="formula">${f.expr}</div>`;
    }
    if (L.example && mode !== "define" && mode !== "summarize") {
      html += `<div class="callout"><b>مثال:</b> ${L.example.q}<br>${(L.example.steps || []).slice(0, 4).map((st, i) => i + 1 + ") " + st).join("<br>")}<br><b>الناتج:</b> ${L.example.ans}</div>`;
    }
    if (L.mistakes && L.mistakes[0] && mode !== "define") {
      html += `<div class="callout warn"><b>غلط وزاري:</b> ${L.mistakes[0]}</div>`;
    }
    html += `<div class="teach-check"><b>تأكد إنك فهمت:</b> ${check}</div>`;
    html += lessonLink(L);
    return html;
  }

  function helpHtml() {
    return `<p>أنا <b>رفيق</b>. بجاوب من الرزمة على جهازك — بدون مفتاح وبدون نت.</p>
      <p>احكِ عادي: اشرح، عرّف، حلّ، لخّص، افتح صفحة.</p>
      <p>مثال: «اشرح قوانين نيوتن» · «حلّي كتلة 2 كغ وقوة 10 ن»</p>`;
  }

  function greetHtml() {
    return `<p>وعليكم السلام — أهلين.</p>
      <p>اسأل من الرزمة: تعريف، قانون، مثال. الجواب على الجهاز، بدون نت.</p>`;
  }

  function attachSummary(text) {
    const cut = String(text || "").replace(/\s+/g, " ").trim().slice(0, 4000);
    if (cut.length < 20) return { html: "<p>ما قدرت أقرأ نص واضح. صوّر أوضح أو انسخ السؤال.</p>", lessons: [] };
    const ranked = scoreQuery(cut, null).filter((x) => x.s > 6).slice(0, 2);
    let html = `<p>قرأت المرفق. أقرب درس بالرزمة:</p><div class="callout">${cut.slice(0, 280)}${cut.length > 280 ? "…" : ""}</div>`;
    if (ranked.length) ranked.forEach((x) => { html += teachLesson(x.L, "summarize"); });
    else html += `<p>حدّد المادة أو انسخ السؤال، بحلّه من الرزمة.</p>`;
    return { html, lessons: ranked.map((x) => x.L) };
  }

  function maybeLinks(spoken, lessons, subject, force) {
    if (force || wantsLinks(spoken)) return researchHtml(spoken, lessons, subject);
    return "";
  }

  function buildAnswer(rawQ, opts) {
    opts = opts || {};
    const spoken = applyDialect(rawQ);
    const q = [spoken, opts.attachmentText || ""].filter(Boolean).join(" \n ");
    const intent = intentOf(spoken);
    const subs = detectSubjects(spoken);
    const subject = opts.subject || subs[0] || CTX.subject || null;

    if (intent === "greet") {
      return { html: greetHtml(), sources: [], intent };
    }
    if (intent === "thanks") {
      return { html: "<p>العفو. جاهز لأي درس كمان — اسأل.</p>", sources: CTX.lessons || [], intent };
    }
    if (intent === "help") {
      return { html: helpHtml(), sources: [], intent };
    }

    if (opts.attachmentText && (intent === "summarize" || intent === "solve" || intent === "ask" || /ملف|صوره|صورة|pdf/i.test(spoken))) {
      const att = attachSummary(opts.attachmentText);
      CTX.lessons = att.lessons;
      CTX.lastIntent = intent;
      return { html: att.html + maybeLinks(spoken, att.lessons, subject, false), sources: att.lessons, intent };
    }

    if (intent === "youtube" || intent === "search") {
      const ranked = scoreQuery(spoken, subject);
      const L = (ranked[0] && ranked[0].s > 3 && ranked[0].L) || (subject ? lessonsOf(subject)[0] : null);
      const lessons = L ? [L] : [];
      let html = L ? teachLesson(L, "summarize") : "<p>حدّد الدرس، وبفتح لك البحث.</p>";
      html += researchHtml(spoken, lessons, subject);
      CTX.lessons = lessons;
      return { html, sources: lessons, intent };
    }

    if (intent === "open_page") {
      const pages = pagesIn(spoken);
      const page = pages[0] || CTX.page || 1;
      const targets = subs.length ? subs : subject ? [subject] : [];
      if (!targets.length) {
        return { html: `<p>قلّي أي رزمة: كيمياء، فيزياء، رياضيات… مثلاً: افتح صفحة ${page} من الكيمياء.</p>`, sources: [], intent };
      }
      let html = `<p>صفحة <b>${page}</b> من الرزمة — هاد الدرس اللي بيقابلها:</p>`;
      const used = [];
      targets.forEach((sid) => {
        const rec = window.lessonAtPage ? window.lessonAtPage(sid, page, null) : null;
        const L = rec ? lessonById(rec.lesson) : lessonsOf(sid)[0];
        if (!L) return;
        used.push(L);
        html += teachLesson(L, "explain");
        html += `<p><button class="source" data-go="pack/${sid}/${page}">افتح الرزمة ص ${page}</button></p>`;
      });
      CTX.subject = targets[0];
      CTX.page = page;
      CTX.lessons = used;
      return { html, sources: used, intent };
    }

    let chosen = pickLessonsFromSpeech(spoken, subject);
    if (intent === "summarize" && !chosen.length && CTX.lessons && CTX.lessons.length && /لخص|ايا|إيا|هم|ها/.test(norm(spoken))) {
      chosen = CTX.lessons;
    }
    if (!chosen.length) {
      const ranked = scoreQuery(spoken, subject);
      const top = ranked.filter((x) => x.s > 3).slice(0, intent === "summarize" ? 2 : 1);
      chosen = top.map((x) => x.L);
      if (!chosen.length && ranked[0] && ranked[0].s > 0) chosen = [ranked[0].L];
    }
    if (!chosen.length && CTX.lessons && CTX.lessons.length && spoken.split(" ").length < 8) {
      chosen = CTX.lessons;
    }

    if (!chosen.length) {
      const sol = window.Solver ? window.Solver.solve(spoken, null) : "";
      const hasAuto = sol && sol.indexOf("حل بأسلوب وزاري") !== -1;
      if (hasAuto) {
        return { html: `<p>حليتها من قوانين الصف:</p>${sol}`, sources: [], intent };
      }
      return {
        html: `<p>وضّح المادة أو اكتب السؤال أوضح (قانون، تعريف، أرقام المسألة).</p>${helpHtml()}`,
        sources: [],
        intent
      };
    }

    const mode = intent === "summarize" ? "summarize" : intent === "define" ? "define" : "explain";
    let html = "";
    if (intent === "solve") {
      html += `<p>نحلّ بأسلوب وزاري: معطيات → قانون → تعويض → ناتج.</p>`;
      if (window.Solver) html += window.Solver.solve(spoken, chosen[0]);
    }
    chosen.forEach((L) => {
      html += teachLesson(L, intent === "solve" ? "explain" : mode);
    });
    html += maybeLinks(spoken, chosen, subject, false);
    CTX.subject = chosen[0].subject;
    CTX.lessons = chosen;
    CTX.lastIntent = intent;
    CTX.lastQ = spoken;
    return { html, sources: chosen, intent };
  }

  window.Rafiq = {
    ask(question, opts) {
      if (typeof opts === "string") opts = { subject: opts };
      const res = buildAnswer(question, opts || {});
      return { html: res.html, sources: res.sources || [], intent: res.intent, ctx: CTX };
    },
    dialectPreview(text) {
      return applyDialect(text);
    },
    reset() {
      CTX = { subject: null, lessons: [], page: null, lastIntent: null, lastQ: "" };
    },
    suggestFor(subject) {
      const map = window.SUGGESTIONS || {};
      return map[subject] || map.all;
    },
    research(topic, subject) {
      return researchHtml(topic, [], subject);
    }
  };
})();
