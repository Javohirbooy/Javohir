"use client";
import { useState, useTransition } from "react";
import { updateOwnProfile } from "@/app/actions/profile";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";

export function ProfileSettingsForm({
  initialName,
  initialAvatarUrl,
}: {
  initialName: string;
  initialAvatarUrl: string | null;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const previewSrc = avatarUrl.trim() || "/iq-logo-3d.png";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const optimisticName = name;
    const optimisticAvatar = avatarUrl;
    startTransition(async () => {
      const res = await updateOwnProfile({ fullName: optimisticName, avatarUrl: optimisticAvatar });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      setName(res.data?.fullName ?? optimisticName);
      setAvatarUrl(res.data?.avatarUrl ?? "");
      toast("Profil yangilandi.", "success");
    });
  }

  async function onAvatarFileChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const tokenRes = await fetch("/api/profile/avatar/upload-token", { method: "POST" });
      const tokenJson = (await tokenRes.json()) as { token?: string; error?: string };
      if (!tokenRes.ok || !tokenJson.token) {
        toast(tokenJson.error ?? "Upload token olinmadi.", "error");
        return;
      }
      const fd = new FormData();
      fd.set("token", tokenJson.token);
      fd.set("file", file);
      const upRes = await fetch("/api/profile/avatar/upload", { method: "POST", body: fd });
      const upJson = (await upRes.json()) as { url?: string; error?: string };
      if (!upRes.ok || !upJson.url) {
        toast(upJson.error ?? "Avatar yuklab bo'lmadi.", "error");
        return;
      }
      setAvatarUrl(upJson.url);
      toast("Avatar yuklandi.", "success");
    } catch {
      toast("Avatar yuklashda xatolik yuz berdi.", "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-3xl border border-emerald-100/90 bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80 sm:p-8">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-emerald-200/60 dark:ring-slate-600">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="Avatar preview" className="h-full w-full object-cover" />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">Faqat o&apos;zingizning profil nomi va avatar URL ni yangilashingiz mumkin.</p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">To&apos;liq ism</span>
        <input
          required
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400/80 focus:ring-4 focus:ring-teal-400/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Avatar URL (https)</span>
        <input
          type="url"
          placeholder="https://example.com/avatar.png"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400/80 focus:ring-4 focus:ring-teal-400/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Yoki avatar fayl yuklash (png/jpg/webp, 2MB)</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={uploading || isPending}
          onChange={(e) => void onAvatarFileChange(e.target.files?.[0] ?? null)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400/80 focus:ring-4 focus:ring-teal-400/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>

      <Button type="submit" disabled={isPending || uploading} className="w-full sm:w-auto">
        {isPending ? "Saqlanmoqda..." : uploading ? "Yuklanmoqda..." : "Saqlash"}
      </Button>
    </form>
  );
}
