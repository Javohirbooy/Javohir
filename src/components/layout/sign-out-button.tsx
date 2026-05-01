"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="glass" className="px-3 py-2 text-sm text-white/95" onClick={() => signOut({ callbackUrl: "/" })}>
      Chiqish
    </Button>
  );
}
