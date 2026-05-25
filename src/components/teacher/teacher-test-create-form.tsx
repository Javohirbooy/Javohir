"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createTest,
  updateTeacherTest,
  type CreateTeacherTestInput,
  type TeacherQuestionInput,
} from "@/app/actions/teacher-tests";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { datetimeLocalValueToUtcIso } from "@/lib/datetime-local";
import { QuestionEditBlock } from "@/components/question/question-edit-preview";
import { MAX_QUESTION_INLINE_IMAGE_FILE_BYTES } from "@/lib/uploads/image-limits";

/** Yorqin maydon: qora `select`/`datetime` OS ichida matn va optionlarni yashirib yuboradi. */
const OL_DASH_FIELD =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-500 focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400/35 [color-scheme:light]";

const OL_DASH_FIELD_MONO = `${OL_DASH_FIELD} font-mono`;

const OL_DASH_FIELD_COMPACT =
  "min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400/35 [color-scheme:light]";

export type SubjectOption = { id: string; title: string; gradeId: string; gradeLabel: string };
export type GradeOption = { id: string; name: string; number: number };

export type TeacherTestEditInitial = {
  testId: string;
  title: string;
  description: string;
  gradeId: string;
  subjectId: string;
  topicId: string;
  difficulty: string;
  durationMinutes: number;
  passScore: number;
  maxAttempts: number;
  startsAt: string;
  endsAt: string;
  protectedExamMode: boolean;
  tabSwitchPolicy: string;
  antiCheatMode: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: TeacherQuestionInput[];
};

function emptyQuestion(): TeacherQuestionInput {
  return { text: "", options: ["", "", "", ""], correctIndex: 0, points: 1 };
}

