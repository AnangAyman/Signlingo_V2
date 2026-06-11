"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { GamificationPage } from "@/components/gamification/GamificationPage";

export default function GamificationRoute() {
  const router = useRouter();
  const { isAuthenticated, hasCheckedSession } = useAuthStore();

  useEffect(() => {
    if (hasCheckedSession && !isAuthenticated) {
      router.push("/login");
    }
  }, [hasCheckedSession, isAuthenticated, router]);

  if (!hasCheckedSession || !isAuthenticated) return null;

  return <GamificationPage />;
}
