# Ishonch checklist (production)

Bu ro‘yxat **“10/10 tayyor”** emas — balki har reliz oldin va keyin **siz o‘zingiz ishonch hosil qilasiz**. Barcha bandlar yashil bo‘lsa, jamoa ichida “chiqarishga tayyor” deb qarash mumkin.

---

## 1. Avtomatik tekshiruvlar (har PR / `main`)

| Qadam | Buyruq | Maqsad |
|--------|--------|--------|
| Lint | `npm run lint` | Kod sifati, aniq xatolar |
| Typecheck | `npm run typecheck` | Tip xatolari |
| Build | `npm run build` | Production build, SSG |
| E2E (ixtiyoriy lekin tavsiya) | `npm run test:e2e` | Asosiy oqimlar (Playwright) |

**“Yashil”:** yuqoridagilarning barchasi `exit 0`.

---

## 2. Ma’lumotlar bazasi

| Qadam | Qanday |
|--------|--------|
| Migratsiyalar | `npx prisma migrate deploy` production `DATABASE_URL` bilan — yangi migratsiya bo‘lsa |
| Holat | `npx prisma migrate status` — “Database schema is up to date” |

---

## 3. Deploydan keyin smoke (5–10 daqiqa)

Bajarish tartibi muhim emas; barchasi **OK** bo‘lishi kerak.

1. **Sog‘liq:** `GET https://<domen>/api/health` → `200`, `status: "ok"`, `database: true`.
2. **Ochiq sahifa:** bosh sahifa, `/testlar` ochiladi, xatolik yo‘q.
3. **Kirish:** mavjud foydalanuvchi bilan login; chiqish.
4. **O‘quvchi:** ruxsatli testni ochish → `beginTestAttempt` → bir savol → (ixtiyoriy) topshirish yoki bekor; xatolik va redirectlar kutilganidek.
5. **O‘qituvchi yoki admin:** `/testlar/[id]` preview (agar rol bo‘lsa) — savollar ko‘rinadi.
6. **Brauzer konsoli:** kritik CSP/JS xatolari yo‘q (ogohlantirishlar bo‘lishi mumkin, lekin sahifa ishdan chiqmasin).

---

## 4. Monitoring (doimiy)

| Narsa | Minimal talab |
|--------|----------------|
| Sentry | Production environment + release; test xatolik guruhlanadi |
| Uptime | Tashqi monitor `/api/health` (2 region tavsiya) |
| Loglar | Vercel / Neon dashboard — 5xx va latency |

`docs/production/OBSERVABILITY.md` ni qo‘llang.

---

## 5. Zaxira va tiklash (kamida bir marta “mashq”)

- Neon backup / PITR yoqilganmi — konsolda tekshiring.
- `docs/production/BACKUP_AND_RESTORE.md` bo‘yicha **restore** qadamlarini o‘qing; imkon bo‘lsa test DBda sinab ko‘ring.

---

## 6. Xavfsizlik tezkor ko‘zdan kechirish

- Vercel **production** env: `AUTH_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL` (HTTPS) — maxfiy kalitlar faqat serverda.
- `ENABLE_HSTS=1` faqat butun sayt doimiy HTTPS bo‘lgach.

---

## 7. Relizdan keyin 24 soat

- Sentry’da **yangi** error spike yo‘qligi.
- Asosiy metrikalar (login, test ochish) odatdagidek.

---

## Qisqa xulosa

- **“100% amin”** — real dunyoda yo‘q.
- **“Chiqarishga tayyor”** — yuqoridagi bandlarni siz yopganingizda yaqinlashasiz.

Har yangi katta o‘zgarishdan keyin **3-bo‘limni** qayta bajaring.
