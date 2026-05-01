import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 sm:px-6">
      <Suspense fallback={<div className="h-40 w-full animate-pulse rounded-3xl bg-white/10" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
