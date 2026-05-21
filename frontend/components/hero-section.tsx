"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

// Character image URL
const CHARACTER_IMAGE_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Firefly_Gemini_Flash_can_you_generate_a_small__friendly_character_with_a_bob_and_glasses_with_a_yellow_and_599506-removebg-preview-f0y6dNmoZlhIHXK0EnPeZ6fVdomNYD.png";

export function HeroSection() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <section className="relative min-h-screen pt-24 pb-16 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* On mobile: character on top, text below. On desktop: side by side. */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center py-8 lg:min-h-[calc(100vh-8rem)]">

          {/* Character column — ORDER 1 on mobile (shows first), ORDER 2 on desktop (right side) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex items-center justify-center order-1 lg:order-2"
          >
            {/* Floating chips — hidden on mobile to avoid overflow */}
            <motion.div
              animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-2 right-4 sm:right-8 px-3 py-1.5 bg-card rounded-xl shadow-xl border border-border hidden sm:flex items-center"
            >
              <span className="text-xl">{"🤟"}</span>
              <span className="ml-2 font-semibold text-sm">{t("hero.iLoveYou")}</span>
            </motion.div>

            <motion.div
              animate={{ y: [0, 15, 0], rotate: [0, -3, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -bottom-2 left-4 sm:left-8 px-3 py-1.5 bg-card rounded-xl shadow-xl border border-border hidden sm:flex items-center"
            >
              <span className="text-xl">{"👋"}</span>
              <span className="ml-2 font-semibold text-sm">{t("hero.hello")}</span>
            </motion.div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/4 -left-2 sm:-left-4 px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20 hidden sm:flex items-center"
            >
              <span className="text-xl">{"✨"}</span>
              <span className="ml-2 font-medium text-primary text-sm">{t("hero.xpChip")}</span>
            </motion.div>

            {/* Character image — properly contained, never distorted */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-3xl scale-110" />
              <motion.img
                src={CHARACTER_IMAGE_URL}
                alt="SignLingo mascot - a friendly character with bob hair and glasses wearing a yellow cardigan"
                className="relative object-contain drop-shadow-2xl
                           w-auto h-auto
                           max-w-[200px] max-h-[240px]
                           sm:max-w-[300px] sm:max-h-[360px]
                           lg:max-w-[420px] lg:max-h-[520px]"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                draggable={false}
              />
            </div>
          </motion.div>

          {/* Text column — ORDER 2 on mobile (shows below character), ORDER 1 on desktop (left side) */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-6 lg:space-y-8 order-2 lg:order-1"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 border border-secondary/30"
            >
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-secondary-foreground">
                {t("hero.badge")}
              </span>
            </motion.div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight text-balance">
                {t("hero.headline")}{" "}
                <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                  {t("hero.headlineSuffix")}
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed text-pretty">
                {t("hero.subtitle")}
              </p>
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg px-8 py-6 shadow-xl shadow-primary/30 group"
                onClick={() => router.push('/signup')}
              >
                {t("hero.ctaPrimary")}
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="font-semibold text-lg px-8 py-6 group border-2"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="mr-2 w-5 h-5 transition-transform group-hover:scale-110" />
                {t("hero.ctaSecondary")}
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-background flex items-center justify-center text-xs font-bold text-primary-foreground"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-semibold text-foreground">50,000+ learners</p>
                  <p className="text-sm text-muted-foreground">joined this month</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="hidden lg:block absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
        >
          <motion.div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
