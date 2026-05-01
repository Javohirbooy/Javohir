"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import type { AppRole } from "@/lib/permissions";
import { saveRolePermissionMatrix } from "@/app/actions/role-permissions";
import { MATRIX_ROLES } from "@/lib/role-permissions-matrix";
import type { PermissionKey } from "@/lib/permission-keys";
import { PERMISSION_KEYS, SUPER_ADMIN_INVARIANT_KEYS, isPermissionKey } from "@/lib/permission-keys";
import { PERMISSION_DESCRIPTIONS_UZ, categoryLabelUz, groupPermissionsByCategory, orderedCategoryIds } from "@/lib/permission-metadata";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Loader2, RotateCcw, Search, Shield, Sparkles } from "lucide-react";

export type PermissionRowLite = { id: string; key: PermissionKey; description: string | null };

function setsFromSerializable(m: Record<AppRole, string[]>): Record<AppRole, Set<PermissionKey>> {
  const o = {} as Record<AppRole, Set<PermissionKey>>;
  for (const r of MATRIX_ROLES) {
    const arr = m[r] ?? [];
    o[r] = new Set(arr.filter((x): x is PermissionKey => isPermissionKey(x)));
  }
  return o;
}

function toPayload(matrix: Record<AppRole, Set<PermissionKey>>): Record<string, string[]> {
  return MATRIX_ROLES.reduce<Record<string, string[]>>((acc, r) => {
    acc[r] = [...matrix[r]];
    return acc;
  }, {});
}

function isSuperInvariant(key: PermissionKey) {
  return (SUPER_ADMIN_INVARIANT_KEYS as readonly PermissionKey[]).includes(key);
}

