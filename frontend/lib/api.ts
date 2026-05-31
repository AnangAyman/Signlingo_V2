/**
 * Centralised API client for the Django backend.
 *
 * Set NEXT_PUBLIC_API_URL in .env.local to point at your backend.
 */

const BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8000";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  league: string;
  dailyStreak: number;
  lives: number;
  username: string;
}

export interface ApiLeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  xp: number;
  weeklyXp: number;
  isCurrentUser: boolean;
  isFriend: boolean;
  league: string;
  isOnline: boolean;
  weeklyChange: "up" | "down" | "same";
}

export interface ApiLesson {
  id: number;
  key: string;
  title: string;
  url: string;
  status: "not_started" | "in_progress" | "completed";
  isCurrent: boolean;
}

export interface ApiShopItem {
  id: number;
  name: string;
  description: string;
  cost_xp: number;
  item_type: string;
  icon_url: string;
  is_limited: boolean;
  stock_remaining: number;
  level_requirement: number;
  league_requirement: string;
  slot?: string | null;
  duration_minutes?: number | null;
  uses_left?: number | null;
  discount_percent?: number | null;
}

export interface ApiDashboard {
  user: ApiUser;
  rank: number | null;
  currentStreak: number;
  completedLessons: number;
  totalLessons: number;
  moduleProgressPercent: number;
  currentLesson: { id: number; title: string; url: string } | null;
}

// ---------------------------------------------------------------------------
// Internal fetch wrapper
// ---------------------------------------------------------------------------

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  login: (email: string, password: string) =>
    request<{ user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    request<{ user: ApiUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  logout: () =>
    request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),

  me: () => request<{ user: ApiUser }>("/api/auth/me"),
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const dashboardApi = {
  get: () => request<ApiDashboard>("/api/dashboard"),
};

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export const leaderboardApi = {
  get: (type: "global" | "friends" = "global") =>
    request<{ entries: ApiLeaderboardEntry[] }>(`/api/leaderboard?type=${type}`),
};

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export const lessonsApi = {
  list: () =>
    request<{
      lessons: ApiLesson[];
      completed: number;
      total: number;
      progress: number;
    }>("/api/lessons"),

  markStatus: (lessonKey: string, status: ApiLesson["status"]) =>
    request<{ success: boolean }>("/api/lessons/mark-status", {
      method: "POST",
      body: JSON.stringify({ lesson_key: lessonKey, status }),
    }),
};

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

export const shopApi = {
  listItems: () => request<{ items: ApiShopItem[] }>("/api/shop/items/"),

  getUserInventory: () =>
    request<{ item_ids: number[] }>("/api/shop/user-inventory/"),

  purchase: (itemId: number) =>
    request<{ user_xp: number; item: ApiShopItem; inventory?: number[] }>(
      "/api/shop/purchase/",
      {
        method: "POST",
        body: JSON.stringify({ item_id: itemId }),
      }
    ),

  equip: (itemId: number, slot: string) =>
    request<{ equipped: Record<string, number>; item?: ApiShopItem }>(
      "/api/shop/equip/",
      {
        method: "POST",
        body: JSON.stringify({ item_id: itemId, slot }),
      }
    ),

  getEquipped: () =>
    request<{ equipped: Record<string, number> }>("/api/shop/user-equipped/"),

  getDailyDeal: () =>
    request<{ item: ApiShopItem | null }>("/api/shop/daily-deal/"),

  buyMysteryBox: () =>
    request<{ item: ApiShopItem; user_xp?: number }>(
      "/api/shop/buy-mystery-box/",
      { method: "POST" }
    ),
};

// ---------------------------------------------------------------------------
// Friends / Social
// ---------------------------------------------------------------------------

export const friendsApi = {
  add: (friendId: string) =>
    request<{ success: boolean; friend: { id: number; name: string } }>(
      `/api/friends/${friendId}/add`,
      { method: "POST" }
    ),

  remove: (friendId: string) =>
    request<{ success: boolean }>(`/api/friends/${friendId}/remove`, {
      method: "POST",
    }),

  search: (q: string) =>
    request<Array<{ id: number; name: string }>>(
      `/api/users/search?q=${encodeURIComponent(q)}`
    ),
};
