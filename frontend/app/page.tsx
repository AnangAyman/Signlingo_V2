"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WelcomeCharacter, WelcomeCharacterRef } from "@/components/welcome-character";
import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { LeaguesSection } from "@/components/leagues-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { PricingSection } from "@/components/pricing-section";
import { CTASection } from "@/components/cta-section";
import { Footer } from "@/components/footer";
import { useAuthStore } from "@/lib/store";
import { RotateCcw } from "lucide-react";

export default function LandingPage() {
  const { skipIntro, setSkipIntro } = useAuthStore();
  const [showContent, setShowContent] = useState(skipIntro);
  const [isIntroPlaying, setIsIntroPlaying] = useState(!skipIntro);
  const characterRef = useRef<WelcomeCharacterRef>(null);

  // Check for reduced motion preference
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Auto-skip intro if reduced motion is preferred
  useEffect(() => {
    if (reducedMotion && !showContent) {
      setShowContent(true);
      setIsIntroPlaying(false);
    }
  }, [reducedMotion, showContent]);

  const handleAnimationComplete = () => {
    setShowContent(true);
    setIsIntroPlaying(false);
    setSkipIntro(true);
  };

  const handleReplayIntro = () => {
    setShowContent(false);
    setIsIntroPlaying(true);
    // Small delay to reset animation
    setTimeout(() => {
      characterRef.current?.reset();
      characterRef.current?.playAnimation();
    }, 100);
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Welcome Animation Overlay */}
      <AnimatePresence>
        {isIntroPlaying && (
          <WelcomeCharacter
            ref={characterRef}
            onAnimationComplete={handleAnimationComplete}
            skipAnimation={skipIntro || reducedMotion}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Navbar />
            <HeroSection />
            <FeaturesSection />
            <LeaguesSection />
            <TestimonialsSection />
            <PricingSection />
            <CTASection />
            <Footer />

            {/* Replay Intro Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 }}
              onClick={handleReplayIntro}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 group"
              aria-label="Replay welcome animation"
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:rotate-180 duration-500" />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Replay Intro
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Intro Button (during animation) */}
      <AnimatePresence>
        {isIntroPlaying && !reducedMotion && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1 }}
            onClick={handleAnimationComplete}
            className="fixed bottom-6 right-6 z-[60] px-4 py-2 bg-card/80 backdrop-blur-sm border border-border rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip Intro →
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}
