/**
 * Centralised API client for the Django backend.
 *
 * Set NEXT_PUBLIC_API_URL in `.env.local` to point at your backend, e.g.
 *   NEXT_PUBLIC_API_URL=http://localhost:8000
 *
 * All calls include `credentials: "include"` so the Django session cookie
 * is sent automatically after login.
 */

function getDefaultApiUrl(): string {
  if (process.env.NODE_ENV === "production") {
    return "https://signlingo-django-cloudrun-test-wnkjpwb6cq-du.a.run.app";
  }

  if (typeof window !== "undefined" && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }

  return "http://localhost:8000";
}

const BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  getDefaultApiUrl();

export const API_BASE_URL = BASE_URL.replace(/\/$/, "");

export function backendPath(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

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
  bestGameScore?: number;
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

export interface ApiDashboard {
  user: ApiUser;
  rank: number | null;
  currentStreak: number;
  completedLessons: number;
  totalLessons: number;
  moduleProgressPercent: number;
  currentLesson: { id: number; title: string; url: string } | null;
}

export interface ApiQuizQuestion {
  id?: number;
  question: string;
  choices: string[];
  answer: string;
  image?: string;
}

export interface ApiMlQuestion {
  id?: number;
  question: string;
  answer: string;
}

export interface ApiPrediction {
  result: string;
  confidence?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Internal fetch wrapper
// ---------------------------------------------------------------------------

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
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
// Interactive game / practice endpoints
// ---------------------------------------------------------------------------

export const gameApi = {
  getQuestion: () => request<ApiQuizQuestion>("/get-question"),

  getMlQuestion: () => request<ApiMlQuestion>("/get-question-ml"),

  checkAnswer: (selected: string, correct: string) =>
    request<{ result: boolean; points: number }>("/check-answer", {
      method: "POST",
      body: JSON.stringify({ selected, correct }),
    }),

  saveSessionResults: (payload: {
    type: "game" | "ml";
    xp: number;
    accuracy: number;
    skipped: boolean;
  }) =>
    request<{ success: boolean }>("/save-session-results", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  predict: async (image: Blob) => {
    const formData = new FormData();
    formData.append("image", image, "snapshot.jpg");

    const res = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<ApiPrediction>;
  },
};

// ---------------------------------------------------------------------------
// Gamification — persist earned XP to the backend (user.points)
// ---------------------------------------------------------------------------

export const gamificationApi = {
  addXp: (amount: number) =>
    request<{ success: boolean; xp: number }>("/api/add-xp", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  // Record the best Magic Touch game score (server keeps the max).
  saveGameScore: (score: number) =>
    request<{ success: boolean; bestGameScore: number }>("/api/game-score", {
      method: "POST",
      body: JSON.stringify({ score }),
    }),
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
