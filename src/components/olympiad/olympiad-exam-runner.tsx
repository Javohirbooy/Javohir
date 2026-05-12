"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { TouchEvent } from "react";
import {
  olympiadAutosaveBatch,
  olympiadLogViolation,
  olympiadSubmit,
  syncOlympiadTimer,
} from "@/app/actions/olympiad-participant";
import type { OlympiadAnswerSigningPayload } from "@/lib/olympiad/exam-types";
import {
  deleteOlympiadAutosaveByIds,
  enqueueOlympiadAutosavePending,
  peekOlympiadAutosaveQueue,
} from "@/lib/olympiad/olympiad-autosave-idb-queue";
import { Button } from "@/components/ui/button";
import {
  ExamCard,
  GlassCard,
  OlympiadExamProgressBar,
  QuestionNavigator,
  StatusIndicator,
  TimerBadge,
} from "@/components/ui/olympiad";
import { QuestionRichText } from "@/components/question/question-rich-text";
import { olympiadType } from "@/lib/ui/design-system";
import {
  answeredMomentumPercent,
  computeExamStressScore,
  latestUnseenMilestone,
  milestoneEncouragementUz,
  playSoftSaveChime,
  shouldAutoFocusMode,
} from "@/lib/olympiad/exam-hybrid-ux";
import { cn } from "@/lib/utils";
import { Check, LayoutGrid, Loader2, Maximize2, Square, Volume2, VolumeX } from "lucide-react";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
const AUTOSAVE_MS = 10_000;
const AUTOSAVE_DEBOUNCE_MS = 900;
const MULTI_TAB_VIOLATION_COOLDOWN_MS = 4_000;

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
  signingMode,
  enableExamWatermark,
  watermarkText,
  enableMultiTabDetect,
  serverAutosaveSeq = 0,
}: {
  sessionId: string;
  title: string;
  questions: OlympiadQuestionDTO[];
  serverEndsAt: string | null;
  serverNow: string;
  antiCheatStrictness: string;
  initialAnswers: number[];
  signingMode: "off" | "seq";
  enableExamWatermark: boolean;
  watermarkText: string | null;
  enableMultiTabDetect: boolean;
  serverAutosaveSeq?: number;
}) {
  const strict = antiCheatStrictness === "STRICT" || antiCheatStrictness === "STANDARD";
  const signingActive = signingMode === "seq";
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => questions.map((_, i) => initialAnswers[i] ?? -1));
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const seqRef = useRef(serverAutosaveSeq);
  const saveInFlight = useRef(false);
  const lastSentJson = useRef<string | null>(null);
  const lastQueuedJson = useRef<string | null>(null);
  const debounceTimer = useRef<number | null>(null);
  const tabId = useMemo(() => (globalThis.crypto?.randomUUID?.() ?? `t${Date.now()}`) as string, []);
  const lastMultiTabViolationAt = useRef(0);

  const [timerSec, setTimerSec] = useState(() => remainingSeconds(serverNow, serverEndsAt));
  const [done, setDone] = useState<{ score: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const devLogged = useRef(false);
  const [focusMode, setFocusMode] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [hybridTip, setHybridTip] = useState<string | null>(null);
  const [stress, setStress] = useState(0);
  const [pulseIdx, setPulseIdx] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const stepNavTimestamps = useRef<number[]>([]);
  const optionFlipLog = useRef<Array<{ t: number; q: number }>>([]);
  const milestonesShown = useRef(new Set<string>());
  const milestoneSeedDone = useRef(false);
  const autoFocusApplied = useRef(false);
  const pulseTimer = useRef<number | null>(null);

  const q = questions[step];
  const progress = questions.length ? ((step + (done ? 1 : 0)) / questions.length) * 100 : 0;
  const momentum = answeredMomentumPercent(answers);
  const letters = useMemo(() => LETTERS.slice(0, Math.min(LETTERS.length, q?.options.length ?? 0)), [q?.options.length]);

  useEffect(() => {
    setSoundOn(typeof window !== "undefined" && window.sessionStorage.getItem("olympiad_exam_sound") === "1");
  }, []);

  useEffect(() => {
    if (milestoneSeedDone.current) return;
    milestoneSeedDone.current = true;
    const ratio = answeredMomentumPercent(answers) / 100;
    for (const k of [0.25, 0.5, 0.75] as const) {
      if (ratio >= k - 0.001) milestonesShown.current.add(String(k));
    }
  }, [answers]);

  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      stepNavTimestamps.current = stepNavTimestamps.current.filter((t) => t > now - 25_000);
      optionFlipLog.current = optionFlipLog.current.filter((o) => o.t > now - 25_000);
      const jumps = stepNavTimestamps.current.length;
      const flips = optionFlipLog.current.filter((o) => o.q === step && o.t > now - 20_000).length;
      const s = computeExamStressScore({
        stepJumpsLast25s: jumps,
        optionFlipsOnCurrentStep20s: flips,
        timerSec,
      });
      setStress(s);
      if (shouldAutoFocusMode(s) && !autoFocusApplied.current) {
        autoFocusApplied.current = true;
        setFocusMode(true);
        setHybridTip("Diqqatni jamlash uchun fokus rejimi avtomatik yoqildi — kerak bo‘lsa panelni qayta oching.");
        window.setTimeout(() => setHybridTip((prev) => (prev?.includes("fokus rejimi") ? null : prev)), 7000);
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [done, step, timerSec]);

  useEffect(() => {
    if (done || !questions.length) return;
    const ratio = momentum / 100;
    const m = latestUnseenMilestone(ratio, milestonesShown.current);
    if (m == null) return;
    milestonesShown.current.add(String(m));
    const msg = milestoneEncouragementUz(m);
    setHybridTip(msg);
    const tid = window.setTimeout(() => setHybridTip((cur) => (cur === msg ? null : cur)), 6500);
    return () => window.clearTimeout(tid);
  }, [answers, done, momentum, questions.length]);

  const buildSigning = useCallback((): OlympiadAnswerSigningPayload | undefined => {
    if (!signingActive) return undefined;
    seqRef.current += 1;
    return { seq: seqRef.current };
  }, [signingActive]);

  const flushQueueFromIdb = useCallback(async () => {
    if (done || saveInFlight.current) return;
    saveInFlight.current = true;
    setSaveBusy(true);
    let anyOk = false;
    try {
      for (let round = 0; round < 8; round += 1) {
        const rows = await peekOlympiadAutosaveQueue(sessionId, 15);
        if (!rows.length) break;
        const items = rows.map((r) => ({
          displayAnswers: r.displayAnswers,
          signing: r.signing ?? null,
        }));
        const res = await olympiadAutosaveBatch(sessionId, items);
        if (res.ok) {
          anyOk = true;
          await deleteOlympiadAutosaveByIds(rows.map((r) => r.id));
          const last = rows[rows.length - 1]!;
          lastSentJson.current = last.payloadJson;
          lastQueuedJson.current = last.payloadJson;
        } else {
          if (res.error) setErr(res.error);
          break;
        }
      }
      if (anyOk) {
        playSoftSaveChime();
        setSaveFlash(true);
        window.setTimeout(() => setSaveFlash(false), 2400);
      }
    } finally {
      saveInFlight.current = false;
      setSaveBusy(false);
    }
  }, [done, sessionId]);

  const scheduleEnqueueAutosave = useCallback(() => {
    if (done) return;
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      debounceTimer.current = null;
      void (async () => {
        const payload = answersRef.current.map((a) => (a < 0 ? -1 : a));
        const json = JSON.stringify(payload);
        if (json === lastQueuedJson.current && json === lastSentJson.current) return;
        const signing = buildSigning();
        await enqueueOlympiadAutosavePending({
          sessionId,
          displayAnswers: payload,
          signing,
          payloadJson: json,
          createdAt: Date.now(),
        });
        lastQueuedJson.current = json;
        await flushQueueFromIdb();
      })();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [buildSigning, done, flushQueueFromIdb, sessionId]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    };
  }, []);

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
    return () => window.clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    void flushQueueFromIdb();
  }, [flushQueueFromIdb]);

  useEffect(() => {
    if (done) return;
    scheduleEnqueueAutosave();
  }, [answers, done, scheduleEnqueueAutosave]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void flushQueueFromIdb();
    }, AUTOSAVE_MS);
    return () => window.clearInterval(id);
  }, [flushQueueFromIdb]);

  useEffect(() => {
    const onLeave = () => {
      void flushQueueFromIdb();
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [flushQueueFromIdb]);

  useEffect(() => {
    if (!enableMultiTabDetect || done || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(`iq_olymp_exam_${sessionId}`);
    let warned = false;
    const onMsg = (ev: MessageEvent) => {
      const d = ev.data as { t?: string; id?: string } | undefined;
      if (d?.t === "claim" && d.id && d.id !== tabId && !warned) {
        warned = true;
        const now = Date.now();
        if (now - lastMultiTabViolationAt.current < MULTI_TAB_VIOLATION_COOLDOWN_MS) return;
        lastMultiTabViolationAt.current = now;
        void olympiadLogViolation(sessionId, "MULTI_TAB_DETECTED", { peer: d.id.slice(0, 8) });
      }
    };
    ch.addEventListener("message", onMsg);
    ch.postMessage({ t: "claim", id: tabId });
    return () => {
      ch.removeEventListener("message", onMsg);
      ch.close();
    };
  }, [done, enableMultiTabDetect, sessionId, tabId]);

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
    return () => window.clearInterval(id);
  }, [strict, sessionId, done]);

  const runSubmit = useCallback(
    (payload: number[], reason: "MANUAL" | "TIME") => {
      start(async () => {
        for (let i = 0; i < 50 && saveInFlight.current; i += 1) {
          await new Promise((r) => setTimeout(r, 40));
        }
        await flushQueueFromIdb();
        const signing = buildSigning();
        const res = await olympiadSubmit(sessionId, payload, reason, signing);
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        setDone({ score: res.score });
      });
    },
    [buildSigning, flushQueueFromIdb, sessionId],
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

  function goToStep(s: number) {
    if (done || s < 0 || s >= questions.length || s === step) return;
    stepNavTimestamps.current.push(Date.now());
    setStep(s);
  }

  function selectOption(idx: number) {
    if (done) return;
    const prevIdx = answersRef.current[step] ?? -1;
    if (prevIdx >= 0 && prevIdx !== idx) {
      optionFlipLog.current.push({ t: Date.now(), q: step });
    }
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    setPulseIdx(idx);
    pulseTimer.current = window.setTimeout(() => {
      setPulseIdx(null);
      pulseTimer.current = null;
    }, 380);
    setAnswers((prev) => {
      const n = [...prev];
      n[step] = idx;
      return n;
    });
  }

  function next() {
    if (step < questions.length - 1) goToStep(step + 1);
  }

  function prev() {
    if (step > 0) goToStep(step - 1);
  }

  function toggleExamSound() {
    if (typeof window === "undefined") return;
    if (soundOn) {
      window.sessionStorage.removeItem("olympiad_exam_sound");
      setSoundOn(false);
    } else {
      window.sessionStorage.setItem("olympiad_exam_sound", "1");
      setSoundOn(true);
    }
  }

  function finish() {
    setErr(null);
    if (answers.some((a) => a < 0)) {
      setErr("Barcha savollarga javob bering.");
      return;
    }
    runSubmit(answers, "MANUAL");
  }

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current == null) return;
    const x = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = x - touchStartX.current;
    touchStartX.current = null;
    if (dx > 56) prev();
    else if (dx < -56) next();
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg animate-[iq-fade-scale_0.5s_ease-out_forwards]">
        <GlassCard className="p-8 text-center">
          <p className={cn(olympiadType.overline, "text-[#22C55E]")}>Yuborildi</p>
          <p className={cn(olympiadType.body, "mt-3 text-slate-600 dark:text-slate-300")}>
            Natijalar olimpiada sozlamalariga qarab keyinroq e&apos;lon qilinishi mumkin.
          </p>
          <p className="mt-6 bg-gradient-to-br from-[#4F7CFF] to-emerald-500 bg-clip-text text-5xl font-black tabular-nums text-transparent sm:text-6xl">
            {done.score}%
          </p>
          <Button className="mt-8 min-h-[48px] w-full sm:w-auto" href="/olympiada/submitted" variant="secondary">
            Keyingi qadam
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={cn("relative pb-28 sm:pb-6", strict && "select-none")}>
      {enableExamWatermark && watermarkText ? (
        <div
          className="pointer-events-none fixed inset-0 z-[5] overflow-hidden opacity-[0.06] dark:opacity-[0.08]"
          aria-hidden
          style={{
            backgroundImage: `repeating-linear-gradient(-24deg, transparent, transparent 48px, rgba(79,124,255,0.35) 48px, rgba(79,124,255,0.35) 49px)`,
          }}
        >
          <div className="absolute inset-0 flex rotate-[-18deg] items-center justify-center text-2xl font-black text-slate-900 dark:text-white">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="mx-12 whitespace-nowrap">
                {watermarkText}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 mb-4 border-b border-white/10 bg-slate-950/85 pb-3 pt-1 backdrop-blur-xl dark:bg-slate-950/90">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn(olympiadType.overline, "text-white/70")}>Imtihon</p>
              {saveFlash ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-100 ring-1 ring-[#22C55E]/40 animate-[iq-fade-up_0.35s_ease-out]">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Saqlangan
                </span>
              ) : saveBusy ? (
                <span className="inline-flex items-center gap-1 text-xs text-white/70">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Saqlanmoqda…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
                  <StatusIndicator tone="neutral" label="Avtosave holati" />
                  Tayyor
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-white sm:text-base">{title}</p>
            <div className="mt-2 max-w-md space-y-2">
              <OlympiadExamProgressBar value={progress} trackClassName="bg-white/15" />
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">Javoblar (momentum)</p>
                <OlympiadExamProgressBar
                  value={momentum}
                  trackClassName="bg-white/12"
                  barClassName="from-emerald-400 via-teal-400 to-cyan-400"
                />
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/70">
              <span>
                Savol {step + 1} / {questions.length}
              </span>
              {stress >= 40 ? (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-amber-100 ring-1 ring-amber-400/30">
                  Barqarorlik: avval joriy savolni yakunlang
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end md:flex-row md:items-center">
            <TimerBadge totalSeconds={timerSec} warnBelowSeconds={600} criticalBelowSeconds={60} onExpire={handleTimerExpire} />
            <button
              type="button"
              onClick={toggleExamSound}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/15"
              aria-pressed={soundOn}
              aria-label={soundOn ? "Avtosave ovozini o‘chirish" : "Avtosave ovozini yoqish"}
            >
              {soundOn ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
              <span className="hidden sm:inline">{soundOn ? "Ovoz" : "Ovozsiz"}</span>
            </button>
            <button
              type="button"
              onClick={() => setFocusMode((f) => !f)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/15"
              aria-pressed={focusMode}
              aria-label={focusMode ? "Savollar panelini ko‘rsatish" : "Fokus rejimi"}
            >
              {focusMode ? <LayoutGrid className="h-5 w-5" aria-hidden /> : <Square className="h-5 w-5" aria-hidden />}
              <span className="hidden sm:inline">{focusMode ? "Panel" : "Fokus"}</span>
            </button>
          </div>
        </div>
      </header>

      {hybridTip ? (
        <div
          role="status"
          className="mb-4 animate-[iq-fade-up_0.4s_ease-out_forwards] rounded-2xl border border-[#4F7CFF]/25 bg-gradient-to-r from-[#4F7CFF]/15 to-emerald-500/10 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm dark:border-white/10 dark:from-sky-500/20 dark:to-emerald-500/10 dark:text-slate-100"
        >
          {hybridTip}
        </div>
      ) : null}

      {strict ? (
        <GlassCard className="mb-4 border-amber-300/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-50">
          <p>
            Xavfsiz rejim: nusxa ko&apos;chirish, yangi varaq va to&apos;liq ekrandan chiqish qayd etiladi.
          </p>
          <Button type="button" variant="secondary" className="mt-3 min-h-[44px] text-xs" onClick={requestFs}>
            <Maximize2 className="mr-2 h-4 w-4" />
            To&apos;liq ekran
          </Button>
        </GlassCard>
      ) : null}

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside
          className={cn(
            "lg:w-60 lg:shrink-0 lg:transition-all lg:duration-300",
            focusMode && "hidden",
            !focusMode && "lg:sticky lg:top-[7.5rem]",
          )}
        >
          <QuestionNavigator
            total={questions.length}
            currentIndex={step}
            answers={answers}
            onSelect={goToStep}
            hidden={false}
          />
        </aside>

        <main className="min-w-0 flex-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <ExamCard
            key={step}
            className="relative animate-[iq-fade-up_0.35s_ease-out_forwards] shadow-2xl"
          >
            <div className={cn(olympiadType.h3, "text-slate-900 dark:text-slate-100")}>
              <QuestionRichText content={q?.text ?? ""} className="font-bold leading-snug" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {q?.options.map((opt, idx) => {
                const selected = answers[step] === idx;
                const pulsing = pulseIdx === idx;
                return (
                  <button
                    key={`${step}-${idx}-${opt}`}
                    type="button"
                    onClick={() => selectOption(idx)}
                    className={cn(
                      "flex min-h-[52px] gap-3 rounded-2xl border-2 px-4 py-4 text-left text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
                      pulsing && "animate-[iq-fade-scale_0.45s_ease-out]",
                      selected
                        ? "border-[#4F7CFF] bg-[#4F7CFF]/10 text-slate-900 shadow-md ring-2 ring-[#4F7CFF]/30 dark:bg-[#4F7CFF]/20 dark:text-white"
                        : "border-slate-200 bg-white text-slate-800 hover:border-[#4F7CFF]/50 hover:shadow-md dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-sky-500/50",
                      pulsing && "ring-2 ring-emerald-400/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black",
                        selected ? "bg-[#4F7CFF] text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                      )}
                    >
                      {letters[idx] ?? idx + 1}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5 text-base leading-snug text-slate-800 dark:text-slate-100">
                      <QuestionRichText content={opt} compact />
                    </div>
                  </button>
                );
              })}
            </div>
            {err ? (
              <p key={err} className="olympiad-shake mt-4 text-sm font-medium text-[#EF4444]">
                {err}
              </p>
            ) : null}

            <div className="mt-8 hidden flex-wrap gap-3 sm:flex">
              <Button variant="secondary" type="button" className="min-h-[48px] min-w-[120px]" onClick={prev} disabled={step === 0}>
                Oldingi
              </Button>
              {step < questions.length - 1 ? (
                <Button type="button" className="min-h-[48px] min-w-[120px]" onClick={next} disabled={answers[step]! < 0}>
                  Keyingi
                </Button>
              ) : (
                <Button type="button" className="min-h-[48px] min-w-[120px]" onClick={finish} disabled={pending || answers[step]! < 0}>
                  Yakunlash va yuborish
                </Button>
              )}
            </div>
          </ExamCard>
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex gap-3 border-t border-white/10 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden"
        aria-label="Savol navigatsiyasi"
      >
        <Button variant="secondary" type="button" className="min-h-[48px] flex-1" onClick={prev} disabled={step === 0}>
          Oldingi
        </Button>
        {step < questions.length - 1 ? (
          <Button type="button" className="min-h-[48px] flex-1" onClick={next} disabled={answers[step]! < 0}>
            Keyingi
          </Button>
        ) : (
          <Button type="button" className="min-h-[48px] flex-1" onClick={finish} disabled={pending || answers[step]! < 0}>
            Yuborish
          </Button>
        )}
      </nav>
    </div>
  );
}
