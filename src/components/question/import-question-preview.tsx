"use client";

import { QuestionRichText } from "@/components/question/question-rich-text";

/** Server pages can mount this to preview imported question text (Markdown / LaTeX / images). */
export function ImportQuestionPreview({
  text,
  className,
  compact,
}: {
  text: string;
  className?: string;
  compact?: boolean;
}) {
  return <QuestionRichText content={text} className={className} compact={compact} />;
}
