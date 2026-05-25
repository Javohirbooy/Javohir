import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TestPackMeta = {
  packKey: string | null;
  variant: number | null;
};

export type BundleOlympiadSlot = {
  olympiadId: string;
  packKey: string;
  variant: number | null;
};

/** importMetadataJson dan paket kaliti va variant raqami. */
export function parseTestPackMeta(importMetadataJson: string | null): TestPackMeta {
  if (!importMetadataJson?.trim()) return { packKey: null, variant: null };
  try {
    const meta = JSON.parse(importMetadataJson) as Record<string, unknown>;
    const packKey =
      Object.keys(meta).find((k) => meta[k] === true && /^[a-zA-Z][\w]*$/.test(k)) ?? null;
    const variant =
      typeof meta.variant === "number" && Number.isFinite(meta.variant)
        ? meta.variant
        : null;
    return { packKey, variant };
  } catch {
    return { packKey: null, variant: null };
  }
}

function slotKey(packKey: string, variant: number | null): string {
  return `${packKey}::${variant ?? "single"}`;
}

/** Bir xil imtihon paketidagi (masalan may17Math8Sinf) variantlarni guruhlaydi. */
export function groupBundleOlympiadSlots(
  subjects: Array<{
    olympiadId: string;
    importMetadataJson: string | null;
    testTitle?: string | null;
  }>,
): Map<string, BundleOlympiadSlot[]> {
  const groups = new Map<string, BundleOlympiadSlot[]>();

  for (const sub of subjects) {
    const { packKey, variant } = parseTestPackMeta(sub.importMetadataJson);
    const key =
      packKey ??
      (sub.testTitle?.replace(/\s*,\s*\d+-variant\s*/gi, "").trim().toLowerCase() ||
        `olympiad:${sub.olympiadId}`);

    const slot: BundleOlympiadSlot = {
      olympiadId: sub.olympiadId,
      packKey: key,
      variant,
    };
    const list = groups.get(key) ?? [];
    const dup = list.some(
      (s) => s.olympiadId === slot.olympiadId || slotKey(s.packKey, s.variant) === slotKey(key, variant),
    );
    if (!dup) list.push(slot);
    groups.set(key, list);
  }

  for (const list of groups.values()) {
    list.sort((a, b) => (a.variant ?? 0) - (b.variant ?? 0));
  }
  return groups;
}

function parseAssignedIds(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

/** Mavjud biriktirishlardan har variant uchun nechta o‘quvchi borligini hisoblaydi. */
export function tallyVariantAssignments(
  assignedJsonRows: string[],
  candidateOlympiadIds: string[],
): Map<string, number> {
  const tally = new Map<string, number>(candidateOlympiadIds.map((id) => [id, 0]));
  for (const json of assignedJsonRows) {
    for (const id of parseAssignedIds(json)) {
      if (tally.has(id)) tally.set(id, (tally.get(id) ?? 0) + 1);
    }
  }
  return tally;
}

/** Eng kam yuklangan variantni tanlaydi (teng bo‘lsa kichik variant raqami). */
export function pickLeastLoadedOlympiadId(
  candidates: BundleOlympiadSlot[],
  tally: Map<string, number>,
): string {
  if (candidates.length === 1) return candidates[0]!.olympiadId;
  return candidates.reduce((best, c) => {
    const cCount = tally.get(c.olympiadId) ?? 0;
    const bCount = tally.get(best.olympiadId) ?? 0;
    if (cCount < bCount) return c;
    if (cCount > bCount) return best;
    return (c.variant ?? 0) < (best.variant ?? 0) ? c : best;
  }).olympiadId;
}

export function computeAssignedOlympiadIds(
  subjects: Array<{
    olympiadId: string;
    importMetadataJson: string | null;
    testTitle?: string | null;
  }>,
  existingAssignedJsonRows: string[],
): string[] {
  const groups = groupBundleOlympiadSlots(subjects);
  const assigned: string[] = [];

  for (const slots of groups.values()) {
    if (slots.length === 0) continue;
    const candidateIds = slots.map((s) => s.olympiadId);
    const tally = tallyVariantAssignments(existingAssignedJsonRows, candidateIds);
    assigned.push(pickLeastLoadedOlympiadId(slots, tally));
  }

  return assigned;
}

export function parseParticipantAssignedOlympiadIds(json: string | null | undefined): string[] {
  return parseAssignedIds(json ?? "[]");
}

type Tx = Pick<Prisma.TransactionClient, "olympiadBundleSubject" | "olympiadBundleParticipant">;

/** Paket fanlaridan variantlarni hisoblab ishtirokchiga yozadi. */
export async function assignBundleVariantsForParticipant(
  tx: Tx,
  bundleId: string,
  participantId: string,
): Promise<string[]> {
  const subjects = await tx.olympiadBundleSubject.findMany({
    where: { bundleId },
    orderBy: { orderIndex: "asc" },
    select: {
      olympiadId: true,
      olympiad: {
        select: {
          test: { select: { title: true, importMetadataJson: true } },
        },
      },
    },
  });

  const existingRows = await tx.olympiadBundleParticipant.findMany({
    where: {
      bundleId,
      id: { not: participantId },
      assignedOlympiadIdsJson: { not: "[]" },
    },
    select: { assignedOlympiadIdsJson: true },
  });

  const assignedIds = computeAssignedOlympiadIds(
    subjects.map((s) => ({
      olympiadId: s.olympiadId,
      importMetadataJson: s.olympiad.test.importMetadataJson,
      testTitle: s.olympiad.test.title,
    })),
    existingRows.map((r) => r.assignedOlympiadIdsJson),
  );

  await tx.olympiadBundleParticipant.update({
    where: { id: participantId },
    data: { assignedOlympiadIdsJson: JSON.stringify(assignedIds) },
  });

  return assignedIds;
}

/** Eski ishtirokchilar uchun bir martalik backfill. */
export async function ensureBundleParticipantAssignments(
  participantId: string,
  bundleId: string,
): Promise<string[]> {
  const row = await prisma.olympiadBundleParticipant.findUnique({
    where: { id: participantId },
    select: { assignedOlympiadIdsJson: true },
  });
  const current = parseParticipantAssignedOlympiadIds(row?.assignedOlympiadIdsJson);
  if (current.length > 0) return current;

  return prisma.$transaction((tx) => assignBundleVariantsForParticipant(tx, bundleId, participantId));
}
