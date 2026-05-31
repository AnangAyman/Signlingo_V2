"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Check, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

const PLAN_KEYS = ["free", "pro", "team"] as const;
const PLAN_PRICES = {
  free:  { monthly: 0,     yearly: 0 },
  pro:   { monthly: 9.99,  yearly: 7.99 },
  team:  { monthly: 24.99, yearly: 19.99 },
};
const PLAN_POPULAR: Record<typeof PLAN_KEYS[number], boolean> = {
  free: false,
  pro: true,
  team: false,
};

export function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [isYearly, setIsYearly] = useState(true);
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4"
          >
            <Sparkles className="w-4 h-4" />
            {t("pricing.badge")}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-balance">
            {t("pricing.title")}{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t("pricing.titleSuffix")}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
            {t("pricing.subtitle")}
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span
              className={cn(
                "font-medium transition-colors",
                !isYearly ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {t("pricing.monthly")}
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-primary"
            />
            <span
              className={cn(
                "font-medium transition-colors",
                isYearly ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {t("pricing.yearly")}
            </span>
            {isYearly && (
              <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs font-semibold rounded-full">
                {t("pricing.savePercent")}
              </span>
            )}
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {PLAN_KEYS.map((planKey, index) => {
            const prices = PLAN_PRICES[planKey];
            const price = isYearly ? prices.yearly : prices.monthly;
            const isPopular = PLAN_POPULAR[planKey];
            const features = t(`pricing.${planKey}.features`, { returnObjects: true }) as string[];

            return (
              <motion.div
                key={planKey}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className={cn(
                  "relative rounded-2xl border-2 p-6 lg:p-8 transition-all duration-300",
                  isPopular
                    ? "border-primary bg-gradient-to-b from-primary/5 to-transparent shadow-xl scale-105 z-10"
                    : "border-border bg-card hover:border-primary/30 hover:shadow-lg"
                )}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg">
                      <Zap className="w-3 h-3" />
                      {t("pricing.mostPopular").toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Plan Name */}
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {t(`pricing.${planKey}.name`)}
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {t(`pricing.${planKey}.description`)}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">
                    ${price}
                  </span>
                  {price > 0 && (
                    <span className="text-muted-foreground">{t("pricing.perMonth")}</span>
                  )}
                  {isYearly && price > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed annually
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  className={cn(
                    "w-full mb-6 font-semibold",
                    isPopular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
                      : ""
                  )}
                  variant={isPopular ? "default" : "outline"}
                  size="lg"
                  onClick={() => {
                    if (planKey === "team") {
                      window.location.href = "mailto:contact@signlingo.com";
                    } else {
                      router.push("/signup");
                    }
                  }}
                >
                  {t(`pricing.${planKey}.cta`)}
                </Button>

                {/* Features */}
                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                          isPopular ? "bg-primary/10" : "bg-muted"
                        )}
                      >
                        <Check
                          className={cn(
                            "w-3 h-3",
                            isPopular ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Money-back guarantee */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center text-muted-foreground mt-12"
        >
          {"🔒"} 30-day money-back guarantee. No questions asked.
        </motion.p>
      </div>
    </section>
  );
}
