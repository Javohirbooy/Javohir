import type { AppLocale } from "./constants";

/** Nested UI strings per locale. Dot-path keys used by `t()`, e.g. `nav.home`. */
export const messages: Record<
  AppLocale,
  {
    nav: {
      home: string;
      subjects: string;
      grades: string;
      tests: string;
      ranking: string;
      testCode: string;
      about: string;
      login: string;
      cabinet: string;
      localeLabel: string;
      profileDashboard: string;
      signOut: string;
    };
    home: {
      heroBadge: string;
      heroKicker: string;
      heroLeadPrefix: string;
      heroLeadAccent: string;
      heroLeadSuffix: string;
      heroBlurb: string;
      feature1Title: string;
      feature1Desc: string;
      feature2Title: string;
      feature2Desc: string;
      feature3Title: string;
      feature3Desc: string;
      platformEyebrow: string;
      platformTitle: string;
      platformSubtitle: string;
      cap1Title: string;
      cap1Body: string;
      cap2Title: string;
      cap2Body: string;
      cap3Title: string;
      cap3Body: string;
      cap4Title: string;
      cap4Body: string;
      statStudents: string;
      statTests: string;
      statAvg: string;
      statGrades: string;
      statHintStudentsOk: string;
      statHintTestsOk: string;
      statHintAvgSubmitted: string;
      statHintAvgWait: string;
      statHintGrades: string;
      statHintDbError: string;
      statHintCheckSettings: string;
      statHintAwaitResult: string;
      subjectsEyebrow: string;
      subjectsTitle: string;
      subjectsSubtitle: string;
      subjectsViewAll: string;
      testPlEyebrow: string;
      testPlTitle: string;
      testPlBody: string;
      testPlPoint1: string;
      testPlPoint2: string;
      testPlPoint3: string;
      testPlOpenTests: string;
      testPlByGrades: string;
      testPlDemoWindow: string;
      testPlProgress: string;
    };
    brand: { tagline: string };
    footer: {
      subjects: string;
      grades: string;
      tests: string;
      login: string;
      disclaimer: string;
    };
    tests: {
      metaLine: string;
      indexEyebrow: string;
      indexTitle: string;
      indexSubtitle: string;
      filterSubject: string;
      filterGrade: string;
      filterDifficulty: string;
      filterAll: string;
      filterAllLevels: string;
      gradeChip: string;
      emptyTitle: string;
      emptyHint: string;
      clearFilters: string;
      questionCount: string;
      startCta: string;
      previewBanner: string;
      loadingSession: string;
    };
    testRunner: {
      questionProgress: string;
      questionNavHint: string;
      prev: string;
      next: string;
      finish: string;
      resultLabel: string;
      scoreDetails: string;
      summaryTitle: string;
      yourAnswer: string;
      correctAnswer: string;
      dash: string;
      errAnswerAll: string;
      errNoSession: string;
      noticePreviewNoScore: string;
      noticePreviewNotSaved: string;
      noticeTabViolation: string;
      sessionEndedTitle: string;
      sessionEndedHint: string;
      protectedIntro: string;
      protectedPolicyPrefix: string;
    };
    difficulty: { EASY: string; MEDIUM: string; HARD: string };
    tabPolicy: { AUTO_SUBMIT: string; WARN: string; IGNORE: string };
  }
