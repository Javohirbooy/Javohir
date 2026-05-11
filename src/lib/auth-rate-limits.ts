/**
 * Kirish urinishlari uchun limitlar.
 * Maktab Wi‑Fi: bitta tashqi IP orqali ~700 o‘quvchi bir vaqtda kirishi mumkin —
 * bu yerda past chegara hammani bloklab qo‘yadi (NAT “bir kishi” emas).
 */

/** Edge middleware: POST /api/auth/callback/* va credentials — IP bo‘yicha */
export const MW_AUTH_POST_WINDOW_MS = 15 * 60 * 1000;
/** ~700 odam + qayta urinish / ikki marta bosish zaxirasi (bir IP = butun maktab Wi‑Fi) */
export const MW_AUTH_POST_MAX_PER_IP = 5000;

/** credentials authorize — bir IP dan qancha marta urinish (authorize ichida) */
export const LOGIN_IP_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_IP_MAX_ATTEMPTS = 5000;

export const LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
export const LOGIN_RATE_LIMIT_ATTEMPTS = 10;
