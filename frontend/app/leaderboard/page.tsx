"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import { Leaderboard } from "@/components/leaderboard";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "sonner";

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasCheckedSession } = useAuthStore();

  useEffect(() => {
    if (hasCheckedSession && !isAuthenticated) {
      router.push("/login");
    }
  }, [hasCheckedSession, isAuthenticated, router]);

  if (!hasCheckedSession || !isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background w-full">
      <Toaster richColors position="top-right" />
      <AppHeader />

      {/* Main content */}
      <main className="w-full px-3 sm:px-4 md:px-6 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-6xl mx-auto"
        >
          <Leaderboard
            currentUserId={user.id}
            initialView="global"
            pageSize={20}
          />
        </motion.div>
      </main>
    </div>
  );
}
