"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";

// ============================================================
// ANIMATION DURATIONS - Adjust these to tune the timing
// ============================================================
export const ANIMATION_DURATIONS = {
  pullUp: 1.5,
  idleBounce: 0.5,
  signing: 3,
  logoSpinIn: 1,
  fadeOut: 0.8,
};

// The character image URL (provided mascot)
const CHARACTER_IMAGE_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Firefly_Gemini_Flash_can_you_generate_a_small__friendly_character_with_a_bob_and_glasses_with_a_yellow_and_599506-removebg-preview-f0y6dNmoZlhIHXK0EnPeZ6fVdomNYD.png";

export interface WelcomeCharacterRef {
  playAnimation: () => Promise<void>;
  reset: () => void;
}

interface WelcomeCharacterProps {
  onAnimationComplete?: () => void;
  skipAnimation?: boolean;
}

const WelcomeCharacter = forwardRef<WelcomeCharacterRef, WelcomeCharacterProps>(
  ({ onAnimationComplete, skipAnimation = false }, ref) => {
    const { t } = useTranslation();
    const characterControls = useAnimationControls();
    const leftArmControls = useAnimationControls();
    const rightArmControls = useAnimationControls();
    const subtitleControls = useAnimationControls();
    const logoControls = useAnimationControls();

    const playAnimation = async () => {
      // Reset all controls
      await Promise.all([
        characterControls.set({ y: "100vh", opacity: 1 }),
        leftArmControls.set({ rotate: 0 }),
        rightArmControls.set({ rotate: 0 }),
        subtitleControls.set({ opacity: 0, y: 20 }),
        logoControls.set({ scale: 0, rotate: -180, opacity: 0 }),
      ]);

      // 1. Pull-up animation (character rises from bottom)
      await characterControls.start({
        y: 0,
        transition: {
          duration: ANIMATION_DURATIONS.pullUp,
          ease: [0.22, 1, 0.36, 1], // Custom ease out
        },
      });

      // 2. Idle bounce
      await characterControls.start({
        y: [0, -20, 0],
        transition: {
          duration: ANIMATION_DURATIONS.idleBounce,
          ease: "easeInOut",
        },
      });

      // 3. Signing animation - "Welcome to SignLingo"
      // Animate both arms in a wave-like motion
      const signingDuration = ANIMATION_DURATIONS.signing;

      // Show subtitle
      subtitleControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" },
      });

      // Arm wave sequence
      await Promise.all([
        rightArmControls.start({
          rotate: [0, 45, 0, -30, 0, 45, 0],
          transition: {
            duration: signingDuration,
            ease: "easeInOut",
            times: [0, 0.2, 0.35, 0.5, 0.65, 0.8, 1],
          },
        }),
        leftArmControls.start({
          rotate: [0, -30, 0, 45, 0, -30, 0],
          transition: {
            duration: signingDuration,
            ease: "easeInOut",
            times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1],
          },
        }),
        characterControls.start({
          scale: [1, 1.05, 1, 1.03, 1],
          transition: {
            duration: signingDuration,
            ease: "easeInOut",
          },
        }),
      ]);

      // 4. Logo spin-in
      await logoControls.start({
        scale: 1,
        rotate: 0,
        opacity: 1,
        transition: {
          duration: ANIMATION_DURATIONS.logoSpinIn,
          type: "spring",
          stiffness: 200,
          damping: 20,
        },
      });

      // Small pause
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 5. Fade out everything
      await Promise.all([
        characterControls.start({
          opacity: 0,
          scale: 0.9,
          transition: { duration: ANIMATION_DURATIONS.fadeOut },
        }),
        subtitleControls.start({
          opacity: 0,
          transition: { duration: ANIMATION_DURATIONS.fadeOut },
        }),
        logoControls.start({
          opacity: 0,
          scale: 1.2,
          transition: { duration: ANIMATION_DURATIONS.fadeOut },
        }),
      ]);

      onAnimationComplete?.();
    };

    const reset = () => {
      characterControls.set({ y: "100vh", opacity: 1 });
      leftArmControls.set({ rotate: 0 });
      rightArmControls.set({ rotate: 0 });
      subtitleControls.set({ opacity: 0, y: 20 });
      logoControls.set({ scale: 0, rotate: -180, opacity: 0 });
    };

    useImperativeHandle(ref, () => ({
      playAnimation,
      reset,
    }));

    useEffect(() => {
      if (skipAnimation) {
        onAnimationComplete?.();
        return;
      }

      // Auto-play on mount
      const timer = setTimeout(() => {
        playAnimation();
      }, 500);

      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skipAnimation]);

    if (skipAnimation) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-background via-background to-primary/10 pointer-events-none">
        {/* Character Container */}
        <motion.div
          animate={characterControls}
          initial={{ y: "100vh", opacity: 1 }}
          className="relative flex flex-col items-center"
        >
          {/* Animated Arms Overlay (SVG for arm movements) */}
          <div className="relative">
            {/* Left Arm Indicator */}
            <motion.div
              animate={leftArmControls}
              className="absolute -left-8 top-1/2 w-12 h-2 bg-primary/50 rounded-full origin-right"
              style={{ transformOrigin: "right center" }}
            />
            {/* Right Arm Indicator */}
            <motion.div
              animate={rightArmControls}
              className="absolute -right-8 top-1/2 w-12 h-2 bg-primary/50 rounded-full origin-left"
              style={{ transformOrigin: "left center" }}
            />

            {/* Character Image */}
            <motion.img
              src={CHARACTER_IMAGE_URL}
              alt={t("media.mascotDetailedAlt")}
              className="w-32 sm:w-40 md:w-52 lg:w-64 xl:w-80 h-auto aspect-auto object-contain drop-shadow-2xl"
              draggable={false}
            />
          </div>

          {/* Subtitle */}
          <motion.div
            animate={subtitleControls}
            initial={{ opacity: 0, y: 20 }}
            className="mt-8 text-center space-y-2"
          >
            <p className="text-2xl md:text-3xl font-bold text-foreground">
              {"👋"} Welcome to SignLingo!
            </p>
            <p className="text-lg md:text-xl text-muted-foreground">
              {"🤟"} [Sign Language: Welcome to SignLingo]
            </p>
          </motion.div>
        </motion.div>

        {/* Logo Spin-in */}
        <motion.div
          animate={logoControls}
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          className="absolute flex flex-col items-center gap-4"
        >
          <SignLingoLogo
            ariaLabel={t("media.handLogoAlt")}
            className="w-32 h-32 md:w-40 md:h-40"
          />
          <span className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            SignLingo
          </span>
        </motion.div>
      </div>
    );
  }
);

