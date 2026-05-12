import { LearningSkillTreePreview, LearningXpStrip } from "@/components/learning/learning-skill-tree-preview";
import { StressSimulatorPanel } from "@/components/shared/stress-simulator-panel";
import { cn } from "@/lib/utils";
import { eduTypography } from "@/lib/design-system/typography";

export default function LearningModePage() {
  return (
    <div className="space-y-6 py-6">
      <p className={cn(eduTypography.body, "text-slate-600 dark:text-slate-300")}>
        Learning mode: glass surface, bosqichli yo‘l va ijobiy feedback loop — serverdan keladigan XP/streak bu yerda props orqali ulanadi.
      </p>
      <LearningXpStrip />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LearningSkillTreePreview />
        </div>
        <StressSimulatorPanel />
      </div>
    </div>
  );
}
