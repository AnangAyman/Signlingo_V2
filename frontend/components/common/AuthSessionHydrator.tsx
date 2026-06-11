"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";

const PROTECTED_PREFIXES = [
  "/ai-game",
  "/dashboard",
  "/gamification",
  "/leaderboard",
  "/lessons",
  "/notifications",
  "/profile",
  "/settings",
];

export function AuthSessionHydrator() {
  const pathname = usePathname();
  const { hasCheckedSession, refreshUser } = useAuthStore();

  useEffect(() => {
    if (hasCheckedSession) return;
    if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

    void refreshUser();
  }, [hasCheckedSession, pathname, refreshUser]);

  return null;
}
