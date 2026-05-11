/**
 * Kirish urinishlari uchun limitlar.
 * Maktab / ofis / mobil NAT — bir tashqi IP dan o‘nlab odam bir vaqtda kirishi mumkin;
 * juda past chegaralar “ko‘pchilik uchun kirish ishlamaydi” holatiga olib keladi.
 */

/** Edge middleware: POST /api/auth/callback/* va credentials — IP bo‘yicha */
export const MW_AUTH_POST_WINDOW_MS = 15 * 60 * 1000;
export const MW_AUTH_POST_MAX_PER_IP = 400;

/** credentials authorize — bir IP dan qancha marta urinish (authorize ichida) */
export const LOGIN_IP_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_IP_MAX_ATTEMPTS = 250;

export const LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
export const LOGIN_RATE_LIMIT_ATTEMPTS = 10;
