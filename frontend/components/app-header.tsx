"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hand,
  LayoutDashboard,
  Trophy,
  Gamepad2,
  BookOpen,
  Bot,
  Languages,
  Bell,
  Settings,
  User,
  LogOut,
  Flame,
  Zap,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/common/LanguageToggle";

const NAV_LINK_CONFIGS = [
  { href: "/dashboard", labelKey: "appNav.home", icon: LayoutDashboard },
  { href: "/lessons", labelKey: "appNav.lessons", icon: BookOpen },
  { href: "/leaderboard", labelKey: "appNav.leaderboard", icon: Trophy },
  { href: "/gamification", labelKey: "appNav.achievements", icon: Gamepad2 },
  { href: "/ai-game", labelKey: "appNav.aiGame", icon: Bot },
  { href: "/translation", labelKey: "appNav.translation", icon: Languages },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(false);
    if (dropdownOpen) {
      window.addEventListener("click", handleClickOutside);
      return () => window.removeEventListener("click", handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Render a minimal skeleton header until client hydration completes
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border h-[57px]" />
    );
  }

  if (!user) return null;

  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border w-full overflow-visible">
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between gap-4 max-w-full">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Hand className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground hidden sm:block">
              SignLingo
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label={t("appNav.mainNavigation")}>
            {NAV_LINK_CONFIGS.map(({ href, labelKey, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  {t(labelKey)}
                </Link>
              );
            })}
          </nav>

          {/* Tablet Responsive Nav (640px - 1024px) */}
          <nav className="hidden md:flex lg:hidden items-center gap-1" aria-label="Main navigation">
            {NAV_LINK_CONFIGS.slice(0, -1).map(({ href, labelKey, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDropdownOpen(false)}
                  className={`
                    flex items-center gap-1.5 px-2 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  <span className="hidden xl:inline">{t(labelKey)}</span>
                </Link>
              );
            })}

            {/* Dropdown for hidden/overflow links on medium screens */}
            <div className="relative z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen(!dropdownOpen);
                }}
                className="flex items-center gap-1 px-2 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="More navigation options"
                aria-expanded={dropdownOpen}
              >
                <ChevronDown className="w-4 h-4" aria-hidden />
              </button>
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-background/95 backdrop-blur-md shadow-lg z-50 overflow-visible"
                  >
                    {NAV_LINK_CONFIGS.map(({ href, labelKey, icon: Icon }) => {
                      const isActive = pathname === href || pathname.startsWith(href + "/");
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setDropdownOpen(false)}
                          className={`
                            flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg
                            transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg
                            ${isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" aria-hidden />
                          {t(labelKey)}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Stats + User Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* XP & Streak pill (desktop) */}
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50">
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <Flame className="w-4 h-4 text-orange-500" aria-hidden />
                {t("appNav.dayStreak", { count: user.dailyStreak })}
              </span>
              <span className="w-px h-4 bg-border" aria-hidden />
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <Zap className="w-4 h-4 text-primary" aria-hidden />
                {user.xp} XP
              </span>
              <span className="w-px h-4 bg-border" aria-hidden />
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {t("appNav.level", { level: user.level })}
              </Badge>
            </div>

            {/* Notifications */}
            <Link href="/notifications" aria-label={t("appNav.notifications")}>
              <Button variant="ghost" size="icon" className="relative" tabIndex={-1}>
                <Bell className="w-5 h-5" />
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full"
                  aria-label={t("appNav.unreadNotifications")}
                />
              </Button>
            </Link>

            {/* Settings */}
            <Link href="/settings" aria-label={t("appNav.settings")}>
              <Button variant="ghost" size="icon" tabIndex={-1}>
                <Settings className="w-5 h-5" />
              </Button>
            </Link>

            {/* Avatar / Profile */}
            <Link href="/profile" className="hidden sm:flex items-center gap-2 pl-2 border-l border-border" aria-label={t("appNav.yourProfile")}>
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden xl:block text-left">
                <p className="text-sm font-medium text-foreground leading-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground leading-tight capitalize">
                  {t("appNav.leagueLabel", { league: user.league })}
                </p>
              </div>
            </Link>

            {/* Language Toggle */}
            <LanguageToggle />

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
              aria-label={t("auth.logout")}
            >
              <LogOut className="w-4 h-4" />
            </Button>

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? t("appNav.closeNavigation") : t("appNav.openNavigation")}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden border-t border-border bg-background"
            aria-label={t("appNav.mobileNavigation")}
          >
            <div className="container mx-auto px-4 py-3 space-y-1">
              {/* Mobile stats */}
              <div className="flex items-center gap-4 px-3 py-2 mb-2 rounded-lg bg-muted/60">
                <span className="flex items-center gap-1 text-sm font-semibold">
                  <Flame className="w-4 h-4 text-orange-500" aria-hidden />
                  {t("appNav.dayStreak", { count: user.dailyStreak })}
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold">
                  <Zap className="w-4 h-4 text-primary" aria-hidden />
                  {user.xp} XP
                </span>
                <Badge variant="secondary" className="text-xs">
                  {t("appNav.level", { level: user.level })}
                </Badge>
              </div>

              {NAV_LINK_CONFIGS.map(({ href, labelKey, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors
                      ${isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" aria-hidden />
                    {t(labelKey)}
                  </Link>
                );
              })}

              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <User className="w-4 h-4" aria-hidden />
                {t("appNav.profile")}
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden />
                {t("auth.logout")}
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
