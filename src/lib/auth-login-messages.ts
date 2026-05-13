/** Kirish formasi — Auth.js `callback/credentials` dan kelgan `code` lar uchun xabarlar. */

export function loginFailureMessageFromCredentialCode(code: string | undefined): string {
  switch (code) {
    case "email_not_verified":
      return "Email hali tasdiqlanmagan. Ro‘yxatdan keyin pochtangizdagi tasdiqlash havolasini oching.";
    case "account_inactive":
      return "Akkaunt hozir faol emas yoki bloklangan. Administratorga murojaat qiling.";
    case "rate_limited":
      return "Juda ko‘p kirish urinishi. Bir necha daqiqadan keyin qayta urinib ko‘ring.";
    /** Edge middleware: POST /api/auth/callback/* — Redis yo‘q yoki IP limit (authorize chaqirilmagan). */
    case "middleware_rate_limited":
      return "Kirish so‘rovi cheklangan (server himoyasi). Bir necha daqiqadan keyin qayta urinib ko‘ring. Redis (Upstash) sozlanganligini tekshiring.";
    case "middleware_redis_unavailable":
      return "Kirish vaqtincha ishlamayapti: Redis (Upstash) ulanmagan. Vercelda UPSTASH_REDIS_REST_URL va TOKEN qo‘shing yoki birozdan keyin qayta urinib ko‘ring.";
    case "lockout":
      return "Bir necha marta noto‘g‘ri parol kiritildi. Vaqtincha bloklangan — birozdan keyin urinib ko‘ring.";
    case "redis_unavailable":
      return "Tizim vaqtincha himoya rejimida (Redis ulanishi). Bir ozdan keyin qayta urinib ko‘ring yoki administratorga xabar bering.";
    case "ambiguous_name":
      return "Bu ism-familiya bilan bir nechta akkaunt topildi. Iltimos, to‘liq email manzilingiz bilan kiring.";
    case "unsupported_password_hash":
      return "Bu akkaunt uchun parol formati yangilanishi kerak. «Parolni unutdingizmi» orqali yangi parol oling yoki administratorga murojaat qiling.";
    case "credentials":
    default:
      return "Email/ism-familiya yoki parol noto‘g‘ri. Email tasdiqlangan va akkaunt faolligini tekshiring; parolni «Parolni unutdingizmi?» orqali ham yangilashingiz mumkin.";
  }
}
