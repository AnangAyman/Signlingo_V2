"use client";

import { PlaceholderPage } from "@/components/placeholder-page";
import { useTranslation } from "react-i18next";

export default function ProfilePage() {
  const { t } = useTranslation("placeholder");
  return (
    <PlaceholderPage
      icon="👤"
      title={t("profile.title")}
      message={t("profile.message")}
      hint={t("profile.hint")}
    />
  );
}
