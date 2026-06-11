"use client";

import { PlaceholderPage } from "@/components/placeholder-page";
import { useTranslation } from "react-i18next";

export default function NotificationsPage() {
  const { t } = useTranslation("placeholder");
  return (
    <PlaceholderPage
      icon="🔔"
      title={t("notifications.title")}
      message={t("notifications.message")}
      hint={t("notifications.hint")}
    />
  );
}
