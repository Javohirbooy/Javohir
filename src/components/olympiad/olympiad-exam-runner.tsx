"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  olympiadAutosaveAnswers,
  olympiadLogViolation,
  olympiadSubmit,
  syncOlympiadTimer,
} from "@/app/actions/olympiad-participant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TestSessionTimer } from "@/components/tests/test-session-timer";
import { QuestionRichText } from "@/components/question/question-rich-text";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

function remainingSeconds(serverNowIso: string, serverEndsIso: string | null): number {
  if (!serverEndsIso) return 0;
  const end = new Date(serverEndsIso).getTime();
  const skew = new Date(serverNowIso).getTime() - Date.now();
  return Math.max(0, Math.ceil((end - Date.now() - skew) / 1000));
}

export type OlympiadQuestionDTO = { id: string; text: string; options: string[] };

export function OlympiadExamRunner({
  sessionId,
  title,
  questions,
  serverEndsAt,
  serverNow,
  antiCheatStrictness,
  initialAnswers,
}: {
  sessionId: string;
  title: string;
  questions: OlympiadQuestionDTO[];
  serverEndsAt: string | null;
  serverNow: string;
  antiCheatStrictness: string;
  initialAnswers: number[];
}) {
  const strict = antiCheatStrictness === "STRICT" || antiCheatStrictness === "STANDARD";
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() =>
    questions.map((_, i) => initialAnswers[i] ?? -1),
  );
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const [timerSec, setTimerSec] = useState(() => remainingSeconds(serverNow, serverEndsAt));
  const [done, setDone] = useState<{ score: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const devLogged = useRef(false);

  const q = questions[step];
  const progress = questions.length ? ((step + (done ? 1 : 0)) / questions.length) * 100 : 0;
  const letters = useMemo(() => LETTERS.slice(0, Math.min(LETTERS.length, q?.options.length ?? 0)), [q?.options.length]);

  useEffect(() => {
    setTimerSec(remainingSeconds(serverNow, serverEndsAt));
  }, [serverNow, serverEndsAt]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        const r = await syncOlympiadTimer(sessionId);
        if (r.ok && r.serverEndsAt) {
          setTimerSec(remainingSeconds(r.serverNow, r.serverEndsAt));
        }
      })();
    }, 30_000);
    return () => clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void olympiadAutosaveAnswers(sessionId, answersRef.current);
    }, 4000);
    return () => clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    if (!strict || done) return;
    const onCtx = (e: MouseEvent) => e.preventDefault();
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      void olympiadLogViolation(sessionId, "COPY_ATTEMPT", {});
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      void olympiadLogViolation(sessionId, "PASTE_ATTEMPT", {});
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C" || e.key === "x" || e.key === "X")) {
        e.preventDefault();
        void olympiadLogViolation(sessionId, "COPY_ATTEMPT", { key: e.key });
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        void olympiadLogViolation(sessionId, "PRINT_BLOCKED", {});
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
      }
    };
    window.addEventListener("contextmenu", onCtx);
    window.addEventListener("copy", onCopy);
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("contextmenu", onCtx);
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [strict, sessionId, done]);

  useEffect(() => {
    if (!strict || done) return;
    const onVis = () => {
      if (document.visibilityState !== "hidden") return;
      void olympiadLogViolation(sessionId, "VISIBILITY_HIDDEN", {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [strict, sessionId, done]);

  useEffect(() => {
    if (!strict || done) return;
    const onFs = () => {
      if (document.fullscreenElement) return;
      void olympiadLogViolation(sessionId, "FULLSCREEN_EXIT", {});
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [strict, sessionId, done]);

  useEffect(() => {
    if (!strict || done) return;
    const id = window.setInterval(() => {
      const threshold = 160;
      if (window.outerHeight - window.innerHeight > threshold || window.outerWidth - window.innerWidth > threshold) {
        if (!devLogged.current) {
          devLogged.current = true;
          void olympiadLogViolation(sessionId, "DEVTOOLS_SUSPECT", {});
        }
      }
    }, 4000);
    return () => clearInterval(id);
  }, [strict, sessionId, done]);

  const runSubmit = useCallback(
    (payload: number[], reason: "MANUAL" | "TIME") => {
      start(async () => {
        const res = await olympiadSubmit(sessionId, payload, reason);
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        setDone({ score: res.score });
      });
    },
    [sessionId],
  );

  const handleTimerExpire = useCallback(() => {
    if (done) return;
    const payload = answersRef.current.map((a) => (a < 0 ? -1 : a));
    runSubmit(payload, "TIME");
  }, [done, runSubmit]);

  function requestFs() {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      void el.requestFullscreen().catch(() => {});
    }
  }

  function selectOption(idx: number) {
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
    if (answers.some((a) => a < 0)) {
      setErr("Barcha savollarga javob bering.");
      return;
    }
    runSubmit(answers, "MANUAL");
  }

  if (done) {
    return (
      <div className="space-y-6">
        <Card className="border-slate-200/80 bg-white p-6 text-center shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-600">Yuborildi</p>
          <p className="mt-3 text-sm text-slate-600">
            Natijalar olimpiada sozlamalariga qarab keyinroq e&apos;lon qilinishi mumkin.
          </p>
          <p className="mt-4 text-4xl font-black text-slate-900">{done.score}%</p>
          <Button className="mt-6" href="/olympiada/submitted" variant="secondary">
            Keyingi qadam
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", strict && "select-none")}>
      {strict ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p>
            Olimpiada xavfsiz rejimida: yangi varaq ochilishi, nusxa ko&apos;chirish va to&apos;liq ekrandan chiqish
            qayd etiladi.
          </p>
          <Button type="button" variant="secondary" className="self-start px-4 py-2 text-xs" onClick={requestFs}>
            To&apos;liq ekran
          </Button>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-3xl border border-white/30 bg-white/10 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">{title}</p>
            <p className="mt-3 text-sm text-white/90">
              Savol {step + 1} / {questions.length} · {Math.round(progress)}%
            </p>
            <ProgressBar value={progress} trackClassName="mt-2 bg-emerald-100/80" className="from-emerald-400 via-green-400 to-teal-400" />
          </div>
          <TestSessionTimer totalSeconds={timerSec} onExpire={handleTimerExpire} />
        </div>
        <div className="rounded-2xl border border-white/25 bg-white/10 px-3 py-3 backdrop-blur-md sm:px-4">
          <p className="text-[0.7rem] font-medium text-white/85 sm:text-xs">Savollar bo&apos;yicha tez navigatsiya</p>
          <div className="mt-3 flex max-h-[min(32vh,260px)] flex-wrap content-start gap-2.5 overflow-y-auto pb-1 sm:max-h-[200px]">
            {questions.map((_, i) => {
              const answered = (answers[i] ?? -1) >= 0;
              const current = i === step;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  className={cn(
                    "flex h-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-2 text-sm font-bold transition active:scale-[0.97]",
                    current
                      ? "border-sky-400 bg-sky-500/90 text-white shadow-[0_0_16px_-4px_rgba(56,189,248,0.8)]"
                      : answered
                        ? "border-emerald-400/70 bg-emerald-500/85 text-white"
                        : "border-white/35 bg-white/15 text-white/90",
                  )}
                  aria-label={`Savol ${i + 1}`}
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
                className={cn(
                  "flex gap-3 rounded-2xl border-2 px-4 py-4 text-left text-sm font-semibold transition active:scale-[0.99]",
                  selected
                    ? "border-sky-500 bg-sky-50 text-sky-950 shadow-md ring-2 ring-sky-200/70"
                    : "border-slate-200 bg-white text-slate-800 hover:border-sky-300",
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
          <Button variant="secondary" type="button" onClick={prev} disabled={step === 0}>
            Oldingi
          </Button>
          {step < questions.length - 1 ? (
            <Button type="button" onClick={next} disabled={answers[step]! < 0}>
              Keyingi
            </Button>
          ) : (
            <Button type="button" onClick={finish} disabled={pending || answers[step]! < 0}>
              Yakunlash va yuborish
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
