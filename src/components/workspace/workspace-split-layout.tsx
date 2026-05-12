"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { eduTypography } from "@/lib/design-system/typography";
import { surfaceClass } from "@/lib/design-system/surfaces";

export function WorkspaceSplitLayout({
  statement,
  editor,
  consoleSlot,
}: {
  statement: ReactNode;
  editor: ReactNode;
  consoleSlot: ReactNode;
}) {
  return (
    <div className="grid min-h-[480px] gap-3 lg:grid-cols-2 lg:gap-4">
      <section
        className={cn(surfaceClass("coding"), "flex min-h-0 flex-col overflow-hidden")}
        aria-label="Muammo matni"
      >
        <header className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Statement
        </header>
        <div className={cn("min-h-0 flex-1 overflow-auto p-3", eduTypography.bodySm)}>{statement}</div>
      </section>
      <div className="flex min-h-0 flex-col gap-3">
        <section className={cn(surfaceClass("coding"), "flex min-h-[200px] flex-1 flex-col overflow-hidden")} aria-label="Kod muharriri">
          <header className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wide">Editor</span>
            <span className="font-mono text-[11px]">TypeScript · strict</span>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-0">{editor}</div>
        </section>
        <WorkspaceConsoleFrame>{consoleSlot}</WorkspaceConsoleFrame>
      </div>
    </div>
  );
}

export function WorkspaceConsoleFrame({ children }: { children: ReactNode }) {
  return (
    <section className={cn(surfaceClass("coding"), "min-h-[120px]")} aria-label="Konsol">
      <header className="border-b border-slate-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Output / tests
      </header>
      <div className="max-h-40 overflow-auto p-3 font-mono text-xs leading-relaxed text-emerald-200/90">{children}</div>
    </section>
  );
}

export function WorkspaceEditorChrome({ code }: { code: string }) {
  return (
    <pre className="m-0 bg-slate-950 p-3 font-mono text-[13px] leading-relaxed text-slate-100" tabIndex={0}>
      <code>{code}</code>
    </pre>
  );
}
