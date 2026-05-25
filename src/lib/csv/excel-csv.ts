/**
 * Excel ba’zi mahalliy sozlamalarda CSV ni `;` bilan ochadi — barcha qator bitta ustunda chiqadi.
 * Birinchi qatorda `sep=,` bo‘lsa, Excel qolgan fayl uchun vergul ajratuvchisini ishlatadi.
 * @see https://support.microsoft.com/help/323626
 */
export const EXCEL_UTF8_CSV_PREFIX = "\uFEFFsep=,\r\n";
