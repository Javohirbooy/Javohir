"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { submitExamAttempt, logExamViolation } from "@/app/actions/exam-session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TestSessionTimer } from "@/components/tests/test-session-timer";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { QuestionRichText } from "@/components/question/question-rich-text";
import { cn } from "@/lib/utils";
import { difficultyLabel } from "@/lib/difficulty";
import { CheckCircle2, XCircle } from "lucide-react";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export type QuestionDTO = {
  id: string;
  text: string;
  options: string[];
  /** Only for admin/teacher preview — never sent for live student attempts. */
  correctIndex?: number;
};

export function TestRunner({
  testId,
  title,
  questions,
  difficulty,
  metaLine,
  preview = false,
  studentExam,
  protectedExamMode = false,
  tabSwitchPolicy = "AUTO_SUBMIT",
  timerSeconds,
}: {
  /** Kelajakda telemetriya / log uchun; hozircha sessiya `studentExam` orqali. */
  testId: string;
  title: string;
  questions: QuestionDTO[];
  difficulty?: string;
  metaLine?: string;
  preview?: boolean;
  studentExam?: { attemptId: string; sessionToken: string };
  protectedExamMode?: boolean;
  tabSwitchPolicy?: string;
  /** Countdown length for real student sessions; preview uses a default. */
  timerSeconds?: number | null;
}) {
  const tf = useT();
  const locale = useLocale();
  const tabPolicyLabel = useCallback(
    (policy: string) => {
      const key = `tabPolicy.${policy}`;
      const s = tf(key);
      return s === key ? policy : s;
    },
    [tf],
  );

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const answersRef = useRef(answers);
  void testId;
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const [done, setDone] = useState<null | {
    score: number;
    total: number;
    correct: number;
    breakdown: { text: string; options: string[]; correctIndex: number; userIndex: number }[];
    notice?: string;
  }>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [terminated, setTerminated] = useState(false);

  const q = questions[step];
  const progress = questions.length ? ((step + (done ? 1 : 0)) / questions.length) * 100 : 0;

  const letters = useMemo(() => LETTERS.slice(0, Math.min(LETTERS.length, q?.options.length ?? 0)), [q?.options.length]);

  const effectiveProtected = Boolean(studentExam && protectedExamMode && !preview);

  /** OS-level screenshots cannot be blocked in the browser; this is deterrence only. */
  useEffect(() => {
    if (!effectiveProtected) return;
    const onCtx = (e: MouseEvent) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C" || e.key === "x" || e.key === "X")) {
        e.preventDefault();
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
      }
    };
    window.addEventListener("contextmenu", onCtx);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("contextmenu", onCtx);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [effectiveProtected]);

  useEffect(() => {
    if (!effectiveProtected || !studentExam || preview || done) return;
    const onVis = () => {
      if (document.visibilityState !== "hidden") return;
      void logExamViolation(studentExam.attemptId, studentExam.sessionToken, "VISIBILITY_HIDDEN", {
        answers: answersRef.current,
      }).then((r) => {
        if (!r.ok) return;
        if (r.submit?.ok) {
          setDone({
            score: r.submit.score,
            total: r.submit.total,
            correct: r.submit.correct,
            breakdown: r.submit.questions.map((x) => ({
              text: x.text,
              options: x.options,
              correctIndex: x.correctIndex,
              userIndex: x.userIndex,
            })),
            notice: tf("testRunner.noticeTabViolation"),
          });
        } else if (r.terminated) {
          setTerminated(true);
        }
      });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [effectiveProtected, studentExam, preview, done, tf]);

  const runSubmit = useCallback(
    (payload: number[], reason: "MANUAL" | "TIME" | "TAB") => {
      if (!studentExam) return;
      start(async () => {
        const res = await submitExamAttempt(studentExam.attemptId, studentExam.sessionToken, payload, reason);
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        setDone({
          score: res.score,
          total: res.total,
          correct: res.correct,
          breakdown: res.questions.map((x) => ({
            text: x.text,
            options: x.options,
            correctIndex: x.correctIndex,
            userIndex: x.userIndex,
          })),
        });
      });
    },
    [studentExam],
  );

  const handleTimerExpire = useCallback(() => {
    if (!studentExam || preview || done) return;
    const payload = answersRef.current.map((a) => (a < 0 ? -1 : a));
    runSubmit(payload, "TIME");
  }, [studentExam, preview, done, runSubmit]);

  function selectOption(idx: number) {
    if (terminated) return;
    setAnswers((prev) => {
      const n = [...prev];
      n[step] = idx;
      return n;
    });
  }

  function next() {
    if (step < questions.length - 1) setStep((s) => s + 1);
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function finish() {
    setErr(null);
    if (terminated) return;
    if (answers.some((a) => a < 0)) {
      setErr(tf("testRunner.errAnswerAll"));
      return;
    }
    if (preview) {
      const canGradeLocally = questions.length > 0 && questions.every((q) => typeof q.correctIndex === "number");
      if (!canGradeLocally) {
        setDone({
          score: 0,
          total: 0,
          correct: 0,
          breakdown: [],
          notice: tf("testRunner.noticePreviewNoScore"),
        });
        return;
      }
      let correct = 0;
      const breakdown = questions.map((q, i) => {
        const correctIndex = q.correctIndex!;
        const userIndex = answers[i] ?? -1;
        const ok = userIndex === correctIndex;
        if (ok) correct += 1;
        return {
          text: q.text,
          options: q.options,
          correctIndex,
          userIndex,
        };
      });
      const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
      setDone({
        score,
        total: questions.length,
        correct,
        breakdown,
        notice: tf("testRunner.noticePreviewNotSaved"),
      });
      return;
    }
    if (!studentExam) {
      setErr(tf("testRunner.errNoSession"));
      return;
    }
    runSubmit(answers, "MANUAL");
  }

  if (done || terminated) {
    const show = done;
    return (
      <div className="space-y-8">
        {terminated && !show ? (
          <Card className="border-amber-200 bg-amber-50 p-6 text-center text-amber-950">
            <p className="font-semibold">{tf("testRunner.sessionEndedTitle")}</p>
            <p className="mt-2 text-sm text-amber-900/80">{tf("testRunner.sessionEndedHint")}</p>
          </Card>
        ) : null}
        {show ? (
          <>
            <Card className="border-slate-200/80 bg-white text-center shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-sky-600">{tf("testRunner.resultLabel")}</p>
              {show.notice ? <p className="mt-3 text-sm text-amber-700">{show.notice}</p> : null}
              <p className="mt-2 text-5xl font-black tracking-tight text-slate-900">
                {show.total ? `${show.score}%` : tf("testRunner.dash")}
              </p>
              {show.total ? (
                <p className="mt-2 text-slate-600">
                  {tf("testRunner.scoreDetails", { correct: show.correct, total: show.total })}
                </p>
              ) : null}
              {show.total ? <ProgressBar value={show.score} className="mt-6 from-sky-500 to-cyan-400" /> : null}
            </Card>
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">{tf("testRunner.summaryTitle")}</h2>
              {show.breakdown.map((row, i) => {
                const ok = row.userIndex === row.correctIndex;
                return (
                  <Card
                    key={i}
                    className={cn(
                      "border bg-white shadow-md",
                      ok ? "border-emerald-200 ring-2 ring-emerald-100" : "border-rose-200 ring-2 ring-rose-100",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {ok ? <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-500" /> : <XCircle className="mt-0.5 h-6 w-6 text-rose-500" />}
                      <div>
                        <div className="font-semibold text-slate-900">
                          <span className="mr-1">{i + 1}.</span>
                          <QuestionRichText content={row.text} className="inline [&_p]:inline" />
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {tf("testRunner.yourAnswer")}{" "}
                          <span className="font-medium text-slate-900">
                            {row.userIndex >= 0 ? row.options[row.userIndex] : tf("testRunner.dash")}
                          </span>
                        </p>
                        {!ok ? (
                          <p className="mt-1 text-sm text-emerald-700">
                            {tf("testRunner.correctAnswer")}{" "}
                            <span className="font-semibold">{row.options[row.correctIndex]}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  const tSec = timerSeconds ?? Math.max(120, questions.length * 90);

  return (
    <div className={cn("space-y-6", effectiveProtected && "select-none")}>
      {effectiveProtected ? (
        <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {tf("testRunner.protectedIntro")} {tabPolicyLabel(tabSwitchPolicy)}.
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-3xl border border-white/30 bg-white/10 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">{title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/55">
              {metaLine ? <span>{metaLine}</span> : null}
              {difficulty ? (
                <span className="rounded-full border border-emerald-300/45 bg-emerald-50/55 px-2 py-0.5 font-semibold text-emerald-800">
                  {difficultyLabel(difficulty, locale)}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-sm text-white/90">
              <span>
                {tf("testRunner.questionProgress", { current: step + 1, total: questions.length })}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <ProgressBar value={progress} trackClassName="mt-2 bg-emerald-100/80" className="from-emerald-400 via-green-400 to-teal-400" />
          </div>
          <TestSessionTimer
            totalSeconds={tSec}
            onExpire={!preview && studentExam ? handleTimerExpire : undefined}
          />
        </div>
        <div className="rounded-2xl border border-white/25 bg-white/10 px-3 py-3 backdrop-blur-md sm:px-4">
          <p className="text-[0.7rem] font-medium leading-snug text-white/85 sm:text-xs">{tf("testRunner.questionNavHint")}</p>
          <div className="mt-3 flex max-h-[min(32vh,260px)] flex-wrap content-start gap-2.5 overflow-y-auto [-webkit-overflow-scrolling:touch] pb-1 sm:max-h-[200px]">
            {questions.map((_, i) => {
              const answered = (answers[i] ?? -1) >= 0;
              const current = i === step;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={terminated}
                  onClick={() => {
                    if (!terminated) setStep(i);
                  }}
                  className={cn(
                    "flex h-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-2 text-sm font-bold transition active:scale-[0.97] disabled:opacity-50",
                    current
                      ? "border-sky-400 bg-sky-500/90 text-white shadow-[0_0_16px_-4px_rgba(56,189,248,0.8)] ring-2 ring-sky-300/50"
                      : answered
                        ? "border-emerald-400/70 bg-emerald-500/85 text-white hover:bg-emerald-500"
                        : "border-white/35 bg-white/15 text-white/90 hover:bg-white/25",
                  )}
                  aria-label={`${tf("testRunner.questionProgress", { current: i + 1, total: questions.length })}`}
                  aria-current={current ? "step" : undefined}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Card className="border-slate-200/80 bg-white shadow-xl">
        <div className="text-lg font-bold leading-snug text-slate-900">
          <QuestionRichText content={q?.text ?? ""} className="font-bold" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {q?.options.map((opt, idx) => {
            const selected = answers[step] === idx;
            const letter = letters[idx] ?? String(idx + 1);
            return (
              <button
                key={`${idx}-${opt}`}
                type="button"
                onClick={() => selectOption(idx)}
                disabled={terminated}
                className={cn(
                  "flex gap-3 rounded-2xl border-2 px-4 py-4 text-left text-sm font-semibold transition active:scale-[0.99]",
                  selected
                    ? "border-sky-500 bg-sky-50 text-sky-950 shadow-md ring-2 ring-sky-200/70"
                    : "border-slate-200 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50/60",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-xl text-xs font-black",
                    selected ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {letter}
                </span>
                <div className="min-w-0 flex-1 pt-0.5 text-slate-800">
                  <QuestionRichText content={opt} compact />
                </div>
              </button>
            );
          })}
        </div>
        {err ? <p className="mt-4 text-sm font-medium text-rose-600">{err}</p> : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="secondary" type="button" onClick={prev} disabled={step === 0 || terminated}>
            {tf("testRunner.prev")}
          </Button>
          {step < questions.length - 1 ? (
            <Button type="button" onClick={next} disabled={answers[step]! < 0 || terminated}>
              {tf("testRunner.next")}
            </Button>
          ) : (
            <Button type="button" onClick={finish} disabled={pending || answers[step]! < 0 || terminated}>
              {tf("testRunner.finish")}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
