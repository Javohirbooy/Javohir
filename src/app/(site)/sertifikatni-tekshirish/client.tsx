"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SertifikatniTekshirishClient({ initialId }: { initialId: string }) {
  const router = useRouter();
  const [id, setId] = useState(initialId);

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card className="border-white/15 bg-white/95 p-8 text-slate-900 shadow-xl">
        <h1 className="text-xl font-bold">Sertifikatni tekshirish</h1>
        <p className="mt-2 text-sm text-slate-600">
          PDF yoki QR ichidagi <span className="font-mono text-xs">cert_…</span> identifikatorni kiriting.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const t = id.trim();
            if (!t) return;
            router.push(`/certificate/verify/${encodeURIComponent(t)}`);
          }}
        >
          <label className="block text-sm font-medium text-slate-700" htmlFor="cert-id">
            Sertifikat ID
          </label>
          <input
            id="cert-id"
            name="id"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none ring-sky-500/30 focus:ring-2"
            placeholder="cert_…"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <Button type="submit" variant="primary" className="w-full py-2.5 text-sm">
            Davom etish
          </Button>
        </form>
      </Card>
    </div>
  );
}
