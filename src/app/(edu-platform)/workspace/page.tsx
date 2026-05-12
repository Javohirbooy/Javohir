import { WorkspaceEditorChrome, WorkspaceSplitLayout } from "@/components/workspace/workspace-split-layout";
import { cn } from "@/lib/utils";
import { eduTypography } from "@/lib/design-system/typography";

const sample = `function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i]!;
    if (map.has(need)) return [map.get(need)!, i];
    map.set(nums[i]!, i);
  }
  return [];
}`;

export default function WorkspaceModePage() {
  return (
    <div className="space-y-6 py-6">
      <p className={cn(eduTypography.body, "text-slate-600 dark:text-slate-300")}>
        Workspace mode: HackerRank uslubidagi split view — statement, editor, konsol alohida landmark sifatida belgilangan.
      </p>
      <WorkspaceSplitLayout
        statement={
          <div className="space-y-3 text-slate-200">
            <p className="font-semibold text-white">Ikki son yig‘indisi</p>
            <p>Berilgan massivda ikkita indeks toping, ularning qiymatlari yig‘indisi target ga teng bo‘lsin.</p>
            <ul className="list-inside list-disc text-slate-300">
              <li>2 ≤ nums.length ≤ 10⁴</li>
              <li>Har bir yechim mavjud.</li>
            </ul>
          </div>
        }
        editor={<WorkspaceEditorChrome code={sample} />}
        consoleSlot={
          <>
            <span className="text-slate-500">$ run tests</span>
            {"\n"}
            <span className="text-emerald-400">✓ sample 1</span>
            {"\n"}
            <span className="text-emerald-400">✓ sample 2</span>
            {"\n"}
            <span className="text-amber-300">⋯ hidden 12/15</span>
          </>
        }
      />
    </div>
  );
}
