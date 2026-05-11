/**
 * Open Graph rasm infratuzilmasi (`next/og` + `/og` marshruti).
 *
 * Yangi ochiq sahifa: odatda `buildPublicPageMetadata` yetarli (`ogSubtitle` ixtiyoriy).
 * Maxsus rasm: `buildOgImagePath` / `buildOgImageMetadataEntry` dan foydalaning.
 */
export { OG_IMAGE_HEIGHT, OG_IMAGE_SIZE, OG_IMAGE_WIDTH } from "./dimensions";
export { buildOgImageMetadataEntry, buildOgImagePath, type OgImageQueryInput } from "./build-og-image-path";
