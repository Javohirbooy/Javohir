"use client";

import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { questionRichTextSchema } from "@/lib/rich-text/question-sanitize-schema";
import { cn } from "@/lib/utils";

function safeUrl(url: string): string {
  const t = url.trim();
  if (t.startsWith("javascript:") || t.startsWith("vbscript:") || t.startsWith("data:text/html")) {
    return "";
  }
  if (t.startsWith("data:image/")) {
    return t.length < 2_500_000 ? t : "";
  }
  return t;
}

type Props = {
  content: string;
  className?: string;
  /** Tighter spacing for option buttons */
  compact?: boolean;
};

/**
 * Renders question / option text: **GitHub Flavored Markdown**, **LaTeX** (`$...$`, `$$...$$`), images `![alt](url)`.
 * No automatic translation — shows exactly what is stored in the DB.
 */
export function QuestionRichText({ content, className, compact }: Props) {
  if (!content?.trim()) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <div
      className={cn(
        "prose prose-slate max-w-none",
        compact ? "prose-sm [&_p]:my-0.5 [&_p]:leading-snug" : "prose-p:leading-relaxed",
        /** KaTeX + images */
        "[&_.katex]:text-inherit [&_img]:max-h-48 [&_img]:w-auto [&_img]:rounded-lg [&_img]:object-contain",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeSanitize, questionRichTextSchema]]}
        urlTransform={safeUrl}
        components={{
          p: ({ children }) => (compact ? <span className="block">{children}</span> : <p>{children}</p>),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
