"use client";

import { motion } from "framer-motion";
import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Reward } from "./useGamificationStore";
import { useTranslation } from "react-i18next";

interface RewardCardProps {
  reward: Reward;
  canAfford: boolean;
  reducedMotion?: boolean;
  onRedeem: (rewardId: string) => void;
}

function safeDate(d: Date | string | undefined): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "";
  }
}

export function RewardCard({
  reward,
  canAfford,
  reducedMotion = false,
  onRedeem,
}: RewardCardProps) {
  const { t } = useTranslation("gamification");
  return (
    <motion.div
      layout
      initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
      className="min-w-[170px]"
    >
      <Card
        className={`overflow-hidden transition-all h-full ${
          reward.isRedeemed ? "opacity-70" : ""
        }`}
      >
        <CardContent className="p-4 flex flex-col items-center text-center gap-3">
          {/* Icon with coin-flip on redeem */}
          <motion.span
            className="text-4xl"
            animate={
              reducedMotion || !reward.isRedeemed
                ? {}
                : { rotateY: [0, 180, 360] }
            }
            transition={{ duration: 0.6 }}
            aria-hidden
          >
            {reward.icon}
          </motion.span>

          {/* Info */}
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground leading-tight">
              {reward.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {reward.description}
            </p>
          </div>

          {/* Cost badge */}
          <Badge variant="secondary" className="text-xs font-semibold">
            ⚡ {t("rewards.cost", { cost: reward.cost })}
          </Badge>

          {/* CTA */}
          {reward.isRedeemed ? (
            <motion.div
              initial={reducedMotion ? {} : { scale: 0 }}
              animate={reducedMotion ? {} : { scale: 1 }}
              transition={{ type: "spring", damping: 10 }}
              className="flex items-center gap-1 text-green-500 text-sm font-semibold"
              aria-label={t("rewards.redeemedOnLabel", { date: safeDate(reward.redeemedAt) })}
            >
              <Check className="w-4 h-4" aria-hidden />
              {t("rewards.redeemed")}
            </motion.div>
          ) : (
            <Button
              size="sm"
              onClick={() => onRedeem(reward.id)}
              disabled={!canAfford}
              className="w-full"
              aria-label={t("rewards.redeemLabel", { name: reward.name, cost: reward.cost })}
            >
              <ShoppingBag className="w-3 h-3 mr-1.5" aria-hidden />
              {t("rewards.redeem")}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
