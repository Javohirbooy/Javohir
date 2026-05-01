"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importTestDraftFromUpload } from "@/app/actions/import-test";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

type SubjectOpt = { id: string; title: string; gradeLabel: string };

export function ImportTestForm({
  subjects,
  reviewBasePath,
}: {
  subjects: SubjectOpt[];
  /** e.g. /admin/testlar/import/review or /oqituvchi/testlar/import/review */
  reviewBasePath: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("subjectId", subjectId);
    start(async () => {
      const r = await importTestDraftFromUpload(fd);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      router.push(`${reviewBasePath}?id=${encodeURIComponent(r.testId)}`);
      router.refresh();
    });
  }

  return (
    <DashboardCard>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="space-y-2 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Fan</span>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {s.gradeLabel}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Test nomi (qoralama)</span>
          <input name="title" className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2" />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">
            .txt, .md yoki .docx (DOCX ichidagi rasmlar Markdown orqali saqlanadi; formula — LaTeX)
          </span>
          <input
            name="file"
            type="file"
            accept=".txt,.md,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
            required
            className="w-full rounded-xl border border-dashed border-white/20 bg-white/[0.04] px-3 py-6 text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </label>
        {err ? <p className="text-sm text-rose-300">{err}</p> : null}
        <button
          type="submit"
          disabled={pending || !subjectId}
          className="rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
        >
          {pending ? "Import…" : "Import va ko‘rib chiqish"}
        </button>
      </form>
    </DashboardCard>
  );
}
