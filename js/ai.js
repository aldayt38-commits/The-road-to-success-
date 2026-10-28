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

  function intentOf(q) {
    const n = norm(q);
    if (/^(السلام|مرحبا|هلا|اهلين|اهلا|hi|hello|صباح|مساء|كيف حالك|كيفك|شو اخبارك)/.test(n) && n.split(" ").length < 8)
      return "greet";
    if (/شكر|يسلم|تسلم|يعطيك العافيه/.test(n) && n.split(" ").length < 6) return "thanks";
    if (/قاموس|كيف احكي|شو بتقدر|ماذا تستطيع|اوامر|help|مساعده/.test(n)) return "help";
    if (/جوجل|google|ابحث|بحث مفتوح|سيرش|search/.test(n) && /جوجل|google|ابحث|بحث|سيرش|search/.test(n))
      return "search";
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
        const blob = norm(
          L.title + " " + L.unitTitle + " " + L.summary + " " + (L.keywords || []).join(" ") + " " + strip(L.html)
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
    return `<div class="research">
      <b>مصادر البحث — الرزمة أولاً، وبعدين كل الشروح</b>
      <p class="muted">رفيق بجاوبك من رزمة 11 علمي غزة. تحت: يوتيوب لكل فيديوهات الشرح، وجوجل مقيّد بالمنهاج، وجوجل مفتوح لأي سؤال.</p>
      <div class="research-grid">
        <a class="r-card" href="${p.ytAll}" target="_blank" rel="noopener">يوتيوب · كل شروح 11 علمي<small>كل الفيديوهات اللي بتشرح الفكرة، مش قناة واحدة</small></a>
        <a class="r-card" href="${p.ytPal}" target="_blank" rel="noopener">يوتيوب · المنهاج الفلسطيني<small>بحث مقيّد: حادي عشر علمي فلسطين</small></a>
        <a class="r-card" href="${p.gOpen}" target="_blank" rel="noopener">جوجل مفتوح<small>بحث حرّ عن سؤالك كما هو</small></a>
        <a class="r-card" href="${p.gPal}" target="_blank" rel="noopener">جوجل مقيّد بالمنهاج<small>نفس السؤال + المنهج الفلسطيني</small></a>
        <a class="r-card" href="${p.elearn}" target="_blank" rel="noopener">البوابة التعليمية<small>دروس مصوّرة رسمية حسب فهرس الكتاب</small></a>
        <a class="r-card" href="${p.gPdf}" target="_blank" rel="noopener">ملفات PDF<small>أوراق وملخصات على جوجل</small></a>
      </div>
    </div>`;
  }

  function ytBlock(lessons, subject, topic) {
    return researchHtml(topic, lessons, subject);
  }

  function refsHtml(lessons, extras) {
    const items = [];
    (lessons || []).forEach((L) => {
      const s = subjOf(L.subject);
      const pg = window.pagesOfLesson ? window.pagesOfLesson(L.id) : null;
      const pageBit = pg ? ` · صفحات ${pg.from}–${pg.to} (ترقيم الرزمة داخل المنصة)` : "";
      items.push(
        `كتاب «${s ? s.book : L.subject}» — الصف 11 علمي — رزمة غزة — الفصل ${L.sem === 1 ? "الأول" : "الثاني"} — الوحدة ${L.unit}: ${L.unitTitle} — الدرس: ${L.title}${pageBit}`
      );
    });
    (extras || []).forEach((e) => items.push(e));
    items.push("مصدر الإجابة الأساسي: رزم طريق النجاح المبنية على فهارس المنهج الفلسطيني لقطاع غزة.");
    items.push("مساند: يوتيوب (كل شروح 11 علمي + بحث مقيّد بالمنهاج الفلسطيني) · جوجل المفتوح · جوجل المقيّد · البوابة التعليمية الفلسطينية.");
    if (!items.length) items.push("لم يُعتمد درس محدد؛ الإجابة عامة من قاموس التعامل أو مساعدة الاستخدام.");
    return `<div class="refs"><b>المراجع — من وين جاوبتك</b><ol>${items
      .map((x) => `<li>${x}</li>`)
      .join("")}</ol></div>`;
  }

  function explainLesson(L, mode) {
    const s = subjOf(L.subject);
    const plain = strip(L.html);
    const sentences = plain.split(/[.。؟!]/).map((x) => x.trim()).filter((x) => x.length > 20);
    const take = mode === "summarize" ? 3 : 6;
    let html = `<h3>${L.title}</h3>
      <p class="muted">${s ? s.name : ""} · الفصل ${L.sem} · الوحدة ${L.unit}: ${L.unitTitle}</p>`;
    if (mode === "summarize") {
      html += `<p>يا زلمة باختصار من الرزمة: <b>${L.summary}</b></p>`;
    } else {
      html += `<p>يلا نرتبها: المقدمة باللهجة، والتعريف والقانون زي الكتاب عشان الوزاري.</p>
        <p><b>الفكرة:</b> ${L.summary}</p>`;
    }
    html += `<p>${sentences.slice(0, take).join(". ")}.</p>`;
    if (L.formulas && L.formulas.length && mode !== "summarize") {
      html += `<p><b>احفظ القانون بالفصحى كما في الكتاب:</b></p>`;
      L.formulas.forEach((f) => {
        html += `<div class="formula">${f.expr}</div><p class="muted">${f.name}${f.note ? " — " + f.note : ""}</p>`;
      });
    }
    if (mode !== "summarize" && L.terms && L.terms.length) {
      html += `<p><b>مصطلحات الرزمة (تعريف وزاري):</b></p><ul>${L.terms.map((t) => `<li><b>${t.t}:</b> ${t.d}</li>`).join("")}</ul>`;
    }
    if (L.example && mode !== "summarize") {
      html += `<div class="callout"><b>مثال محلول بأسلوب الكتاب:</b> ${L.example.q}<br>${L.example.steps
        .map((st, i) => i + 1 + ") " + st)
        .join("<br>")}<br><b>الناتج:</b> ${L.example.ans}</div>`;
    }
    if (L.mistakes && L.mistakes[0]) {
      html += `<div class="callout warn"><b>غلط شائع بالامتحان — دير بالك:</b> ${L.mistakes[0]}</div>`;
    }
    if (mode !== "summarize") {
      html += `<p><b>أهداف الدرس:</b> ${L.objectives.join("، ")}.</p>`;
    }
    return html;
  }

  function helpHtml() {
    const ex = (window.DIALECT && window.DIALECT.examples) || [];
    return `<p>أهلين، أنا <b>رفيق الرزمة</b> تبع <b>طريق النجاح</b>. احكِ معي زي ما بتحكي مع حدّ من غزة — بفهم هلقيت وبدّي ولخّصلي ووزمة.</p>
      <p><b>شو بقدر أعمل:</b></p>
      <ul>
        <li>افتح صفحة من أي رزمة وأشرحها</li>
        <li>لخّص درس أو درسين أو وحدة كاملة</li>
        <li>أشرح وأحل من الرزمة — وأي سؤال تسأله بجاوبك من أقرب درس</li>
        <li>ألخّص PDF أو صورة ترفعها، وأحاول أحل أسئلة الصورة</li>
        <li>أفتح لك <b>كل فيديوهات الشرح على يوتيوب</b> لحادي عشر علمي</li>
        <li>بحث جوجل <b>مقيّد بالمنهاج</b> وبحث جوجل <b>مفتوح</b></li>
        <li>تحت كل جواب بكتب المراجع ومن وين جاوبت</li>
        <li>أحل مسائل بأرقام: قانون، تعويض، ناتج (رياضيات / فيزياء / كيمياء)</li>
        <li>تقدر تحكي بالميكروفون وأقرأ لك الجواب بالصوت</li>
      </ul>
      <p><b>أمثلة:</b></p>
      <ul>${ex.map((e) => `<li>${e}</li>`).join("")}
        <li>ابحثلي على جوجل المفتوح عن قانون هس</li>
        <li>كل فيديوهات يوتيوب لشرح المتجهات</li>
      </ul>`;
  }

  function greetHtml() {
    return `<p>وعليكم السلام — أهلين فيك في <b>طريق النجاح</b>.</p>
      <p>أنا رفيق، هون الدردشة كاملة. احكِ عادي: «افتح صفحة 10 من الكيمياء»، «لخصلي الدرس الأول»، «كل فيديوهات نيوتن»، «ابحثلي على جوجل».</p>
      <p>بجاوب من الرزمة أولاً، وبفتح لك يوتيوب لكل شروح 11 علمي + جوجل المقيّد والمفتوح. تحت كل جواب بتلاقي المراجع.</p>`;
  }

  function attachSummary(text) {
    const cut = String(text || "").replace(/\s+/g, " ").trim().slice(0, 4000);
    if (cut.length < 20) return { html: "<p>الملف فاضي أو ما قدرت أقرأ منه نص واضح. صوّر أوضح أو انسخ السؤال.</p>", lessons: [] };
    const ranked = scoreQuery(cut, null).filter((x) => x.s > 6).slice(0, 3);
    let html = `<p>قرأت النص المرفوع. هذا ملخص سريع + ربطه برزمة 11 علمي غزة:</p>
      <div class="callout">${cut.slice(0, 420)}${cut.length > 420 ? "…" : ""}</div>`;
    if (ranked.length) {
      html += `<p>أقرب دروس الرزمة لهاي المادة:</p>`;
      ranked.forEach((x) => {
        html += explainLesson(x.L, "summarize");
      });
    } else {
      html += `<p>ما لقيت تطابق قوي مع رزمة الحادي عشر علمي. انسخ السؤال أو حدد المادة — وبرضه فتحت لك البحث.</p>`;
    }
    return { html, lessons: ranked.map((x) => x.L) };
  }

  function buildAnswer(rawQ, opts) {
    opts = opts || {};
    const spoken = applyDialect(rawQ);
    const q = [spoken, opts.attachmentText || ""].filter(Boolean).join(" \n ");
    const intent = intentOf(spoken);
    const subs = detectSubjects(spoken);
    const subject = opts.subject || subs[0] || CTX.subject || null;

    if (intent === "greet") {
      return {
        html: greetHtml() + researchHtml(spoken, [], subject) + refsHtml([], ["قاموس التعامل الغزّاوي داخل المنصة"]),
        sources: [],
        intent
      };
    }
    if (intent === "thanks") {
      return { html: "<p>العفو يا بطل، يسلمو. جاهز لأي درس كمان.</p>" + refsHtml(CTX.lessons || []), sources: CTX.lessons || [], intent };
    }
    if (intent === "help") {
      return { html: helpHtml() + researchHtml("", [], subject) + refsHtml([], ["قاموس التعامل — لهجة غزة/فلسطين"]), sources: [], intent };
    }

    if (opts.attachmentText && (intent === "summarize" || intent === "solve" || intent === "ask" || /ملف|صوره|صورة|pdf/i.test(spoken))) {
      const att = attachSummary(opts.attachmentText);
      const extra =
        intent === "solve"
          ? "<p>إذا السؤال محلول بأسلوب الكتاب، طابقته مع أقرب درس. تأكد من المعطيات بعد القراءة الضوئية.</p>"
          : "";
      CTX.lessons = att.lessons;
      CTX.lastIntent = intent;
      return {
        html: att.html + extra + ytBlock(att.lessons, subject, spoken) + refsHtml(att.lessons, [opts.attachmentName || "ملف مرفوع من الطالب"]),
        sources: att.lessons,
        intent
      };
    }

    if (intent === "youtube" || intent === "search") {
      const ranked = scoreQuery(spoken, subject);
      const L = (ranked[0] && ranked[0].s > 3 && ranked[0].L) || (subject ? lessonsOf(subject)[0] : null);
      const lessons = L ? [L] : [];
      let html = "";
      if (intent === "youtube") {
        html = `<p>تمام — فتحت لك <b>كل فيديوهات الشرح</b> لحادي عشر علمي على يوتيوب لهاي الفكرة، وكمان بحث مقيّد بالمنهاج الفلسطيني.</p>
          <p>أنا بجاوبك من الرزمة؛ الفيديو عشان تسمع صوت أستاذ. إذا وصفتلي اللي قاله الأستاذ، برّبطه بالكتاب.</p>`;
        if (L) html += explainLesson(L, "summarize");
      } else {
        html = `<p>بحث مزدوج: <b>جوجل المفتوح</b> لسؤالك كما هو، و<b>جوجل المقيّد</b> بالمنهاج الفلسطيني، ويوتيوب لكل الشروح.</p>`;
        if (L) html += `<p>وأقرب درس بالرزمة: <b>${L.title}</b> — ${L.summary}</p>`;
      }
      CTX.lessons = lessons;
      return {
        html: html + ytBlock(lessons, subject, spoken) + refsHtml(lessons, ["بحث يوتيوب/جوجل: مفتوح + مقيّد بـ حادي عشر علمي فلسطين"]),
        sources: lessons,
        intent
      };
    }

    if (intent === "open_page") {
      const pages = pagesIn(spoken);
      const page = pages[0] || CTX.page || 1;
      const targets = subs.length ? subs : subject ? [subject] : [];
      if (!targets.length) {
        return {
          html: `<p>قلّي أي رزمة: كيمياء، فيزياء، رياضيات… مثلاً: افتح صفحة ${page} من رزمة الكيمياء.</p>` + researchHtml(spoken, [], null) + refsHtml([]),
          sources: [],
          intent
        };
      }
      let html = `<p>فتحت لك صفحة <b>${page}</b> من الرزمة (ترقيم طريق النجاح حسب ترتيب دروس الكتاب). هاد الشرح من الدرس اللي بيقابل هالصفحة:</p>`;
      const used = [];
      targets.forEach((sid) => {
        const rec = window.lessonAtPage ? window.lessonAtPage(sid, page, null) : null;
        const L = rec ? lessonById(rec.lesson) : lessonsOf(sid)[0];
        if (!L) return;
        used.push(L);
        const s = subjOf(sid);
        html += `<div class="callout">رزمة ${s.name} · صفحة ${page} ≈ الدرس «${L.title}» (صفحات ${rec ? rec.from + "–" + rec.to : "—"}) · الوحدة ${L.unit}</div>`;
        html += explainLesson(L, "explain");
        html += `<p><button class="source" data-go="pack/${sid}/${page}">افتح الرزمة على صفحة ${page}</button></p>`;
      });
      CTX.subject = targets[0];
      CTX.page = page;
      CTX.lessons = used;
      CTX.lastIntent = "open_page";
      html += ytBlock(used, targets[0], spoken);
      return { html: html + refsHtml(used), sources: used, intent };
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
        return {
          html: `<p>حليتها من القوانين، حتى لو ما انربطت بدرس معيّن. راجع الرزمة بعدين.</p>${sol}` +
            ytBlock([], subject, spoken) + refsHtml([], ["حل رقمي من قوانين الصف 11 علمي"]),
          sources: [],
          intent
        };
      }
      const html = `<p>ما مسكت درس واحد واضح من الرزمة، بس ما رح أتركك بلا جواب.</p>
        <p>اشرح سؤالك بجملة أو حدّد المادة، أو اكتب أرقام المسألة (كتلة، قوة، زاوية…). وهون بحث مفتوح + يوتيوب لكل شروح 11 علمي:</p>
        ${helpHtml()}`;
      return { html: html + ytBlock([], subject, spoken) + refsHtml([]), sources: [], intent };
    }

    const mode = intent === "summarize" ? "summarize" : "explain";
    let html = "";
    if (intent === "summarize") html += `<p>ملخص المطلوب من الرزمة، من غير حشو:</p>`;
    else if (intent === "solve") {
      html += `<p>يلا نحلّها بأسلوب الوزاري: المعطيات → القانون بالفصحى → التعويض → الناتج. بعدين مثال الرزمة والمراجع.</p>`;
      if (window.Solver) html += window.Solver.solve(spoken, chosen[0]);
    } else html += `<p>شرح من الرزمة، وبعده كل فيديوهات يوتيوب وجوجل المفتوح والمقيّد:</p>`;

    chosen.forEach((L) => {
      html += explainLesson(L, intent === "solve" ? "explain" : mode);
    });
    html += ytBlock(chosen, subject, spoken);
    CTX.subject = chosen[0].subject;
    CTX.lessons = chosen;
    CTX.lastIntent = intent;
    CTX.lastQ = spoken;
    return { html: html + refsHtml(chosen), sources: chosen, intent };
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
