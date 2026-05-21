"use client";

import { useRef } from "react";
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RewardCard } from "./RewardCard";
import { useGamificationStore } from "./useGamificationStore";
import { useSoundEffect } from "@/hooks/useSoundEffect";
import { useTranslation } from "react-i18next";

interface RewardsShopProps {
  reducedMotion?: boolean;
}

export function RewardsShop({ reducedMotion = false }: RewardsShopProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { rewards, userProgress, redeemReward } = useGamificationStore();
  const { play } = useSoundEffect();
  const { t } = useTranslation("gamification");

  const handleRedeem = (rewardId: string) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;

    if (reward.isRedeemed) {
      toast.info(t("rewards.alreadyRedeemedToast", { name: reward.name }));
      return;
    }

    if (userProgress.totalXp < reward.cost) {
      toast.error(
        t("rewards.notEnoughXpToast", { xp: reward.cost - userProgress.totalXp })
      );
      return;
    }

    const success = redeemReward(rewardId);
    if (success) {
      play("/sounds/coin.mp3");
      toast.success(t("rewards.redeemedToast", { name: reward.name, cost: reward.cost }));
    }
  };

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" aria-hidden />
            {t("rewards.title")}
          </CardTitle>

          {/* Scroll controls */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => scroll("left")}
              aria-label={t("rewards.scrollLeft")}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => scroll("right")}
              aria-label={t("rewards.scrollRight")}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("rewards.balance")}{" "}
          <span className="font-semibold text-foreground">
            ⚡ {userProgress.totalXp.toLocaleString()} XP
          </span>
        </p>
      </CardHeader>

      <CardContent>
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]"
          role="list"
          aria-label={t("rewards.availableLabel")}
        >
          {rewards.map((reward, index) => (
            <div key={reward.id} role="listitem" className="flex-shrink-0">
              <RewardCard
                reward={reward}
                canAfford={
                  !reward.isRedeemed && userProgress.totalXp >= reward.cost
                }
                reducedMotion={reducedMotion}
                onRedeem={handleRedeem}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
