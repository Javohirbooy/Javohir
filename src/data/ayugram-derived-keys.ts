/**
 * 4–6-sinf “Test imtihon” DOCXlarida alohida javob kaliti yo‘q.
 * Ushbu indekslar (0=A … 3=D) o‘qituvchi tomonidan standart ingliz tili grammatikasi bo‘yicha tuzilgan;
 * rasmiy kalit bilan farq bo‘lsa, admin tahrirlash ekranidan tuzatiladi.
 */

export const AYU_DERIVED_KEYS = {
  grade4: {
    variant1: [0, 1, 1, 1, 0, 2, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1, 2, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 2],
    variant2: [1, 1, 0, 1, 1, 1, 1, 1, 0, 2, 1, 1, 1, 2, 1, 0, 1, 1, 1, 0, 2, 1, 1, 1, 0, 0, 1, 2, 2, 1],
  },
  grade5: {
    variant1: [0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 2, 2],
    variant2: [1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 2, 1, 1, 1, 1, 2, 2, 2, 0, 1, 2, 1, 1, 2, 1, 1, 2, 0, 2],
  },
  grade6: {
    variant1: [1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 2, 1, 1, 1, 2, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 0, 2],
    variant2: [1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 2, 1, 1, 1, 2, 2, 1, 2, 0, 1, 2, 1, 1, 2, 1, 2, 2, 0, 2],
  },
} as const;