WelcomeCharacter.displayName = "WelcomeCharacter";

// SignLingo Logo Component (Hand + Text)
function SignLingoLogo({
  ariaLabel,
  className,
}: {
  ariaLabel: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={ariaLabel}
    >
      {/* Palm */}
      <ellipse cx="50" cy="55" rx="25" ry="30" className="fill-primary" />
      {/* Thumb */}
      <ellipse
        cx="25"
        cy="45"
        rx="8"
        ry="15"
        className="fill-primary"
        transform="rotate(-30 25 45)"
      />
      {/* Fingers */}
      <rect
        x="30"
        y="10"
        width="8"
        height="30"
        rx="4"
        className="fill-primary"
      />
      <rect
        x="42"
        y="5"
        width="8"
        height="35"
        rx="4"
        className="fill-primary"
      />
      <rect
        x="54"
        y="8"
        width="8"
        height="32"
        rx="4"
        className="fill-primary"
      />
      <rect
        x="66"
        y="15"
        width="8"
        height="25"
        rx="4"
        className="fill-primary"
      />
      {/* Face on palm */}
      <circle cx="43" cy="50" r="3" className="fill-foreground" />
      <circle cx="57" cy="50" r="3" className="fill-foreground" />
      <path
        d="M43 62 Q50 68 57 62"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-foreground"
        fill="none"
      />
    </svg>
  );
}

export { WelcomeCharacter, SignLingoLogo };
