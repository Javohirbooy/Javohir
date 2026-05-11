import { z } from "zod";

export const olympiadJoinSchema = z.object({
  firstName: z.string().trim().min(1, "Ism kiriting").max(80),
  lastName: z.string().trim().min(1, "Familiya kiriting").max(80),
  gradeLabel: z.string().trim().min(1, "Sinf kiriting").max(40),
  age: z.coerce.number().int().min(6).max(99),
  schoolName: z.string().trim().min(1, "Maktab nomi").max(200),
  region: z.string().trim().min(1, "Hudud").max(120),
  phone: z
    .string()
    .trim()
    .max(32)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  accessCode: z.string().trim().min(4, "Kod juda qisqa").max(64),
  deviceFp: z.string().max(2000).optional(),
  website: z.string().max(10).optional(),
});

export type OlympiadJoinInput = z.infer<typeof olympiadJoinSchema>;
