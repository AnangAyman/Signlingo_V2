"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Hand, Video, Trophy, Sparkles, Brain, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const FEATURE_KEYS = [
  { key: "aiHandRecognition", icon: Hand, gradient: "from-primary to-primary/60", delay: 0 },
  { key: "interactiveVideoLessons", icon: Video, gradient: "from-secondary to-secondary/60", delay: 0.1 },
  { key: "gamifiedLeagues", icon: Trophy, gradient: "from-chart-3 to-chart-3/60", delay: 0.2 },
  { key: "adaptiveLearning", icon: Brain, gradient: "from-chart-4 to-chart-4/60", delay: 0.3 },
  { key: "communityPractice", icon: Users, gradient: "from-chart-5 to-chart-5/60", delay: 0.4 },
  { key: "dailyChallenges", icon: Sparkles, gradient: "from-primary to-secondary", delay: 0.5 },
] as const;

export function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useTranslation();

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4"
          >
            <Sparkles className="w-4 h-4" />
            {t("features.badge")}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-balance">
            {t("features.title")}{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t("features.titleSuffix")}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("features.subtitle")}
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {FEATURE_KEYS.map(({ key, icon: Icon, gradient, delay }) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay }}
              className="group"
            >
              <div className="h-full p-6 lg:p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                  {t(`features.${key}.title`)}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t(`features.${key}.description`)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