export function RolePermissionsManager({
  permissions,
  initialMatrix,
}: {
  permissions: PermissionRowLite[];
  initialMatrix: Record<AppRole, string[]>;
}) {
  const { update } = useSession();
  const baselineRef = useRef(structuredClone(initialMatrix) as Record<AppRole, string[]>);
  const [matrix, setMatrix] = useState(() => setsFromSerializable(initialMatrix));
  const [baselineVersion, setBaselineVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => groupPermissionsByCategory(PERMISSION_KEYS), []);

  const matches = useCallback(
    (key: PermissionKey) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const desc = PERMISSION_DESCRIPTIONS_UZ[key].toLowerCase();
      return key.toLowerCase().includes(q) || desc.includes(q);
    },
    [query],
  );

  const visibleCategories = useMemo(() => {
    return orderedCategoryIds().filter((cid) => {
      const keys = grouped.get(cid) ?? [];
      return keys.some((k) => matches(k));
    });
  }, [grouped, matches]);

  const toggle = useCallback((role: AppRole, key: PermissionKey, nextOn: boolean) => {
    if (role === "SUPER_ADMIN" && isSuperInvariant(key) && !nextOn) return;
    setMatrix((prev) => {
      const copy = { ...prev, [role]: new Set(prev[role]) };
      if (nextOn) copy[role].add(key);
      else copy[role].delete(key);
      return copy;
    });
    setMessage(null);
  }, []);

  const selectAllForRole = useCallback((role: AppRole) => {
    setMatrix((prev) => ({ ...prev, [role]: new Set(PERMISSION_KEYS) }));
    setMessage(null);
  }, []);

  const clearRole = useCallback((role: AppRole) => {
    setMatrix((prev) => {
      const n = new Set<PermissionKey>();
      if (role === "SUPER_ADMIN") {
        for (const k of SUPER_ADMIN_INVARIANT_KEYS) n.add(k);
      }
      return { ...prev, [role]: n };
    });
    setMessage(null);
  }, []);

  const selectCategoryForRole = useCallback((role: AppRole, keys: PermissionKey[]) => {
    setMatrix((prev) => {
      const n = new Set(prev[role]);
      for (const k of keys) {
        if (role === "SUPER_ADMIN" && isSuperInvariant(k)) n.add(k);
        else n.add(k);
      }
      if (role === "SUPER_ADMIN") {
        for (const k of SUPER_ADMIN_INVARIANT_KEYS) n.add(k);
      }
      return { ...prev, [role]: n };
    });
    setMessage(null);
  }, []);

  const discard = useCallback(() => {
    const b = baselineRef.current;
    setMatrix(setsFromSerializable(b));
    setMessage(null);
  }, []);

  const save = useCallback(() => {
    setMessage(null);
    const payload = toPayload(matrix);
    startTransition(async () => {
      const res = await saveRolePermissionMatrix(payload);
      if (!res.ok) {
        setMessage({ type: "err", text: res.error });
        return;
      }
      baselineRef.current = structuredClone(payload) as Record<AppRole, string[]>;
      setBaselineVersion((v) => v + 1);
      setMessage({ type: "ok", text: "Ruxsatlar saqlandi. Sessiya yangilandi." });
      await update();
    });
  }, [matrix, update]);

  const dirty = useMemo(() => {
    return JSON.stringify(toPayload(matrix)) !== JSON.stringify(baselineRef.current);
  }, [matrix, baselineVersion]);

  const roleLabel: Record<AppRole, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    TEACHER: "O‘qituvchi",
    STUDENT: "O‘quvchi",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-200/80">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            IQ Monitoring
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white">Rol ruxsatlari</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/60">
            Har bir rol uchun ruxsatlarni xavfsiz boshqaring. Super Admin uchun{" "}
            <span className="font-mono text-cyan-200/90">SITE_SETTINGS_SUPER</span> va{" "}
            <span className="font-mono text-cyan-200/90">PERMISSIONS_MANAGE</span> majburiy. O‘zgarishdan keyin joriy
            sessiya avtomatik yangilanadi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="gap-2" onClick={discard} disabled={!dirty || pending}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Bekor qilish
          </Button>
          <Button type="button" variant="primary" className="min-w-[8rem] gap-2" onClick={save} disabled={!dirty || pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            Saqlash
          </Button>
        </div>
      </div>

      {message ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm font-medium backdrop-blur-xl",
            message.type === "ok"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
              : "border-rose-400/35 bg-rose-500/10 text-rose-100",
          )}
        >
          {message.text}
        </div>
      ) : null}

      <DashboardCard className="p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kalit yoki tavsif bo‘yicha qidirish…"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/50 py-3 pl-10 pr-4 text-sm text-white outline-none ring-cyan-500/0 transition placeholder:text-white/35 focus:ring-4 focus:ring-violet-500/25"
          />
        </div>
      </DashboardCard>

      <div className="space-y-8">
        {visibleCategories.map((catId) => {
          const keys = (grouped.get(catId) ?? []).filter((k) => matches(k));
          if (keys.length === 0) return null;
          return (
            <DashboardCard key={catId} className="overflow-hidden p-0">
              <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-white">{categoryLabelUz(catId)}</h2>
                <div className="flex flex-wrap gap-2">
                  {MATRIX_ROLES.map((role) => (
                    <button
                      key={`${catId}-${role}-all`}
                      type="button"
                      onClick={() => selectCategoryForRole(role, keys)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-violet-400/30 hover:bg-white/10"
                    >
                      {roleLabel[role]}: to‘liq ({keys.length})
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-950/95 shadow-[0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
                    <tr className="text-xs uppercase tracking-wider text-white/45">
                      <th className="sticky left-0 z-20 min-w-[14rem] bg-slate-950/95 px-4 py-3 font-semibold">Ruxsat</th>
                      {MATRIX_ROLES.map((role) => (
                        <th key={role} className="px-2 py-3 text-center font-semibold text-white/70">
                          <div className="flex flex-col items-center gap-2">
                            <span>{roleLabel[role]}</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => selectAllForRole(role)}
                                className="rounded-lg border border-white/10 bg-violet-500/15 px-2 py-0.5 text-[0.65rem] font-bold text-violet-100 hover:bg-violet-500/25"
                              >
                                Hammasi
                              </button>
                              <button
                                type="button"
                                onClick={() => clearRole(role)}
                                className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[0.65rem] font-bold text-white/60 hover:bg-white/10"
                              >
                                Tozalash
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => {
                      const lockedSuper = isSuperInvariant(key);
                      return (
                        <tr key={key} className="border-b border-white/5 text-white/85 hover:bg-white/[0.02]">
                          <td className="sticky left-0 z-10 bg-[#070b14]/95 px-4 py-3 align-top backdrop-blur-sm">
                            <p className="font-mono text-xs font-semibold text-cyan-200/90">{key}</p>
                            <p className="mt-1 text-xs leading-relaxed text-white/55">{PERMISSION_DESCRIPTIONS_UZ[key]}</p>
                            {lockedSuper ? (
                              <p className="mt-1 text-[0.65rem] font-medium text-amber-200/80">Super Admin: majburiy</p>
                            ) : null}
                          </td>
                          {MATRIX_ROLES.map((role) => {
                            const on = matrix[role].has(key);
                            const cellDisabled = pending || (role === "SUPER_ADMIN" && lockedSuper && on);
                            return (
                              <td key={`${key}-${role}`} className="px-2 py-3 text-center align-middle">
                                <button
                                  type="button"
                                  disabled={cellDisabled}
                                  onClick={() => toggle(role, key, !on)}
                                  className={cn(
                                    "mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border text-xs font-bold transition",
                                    on
                                      ? "border-cyan-400/40 bg-gradient-to-br from-cyan-500/30 to-violet-600/25 text-white shadow-lg shadow-cyan-900/20"
                                      : "border-white/10 bg-white/[0.04] text-white/35 hover:border-white/20 hover:bg-white/[0.08]",
                                    role === "SUPER_ADMIN" && lockedSuper && on ? "cursor-not-allowed opacity-95" : "",
                                  )}
                                  aria-pressed={on}
                                  aria-label={`${role} — ${key}`}
                                >
                                  {on ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          );
        })}
      </div>

      <DashboardCard className="border-white/10 bg-white/[0.03]">
        <p className="text-sm text-white/60">
          Katalog: <span className="font-semibold text-white">{permissions.length}</span> ruxsat. O‘zgarishlar{" "}
          <span className="font-mono text-cyan-200/80">RolePermission</span> jadvaliga yoziladi; audit jurnaliga yozuv
          qo‘shiladi.
        </p>
      </DashboardCard>
    </div>
  );
}
