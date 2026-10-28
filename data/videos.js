(function () {
  const enc = (q) => encodeURIComponent(String(q || "").trim());
  const yt = (q) => "https://www.youtube.com/results?search_query=" + enc(q);
  const g = (q) => "https://www.google.com/search?q=" + enc(q);

  const PAL = "حادي عشر علمي فلسطين المنهج الفلسطيني";
  const ALL = "شرح الصف الحادي عشر علمي";

  window.VIDEOS = {
    palPhrase: PAL,
    allPhrase: ALL,
    yt,
    google: g,
    portals: [
      {
        id: "elearn",
        name: "البوابة التعليمية الفلسطينية — 11 علمي",
        url: "https://elearn.edu.ps/c11s/",
        note: "دروس مصوّرة مرتبة حسب فهرس الكتاب"
      },
      {
        id: "elearn-land",
        name: "مباحث الصف 11 علمي (الفصلان)",
        url: "https://elearn.edu.ps/landing3/c11s/",
        note: "رياضيات، فيزياء، كيمياء، حياتية، عربي، إنجليزي، إسلامية، تكنولوجيا"
      },
      {
        id: "rawafed",
        name: "روافد — مصادر الوزارة",
        url: "https://rawafed.edu.ps",
        note: "أوراق عمل وفيديو حسب المبحث"
      },
      {
        id: "moe",
        name: "رزم غزة الرسمية",
        url: "https://www.moe.edu.ps/gaza/subjects",
        note: "تحميل الرزم التعليمية"
      },
      {
        id: "tv",
        name: "فضائية فلسطين التعليمية",
        url: yt("فضائية فلسطين التعليمية حادي عشر علمي"),
        note: "دروس مصوّرة على يوتيوب"
      }
    ],
    universe: [
      { label: "كل شروح 11 علمي على يوتيوب", q: ALL },
      { label: "رياضيات 11 علمي — كل الفيديوهات", q: "رياضيات حادي عشر علمي شرح" },
      { label: "فيزياء 11 علمي — كل الفيديوهات", q: "فيزياء حادي عشر علمي شرح" },
      { label: "كيمياء 11 علمي — كل الفيديوهات", q: "كيمياء حادي عشر علمي شرح" },
      { label: "علوم حياتية 11 علمي — كل الفيديوهات", q: "علوم حياتية حادي عشر علمي شرح" },
      { label: "عربي 11 — كل الفيديوهات", q: "لغة عربية حادي عشر فلسطين شرح" },
      { label: "إنجليزي English for Palestine 11", q: "English for Palestine 11 شرح" },
      { label: "تربية إسلامية 11", q: "تربية إسلامية حادي عشر فلسطين شرح" },
      { label: "تكنولوجيا 11 علمي", q: "تكنولوجيا حادي عشر علمي فلسطين شرح" },
      { label: "وزاري 11 علمي — مراجعة", q: "وزاري حادي عشر علمي فلسطين مراجعة" }
    ],
    topicQuery(topic, subjectName) {
      const t = [topic, subjectName].filter(Boolean).join(" ").trim();
      return t || "حادي عشر علمي";
    },
    pack(topic, subjectName) {
      const t = this.topicQuery(topic, subjectName);
      return {
        topic: t,
        ytAll: yt(`${t} ${ALL}`),
        ytPal: yt(`${t} ${PAL} شرح`),
        gOpen: g(t),
        gPal: g(`${t} ${PAL}`),
        gPdf: g(`${t} ${PAL} filetype:pdf`),
        elearn: "https://elearn.edu.ps/c11s/"
      };
    },
    forLesson(L) {
      if (!L) return this.pack("");
      const s = (window.SUBJECTS || []).find((x) => x.id === L.subject);
      return this.pack(`${L.title} ${L.unitTitle || ""}`, s ? s.name : "");
    }
  };
})();
