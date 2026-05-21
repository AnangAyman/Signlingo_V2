"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("i18nextLng") : null;
    if (saved === "en" || saved === "ko") {
      i18n.changeLanguage(saved);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
