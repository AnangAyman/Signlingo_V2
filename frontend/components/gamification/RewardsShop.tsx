"use client";

import { useRef } from "react";
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RewardCard } from "./RewardCard";
import { useGamificationStore } from "./useGamificationStore";
import { useSoundEffect } from "@/hooks/useSoundEffect";

interface RewardsShopProps {
  reducedMotion?: boolean;
}

export function RewardsShop({ reducedMotion = false }: RewardsShopProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { rewards, userProgress, redeemReward } = useGamificationStore();
  const { play } = useSoundEffect();

  const handleRedeem = (rewardId: string) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;

    if (reward.isRedeemed) {
      toast.info(`${reward.name} is already redeemed.`);
      return;
    }

    if (userProgress.totalXp < reward.cost) {
      toast.error(
        `Not enough XP! Need ${reward.cost - userProgress.totalXp} more XP.`
      );
      return;
    }

    const success = redeemReward(rewardId);
    if (success) {
      play("/sounds/coin.mp3");
      toast.success(`You redeemed ${reward.name} for ${reward.cost} XP!`);
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
            Rewards Shop
          </CardTitle>

          {/* Scroll controls */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => scroll("left")}
              aria-label="Scroll rewards left"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => scroll("right")}
              aria-label="Scroll rewards right"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Your balance:{" "}
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
          aria-label="Available rewards"
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
