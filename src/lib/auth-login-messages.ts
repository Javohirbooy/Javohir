/** Kirish formasi — Auth.js `callback/credentials` dan kelgan `code` lar uchun xabarlar. */

export function loginFailureMessageFromCredentialCode(code: string | undefined): string {
  switch (code) {
    case "email_not_verified":
      return "Email hali tasdiqlanmagan. Ro‘yxatdan keyin pochtangizdagi tasdiqlash havolasini oching.";
    case "account_inactive":
      return "Akkaunt hozir faol emas yoki bloklangan. Administratorga murojaat qiling.";
    case "rate_limited":
      return "Juda ko‘p kirish urinishi. Bir necha daqiqadan keyin qayta urinib ko‘ring.";
    case "lockout":
      return "Bir necha marta noto‘g‘ri parol kiritildi. Vaqtincha bloklangan — birozdan keyin urinib ko‘ring.";
    case "redis_unavailable":
      return "Tizim vaqtincha himoya rejimida (Redis ulanishi). Bir ozdan keyin qayta urinib ko‘ring yoki administratorga xabar bering.";
    case "credentials":
    default:
      return "Email/ism-familiya yoki parol noto‘g‘ri. Email tasdiqlangan va akkaunt faolligini tekshiring.";
  }
}
