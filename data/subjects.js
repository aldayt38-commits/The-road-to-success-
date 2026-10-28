window.SUBJECTS = [
  {
    id: "math",
    name: "الرياضيات",
    short: "رياضيات علمي",
    book: "الرياضيات للفرع العلمي والصناعي",
    color: "#e0b63a",
    icon: "∑",
    hours: 5,
    blurb: "المتجهات، المنطق، المعادلات، الإحصاء، القطوع المخروطية والنهايات.",
    semesters: 2
  },
  {
    id: "physics",
    name: "الفيزياء",
    short: "فيزياء",
    book: "الفيزياء للفرع العلمي والصناعي",
    color: "#2f6fed",
    icon: "⚛",
    hours: 4,
    blurb: "الميكانيكا، الضوء، الكهرباء السكونية والفيزياء الطبية.",
    semesters: 2
  },
  {
    id: "chemistry",
    name: "الكيمياء",
    short: "كيمياء",
    book: "الكيمياء للفرع العلمي والزراعي",
    color: "#7c3aed",
    icon: "⚗",
    hours: 3,
    blurb: "الروابط، الحسابات الكيميائية، المحاليل، الحرارية، الاتزان والعضوية.",
    semesters: 2
  },
  {
    id: "biology",
    name: "العلوم الحياتية",
    short: "أحياء",
    book: "العلوم الحياتية للفرع العلمي",
    color: "#22d3ee",
    icon: "🧬",
    hours: 3,
    blurb: "الخلية، أجهزة الجسم، علم الوراثة وتصنيف الكائنات الحية.",
    semesters: 2
  },
  {
    id: "arabic",
    name: "اللغة العربية",
    short: "عربي",
    book: "المطالعة والقواعد والعروض والتعبير",
    color: "#e0b63a",
    icon: "ا",
    hours: 4,
    blurb: "النصوص، النحو، العروض وفنون التعبير وفق كتاب الصف الحادي عشر.",
    semesters: 2
  },
  {
    id: "english",
    name: "اللغة الإنجليزية",
    short: "English",
    book: "English for Palestine 11",
    color: "#3b82f6",
    icon: "E",
    hours: 4,
    blurb: "Grammar, writing and reading from the official Pupil’s Book.",
    semesters: 2
  },
  {
    id: "islamic",
    name: "التربية الإسلامية",
    short: "إسلامية",
    book: "التربية الإسلامية — جميع الفروع",
    color: "#166534",
    icon: "☪",
    hours: 2,
    blurb: "القرآن، العقيدة، الحديث، الفقه، السير والفكر الإسلامي.",
    semesters: 2
  },
  {
    id: "tech",
    name: "تكنولوجيا المعلومات",
    short: "تكنولوجيا",
    book: "التكنولوجيا للفرع العلمي والصناعي",
    color: "#334155",
    icon: "💻",
    hours: 2,
    blurb: "قواعد البيانات، التطبيقات الذكية، الروبوت وشبكات الاتصال.",
    semesters: 2
  },
];

window.META = {
  platform: "طريق النجاح",
  grade: "الصف الحادي عشر",
  stream: "الفرع العلمي",
  region: "قطاع غزة",
  curriculum: "المنهج الفلسطيني — الرزم التعليمية المعتمدة لدى وزارة التربية والتعليم العالي / غزة",
  year: "2026 / 2027",
  note: "المحتوى التعليمي مبني على فهارس الكتب الرسمية ورزم الحادي عشر علمي الصادرة لطلبة قطاع غزة، مع شروح مبسّطة وتمارين. ليس نسخة حرفية من الكتاب المدرسي."
};

window.SCHEDULE = {
  days: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"],
  periods: [
    { t: "08:00", sun: "arabic", mon: "math", tue: "physics", wed: "chemistry", thu: "biology" },
    { t: "08:50", sun: "math", mon: "physics", tue: "arabic", wed: "english", thu: "math" },
    { t: "09:40", sun: "physics", mon: "chemistry", tue: "math", wed: "biology", thu: "english" },
    { t: "10:40", sun: "chemistry", mon: "english", tue: "biology", wed: "math", thu: "islamic" },
    { t: "11:30", sun: "english", mon: "biology", tue: "islamic", wed: "tech", thu: "physics" },
    { t: "12:20", sun: "islamic", mon: "tech", tue: "english", wed: "arabic", thu: "chemistry" },
    { t: "13:10", sun: "tech", mon: "arabic", tue: "chemistry", wed: "physics", thu: "arabic" }
  ]
};

window.SUGGESTIONS = {
  all: [
    "اشرحلي قوانين نيوتن",
    "عرّف الرابطة الأيونية",
    "حلّي: كتلة 2 كغ وقوة 10 ن أوجد التسارع",
    "لخصلي الدرس الأول فيزياء"
  ],
  math: ["ما هو الضرب النقطي؟", "كيف نحل معادلة أسية؟", "اشرح العلامة المعيارية", "ما نهاية الاقتران عند نقطة؟"],
  physics: ["قانون العزم", "طاقة الوضع الحركية", "حركة المقذوفات", "قانون كولوم"],
  chemistry: ["قانون هس", "المادة المحددة للتفاعل", "الخواص الجامعة للمحاليل", "نظرية التصادم"],
  biology: ["المركبات العضوية في الخلية", "تركيب العصبون", "السيادة غير التامة", "خصائص الحبليات"],
  arabic: ["أضرب الخبر", "بحر الرمل", "الاسم المقصور", "فتح عمورية"],
  english: ["Correlative conjunctions", "Hope vs wish", "Active and passive", "Relative clauses"],
  islamic: ["يسر الدين وسماحته", "أحكام البيوع", "حرمة المسلم", "من علماء فلسطين"],
  tech: ["ما هي قاعدة البيانات؟", "طبقات OSI", "لوحة الأردوينو", "المفتاح الأساسي"]
};
