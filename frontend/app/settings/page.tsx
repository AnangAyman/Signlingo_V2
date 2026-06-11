"use client";

import { PlaceholderPage } from "@/components/placeholder-page";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation("placeholder");
  return (
    <PlaceholderPage
      icon="⚙️"
      title={t("settings.title")}
      message={t("settings.message")}
    />
  );
}
