"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { startBundleSubject } from "@/app/actions/olympiad-bundle-participant";
import type { BundleDashboardPayload, BundleSubjectStatus } from "@/lib/olympiad/bundle-types";
import { GlassCard } from "@/components/ui/olympiad/glass-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  BundleSubjectStatus,
  { ring: string; badge: string; label: string }
> = {
  NOT_STARTED: {
    ring: "stroke-slate-300 dark:stroke-slate-600",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    label: "Boshlanmagan",
  },
  IN_PROGRESS: {
    ring: "stroke-sky-500",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
    label: "Jarayonda",
  },
  COMPLETED: {
    ring: "stroke-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    label: "Yakunlangan",
  },
  LOCKED: {
    ring: "stroke-slate-200 dark:stroke-slate-700",
    badge: "bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400",
    label: "Qulflangan",
  },
};

function ProgressRing({ percent, status }: { percent: number; status: BundleSubjectStatus }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const style = STATUS_STYLES[status];
  return (
    <svg
      className="h-16 w-16 shrink-0 motion-safe:transition-[stroke-dashoffset] motion-reduce:transition-none"
      viewBox="0 0 64 64"
      aria-hidden
    >
      <circle cx="32" cy="32" r={r} className="fill-none stroke-slate-200 dark:stroke-slate-700" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        className={cn("fill-none", style.ring)}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={status === "COMPLETED" ? 0 : offset}
        transform="rotate(-90 32 32)"
      />
      <text
        x="32"
        y="34"
        textAnchor="middle"
        className="fill-slate-800 text-[11px] font-bold dark:fill-slate-100"
      >
        {status === "COMPLETED" ? "✓" : `${Math.round(percent)}%`}
      </text>
    </svg>
  );
}

function SubjectCard({
  subject,
  onStart,
  pending,
}: {
  subject: BundleDashboardPayload["subjects"][number];
  onStart: (olympiadId: string) => void;
  pending: boolean;
}) {
  const st = STATUS_STYLES[subject.status];
  const pct = subject.status === "COMPLETED" ? 100 : subject.status === "IN_PROGRESS" ? 50 : 0;

  const actionLabel =
    subject.status === "COMPLETED"
      ? "Fanlar ro‘yxati"
      : subject.status === "IN_PROGRESS"
        ? "Davom etish"
        : subject.status === "LOCKED"
          ? "Qulflangan"
          : "Boshlash";

  return (
    <GlassCard
      className={cn(
        "flex flex-col gap-4 p-4 sm:p-5 motion-safe:hover:-translate-y-0.5 motion-reduce:hover:translate-none",
        subject.status === "LOCKED" && "opacity-75",
        "focus-within:ring-2 focus-within:ring-sky-500/40",
      )}
    >
      <div className="flex items-start gap-3">
        <ProgressRing percent={pct} status={subject.status} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {subject.subjectEmoji ? (
              <span className="text-2xl" aria-hidden>
                {subject.subjectEmoji}
              </span>
            ) : null}
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{subject.title}</h3>
          </div>
          <span className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", st.badge)}>
            {st.label}
          </span>
          <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <li>
              {subject.questionCount} ta savol · {subject.totalPoints} ball
            </li>
            <li>Taxminiy vaqt: {subject.durationMinutes} daqiqa</li>
            {subject.percent != null ? <li>Natija: {subject.percent}%</li> : null}
          </ul>
        </div>
      </div>
      <Button
        type="button"
        variant={subject.status === "COMPLETED" ? "outline" : "primary"}
        disabled={pending || subject.status === "LOCKED"}
        className="min-h-11 w-full"
        aria-label={`${subject.title} — ${actionLabel}`}
        onClick={() => onStart(subject.olympiadId)}
      >
        {pending ? "Yuklanmoqda…" : actionLabel}
      </Button>
    </GlassCard>
  );
}

export function OlympiadBundleSubjectSelector({ dashboard }: { dashboard: BundleDashboardPayload }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onStart = (olympiadId: string) => {
    start(async () => {
      const r = await startBundleSubject(olympiadId);
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      router.push(r.redirectTo);
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <GlassCard className="border-white/20 bg-white/95 p-5 dark:bg-slate-900/90 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
          Ko‘p fanli imtihon
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{dashboard.title}</h1>
        {dashboard.description ? (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{dashboard.description}</p>
        ) : null}
        <div className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-2">
          <p>
            <span className="font-semibold">Ishtirokchi:</span> {dashboard.studentName}
          </p>
          <p>
            <span className="font-semibold">Maktab:</span> {dashboard.schoolName}
          </p>
          <p>
            <span className="font-semibold">Sinf:</span> {dashboard.gradeLabel}
          </p>
          <p>
            <span className="font-semibold">Hudud:</span> {dashboard.region}
          </p>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Umumiy progress</span>
            <span>
              {dashboard.completedCount}/{dashboard.totalSubjects} fan · {dashboard.completionPercent}%
            </span>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            role="progressbar"
            aria-valuenow={dashboard.completionPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 motion-safe:transition-[width] motion-reduce:transition-none"
              style={{ width: `${dashboard.completionPercent}%` }}
            />
          </div>
        </div>
        {dashboard.allCompleted ? (
          <div className="mt-6">
            <Button href="/olympiada/bundle/results" className="min-h-11 w-full sm:w-auto">
              Yakuniy natijalar
            </Button>
          </div>
        ) : null}
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Fanlar ro‘yxati">
        {dashboard.subjects.map((sub) => (
          <div key={sub.olympiadId} role="listitem">
            <SubjectCard subject={sub} onStart={onStart} pending={pending} />
          </div>
        ))}
      </div>
    </div>
  );
}
