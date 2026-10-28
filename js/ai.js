(function () {
  const TASHKEEL = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
  const STOP = new Set(
    "في من على إلى الى عن مع هذا هذه ذلك تلك التي الذي ما لا لم لن إن أن أو ثم قد كل كما ليس هي هو هم هن انا نحن انت تم يكون تكون كان كانت بين خلال بعد قبل غير ايضا جدا كيف هل عرف تعريف اشرح وضح فسر يعني المقصود احسب اوجد لخص حل حلي لي بدي اريد شرح سوال مساله لماذا قولي احكي عن قانون قوانين صيغه صيغة".split(
      " "
    )
  );

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

  function bare(s) {
    return norm(s)
      .replace(/^ال/, "")
      .replace(/\sال/g, " ")
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
    return norm(s)
      .split(" ")
      .map((w) => {
        w = w.replace(/^وال/, "").replace(/^ال/, "");
        if (w.length > 4 && w.charAt(0) === "و") w = w.slice(1);
        return w;
      })
      .filter((w) => w.length > 2 && !STOP.has(w));
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
    ["math", ["رياضيات", "الرياضيات"]],
    ["biology", ["احياء", "علوم حياتيه", "حياتيه", "بيولوجي"]],
    ["arabic", ["عربي", "العربي", "لغه عربيه", "نحو", "مطالعه"]],
    ["english", ["انجليزي", "الانجليزي", "english", "انجلش"]],
    ["islamic", ["اسلاميه", "تربيه اسلاميه", "دين", "فقه"]],
    ["tech", ["تكنولوجيا", "تكنو", "حاسوب", "شبكات", "قواعد بيانات"]]
  ];

  function detectSubjects(q) {
    const nq = norm(q);
    const found = [];
    SUBJ_ALIASES.forEach(([id, als]) => {
      if (als.some((a) => nq.includes(norm(a)))) found.push(id);
    });
    return found;
  }

  const SYN = [
    ["اكسد", "تاكسد"],
    ["تاكسد", "اكسد"],
    ["انزيم", "انزيمات"],
    ["polar", "قطبي"],
    ["covalent", "تساهمي"],
    ["ionic", "ايوني"],
    ["newton", "نيوتن"],
    ["vector", "متجه"],
    ["enzyme", "انزيم"],
    ["oxidation", "تاكسد"],
    ["reduction", "اختزال"],
    ["cell", "خليه"],
    ["work", "شغل"],
    ["torque", "عزم"],
    ["capacitor", "مواسع"],
    ["kinetic", "حركيه"],
    ["potential", "وضع"],
    ["mole", "مولاليه"],
    ["yield", "مردود"],
    ["ohmic", "اوم"]
  ];

  function expand(s) {
    const nq = norm(s);
    const extra = [];
    SYN.forEach(([a, b]) => {
      if (nq.indexOf(a) !== -1) extra.push(b);
    });
    return extra.length ? nq + " " + extra.join(" ") : nq;
  }

  function topicOf(raw) {
    let s = norm(raw);
    const prefixes = [
      "اشرح لي",
      "اشرحلي",
      "اشرح",
      "فسر لي",
      "فسر",
      "وضح",
      "عرف لي",
      "عرف",
      "تعريف",
      "ما هو تعريف",
      "ما تعريف",
      "ما هي",
      "ما هو",
      "ماذا",
      "ما معنى",
      "ماذا يعني",
      "يعني",
      "المقصود ب",
      "المقصود",
      "لخص لي",
      "لخص",
      "حل لي",
      "حلي",
      "حل",
      "احسب",
      "اوجد",
      "قارن بين",
      "قارن",
      "ما الفرق بين",
      "الفرق بين",
      "فرق بين",
      "بدي شرح",
      "بدي",
      "اريد",
      "احكيلي",
      "احكي",
      "قولي عن",
      "قولي",
      "كيف"
    ];
    prefixes.sort((a, b) => b.length - a.length);
    prefixes.forEach((p) => {
      const np = norm(p);
      if (s.startsWith(np + " ")) s = s.slice(np.length).trim();
    });
    s = s.replace(/\b(من فضلك|لو سمحت|باختصار|باللهجه|زي الكتاب|من الرزمه|من الكتاب)\b/g, " ");
    return s.replace(/\s+/g, " ").trim();
  }

  const ORD = {
    الاول: 1,
    الأولي: 1,
    اول: 1,
    "1": 1,
    الثاني: 2,
    ثاني: 2,
    "2": 2,
    الثالث: 3,
    ثالث: 3,
    "3": 3,
    الرابع: 4,
    رابع: 4,
    "4": 4,
    الخامس: 5,
    خامس: 5,
    "5": 5,
    السادس: 6,
    سادس: 6,
    "6": 6,
    السابع: 7,
    سابع: 7,
    "7": 7,
    الثامن: 8,
    ثامن: 8,
    "8": 8,
    التاسع: 9,
    تاسع: 9,
    "9": 9,
    العاشر: 10,
    عاشر: 10,
    "10": 10
  };

  function ordinalsIn(q) {
    const nq = norm(q);
    const out = [];
    Object.keys(ORD).forEach((k) => {
      if (nq.includes(k)) out.push(ORD[k]);
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
    const nq = norm(q);
    return /يوتيوب|قناه|فيديو|جوجل|google|ابحث|بحث|مصدر|مصادر|youtube|search/.test(nq);
  }

  function intentOf(q) {
    const nq = norm(q);
    const short = nq.split(" ").length < 8;
    if (/^(السلام|مرحبا|هلا|اهلين|اهلا|hi|hello|صباح|مساء|كيف حالك|كيفك|شو اخبارك)/.test(nq) && short) return "greet";
    if (/شكر|يسلم|تسلم|يعطيك العافيه/.test(nq) && nq.split(" ").length < 6) return "thanks";
    if (/قاموس|كيف احكي|شو بتقدر|ماذا تستطيع|اوامر|help|مساعده/.test(nq)) return "help";
    if (/جوجل|google|ابحث|بحث مفتوح|سيرش|search/.test(nq)) return "search";
    if (/يوتيوب|قناه|فيديو|فيديوهات|شرح مصور|youtube/.test(nq)) return "youtube";
    if (/افتح/.test(nq) && (/صفح|رزمه|رزمة|وزمه|كتاب/.test(nq) || /\d/.test(nq))) return "open_page";
    if (/\d/.test(nq) && /حل |حلّ|اوجد|احسب|ما قيمه|ما قيمة|ناتج|كم /.test(nq)) return "solve";
    if (/لخص|ملخص|اختصر/.test(nq)) return "summarize";
    if (/قارن|فرق/.test(nq)) return "compare";
    if (/اشرح|وضح|فسر/.test(nq)) return "explain";
    if (/عرف|ما هو|ما هي|تعريف|يعني|معنى|المقصود/.test(nq)) return "define";
    if (/قانون|قوانين|صيغه|صيغة/.test(nq) && short) return "define";
    if (/حل |حلّ/.test(nq)) return "solve";
    return "ask";
  }

  function strip(html) {
    return String(html || "")
      .replace(/<div class="formula">([\s\S]*?)<\/div>/g, " ⟨ $1 ⟩ ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function synEq(a, b) {
    if (a === b) return true;
    for (let i = 0; i < SYN.length; i++) {
      const x = SYN[i][0],
        y = SYN[i][1];
      if ((a.indexOf(x) !== -1 && b.indexOf(y) !== -1) || (a.indexOf(y) !== -1 && b.indexOf(x) !== -1)) return true;
    }
    return false;
  }

  function tokHit(w, tt) {
    if (tt.has(w)) return true;
    let ok = false;
    tt.forEach((x) => {
      if (ok) return;
      if (synEq(w, x)) ok = true;
      else if (w.length >= 4 && x.length >= 4 && (x.startsWith(w) || w.startsWith(x))) ok = true;
    });
    return ok;
  }

  function overlap(q, text) {
    const qt = tokens(q);
    if (!qt.length) return 0;
    const tt = new Set(tokens(text));
    let hit = 0,
      tot = 0;
    qt.forEach((w) => {
      const wt = w.length >= 6 ? 4 : w.length >= 4 ? 2 : 1;
      tot += wt;
      if (tokHit(w, tt)) hit += wt * 5;
    });
    return tot ? hit / tot : 0;
  }

  function phraseScore(query, cand, allowExtra) {
    const ba = bare(query),
      bb = bare(cand);
    if (ba && bb && ba === bb) return 120;
    const ta = tokens(query),
      tb = tokens(cand);
    if (!ta.length || !tb.length) return 0;
    const setB = new Set(tb);
    let hit = 0;
    ta.forEach((w) => {
      if (tokHit(w, setB)) hit++;
    });
    if (!hit) return 0;
    if (hit === ta.length) {
      if (allowExtra) return 85;
      const setA = new Set(ta);
      const extra = tb.filter((w) => w.length >= 3 && !tokHit(w, setA));
      return extra.length ? 30 : 110;
    }
    if (hit / ta.length >= 0.5) return allowExtra ? 55 : 18;
    return (hit / ta.length) * 20;
  }

  function inlineDefs(L) {
    const html = L.html || "";
    const out = [];
    const re = /<b>([^<]{2,55})<\/b>\s*[:：]?\s*([^<]{6,280})/g;
    let m;
    while ((m = re.exec(html))) {
      const t = m[1].replace(/[:：]/g, "").trim();
      const d = m[2].replace(/&nbsp;/g, " ").trim();
      if (t.length >= 2 && d.length >= 6 && !/مثال|لاحظ|تنبيه/.test(t)) out.push({ t: t, d: d });
    }
    html.replace(/<div class="callout[^"]*">([\s\S]*?)<\/div>/g, (_, inner) => {
      const p = strip(inner);
      if (p.length < 12) return;
      const first = p.split(/\s+/)[0].replace(/[:،.]+$/, "");
      if (first && first.length >= 3) out.push({ t: first, d: p });
    });
    return out;
  }

  function sentencesAbout(L, topic) {
    const plain = strip(L.html);
    const keys = tokens(topic);
    if (!keys.length) return [];
    return plain
      .split(/[.。؟!]/)
      .map((x) => x.trim())
      .filter((x) => x.length > 18)
      .filter((x) => {
        const nx = norm(x);
        return keys.some((k) => k.length >= 3 && nx.includes(k));
      })
      .slice(0, 3);
  }

  function allLessons(subject) {
    return (window.LESSONS || []).filter((L) => L.subject !== "christian").filter((L) => !subject || L.subject === subject);
  }

  function rankHits(q, subject) {
    const topic = topicOf(q);
    const nq = expand(q);
    const nt = expand(topic || q);
    const bt = bare(nt);
    const hits = [];
    allLessons(subject).forEach((L) => {
      const GENERIC = /^(خليه|قوه|طاقه|ماده|جسم|حركه|قانون|وحده|درس|صيغه|نص)$/;
      let ls = phraseScore(nt, L.title, true);
      if (/قطبي|polar/.test(nt) && /قطبي/.test(norm(L.title))) ls += 30;
      ls += overlap(nt, L.unitTitle || "") * 2;
      ls += overlap(nt, L.summary || "") * 2;
      ls += overlap(nt, (L.keywords || []).join(" ")) * 4;
      if (!(GENERIC.test(bt) && tokens(nt).length <= 2)) {
        (L.keywords || []).forEach((k) => {
          if (phraseScore(nt, k, false) >= 110) {
            ls += 40;
            const sents = sentencesAbout(L, k);
            const defish = sents.find((s) => /فقدان|اكتساب|هو |هي |مقدار|قوة|كمية|بروتين|تجاذب|يُعر/.test(s));
            const sent = defish || (norm(L.summary || "").includes(bare(k)) ? L.summary : sents[0]);
            if (sent) hits.push({ kind: "term", L: L, term: { t: k, d: sent }, s: 90 });
          }
        });
      }
      if (GENERIC.test(bt) && tokens(nt).length <= 2) ls = Math.min(ls, 15);
      hits.push({ kind: "lesson", L: L, s: ls });

      const terms = (L.terms || []).concat(inlineDefs(L));
      terms.forEach((term) => {
        const ts = phraseScore(nt, term.t, false);
        if (ts >= 18) hits.push({ kind: "term", L: L, term: term, s: ts });
      });

      (L.formulas || []).forEach((f) => {
        const fs = phraseScore(nt, f.name, false);
        if (fs >= 18) hits.push({ kind: "formula", L: L, formula: f, s: fs });
      });
    });
    return hits.sort((a, b) => b.s - a.s);
  }

  function scoreQuery(q, subject) {
    return rankHits(q, subject)
      .filter((h) => h.kind === "lesson")
      .map((h) => ({ L: h.L, s: h.s }));
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
    const qq = (topic || "") + " " + sname;
    return {
      topic: qq,
      ytAll: T.yt ? T.yt(qq + " شرح الصف الحادي عشر علمي") : "#",
      ytPal: T.yt ? T.yt(qq + " حادي عشر علمي فلسطين المنهج الفلسطيني شرح") : "#",
      gOpen: T.googleOpen ? T.googleOpen(qq) : "https://www.google.com/search?q=" + encodeURIComponent(qq),
      gPal: T.google ? T.google(qq) : "#",
      gPdf: "https://www.google.com/search?q=" + encodeURIComponent(qq + " حادي عشر علمي filetype:pdf"),
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

  function teachTerm(L, term) {
    const s = subjOf(L.subject);
    const about = sentencesAbout(L, term.t);
    let html = `<p class="teach-hook">من الرزمة — التعريف زي الكتاب، مش تخمين.</p>
      <p class="muted">${s ? s.name : ""} · ${L.title}</p>
      <div class="teach-block"><b>${term.t}:</b> ${term.d}</div>`;
    if (about[0]) html += `<p>${about.join(". ")}.</p>`;
    html += `<div class="teach-check"><b>تأكد إنك فهمت:</b> عرّف بجملتك: ${term.t}</div>`;
    html += lessonLink(L);
    return html;
  }

  function teachFormula(L, f) {
    const s = subjOf(L.subject);
    let html = `<p class="teach-hook">القانون من الرزمة، فصحى الكتاب:</p>
      <p class="muted">${s ? s.name : ""} · ${L.title}</p>
      <p><b>${f.name}</b></p>
      <div class="formula">${f.expr}</div>`;
    if (f.note) html += `<p>${f.note}</p>`;
    if (L.example) {
      html += `<div class="callout"><b>مثال الكتاب:</b> ${L.example.q}<br>${(L.example.steps || []).slice(0, 4).map((st, i) => i + 1 + ") " + st).join("<br>")}<br><b>الناتج:</b> ${L.example.ans}</div>`;
    }
    html += lessonLink(L);
    return html;
  }

  function teachLesson(L, mode, focus) {
    if (focus && focus.term) return teachTerm(L, focus.term);
    if (focus && focus.formula) return teachFormula(L, focus.formula);
    const s = subjOf(L.subject);
    const topic = focus && focus.topic ? focus.topic : L.title;
    const about = sentencesAbout(L, topic);
    const def =
      (L.terms || []).find((t) => phraseScore(topic, t.t, false) >= 80) ||
      inlineDefs(L).find((t) => phraseScore(topic, t.t, false) >= 80) ||
      null;
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

    if (def && mode === "define") {
      html += `<div class="teach-block"><b>التعريف (فصحى الكتاب):</b> ${def.t} — ${def.d}</div>`;
    } else if (def) {
      html += `<div class="teach-block"><b>التعريف (فصحى الكتاب):</b> ${def.t} — ${def.d}</div>`;
    }
    if (about.length) html += `<p>${about.join(". ")}.</p>`;
    else {
      const plain = strip(L.html);
      const sentences = plain
        .split(/[.。؟!]/)
        .map((x) => x.trim())
        .filter((x) => x.length > 18);
      if (sentences[0]) html += `<p>${sentences.slice(0, 2).join(". ")}.</p>`;
    }

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

  function teachUnit(lessons) {
    const u = lessons[0];
    const s = subjOf(u.subject);
    let html = `<p class="teach-hook">وحدة «${u.unitTitle}» من ${s ? s.name : "الرزمة"} — ${lessons.length} دروس، من غير اختراع:</p><ol>`;
    lessons.forEach((L) => {
      html += `<li><b>${L.title}:</b> ${L.summary} ${lessonLink(L)}</li>`;
    });
    html += "</ol>";
    return html;
  }

  function missHtml(q, near) {
    let html = `<p>ما لقيت هاد المصطلح بهالرزمة بالاسم اللي كتبته — وما رح أخمن عشان ما أغلط.</p>
      <p>سمّي المادة أو اكتب المصطلح زي الكتاب (مثال: الرابطة الأيونية، القانون الثاني لنيوتن، الضرب النقطي).</p>`;
    const uniq = [];
    const seen = {};
    (near || []).forEach((h) => {
      if (!h.L || seen[h.L.id] || h.s < 8) return;
      seen[h.L.id] = 1;
      uniq.push(h.L);
    });
    if (uniq.length) {
      html += `<p>أقرب دروس لو كنت تقصد واحد منهم:</p>`;
      uniq.slice(0, 3).forEach((L) => {
        html += lessonLink(L);
      });
    }
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
    const cut = String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
    if (cut.length < 20) return { html: "<p>ما قدرت أقرأ نص واضح. صوّر أوضح أو انسخ السؤال.</p>", lessons: [] };
    const ranked = scoreQuery(cut, null).filter((x) => x.s > 18).slice(0, 2);
    let html = `<p>قرأت المرفق. أقرب درس بالرزمة:</p><div class="callout">${cut.slice(0, 280)}${cut.length > 280 ? "…" : ""}</div>`;
    if (ranked.length) ranked.forEach((x) => {
      html += teachLesson(x.L, "summarize");
    });
    else html += `<p>حدّد المادة أو انسخ السؤال، بحلّه من الرزمة.</p>`;
    return { html: html, lessons: ranked.map((x) => x.L) };
  }

  function maybeLinks(spoken, lessons, subject, force) {
    if (force || wantsLinks(spoken)) return researchHtml(spoken, lessons, subject);
    return "";
  }

  function splitCompare(q) {
    const t = topicOf(q);
    const parts = t.split(/\s+و(?:ال)?\s*|\s+ام\s+|versus|\bvs\b/);
    if (parts.length >= 2) return parts.slice(0, 2).map((x) => x.trim()).filter(Boolean);
    return null;
  }

  function pickBest(hits, intent) {
    if (!hits || !hits.length) return null;
    const need = intent === "define" ? 70 : 28;
    const cand = hits.filter((h) => {
      if (h.kind === "term" && h.s >= 80) return true;
      if (h.kind === "formula" && h.s >= 80) return true;
      if (h.kind === "lesson" && h.s >= need) return true;
      return false;
    });
    if (cand[0]) return cand[0];
    if (intent === "define") return null;
    return hits.find((h) => h.kind === "lesson" && h.s >= 22) || null;
  }

  function buildAnswer(rawQ, opts) {
    opts = opts || {};
    const spoken = applyDialect(rawQ);
    const intent = intentOf(spoken);
    const subs = detectSubjects(spoken);
    const subject = opts.subject || subs[0] || null;

    if (intent === "greet") {
      return { html: greetHtml(), sources: [], intent: intent };
    }
    if (intent === "thanks") {
      return { html: "<p>العفو. جاهز لأي درس كمان — اسأل.</p>", sources: CTX.lessons || [], intent: intent };
    }
    if (intent === "help") {
      return { html: helpHtml(), sources: [], intent: intent };
    }

    if (opts.attachmentText && (intent === "summarize" || intent === "solve" || intent === "ask" || /ملف|صوره|صورة|pdf/i.test(spoken))) {
      const att = attachSummary(opts.attachmentText);
      CTX.lessons = att.lessons;
      CTX.lastIntent = intent;
      return { html: att.html + maybeLinks(spoken, att.lessons, subject, false), sources: att.lessons, intent: intent };
    }

    if (intent === "youtube" || intent === "search") {
      const ranked = scoreQuery(spoken, subject);
      const L = ranked[0] && ranked[0].s > 18 ? ranked[0].L : null;
      const lessons = L ? [L] : [];
      let html = L ? teachLesson(L, "summarize") : "<p>حدّد الدرس، وبفتح لك البحث.</p>";
      html += researchHtml(spoken, lessons, subject);
      CTX.lessons = lessons;
      return { html: html, sources: lessons, intent: intent };
    }

    if (intent === "open_page") {
      const pages = pagesIn(spoken);
      const page = pages[0] || CTX.page || 1;
      const targets = subs.length ? subs : subject ? [subject] : [];
      if (!targets.length) {
        return { html: `<p>قلّي أي رزمة: كيمياء، فيزياء، رياضيات… مثلاً: افتح صفحة ${page} من الكيمياء.</p>`, sources: [], intent: intent };
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
      return { html: html, sources: used, intent: intent };
    }

    const follow = CTX.lessons && CTX.lessons.length && spoken.split(/\s+/).length < 6 && /لخص|ايا|مثال|كمان|وضح|نفس الدرس/.test(norm(spoken));

    if (window.Solver && window.Solver.canAuto(spoken)) {
      const hits = rankHits(spoken, subject);
      const best = pickBest(hits, "solve");
      const L = best ? best.L : null;
      let html = `<p>نحلّ بأسلوب وزاري: معطيات → قانون → تعويض → ناتج.</p>`;
      html += window.Solver.solve(spoken, L);
      if (L) html += lessonLink(L);
      CTX.subject = L ? L.subject : CTX.subject;
      CTX.lessons = L ? [L] : CTX.lessons;
      CTX.lastIntent = intent;
      CTX.lastQ = spoken;
      return { html: html, sources: L ? [L] : [], intent: "solve" };
    }

    let chosen = pickLessonsFromSpeech(spoken, subject || (follow ? CTX.subject : null));
    if (intent === "summarize" && !chosen.length && follow) chosen = CTX.lessons;

    if (chosen.length > 2) {
      const html = teachUnit(chosen) + maybeLinks(spoken, chosen, subject, false);
      CTX.subject = chosen[0].subject;
      CTX.lessons = chosen;
      return { html: html, sources: chosen, intent: intent };
    }

    if (intent === "compare") {
      const parts = splitCompare(spoken);
      if (parts && parts.length === 2) {
        const a = pickBest(rankHits(parts[0], subject), "explain");
        const b = pickBest(rankHits(parts[1], subject), "explain");
        if (a && b) {
          let html = `<p class="teach-hook">المقارنة من الرزمة، مش من برّا.</p>`;
          html += a.term ? teachTerm(a.L, a.term) : teachLesson(a.L, "define", { topic: parts[0] });
          html += b.term ? teachTerm(b.L, b.term) : teachLesson(b.L, "define", { topic: parts[1] });
          const src = [a.L];
          if (b.L.id !== a.L.id) src.push(b.L);
          CTX.lessons = src;
          CTX.subject = a.L.subject;
          return { html: html, sources: src, intent: intent };
        }
      }
    }

    const hits = rankHits(spoken, subject);
    const best = pickBest(hits, intent);

    if (!best && follow) {
      const html = teachLesson(CTX.lessons[0], intent === "summarize" ? "summarize" : "explain");
      return { html: html, sources: CTX.lessons, intent: intent };
    }

    if (!best) {
      return { html: missHtml(spoken, hits.slice(0, 6)), sources: [], intent: intent };
    }

    const mode = intent === "summarize" ? "summarize" : intent === "define" ? "define" : "explain";
    let html = "";
    if (intent === "solve") {
      html += `<p>نحلّ بأسلوب وزاري: معطيات → قانون → تعويض → ناتج.</p>`;
      if (window.Solver) html += window.Solver.solve(spoken, best.L);
    }
    if (best.kind === "term") html += teachTerm(best.L, best.term);
    else if (best.kind === "formula") html += teachFormula(best.L, best.formula);
    else html += teachLesson(best.L, mode, { topic: topicOf(spoken) });

    if (chosen.length === 1 && chosen[0].id !== best.L.id) html += teachLesson(chosen[0], "summarize");

    html += maybeLinks(spoken, [best.L], subject, false);
    CTX.subject = best.L.subject;
    CTX.lessons = [best.L];
    CTX.lastIntent = intent;
    CTX.lastQ = spoken;
    return { html: html, sources: [best.L], intent: intent };
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
