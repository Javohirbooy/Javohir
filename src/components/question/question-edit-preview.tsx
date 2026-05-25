"use client";

import { useState } from "react";
import { QuestionRichText } from "@/components/question/question-rich-text";
import { cn } from "@/lib/utils";

const PREVIEW_PROSE =
  "prose-slate max-w-none [&_.katex]:text-slate-900 [&_p]:my-0 [&_p]:leading-relaxed";

type FieldProps = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  compact?: boolean;
  defaultShowSource?: boolean;
};

export function QuestionFieldWithPreview({
  value,
  onChange,
  rows = 3,
  placeholder,
  compact,
  defaultShowSource,
}: FieldProps) {
  const hasContent = value.trim().length > 0;
  const [showSource, setShowSource] = useState(
    defaultShowSource ?? (!hasContent || !/\$|\\\(|\\frac/.test(value)),
  );

  return (
    <div className="space-y-2">
      {hasContent && !showSource ? (
        <div
          className={cn(
            "rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-slate-900 shadow-sm",
            compact && "py-2",
          )}
        >
          <QuestionRichText content={value} compact={compact} className={PREVIEW_PROSE} />
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setShowSource((v) => !v)}
        className="text-xs font-semibold text-cyan-300/90 hover:text-cyan-200"
      >
        {showSource ? "Ko‘rinishni ko‘rsatish" : "Matnni tahrirlash"}
      </button>
      {showSource ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-500 focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400/35 [color-scheme:light]"
          placeholder={placeholder}
        />
      ) : null}
    </div>
  );
}

type BlockProps = {
  text: string;
  options: string[];
  correctIndex: number;
  onTextChange: (v: string) => void;
  onOptionChange: (index: number, v: string) => void;
};

const LETTERS = ["A", "B", "C", "D"] as const;

export function QuestionBlockLivePreview({
  text,
  options,
  correctIndex,
}: Omit<BlockProps, "onTextChange" | "onOptionChange">) {
  if (!text.trim() && options.every((o) => !o.trim())) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white p-4 text-slate-900 shadow-lg shadow-black/20">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Ko‘rinish</p>
      <div className="text-base font-bold leading-snug">
        <QuestionRichText content={text} className={cn(PREVIEW_PROSE, "font-bold")} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {LETTERS.map((letter, i) => {
          const opt = options[i] ?? "";
          if (!opt.trim()) return null;
          const selected = i === correctIndex;
          return (
            <div
              key={letter}
              className={cn(
                "flex gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold",
                selected ? "border-emerald-500 bg-emerald-50/90" : "border-slate-200 bg-slate-50/80",
              )}
            >
              <span className="shrink-0 text-slate-500">{letter})</span>
              <QuestionRichText content={opt} compact className={cn(PREVIEW_PROSE, "min-w-0 flex-1")} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QuestionEditBlock({
  text,
  options,
  correctIndex,
  onTextChange,
  onOptionChange,
}: BlockProps) {
  const [editMode, setEditMode] = useState(false);
  const hasMath = /\$|\\\(|\\frac/.test(text) || options.some((o) => /\$|\\\(|\\frac/.test(o));

  return (
    <div className="space-y-4">
      <QuestionBlockLivePreview text={text} options={options} correctIndex={correctIndex} />

      {hasMath && !editMode ? (
        <button
          type="button"
          onClick={() => setEditMode(true)}
          className="text-xs font-semibold text-violet-300/90 hover:text-violet-200"
        >
          Matn va variantlarni tahrirlash
        </button>
      ) : null}

      {editMode || !hasMath ? (
        <div className="space-y-3 rounded-xl border border-dashed border-white/15 bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Manba matn</p>
          <QuestionFieldWithPreview
            value={text}
            onChange={onTextChange}
            rows={4}
            placeholder="Savol matni (Markdown / LaTeX)"
            defaultShowSource={!hasMath}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((oi) => (
              <label key={oi} className="block text-xs font-semibold text-white/55">
                Variant {oi + 1}
                <div className="mt-1">
                  <QuestionFieldWithPreview
                    value={options[oi] ?? ""}
                    onChange={(v) => onOptionChange(oi, v)}
                    rows={2}
                    placeholder={`Variant ${oi + 1}`}
                    compact
                    defaultShowSource={!hasMath}
                  />
                </div>
              </label>
            ))}
          </div>
          {hasMath ? (
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="text-xs font-semibold text-white/50 hover:text-white/70"
            >
              Tahrirlashni yopish
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
