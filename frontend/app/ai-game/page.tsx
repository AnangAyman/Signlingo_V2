"use client";

import Link from "next/link";
import { Camera, ExternalLink, Gamepad2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { backendPath } from "@/lib/api";
import { useTranslation } from "react-i18next";

export default function AIGamePage() {
  const { t } = useTranslation("ai-game");
  const magicTouchUrl = backendPath("/magic_touch");
  const cameraPracticeUrl = backendPath("/capture");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            {t("badge")}
          </p>
          <h1 className="text-4xl font-black text-foreground mb-3">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-primary/30">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
                <Gamepad2 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>{t("magicTouch.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t("magicTouch.description")}
              </p>
              <Button asChild className="w-full">
                <Link href={magicTouchUrl}>
                  {t("magicTouch.button")}
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
              <CardTitle>{t("cameraPractice.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t("cameraPractice.description")}
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href={cameraPracticeUrl}>
                  {t("cameraPractice.button")}
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
