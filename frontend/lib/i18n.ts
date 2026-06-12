import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "@/locales/en/common.json";
import enLeaderboard from "@/locales/en/leaderboard.json";
import enGamification from "@/locales/en/gamification.json";
import enPlaceholder from "@/locales/en/placeholder.json";
import enLeagues from "@/locales/en/leagues.json";
import enDashboard from "@/locales/en/dashboard.json";
import enAuth from "@/locales/en/auth.json";
import enLessons from "@/locales/en/lessons.json";
import enAiGame from "@/locales/en/ai-game.json";

import koCommon from "@/locales/ko/common.json";
import koLeaderboard from "@/locales/ko/leaderboard.json";
import koGamification from "@/locales/ko/gamification.json";
import koPlaceholder from "@/locales/ko/placeholder.json";
import koLeagues from "@/locales/ko/leagues.json";
import koDashboard from "@/locales/ko/dashboard.json";
import koAuth from "@/locales/ko/auth.json";
import koLessons from "@/locales/ko/lessons.json";
import koAiGame from "@/locales/ko/ai-game.json";

const resources = {
  en: {
    common: enCommon,
    leaderboard: enLeaderboard,
    gamification: enGamification,
    placeholder: enPlaceholder,
    leagues: enLeagues,
    dashboard: enDashboard,
    auth: enAuth,
    lessons: enLessons,
    "ai-game": enAiGame,
  },
  ko: {
    common: koCommon,
    leaderboard: koLeaderboard,
    gamification: koGamification,
    placeholder: koPlaceholder,
    leagues: koLeagues,
    dashboard: koDashboard,
    auth: koAuth,
    lessons: koLessons,
    "ai-game": koAiGame,
  },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    ns: ["common", "leaderboard", "gamification", "placeholder", "leagues", "dashboard", "auth", "lessons", "ai-game"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
