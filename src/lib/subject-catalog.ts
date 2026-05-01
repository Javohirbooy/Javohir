import type { LucideIcon } from "lucide-react";
import {
  Atom,
  BookMarked,
  BookOpen,
  Brain,
  Calculator,
  Cpu,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Microscope,
} from "lucide-react";

export type CatalogSubject = {
  slug: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  /** Tailwind gradient for card bg */
  cardGradient: string;
  /** Accent ring / glow */
  accent: string;
};

/** Canonical subjects — `title` matches seeded `Subject.title` in Prisma. */
export const SUBJECT_CATALOG: CatalogSubject[] = [
  {
    slug: "matematika",
    title: "Matematika",
    description: "Algebra, geometriya, matematik analiz va masala yechish.",
    Icon: Calculator,
    cardGradient: "from-emerald-600/92 via-green-600/88 to-teal-700/92",
    accent: "ring-emerald-400/45 shadow-emerald-500/25",
  },
  {
    slug: "fizika",
    title: "Fizika",
    description: "Mexanika, elektrodinamika va zamonaviy fizika asoslari.",
    Icon: Atom,
    cardGradient: "from-teal-600/92 via-emerald-600/88 to-green-700/92",
    accent: "ring-teal-400/45 shadow-teal-500/25",
  },
  {
    slug: "kimyo",
    title: "Kimyo",
    description: "Organik va noorganik kimyo, laboratoriya tafakkuri.",
    Icon: FlaskConical,
    cardGradient: "from-green-600/92 via-emerald-600/88 to-teal-800/92",
    accent: "ring-green-400/45 shadow-green-500/25",
  },
  {
    slug: "biologiya",
    title: "Biologiya",
    description: "Genetika, ekologiya va hujayra darajasida hayot fanlari.",
    Icon: Microscope,
    cardGradient: "from-emerald-600/92 via-green-600/88 to-teal-700/92",
    accent: "ring-emerald-400/45 shadow-emerald-500/25",
  },
  {
    slug: "geografiya",
    title: "Geografiya",
    description: "Tabiiy geografiya, iqtisodiy geografiya va xaritalash.",
    Icon: Globe2,
    cardGradient: "from-lime-600/92 via-green-600/88 to-emerald-800/92",
    accent: "ring-lime-400/45 shadow-lime-500/25",
  },
  {
    slug: "tarix",
    title: "Tarix",
    description: "Jahon va mahalliy tarix, manbashunoslik va tahlil.",
    Icon: Landmark,
    cardGradient: "from-emerald-700/92 via-green-700/88 to-teal-900/92",
    accent: "ring-emerald-400/40 shadow-emerald-500/22",
  },
  {
    slug: "ona-tili",
    title: "Ona tili",
    description: "Grammatika, adabiyot va yozma nutq mahorati.",
    Icon: BookOpen,
    cardGradient: "from-green-600/92 via-emerald-600/88 to-teal-800/92",
    accent: "ring-green-400/45 shadow-green-500/25",
  },
  {
    slug: "ingliz-tili",
    title: "Ingliz tili",
    description: "Grammar, reading va communication skills.",
    Icon: Languages,
    cardGradient: "from-teal-600/92 via-emerald-600/88 to-green-900/92",
    accent: "ring-teal-400/45 shadow-teal-500/25",
  },
  {
    slug: "informatika",
    title: "Informatika",
    description: "Algoritmlar, ma’lumotlar va raqamli savodxonlik.",
    Icon: Cpu,
    cardGradient: "from-emerald-700/93 via-green-800/90 to-teal-950/95",
    accent: "ring-emerald-400/40 shadow-emerald-500/22",
  },
  {
    slug: "adabiyot",
    title: "Adabiyot",
    description: "She’riyat, nasr va ijodiy tahlil mashqlari.",
    Icon: BookMarked,
    cardGradient: "from-green-700/92 via-emerald-700/88 to-teal-900/92",
    accent: "ring-green-400/40 shadow-green-500/22",
  },
  {
    slug: "psixologiya",
    title: "Psixologiya",
    description: "O‘quv motivatsiyasi va soft skills bo‘yicha kirish.",
    Icon: Brain,
    cardGradient: "from-emerald-700/92 via-teal-700/88 to-green-950/92",
    accent: "ring-emerald-400/45 shadow-emerald-500/25",
  },
];

export function catalogBySlug(slug: string) {
  return SUBJECT_CATALOG.find((s) => s.slug === slug);
}
