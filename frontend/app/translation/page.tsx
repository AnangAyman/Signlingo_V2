"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { TranslationMode } from "@/components/translation/TranslationMode";
import { useAuthStore } from "@/lib/store";

export default function TranslationPage() {
  const router = useRouter();
  const { isAuthenticated, hasCheckedSession } = useAuthStore();

  useEffect(() => {
    if (hasCheckedSession && !isAuthenticated) {
      router.push("/login");
    }
  }, [hasCheckedSession, isAuthenticated, router]);

  if (!hasCheckedSession || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="w-full px-3 sm:px-4 md:px-6 py-6 sm:py-8">
        <TranslationMode />
      </main>
    </div>
  );
}
