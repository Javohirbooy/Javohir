import type { AppLocale } from "@/lib/i18n/constants";

/** Til bo‘yicha matnlar — kelajakda URL segmenti (`/uz/...`) bilan `alternates.languages` kengaytiriladi. */
export type PublicSeoKey =
  | "home"
  | "fanlar"
  | "sinflar"
  | "testlar"
  | "kirish"
  | "register"
  | "registerDisabled"
  | "forgotPassword"
  | "resetPassword"
  | "aloqa"
  | "bizHaqimizda"
  | "reyting"
  | "premium"
  | "verifyEmail"
  | "testNotFound";

type Entry = { title: string; description: string };

const M: Record<AppLocale, Record<PublicSeoKey, Entry>> = {
  uz: {
    home: {
      title: "IQ Monitoring — universal ta’lim monitoringi",
      description:
        "Maktab fanlari, sinflar, monitoring testlari va analytics — bitta zamonaviy platformada. Admin, o‘qituvchi va o‘quvchi kabinetlari.",
    },
    fanlar: {
      title: "Fanlar",
      description:
        "Barcha maktab fanlari ro‘yxati: filtrlash, fan bo‘yicha testlar va sinf tuzilmasiga o‘tish. IQ Monitoring katalogi.",
    },
    sinflar: {
      title: "Sinflar",
      description:
        "1–11 sinflar bo‘yicha tuzilma, qidiruv va har bir sinf sahifasiga havolalar. Maktab monitoringi uchun tayyor UX.",
    },
    testlar: {
      title: "Testlar",
      description:
        "Fan, sinf va qiyinlik bo‘yicha testlar katalogi. O‘quvchilar uchun monitoring imkoniyati va o‘qituvchilar uchun boshqaruv.",
    },
    kirish: {
      title: "Kirish",
      description:
        "IQ Monitoring tizimiga xavfsiz kirish — email yoki ism-familiya va parol. Admin, o‘qituvchi yoki o‘quvchi kabineti.",
    },
    register: {
      title: "Ro‘yxatdan o‘tish",
      description:
        "Yangi o‘quvchi akkaunti: ism-familiya, email va parol. Email tasdiqlashdan keyin monitoring testlariga kirish.",
    },
    registerDisabled: {
      title: "Ro‘yxatdan o‘tish vaqtincha o‘chirilgan",
      description:
        "Yangi akkaunt ochish hozircha faol emas. Mavjud foydalanuvchilar kirish sahifasidan tizimga kira oladi.",
    },
    forgotPassword: {
      title: "Parolni tiklash",
      description:
        "Email orqali parolni tiklash havolasi. Xavfsiz token va muddat bilan — IQ Monitoring hisobingizni qayta tiklang.",
    },
    resetPassword: {
      title: "Yangi parol",
      description:
        "Tiklash havolasi orqali yangi parol o‘rnatish. Kamida 8 belgi; muvaffaqiyatdan keyin kirish sahifasiga qaytish.",
    },
    aloqa: {
      title: "Aloqa",
      description:
        "IQ Monitoring bo‘yicha savol, hamkorlik yoki texnik murojaat. Xabar qoldirish formasi orqali jamoamiz bilan bog‘laning.",
    },
    bizHaqimizda: {
      title: "Biz haqimizda",
      description:
        "IQ Monitoring loyihasi, texnologiyalar (Next.js, Prisma) va ta’lim monitoringi yo‘nalishi haqida qisqacha ma’lumot.",
    },
    reyting: {
      title: "Reyting",
      description:
        "Eng yuqori test natijalari (namuna). Sinf va fan bo‘yicha filtrlash keyingi bosqichda kengayadi.",
    },
    premium: {
      title: "Premium",
      description:
        "Kengaytirilgan imkoniyatlar va prioritet qo‘llab-quvvatlash — IQ Monitoring premium rejasi haqida va ro‘yxatdan o‘tishga havola.",
    },
    verifyEmail: {
      title: "Emailni tasdiqlash",
      description:
        "Email tasdiqlash havolasi orqali akkauntni faollashtirish. Bu sahifa indekslanmaydi.",
    },
    testNotFound: {
      title: "Test topilmadi",
      description: "So‘ralgan test mavjud emas yoki o‘chirilgan. Testlar katalogiga qayting.",
    },
  },
  ru: {
    home: {
      title: "IQ Monitoring — универсальный мониторинг образования",
      description:
        "Школьные предметы, классы, мониторинговые тесты и аналитика в одной современной платформе. Кабинеты администратора, учителя и ученика.",
    },
    fanlar: {
      title: "Предметы",
      description:
        "Каталог школьных предметов, фильтрация и переходы к тестам и классам. Каталог IQ Monitoring.",
    },
    sinflar: {
      title: "Классы",
      description:
        "Структура по классам 1–11, поиск и ссылки на страницы классов. Готовый UX для школьного мониторинга.",
    },
    testlar: {
      title: "Тесты",
      description:
        "Каталог тестов по предмету, классу и сложности. Мониторинг для учеников и управление для учителей.",
    },
    kirish: {
      title: "Вход",
      description:
        "Безопасный вход в IQ Monitoring — email или ФИО и пароль. Кабинет администратора, учителя или ученика.",
    },
    register: {
      title: "Регистрация",
      description:
        "Новый аккаунт ученика: ФИО, email и пароль. После подтверждения email — доступ к мониторинговым тестам.",
    },
    registerDisabled: {
      title: "Регистрация временно отключена",
      description:
        "Создание новых аккаунтов сейчас недоступно. Существующие пользователи могут войти со страницы входа.",
    },
    forgotPassword: {
      title: "Восстановление пароля",
      description:
        "Ссылка для сброса пароля на email. Безопасный токен и срок действия — восстановите доступ к IQ Monitoring.",
    },
    resetPassword: {
      title: "Новый пароль",
      description:
        "Установите новый пароль по ссылке восстановления. Минимум 8 символов; затем возвращайтесь на страницу входа.",
    },
    aloqa: {
      title: "Контакты",
      description:
        "Вопросы, сотрудничество или техническая поддержка IQ Monitoring. Свяжитесь с нами через форму обратной связи.",
    },
    bizHaqimizda: {
      title: "О нас",
      description:
        "Проект IQ Monitoring, технологии (Next.js, Prisma) и направление школьного мониторинга — краткая информация.",
    },
    reyting: {
      title: "Рейтинг",
      description:
        "Лучшие результаты тестов (демо). Фильтрация по классу и предмету планируется в следующих версиях.",
    },
    premium: {
      title: "Premium",
      description:
        "Расширенные возможности и приоритетная поддержка — информация о премиум-плане IQ Monitoring и ссылка на регистрацию.",
    },
    verifyEmail: {
      title: "Подтверждение email",
      description:
        "Активация аккаунта по ссылке подтверждения. Страница не индексируется.",
    },
    testNotFound: {
      title: "Тест не найден",
      description: "Запрошенный тест отсутствует или удалён. Вернитесь в каталог тестов.",
    },
  },
  en: {
    home: {
      title: "IQ Monitoring — universal school learning analytics",
      description:
        "Subjects, classes, monitoring tests and analytics in one modern platform. Admin, teacher and student workspaces.",
    },
    fanlar: {
      title: "Subjects",
      description:
        "Browse all school subjects with filters and links to tests and grade structure. IQ Monitoring subject catalog.",
    },
    sinflar: {
      title: "Grades & classes",
      description:
        "Structure for grades 1–11, search and links to each grade page. UX ready for school-wide monitoring.",
    },
    testlar: {
      title: "Tests",
      description:
        "Test catalog by subject, grade and difficulty. Student monitoring flows and teacher management tools.",
    },
    kirish: {
      title: "Sign in",
      description:
        "Secure sign-in to IQ Monitoring with email or full name and password. Admin, teacher or student dashboard access.",
    },
    register: {
      title: "Create account",
      description:
        "New student account: full name, email and password. After email verification, access monitoring tests.",
    },
    registerDisabled: {
      title: "Registration temporarily disabled",
      description:
        "New sign-ups are currently unavailable. Existing users can still sign in from the login page.",
    },
    forgotPassword: {
      title: "Forgot password",
      description:
        "Request a password reset link by email. Secure, time-limited token — restore access to IQ Monitoring.",
    },
    resetPassword: {
      title: "Set new password",
      description:
        "Choose a new password via your reset link. At least 8 characters; then return to the sign-in page.",
    },
    aloqa: {
      title: "Contact",
      description:
        "Questions, partnerships or technical support for IQ Monitoring. Reach our team through the contact form.",
    },
    bizHaqimizda: {
      title: "About us",
      description:
        "The IQ Monitoring project, stack (Next.js, Prisma) and our focus on school monitoring — short overview.",
    },
    reyting: {
      title: "Leaderboard",
      description:
        "Top test scores (sample data). Grade and subject filters will be expanded in upcoming releases.",
    },
    premium: {
      title: "Premium",
      description:
        "Advanced capabilities and priority support — learn about the IQ Monitoring premium plan and how to get started.",
    },
    verifyEmail: {
      title: "Verify email",
      description:
        "Activate your account using the verification link from your inbox. This flow is not indexed by search engines.",
    },
    testNotFound: {
      title: "Test not found",
      description: "The requested test does not exist or was removed. Return to the test catalog.",
    },
  },
};

export function publicSeoEntry(locale: AppLocale, key: PublicSeoKey): Entry {
  const row = M[locale] ?? M.uz;
  return row[key] ?? M.uz[key];
}

export function testDetailDescription(locale: AppLocale, testTitle: string, gradeNumber: number, subjectTitle: string): string {
  const templates: Record<AppLocale, string> = {
    uz: `«${testTitle}» — ${gradeNumber}-sinf, ${subjectTitle}. IQ Monitoring test sahifasi.`,
    ru: `«${testTitle}» — ${gradeNumber} класс, ${subjectTitle}. Страница теста IQ Monitoring.`,
    en: `“${testTitle}” — grade ${gradeNumber}, ${subjectTitle}. IQ Monitoring test page.`,
  };
  return templates[locale] ?? templates.uz;
}
