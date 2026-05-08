"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { submitContactMessage } from "@/app/actions/auth-public";
import { useToast } from "@/components/providers/toast-provider";
import { Mail, MessageSquare, User } from "lucide-react";

export function ContactForm() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await submitContactMessage({ name, email, message });
    setLoading(false);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }
    toast("Xabaringiz qabul qilindi. Rahmat!", "success");
    setMessage("");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-emerald-100/90 bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80 sm:p-8">
      <div className="space-y-2">
        <label htmlFor="c-name" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <User className="h-4 w-4 text-emerald-600" aria-hidden />
          Ism
        </label>
        <input
          id="c-name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400/80 focus:ring-4 focus:ring-teal-400/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="c-email" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Mail className="h-4 w-4 text-emerald-600" aria-hidden />
          Email
        </label>
        <input
          id="c-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400/80 focus:ring-4 focus:ring-teal-400/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="c-msg" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <MessageSquare className="h-4 w-4 text-emerald-600" aria-hidden />
          Xabar
        </label>
        <textarea
          id="c-msg"
          name="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400/80 focus:ring-4 focus:ring-teal-400/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>
      <Button type="submit" className="w-full py-3" disabled={loading}>
        {loading ? "Yuborilmoqda…" : "Yuborish"}
      </Button>
    </form>
  );
}