> = {
  uz: {
    nav: {
      home: "Bosh sahifa",
      subjects: "Fanlar",
      grades: "Sinflar",
      tests: "Testlar",
      ranking: "Reyting",
      testCode: "Test kodi",
      about: "Biz haqimizda",
      login: "Kirish",
      cabinet: "Kabinet",
      localeLabel: "Til",
      profileDashboard: "Kabinet",
      signOut: "Chiqish",
    },
    brand: {
      tagline: "Zamonaviy maktab boshqaruvi va test platformasi.",
    },
    footer: {
      subjects: "Fanlar",
      grades: "Sinflar",
      tests: "Testlar",
      login: "Kirish",
      disclaimer: "© {year} IQ Monitoring. Demo muhit — production uchun sozlamalarni yangilang.",
    },
    tests: {
      metaLine: "{grade}-sinf · {subject}",
      indexEyebrow: "IQ Monitoring",
      indexTitle: "Testlar markazi",
      indexSubtitle:
        "Fan, sinf va murakkablik bo‘yicha filtrlash. MCQ testlar, ball va tahlil — bitta premium tajribada.",
      filterSubject: "Fan",
      filterGrade: "Sinf",
      filterDifficulty: "Murakkablik",
      filterAll: "Hammasi",
      filterAllLevels: "Barcha darajalar",
      gradeChip: "{grade}-sinf",
      emptyTitle: "Bu filtr bo‘yicha test topilmadi.",
      emptyHint: "Filtrlarni o‘zgartiring yoki yuqoridagi «Hammasi»ni tanlang.",
      clearFilters: "Filtrni tozalash",
      questionCount: "{n} savol",
      startCta: "Boshlash",
      previewBanner:
        "Ko‘rish rejimi — natija bazaga yozilmaydi. O‘quvchi topshirishi uchun test kodi kerak.",
      loadingSession: "Test sessiyasi tayyorlanmoqda…",
    },
    testRunner: {
      questionProgress: "Savol {current} / {total}",
      questionNavHint: "Savollar: yashil — javob berilgan, kulrang — hali yo‘q. Raqamga bosib o‘tishingiz mumkin.",
      prev: "Oldingi",
      next: "Keyingi",
      finish: "Yakunlash",
      resultLabel: "Natija",
      scoreDetails: "{correct} / {total} savol to‘g‘ri",
      summaryTitle: "Savollar bo‘yicha xulosa",
      yourAnswer: "Sizning javobingiz:",
      correctAnswer: "To‘g‘ri javob:",
      dash: "—",
      errAnswerAll: "Barcha savollarga javob bering.",
      errNoSession: "Sessiya topilmadi. Sahifani yangilang.",
      noticePreviewNoScore: "Bu rejimda ball hisoblanmaydi. O‘quvchi sifatida test kodi bilan kiring.",
      noticePreviewNotSaved: "Ko‘rish rejimi — bazaga yozilmadi.",
      noticeTabViolation: "Qoida: varaqdan chiqish — avto-yuborish.",
      sessionEndedTitle: "Sessiya qoidalarga ko‘ra yakunlandi.",
      sessionEndedHint: "Batafsil ma’lumot administrator jurnalida.",
      protectedIntro:
        "Himoyalangan imtihon. Skrinshot / yozib olish brauzerda to‘liq bloklanmaydi (OS cheklovi), lekin qoidabuzarlik jurnalga yoziladi. Varaqdan chiqish siyosati:",
      protectedPolicyPrefix: "",
    },
    difficulty: { EASY: "Oson", MEDIUM: "O‘rta", HARD: "Qiyin" },
    tabPolicy: {
      AUTO_SUBMIT: "varaqdan chiqishda avto-yuborish",
      WARN: "ogohlantirish",
      IGNORE: "e’tiborsiz qoldirish",
    },
    home: {
      heroBadge: "Universal ta’lim monitoringi",
      heroKicker: "Barcha fanlar uchun zamonaviy ta’lim platformasi",
      heroLeadPrefix: "",
      heroLeadAccent: "",
      heroLeadSuffix: "",
      heroBlurb: "",
      feature1Title: "Ko‘p fanli tuzilma",
      feature1Desc: "Matematikadan ITgacha — tartibli kontent va testlar.",
      feature2Title: "Progress va tahlil",
      feature2Desc: "Ball, foiz va vizual progress — qarorlar uchun.",
      feature3Title: "Zamonaviy interfeys",
      feature3Desc: "Glass effekt, gradient va silliq animatsiyalar.",
      platformEyebrow: "Platforma imkoniyatlari",
      platformTitle: "Professional ta’lim SaaS tajribasi",
      platformSubtitle:
        "O‘quvchilar, o‘qituvchilar va boshqaruv — bir xil vizual tilda, silliq animatsiyalar va aniq navigatsiya bilan.",
      cap1Title: "Rollar va kabinetlar",
      cap1Body: "Admin, o‘qituvchi va o‘quvchi uchun alohida dashboardlar, tezkor amallar va statistikalar.",
      cap2Title: "Monitoring va analytics",
      cap2Body: "Chartlar, progress barlar va natijalar dinamikasi — qarorlar uchun vizual asos.",
      cap3Title: "Xavfsizlik zanjiri",
      cap3Body: "NextAuth asosidagi autentifikatsiya; production uchun siyosat va rollarni kengaytirish oson.",
      cap4Title: "Texnik arxitektura",
      cap4Body: "Next.js App Router, Prisma, modular komponentlar — real ma’lumotlarga o‘tish uchun tayyor.",
      statStudents: "O‘quvchilar",
      statTests: "Testlar",
      statAvg: "O‘rtacha ball",
      statGrades: "Sinflar",
      statHintStudentsOk: "Demo platforma",
      statHintTestsOk: "MCQ, barcha fanlar",
      statHintAvgSubmitted: "Topshirilgan natijalar",
      statHintAvgWait: "Natija kiritilgach",
      statHintGrades: "1–11 qamrov",
      statHintDbError: "Ma’lumotlar bazasiga ulanish vaqtincha yo‘q",
      statHintCheckSettings: "Sozlamalarni tekshiring",
      statHintAwaitResult: "Natija kiritilgach",
      subjectsEyebrow: "Fanlar ekotizimi",
      subjectsTitle: "Barcha asosiy maktab fanlari",
      subjectsSubtitle:
        "Har bir fan uchun alohida vizual identifikator, testlar va sinf bo‘yicha tartib — kengaytirish uchun tayyor arxitektura.",
      subjectsViewAll: "Barcha fanlar",
      testPlEyebrow: "Test infratuzilmasi",
      testPlTitle: "Baholash — ishonchli va shaffof",
      testPlBody:
        "IQ Monitoring test moduli har bir savolni tartib bilan ko‘rsatadi, natijani foiz va tahlil ko‘rinishida beradi. Ma’lumotlar real tizimga ulash uchun API va DB qatlami tayyor.",
      testPlPoint1: "Fan va sinf bo‘yicha filtrlash",
      testPlPoint2: "Bloklangan savollar va foizda natija",
      testPlPoint3: "O‘qituvchi va admin uchun analytics",
      testPlOpenTests: "Testlarni ochish",
      testPlByGrades: "Sinflar bo‘yicha",
      testPlDemoWindow: "Demo test oynasi",
      testPlProgress: "Progress",
    },
  },
  ru: {
    nav: {
      home: "Главная",
      subjects: "Предметы",
      grades: "Классы",
      tests: "Тесты",
      ranking: "Рейтинг",
      testCode: "Код теста",
      about: "О нас",
      login: "Вход",
      cabinet: "Кабинет",
      localeLabel: "Язык",
      profileDashboard: "Кабинет",
      signOut: "Выйти",
    },
    brand: {
      tagline: "Современная школьная платформа для мониторинга и тестов.",
    },
    footer: {
      subjects: "Предметы",
      grades: "Классы",
      tests: "Тесты",
      login: "Вход",
      disclaimer: "© {year} IQ Monitoring. Демо — обновите настройки для production.",
    },
    tests: {
      metaLine: "{grade} класс · {subject}",
      indexEyebrow: "IQ Monitoring",
      indexTitle: "Центр тестов",
      indexSubtitle:
        "Фильтры по предмету, классу и сложности. MCQ, баллы и аналитика в одном интерфейсе.",
      filterSubject: "Предмет",
      filterGrade: "Класс",
      filterDifficulty: "Сложность",
      filterAll: "Все",
      filterAllLevels: "Все уровни",
      gradeChip: "{grade} класс",
      emptyTitle: "По этому фильтру тесты не найдены.",
      emptyHint: "Измените фильтры или выберите «Все» выше.",
      clearFilters: "Сбросить фильтры",
      questionCount: "{n} вопр.",
      startCta: "Начать",
      previewBanner:
        "Режим просмотра — результат не сохраняется. Для ученика нужен код теста.",
      loadingSession: "Подготовка сессии теста…",
    },
    testRunner: {
      questionProgress: "Вопрос {current} / {total}",
      questionNavHint: "Вопросы: зелёный — отвечен, серый — ещё нет. Нажмите номер, чтобы перейти.",
      prev: "Назад",
      next: "Далее",
      finish: "Завершить",
      resultLabel: "Результат",
      scoreDetails: "{correct} / {total} верно",
      summaryTitle: "Разбор по вопросам",
      yourAnswer: "Ваш ответ:",
      correctAnswer: "Правильный ответ:",
      dash: "—",
      errAnswerAll: "Ответьте на все вопросы.",
      errNoSession: "Сессия не найдена. Обновите страницу.",
      noticePreviewNoScore: "В этом режиме баллы не считаются. Войдите как ученик с кодом теста.",
      noticePreviewNotSaved: "Режим просмотра — не сохранено в базе.",
      noticeTabViolation: "Правило: уход со вкладки — автоотправка.",
      sessionEndedTitle: "Сессия завершена по правилам.",
      sessionEndedHint: "Подробности в журнале администратора.",
      protectedIntro:
        "Защищённый экзамен. Скриншоты и запись не блокируются полностью (ограничения ОС), нарушения пишутся в журнал. Политика при уходе со вкладки:",
      protectedPolicyPrefix: "",
    },
    difficulty: { EASY: "Лёгкий", MEDIUM: "Средний", HARD: "Сложный" },
    tabPolicy: {
      AUTO_SUBMIT: "автоотправка при уходе со вкладки",
      WARN: "предупреждение",
      IGNORE: "игнорировать",
    },
    home: {
      heroBadge: "Универсальный мониторинг обучения",
      heroKicker: "Современная образовательная платформа для всех предметов",
      heroLeadPrefix: "Для всех школьных предметов — ",
      heroLeadAccent: "мониторинг",
      heroLeadSuffix: " и тестовая инфраструктура",
      heroBlurb:
        "Классы, предметы, интерактивная оценка и аналитика — в одном премиальном интерфейсе. Современное обучение, тесты и аналитика по всем предметам.",
      feature1Title: "Мультипредметная структура",
      feature1Desc: "От математики до IT — упорядоченный контент и тесты.",
      feature2Title: "Прогресс и аналитика",
      feature2Desc: "Баллы, проценты и визуальный прогресс — для решений.",
      feature3Title: "Современный интерфейс",
      feature3Desc: "Стекло, градиенты и плавные анимации.",
      platformEyebrow: "Возможности платформы",
      platformTitle: "Профессиональный образовательный SaaS",
      platformSubtitle:
        "Ученики, учителя и администрирование — единый визуальный язык, плавные анимации и понятная навигация.",
      cap1Title: "Роли и кабинеты",
      cap1Body: "Отдельные панели для админа, учителя и ученика, быстрые действия и статистика.",
      cap2Title: "Мониторинг и аналитика",
      cap2Body: "Графики, прогресс-бары и динамика результатов — визуальная основа для решений.",
      cap3Title: "Цепочка безопасности",
      cap3Body: "Аутентификация на NextAuth; политики и роли легко расширять для production.",
      cap4Title: "Техническая архитектура",
      cap4Body: "Next.js App Router, Prisma, модульные компоненты — готово к реальным данным.",
      statStudents: "Ученики",
      statTests: "Тесты",
      statAvg: "Средний балл",
      statGrades: "Классы",
      statHintStudentsOk: "Демо-платформа",
      statHintTestsOk: "MCQ, все предметы",
      statHintAvgSubmitted: "Сданные результаты",
      statHintAvgWait: "После появления результатов",
      statHintGrades: "Охват 1–11",
      statHintDbError: "Нет подключения к базе данных",
      statHintCheckSettings: "Проверьте настройки",
      statHintAwaitResult: "После появления результатов",
      subjectsEyebrow: "Экосистема предметов",
      subjectsTitle: "Все основные школьные предметы",
      subjectsSubtitle:
        "У каждого предмета свой визуал, тесты и порядок по классам — архитектура готова к расширению.",
      subjectsViewAll: "Все предметы",
      testPlEyebrow: "Тестовая инфраструктура",
      testPlTitle: "Оценка — надёжно и прозрачно",
      testPlBody:
        "Модуль тестов IQ Monitoring показывает вопросы по порядку, выдаёт результат в процентах и аналитике. Слой API и БД готов к интеграции.",
      testPlPoint1: "Фильтры по предмету и классу",
      testPlPoint2: "Блоки вопросов и результат в процентах",
      testPlPoint3: "Аналитика для учителя и админа",
      testPlOpenTests: "Открыть тесты",
      testPlByGrades: "По классам",
      testPlDemoWindow: "Демо окна теста",
      testPlProgress: "Прогресс",
    },
  },
  en: {
    nav: {
      home: "Home",
      subjects: "Subjects",
      grades: "Grades",
      tests: "Tests",
      ranking: "Leaderboard",
      testCode: "Test code",
      about: "About",
      login: "Sign in",
      cabinet: "Dashboard",
      localeLabel: "Language",
      profileDashboard: "Dashboard",
      signOut: "Sign out",
    },
    brand: {
      tagline: "Modern school monitoring and testing platform.",
    },
    footer: {
      subjects: "Subjects",
      grades: "Grades",
      tests: "Tests",
      login: "Sign in",
      disclaimer: "© {year} IQ Monitoring. Demo environment — update settings for production.",
    },
    tests: {
      metaLine: "Grade {grade} · {subject}",
      indexEyebrow: "IQ Monitoring",
      indexTitle: "Test hub",
      indexSubtitle: "Filter by subject, grade, and difficulty. MCQ scoring and analytics in one place.",
      filterSubject: "Subject",
      filterGrade: "Grade",
      filterDifficulty: "Difficulty",
      filterAll: "All",
      filterAllLevels: "All levels",
      gradeChip: "Gr. {grade}",
      emptyTitle: "No tests match these filters.",
      emptyHint: "Change filters or choose “All” above.",
      clearFilters: "Clear filters",
      questionCount: "{n} questions",
      startCta: "Start",
      previewBanner: "Preview mode — results are not saved. Students need a test code to submit.",
      loadingSession: "Preparing test session…",
    },
    testRunner: {
      questionProgress: "Question {current} / {total}",
      questionNavHint: "Questions: green = answered, gray = not yet. Tap a number to jump.",
      prev: "Previous",
      next: "Next",
      finish: "Finish",
      resultLabel: "Result",
      scoreDetails: "{correct} / {total} correct",
      summaryTitle: "Question review",
      yourAnswer: "Your answer:",
      correctAnswer: "Correct answer:",
      dash: "—",
      errAnswerAll: "Answer every question.",
      errNoSession: "Session not found. Refresh the page.",
      noticePreviewNoScore: "Scores are not calculated in this mode. Enter as a student with a test code.",
      noticePreviewNotSaved: "Preview mode — not saved to the database.",
      noticeTabViolation: "Rule: leaving the tab triggers auto-submit.",
      sessionEndedTitle: "Session ended per policy.",
      sessionEndedHint: "See the administrator log for details.",
      protectedIntro:
        "Protected exam. Screenshots/recording cannot be fully blocked in the browser (OS limits); violations are logged. Tab-leaving policy:",
      protectedPolicyPrefix: "",
    },
    difficulty: { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" },
    tabPolicy: {
      AUTO_SUBMIT: "auto-submit on tab switch",
      WARN: "warn only",
      IGNORE: "ignore",
    },
    home: {
      heroBadge: "Universal learning monitoring",
      heroKicker: "Smart education platform for all subjects",
      heroLeadPrefix: "Monitoring and test infrastructure for ",
      heroLeadAccent: "every school subject",
      heroLeadSuffix: "",
      heroBlurb:
        "Grades, subjects, interactive assessment, and analytics — in one premium interface. Modern learning, tests, and analytics across every subject.",
      feature1Title: "Multi-subject structure",
      feature1Desc: "From math to IT — organized content and tests.",
      feature2Title: "Progress & analytics",
      feature2Desc: "Scores, percentages, and visual progress — for better decisions.",
      feature3Title: "Premium UX",
      feature3Desc: "Glass, gradients, and smooth motion.",
      platformEyebrow: "Platform capabilities",
      platformTitle: "Professional education SaaS experience",
      platformSubtitle:
        "Students, teachers, and operations — one visual language, smooth motion, and clear navigation.",
      cap1Title: "Roles & dashboards",
      cap1Body: "Separate dashboards for admin, teacher, and student with quick actions and stats.",
      cap2Title: "Monitoring & analytics",
      cap2Body: "Charts, progress bars, and result trends — a visual basis for decisions.",
      cap3Title: "Security chain",
      cap3Body: "NextAuth authentication; policies and roles are easy to extend for production.",
      cap4Title: "Technical architecture",
      cap4Body: "Next.js App Router, Prisma, modular components — ready for real data.",
      statStudents: "Students",
      statTests: "Tests",
      statAvg: "Average score",
      statGrades: "Grades",
      statHintStudentsOk: "Demo platform",
      statHintTestsOk: "MCQ, all subjects",
      statHintAvgSubmitted: "Submitted results",
      statHintAvgWait: "When results exist",
      statHintGrades: "Grades 1–11",
      statHintDbError: "Database unavailable",
      statHintCheckSettings: "Check configuration",
      statHintAwaitResult: "When results exist",
      subjectsEyebrow: "Subject ecosystem",
      subjectsTitle: "Core school subjects",
      subjectsSubtitle:
        "Each subject has its own look, tests, and grade ordering — architecture ready to grow.",
      subjectsViewAll: "All subjects",
      testPlEyebrow: "Test infrastructure",
      testPlTitle: "Assessment — reliable and transparent",
      testPlBody:
        "The IQ Monitoring test module shows each question in order, delivers percent scores and insights. API and DB layers are ready to wire up.",
      testPlPoint1: "Filter by subject and grade",
      testPlPoint2: "Structured questions and percent results",
      testPlPoint3: "Analytics for teachers and admins",
      testPlOpenTests: "Open tests",
      testPlByGrades: "By grade",
      testPlDemoWindow: "Demo test window",
      testPlProgress: "Progress",
    },
  },
};
