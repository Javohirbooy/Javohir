"use client";

import { useEffect, useState } from "react";
import { beginTestAttempt, type BeginAttemptResult } from "@/app/actions/exam-session";
import { useT } from "@/components/providers/locale-provider";
import { TestRunner } from "@/components/tests/test-runner";

/**
 * Starts a server-tracked exam attempt (shuffle, timer, violations) then mounts the runner.
 * Does not bypass server checks — beginTestAttempt enforces cookie, window, and attempt limits.
 */
export function StudentExamBootstrap({ testId }: { testId: string }) {
  const tf = useT();
  const [state, setState] = useState<BeginAttemptResult | { loading: true }>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    beginTestAttempt(testId).then((r) => {
      if (!cancelled) setState(r);
    });
    return () => {
      cancelled = true;
    };
  }, [testId]);

  if ("loading" in state) {
    return (
      <div className="rounded-3xl border border-white/15 bg-white/5 px-6 py-10 text-center text-white/70 backdrop-blur-xl">
        {tf("tests.loadingSession")}
      </div>
    );
  }

  if (!state.ok) {
    return (
      <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 px-6 py-8 text-center text-rose-100">
        {state.error}
      </div>
    );
  }

  const timerSeconds =
    state.remainingSeconds != null
      ? Math.max(1, state.remainingSeconds)
      : state.durationMinutes != null
        ? Math.max(60, state.durationMinutes * 60)
        : Math.max(300, state.questions.length * 90);

  return (
    <TestRunner
      testId={testId}
      title={state.title}
      questions={state.questions}
      difficulty={state.difficulty}
      metaLine={state.metaLine}
      preview={false}
      studentExam={{ attemptId: state.attemptId, sessionToken: state.sessionToken }}
      protectedExamMode={state.protectedExamMode}
      tabSwitchPolicy={state.tabSwitchPolicy}
      timerSeconds={timerSeconds}
    />
  );
}
