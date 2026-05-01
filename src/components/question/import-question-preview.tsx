"use client";

import { QuestionRichText } from "@/components/question/question-rich-text";

/** Server pages can mount this to preview imported question text (Markdown / LaTeX / images). */
export function ImportQuestionPreview({ text, className }: { text: string; className?: string }) {
  return <QuestionRichText content={text} className={className} />;
}
