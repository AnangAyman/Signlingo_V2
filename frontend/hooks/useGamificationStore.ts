// Convenience re-export so consumers can import from "@/hooks/useGamificationStore"
// without needing to know the implementation location.
export { useGamificationStore } from "@/components/gamification/useGamificationStore";
export type {
  Badge,
  Reward,
  DailyQuest,
  UserProgress,
} from "@/components/gamification/useGamificationStore";
