import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Backend (Cloud Run) origin. The paths below are proxied here by Vercel so the
// browser only ever talks to the frontend origin — keeping session cookies
// first-party (works in Safari) and removing the need for CORS.
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN ||
  "https://signlingo-backend-85465027835.asia-northeast3.run.app"

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  turbopack: {
    // Keep Next.js rooted in the frontend package even when parent folders contain lockfiles.
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Top-level backend (games_port etc.) routes the frontend calls. These live
    // at the Django root, not under /api/, so they must be proxied explicitly.
    // None collide with Next.js page routes.
    const backendRoutes = [
      "predict", "predict_gru",
      "get-question", "get-question-ml", "check-answer",
      "save-session-results", "result-summary", "get-summary-results",
      "ml_game", "decrement_life", "gamepage", "capture",
      "magic_touch", "magic_touch_advanced",
      "translation_mode", "translate_sequence",
      "health", "health/",
    ]
    return [
      { source: "/api/:path*", destination: `${BACKEND_ORIGIN}/api/:path*` },
      { source: "/login/google", destination: `${BACKEND_ORIGIN}/login/google` },
      { source: "/login/google/:path*", destination: `${BACKEND_ORIGIN}/login/google/:path*` },
      { source: "/static/:path*", destination: `${BACKEND_ORIGIN}/static/:path*` },
      ...backendRoutes.map((p) => ({
        source: `/${p}`,
        destination: `${BACKEND_ORIGIN}/${p}`,
      })),
    ]
  },
}

export default nextConfig
