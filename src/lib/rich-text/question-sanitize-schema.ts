import type { Schema } from "hast-util-sanitize";
import { defaultSchema } from "hast-util-sanitize";

/**
 * Sanitize rehype output after `rehype-katex` (spans, SVG) and GFM (img, table).
 * User content is Markdown-only (no raw HTML); still strip dangerous href/src.
 */
export const questionRichTextSchema: Schema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "math",
    "semantics",
    "mrow",
    "mi",
    "mo",
    "mn",
    "msup",
    "msub",
    "mfrac",
    "msqrt",
    "mroot",
    "mtext",
    "mspace",
    "mover",
    "munder",
    "munderover",
    "annotation",
  ],
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      "className",
      "style",
      "aria-hidden",
      "aria-label",
      "title",
    ],
    div: [...(defaultSchema.attributes?.div ?? []), "className", "style"],
    svg: [
      "xmlns",
      "width",
      "height",
      "viewBox",
      "preserveAspectRatio",
      "className",
      "aria-hidden",
      "focusable",
      "role",
      "fill",
      "stroke",
    ],
    path: ["d", "fill", "stroke", "stroke-width", "className"],
    line: ["x1", "x2", "y1", "y2", "className"],
    rect: ["x", "y", "width", "height", "className"],
  },
};