export function TeacherTestCreateForm({
  variant,
  subjects,
  grades,
  topicsBySubjectId,
  defaultSubjectId,
  afterPublishHref = "/oqituvchi/testlar",
  edit,
}: {
  variant: "teacher" | "admin";
  subjects: SubjectOption[];
  grades?: GradeOption[];
  topicsBySubjectId?: Record<string, { id: string; title: string }[]>;
  defaultSubjectId?: string;
  afterPublishHref?: string;
  edit?: TeacherTestEditInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const initialGrade =
    edit?.gradeId ??
    (variant === "teacher" && grades?.length
      ? grades.find((g) => subjects.some((s) => s.id === (defaultSubjectId ?? subjects[0]?.id) && s.gradeId === g.id))?.id ??
        grades[0]!.id
      : subjects.find((s) => s.id === (defaultSubjectId ?? subjects[0]?.id))?.gradeId ?? "");

  const [gradeId, setGradeId] = useState(initialGrade);

  const filteredSubjects = useMemo(() => {
    if (variant === "admin") return subjects;
    return subjects.filter((s) => s.gradeId === gradeId);
  }, [subjects, gradeId, variant]);

  const [title, setTitle] = useState(edit?.title ?? "");
  const [description, setDescription] = useState(edit?.description ?? "");
  const [subjectId, setSubjectId] = useState(() => {
    if (edit?.subjectId) return edit.subjectId;
    const d = defaultSubjectId ?? subjects[0]?.id ?? "";
    return d;
  });
  const [topicId, setTopicId] = useState(edit?.topicId ?? "");
  const [topicTitle, setTopicTitle] = useState("");
  const [difficulty, setDifficulty] = useState(edit?.difficulty ?? "MEDIUM");
  const [durationMinutes, setDurationMinutes] = useState(edit?.durationMinutes ?? 30);
  const [passScore, setPassScore] = useState(edit?.passScore ?? 60);
  const [maxAttempts, setMaxAttempts] = useState(edit?.maxAttempts ?? 1);
  const [questionCountTarget, setQuestionCountTarget] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [isDraft, setIsDraft] = useState(false);
  const [startsAt, setStartsAt] = useState(edit?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(edit?.endsAt ?? "");
  const [protectedExamMode, setProtectedExamMode] = useState(edit?.protectedExamMode ?? false);
  const [tabSwitchPolicy, setTabSwitchPolicy] = useState(edit?.tabSwitchPolicy ?? "AUTO_SUBMIT");
  const [antiCheatMode, setAntiCheatMode] = useState(edit?.antiCheatMode ?? "STANDARD");
  const [shuffleQuestions, setShuffleQuestions] = useState(edit?.shuffleQuestions ?? true);
  const [shuffleOptions, setShuffleOptions] = useState(edit?.shuffleOptions ?? true);
  const [questions, setQuestions] = useState<TeacherQuestionInput[]>(
    edit?.questions?.length ? edit.questions : [emptyQuestion(), emptyQuestion(), emptyQuestion()],
  );
  const topicChoices = topicsBySubjectId?.[subjectId] ?? [];

  useEffect(() => {
    if (variant !== "teacher") return;
    if (filteredSubjects.length && !filteredSubjects.some((s) => s.id === subjectId)) {
      setSubjectId(filteredSubjects[0]!.id);
      setTopicId("");
    }
  }, [variant, filteredSubjects, subjectId]);

  const subjectLabel = useMemo(() => {
    const s = subjects.find((x) => x.id === subjectId);
    return s ? `${s.title} (${s.gradeLabel})` : "";
  }, [subjects, subjectId]);

  function updateQuestion(i: number, patch: Partial<TeacherQuestionInput>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const options = [...q.options];
        options[oIndex] = value;
        return { ...q, options };
      }),
    );
  }

  function appendQuestionImageMarkdown(qIndex: number, dataUrl: string) {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qIndex ? { ...q, text: `${q.text}\n\n![](${dataUrl})\n` } : q,
      ),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(i: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function buildInput(publishIntent: "draft" | "publish"): CreateTeacherTestInput {
    return {
      title,
      description: description.trim() || null,
      subjectId,
      gradeId: variant === "teacher" ? gradeId : undefined,
      topicId: topicId || null,
      topicTitle: topicTitle.trim() || undefined,
      difficulty,
      durationMinutes,
      passScore,
      maxAttempts,
      questionCountTarget,
      isActive: publishIntent === "publish" ? true : isActive,
      isDraft: publishIntent === "draft",
      publishIntent,
      questions,
      startsAt: startsAt ? (datetimeLocalValueToUtcIso(startsAt) ?? startsAt) : null,
      endsAt: endsAt ? (datetimeLocalValueToUtcIso(endsAt) ?? endsAt) : null,
      protectedExamMode,
      tabSwitchPolicy,
      antiCheatMode,
      shuffleQuestions,
      shuffleOptions,
    };
  }

  function runSave(publishIntent: "draft" | "publish") {
    setError(null);
    setSuccessMsg(null);
    if (variant === "teacher" && !gradeId) {
      setError("Sinfni tanlang.");
      return;
    }
    if (variant === "teacher" && !filteredSubjects.some((s) => s.id === subjectId)) {
      setError("Tanlangan sinf uchun fan topilmadi.");
      return;
    }
    const input = buildInput(publishIntent);
    startTransition(async () => {
      const res = edit ? await updateTeacherTest(edit.testId, input) : await createTest(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (publishIntent === "draft") setSuccessMsg("Qoralama saqlandi.");
      else setSuccessMsg(edit ? "O‘zgarishlar saqlandi." : "Test nashr qilindi.");
      router.refresh();
      if (publishIntent === "publish") {
        if (edit) router.push(`/oqituvchi/testlar/${edit.testId}/tahrirlash`);
        else router.push(afterPublishHref);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={variant === "teacher" ? "/oqituvchi/testlar" : "/admin/testlar"}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
        >
          ← Ro‘yxatga
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      ) : null}
      {successMsg ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{successMsg}</div>
      ) : null}

      <DashboardCard className="border-violet-400/15">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Asosiy ma’lumotlar</h2>
            <p className="mt-1 text-sm text-white/55">{subjectLabel || "Fan va sinfni tanlang"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => runSave("draft")}
              className="rounded-2xl border border-amber-400/35 bg-amber-500/10 px-5 py-2.5 text-sm font-bold text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50"
            >
              Qoralama saqlash
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => runSave("publish")}
              className="rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-900/40 ring-1 ring-white/20 transition hover:brightness-110 disabled:opacity-50"
            >
              Nashr qilish
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {variant === "teacher" && grades?.length ? (
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Sinf / sinf (faqat biriktirilganlar)</span>
              <select
                value={gradeId}
                onChange={(e) => {
                  setGradeId(e.target.value);
                  setSubjectId("");
                  setTopicId("");
                }}
                className={OL_DASH_FIELD}
              >
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.number}-sinf)
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Test nomi</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={OL_DASH_FIELD}
              placeholder="Masalan: Algebra — 1-bob nazorati"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Tavsif (ixtiyoriy)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={OL_DASH_FIELD}
              placeholder="O‘quvchilarga ko‘rinadigan qisqa izoh"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Fan</span>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setTopicId("");
              }}
              className={OL_DASH_FIELD}
            >
              {filteredSubjects.length === 0 ? (
                <option value="">—</option>
              ) : null}
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {s.gradeLabel}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Mavzu (katalogdan)</span>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className={OL_DASH_FIELD}
            >
              <option value="">— Tanlanmagan —</option>
              {topicChoices.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Yangi mavzu nomi (ixtiyoriy, katalogga qo‘shiladi)</span>
            <input
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              className={OL_DASH_FIELD}
              placeholder="Agar yuqorida mavzu tanlanmasa, shu yerda yozing"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Qiyinchilik</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={OL_DASH_FIELD}
            >
              <option value="EASY">Oson</option>
              <option value="MEDIUM">O‘rta</option>
              <option value="HARD">Qiyin</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Davomiylik (daq)</span>
            <input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value) || 1)}
              className={OL_DASH_FIELD}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">O‘tish balli (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={passScore}
              onChange={(e) => setPassScore(Number(e.target.value) || 0)}
              className={OL_DASH_FIELD}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Urinish limiti (0 = cheksiz)</span>
            <input
              type="number"
              min={0}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value) || 0)}
              className={OL_DASH_FIELD}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Reja: savollar soni</span>
            <input
              type="number"
              min={1}
              value={questionCountTarget}
              onChange={(e) => setQuestionCountTarget(Number(e.target.value) || 1)}
              className={OL_DASH_FIELD}
            />
          </label>

          {variant === "admin" ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
              <label className="flex items-center gap-3 text-sm text-white/80">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded" />
                Aktiv
              </label>
              <label className="flex items-center gap-3 text-sm text-white/80">
                <input type="checkbox" checked={isDraft} onChange={(e) => setIsDraft(e.target.checked)} className="h-4 w-4 rounded" />
                Qoralama
              </label>
            </div>
          ) : null}
        </div>
      </DashboardCard>

      <DashboardCard className="border-emerald-400/10">
        <h2 className="text-lg font-bold text-white">Vaqt va himoya</h2>
        <p className="mt-1 text-sm text-white/50">
          OS darajasida skrinshotlarni to‘liq bloklash mumkin emas — himoya brauzer darajasida. STRICT rejim qat’iyroq siyosatni majburan qo‘llaydi.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Boshlanish (mahalliy)</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={OL_DASH_FIELD}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Tugash (mahalliy)</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={OL_DASH_FIELD}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Anti-cheat profili</span>
            <select
              value={antiCheatMode}
              onChange={(e) => setAntiCheatMode(e.target.value)}
              className={OL_DASH_FIELD}
            >
              <option value="OFF">Oddiy</option>
              <option value="STANDARD">Standart</option>
              <option value="STRICT">Qat’iy (himoya + avto-yuborish)</option>
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm text-white/80">
            <input
              type="checkbox"
              checked={protectedExamMode}
              onChange={(e) => setProtectedExamMode(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Himoyalangan imtihon rejimi
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Varaqdan chiqish siyosati</span>
            <select
              value={tabSwitchPolicy}
              onChange={(e) => setTabSwitchPolicy(e.target.value)}
              className={OL_DASH_FIELD}
            >
              <option value="WARNING">Faqat ogohlantirish</option>
              <option value="AUTO_FAIL">Avto-yiqilish (0 ball)</option>
              <option value="AUTO_SUBMIT">Avto-yuborish</option>
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm text-white/80">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Savollarni aralashtirish
          </label>
          <label className="flex items-center gap-3 text-sm text-white/80">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Javob variantlarini aralashtirish
          </label>
        </div>
      </DashboardCard>

      <DashboardCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Savollar</h2>
          <button
            type="button"
            onClick={addQuestion}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            + Savol
          </button>
        </div>
        <p className="mt-2 text-sm text-white/50">Kamida bitta to‘liq savol (matn + 2+ variant) bo‘lishi kerak.</p>
        <p className="mt-1 text-xs text-white/40">
          <span className="text-white/55">Rich matn:</span> Markdown, LaTeX{" "}
          <code className="rounded bg-white/10 px-1">$a^2$</code> yoki <code className="rounded bg-white/10 px-1">$$…$$</code>, rasm —{" "}
          <code className="rounded bg-white/10 px-1">![](URL)</code> yoki quyidagi “Rasm qo‘shish” (≈450KB gacha, base64).
        </p>

        <div className="mt-6 space-y-6">
          {questions.map((q, qi) => (
            <div key={qi} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-violet-200/90">Savol {qi + 1}</span>
                {questions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qi)}
                    className="text-xs font-semibold text-rose-300 hover:text-rose-200"
                  >
                    Olib tashlash
                  </button>
                ) : null}
              </div>
              <QuestionEditBlock
                text={q.text}
                options={q.options}
                correctIndex={q.correctIndex}
                onTextChange={(text) => updateQuestion(qi, { text })}
                onOptionChange={(oi, value) => updateOption(qi, oi, value)}
              />
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-cyan-300/90 hover:text-cyan-200">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    if (f.size > MAX_QUESTION_INLINE_IMAGE_FILE_BYTES) {
                      setError(`Rasm hajmi ${Math.round(MAX_QUESTION_INLINE_IMAGE_FILE_BYTES / (1024 * 1024))} MB dan oshmasligi kerak.`);
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const url = typeof reader.result === "string" ? reader.result : "";
                      if (url) appendQuestionImageMarkdown(qi, url);
                    };
                    reader.readAsDataURL(f);
                  }}
                />
                + Rasm qo‘shish (barcha rasm turlari, ~12MB gacha)
              </label>
              <label className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-white/90">
                <span className="shrink-0">To‘g‘ri variant</span>
                <select
                  value={q.correctIndex}
                  onChange={(e) => updateQuestion(qi, { correctIndex: Number(e.target.value) })}
                  className={`${OL_DASH_FIELD_COMPACT} w-auto min-w-[5.5rem]`}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <option key={i} value={i}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-white/80">
                Savol balli
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0.01}
                  value={q.points ?? 1}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateQuestion(qi, { points: Number.isFinite(v) ? v : 1 });
                  }}
                  className={`${OL_DASH_FIELD_COMPACT} mt-2 w-full max-w-[10rem]`}
                />
              </label>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => runSave("draft")}
            className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            {pending ? "Saqlanmoqda…" : "Qoralama saqlash"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => runSave("publish")}
            className="rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 ring-1 ring-white/20 transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Saqlanmoqda…" : "Nashr qilish"}
          </button>
        </div>
      </DashboardCard>
    </div>
  );
}
