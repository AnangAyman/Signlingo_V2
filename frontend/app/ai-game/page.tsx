"use client";

import Link from "next/link";
import { Camera, ExternalLink, Gamepad2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULT_BACKEND_URL =
  process.env.NODE_ENV === "production"
    ? "https://signlingo-django.onrender.com"
    : "http://localhost:8000";

const BACKEND_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  DEFAULT_BACKEND_URL;

function backendPath(path: string) {
  return `${BACKEND_URL.replace(/\/$/, "")}${path}`;
}

export default function AIGamePage() {
  const magicTouchUrl = backendPath("/magic_touch");
  const cameraPracticeUrl = backendPath("/capture");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            Django AI backend connected
          </p>
          <h1 className="text-4xl font-black text-foreground mb-3">
            AI Practice Game
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            The new Next.js frontend now links to the existing Django camera
            and prediction flow while the full React game UI is being integrated.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-primary/30">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
                <Gamepad2 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Magic Touch Game</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Open the Django-powered game page that uses the current
                MediaPipe/static letter prediction backend.
              </p>
              <Button asChild className="w-full">
                <Link href={magicTouchUrl} target="_blank" rel="noreferrer">
                  Open Magic Touch
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center mb-3">
                <Camera className="w-6 h-6 text-secondary" />
              </div>
              <CardTitle>Camera Practice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Use the existing Django camera capture page to test live
                recognition before the final frontend game screen is finished.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href={cameraPracticeUrl} target="_blank" rel="noreferrer">
                  Open Camera Practice
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
