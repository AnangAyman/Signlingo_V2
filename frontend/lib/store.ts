import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, type ApiUser } from "@/lib/api";

// ============================================================
// AUTH STORE
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  xp: number;
  level: number;
  league: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  dailyStreak: number;
  lives: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCheckedSession: boolean;
  skipIntro: boolean;
  setSkipIntro: (skip: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

function mapApiUser(u: ApiUser): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    xp: u.xp,
    level: u.level,
    league: u.league.toLowerCase() as User["league"],
    dailyStreak: u.dailyStreak,
    lives: u.lives,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      hasCheckedSession: false,
      skipIntro: false,

      setSkipIntro: (skip) => set({ skipIntro: skip }),

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { user } = await authApi.login(email, password);
          set({ user: mapApiUser(user), isAuthenticated: true, isLoading: false, hasCheckedSession: true, skipIntro: true });
        } catch (err) {
          set({ isLoading: false, hasCheckedSession: true });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore network errors — clear local state regardless.
        }
        set({ user: null, isAuthenticated: false, hasCheckedSession: true, skipIntro: false });
      },

      signup: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        try {
          const { user } = await authApi.register(email, password, name);
          set({ user: mapApiUser(user), isAuthenticated: true, isLoading: false, hasCheckedSession: true, skipIntro: true });
        } catch (err) {
          set({ isLoading: false, hasCheckedSession: true });
          throw err;
        }
      },

      refreshUser: async () => {
        try {
          const { user } = await authApi.me();
          set({ user: mapApiUser(user), isAuthenticated: true, hasCheckedSession: true });
        } catch {
          set({ user: null, isAuthenticated: false, hasCheckedSession: true });
        }
      },
    }),
    {
      name: "signlingo-auth",
      partialize: (state) => ({
        skipIntro: state.skipIntro,
      }),
    }
  )
);

// ============================================================
// ANIMATION PREFERENCES STORE
// ============================================================

interface AnimationState {
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
}

export const useAnimationStore = create<AnimationState>((set) => ({
  reducedMotion: false,
  setReducedMotion: (reduced) => set({ reducedMotion: reduced }),
}));
