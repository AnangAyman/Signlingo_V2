"use client";

import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { t } = useTranslation();
  const isKorean = i18n.language === "ko";

  const handleToggle = () => {
    const newLang = isKorean ? "en" : "ko";
    i18n.changeLanguage(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("i18nextLng", newLang);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      aria-label={t("language.toggle")}
      className={`flex items-center gap-1.5 font-semibold text-sm px-2.5 h-8 ${className ?? ""}`}
    >
      <span className="text-base leading-none" aria-hidden>
        {isKorean ? "🇺🇸" : "🇰🇷"}
      </span>
      <span>{isKorean ? t("language.en") : t("language.ko")}</span>
    </Button>
  );
}
