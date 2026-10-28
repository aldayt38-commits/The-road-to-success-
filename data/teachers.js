window.TEACHERS = {
  portals: (window.VIDEOS && window.VIDEOS.portals) || [
    { name: "البوابة التعليمية الفلسطينية — الصف 11 علمي", url: "https://elearn.edu.ps/c11s/", note: "دروس مصوّرة مرتبة حسب فهرس الكتاب الرسمي" },
    { name: "روافد — مصادر وزارة التربية", url: "https://rawafed.edu.ps", note: "أوراق عمل وفيديو حسب المبحث والوحدة" },
    { name: "رزم غزة الرسمية (وزارة التربية / غزة)", url: "https://www.moe.edu.ps/gaza/subjects", note: "تحميل الرزم التعليمية للحادي عشر علمي" }
  ],
  youtubeQuery: {
    math: "رياضيات حادي عشر علمي فلسطين المتجهات",
    physics: "فيزياء حادي عشر علمي فلسطين قوانين نيوتن",
    chemistry: "كيمياء حادي عشر علمي فلسطين الروابط الكيميائية",
    biology: "علوم حياتية حادي عشر علمي فلسطين الخلية",
    arabic: "لغة عربية حادي عشر فلسطين أضرب الخبر",
    english: "English for Palestine 11 hope and wish",
    islamic: "تربية إسلامية حادي عشر فلسطين سورة يوسف",
    tech: "تكنولوجيا حادي عشر علمي فلسطين قواعد البيانات"
  },
  lessonQuery(L) {
    const s = (window.SUBJECTS || []).find((x) => x.id === L.subject);
    return `${L.title} ${s ? s.name : ""} حادي عشر علمي فلسطين شرح`;
  },
  yt(q) {
    return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  },
  google(q) {
    return "https://www.google.com/search?q=" + encodeURIComponent(q + " حادي عشر علمي فلسطين شرح");
  },
  googleOpen(q) {
    return "https://www.google.com/search?q=" + encodeURIComponent(q);
  }
};
