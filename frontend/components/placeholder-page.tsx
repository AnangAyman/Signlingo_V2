"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { useTranslation } from "react-i18next";

interface PlaceholderPageProps {
  icon: string;
  title: string;
  message: string;
  /** Optional hint line (smaller, muted text) */
  hint?: string;
}

export function PlaceholderPage({ icon, title, message, hint }: PlaceholderPageProps) {
  const router = useRouter();
  const { t } = useTranslation("placeholder");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center max-w-xl">
        {/* Hand illustration */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-8xl mb-6 select-none"
          aria-hidden
        >
          {icon}
        </motion.div>

        {/* Wiggling construction emoji overlay */}
        <motion.div
          animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
          className="text-4xl mb-6 select-none"
          aria-hidden
        >
          🚧
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h1 className="text-3xl font-black text-foreground mb-3 tracking-tight">
            {title}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-2">
            {message}
          </p>
          {hint && (
            <p className="text-sm text-muted-foreground/70 mb-8">{hint}</p>
          )}
          {!hint && <div className="mb-8" />}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3"
        >
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("goBack")}
          </Button>
          <Button onClick={() => router.push("/dashboard")}>
            {t("backToHome")}
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
