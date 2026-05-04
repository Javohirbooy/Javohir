"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importTestDraftsFromUpload } from "@/app/actions/import-test";
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
  const [done, setDone] = useState<{ testId: string; title: string; fileName: string }[] | null>(null);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setDone(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("subjectId", subjectId);
    start(async () => {
      const r = await importTestDraftsFromUpload(fd);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      if (r.items.length === 1) {
        router.push(`${reviewBasePath}?id=${encodeURIComponent(r.items[0]!.testId)}`);
        router.refresh();
        return;
      }
      setDone(r.items);
      router.refresh();
    });
  }

  return (
    <DashboardCard>
      {done && done.length > 1 ? (
        <div className="mb-6 space-y-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-emerald-100">{done.length} ta qoralama yaratildi — har birini alohida tahrirlang:</p>
          <ul className="space-y-2">
            {done.map((it) => (
              <li key={it.testId}>
                <Link
                  href={`${reviewBasePath}?id=${encodeURIComponent(it.testId)}`}
                  className="inline-flex flex-wrap items-center gap-2 text-sm font-medium text-sky-200 underline-offset-2 hover:underline"
                >
                  <span className="font-mono text-xs text-white/50">{it.fileName}</span>
                  <span>→ {it.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Fan</span>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-sky-500/30 focus:ring-2"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {s.gradeLabel}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Test nomi (qoralama)</span>
          <input
            name="title"
            defaultValue=""
            placeholder="Masalan: Algebra — nazorat"
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-sky-500/30 focus:ring-2"
          />
          <span className="text-[0.7rem] text-white/40">Bir nechta fayl bo‘lsa, nomiga fayl nomi qo‘shiladi.</span>
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">
            1–3 ta fayl: .txt, .md yoki .docx (DOCX ichidagi rasmlar Markdown orqali)
          </span>
          <input
            name="files"
            type="file"
            multiple
            accept=".txt,.md,.docx,.DOCX,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
            required
            className="w-full rounded-xl border border-dashed border-white/20 bg-white/[0.04] px-3 py-6 text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </label>
        {err ? <p className="text-sm text-rose-300">{err}</p> : null}
        <button
          type="submit"
          disabled={pending || !subjectId}
          className="rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
        >
          {pending ? "Import…" : "Import va ko‘rib chiqish"}
        </button>
      </form>
    </DashboardCard>
  );
}
