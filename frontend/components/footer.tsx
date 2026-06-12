"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { SignLingoLogo } from "./welcome-character";
import { Github, Twitter, Instagram, Linkedin, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

const FOOTER_LINK_KEYS = {
  product: ["features", "leagues", "pricing", "mobileApp"],
  company: ["aboutUs", "careers", "blog", "pressKit"],
  resources: ["helpCenter", "community", "signDictionary", "tutorials"],
  legal: ["privacyPolicy", "termsOfService", "accessibility", "cookiePolicy"],
} as const;

const FOOTER_LINK_HREFS: Record<string, string> = {
  features: "#features",
  leagues: "#leagues",
  pricing: "#pricing",
  mobileApp: "#",
  aboutUs: "#",
  careers: "#",
  blog: "#",
  pressKit: "#",
  helpCenter: "#",
  community: "#",
  signDictionary: "#",
  tutorials: "#",
  privacyPolicy: "#",
  termsOfService: "#",
  accessibility: "#",
  cookiePolicy: "#",
};

const SOCIAL_LINKS = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
];

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <SignLingoLogo ariaLabel={t("media.handLogoAlt")} className="w-10 h-10" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                SignLingo
              </span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-xs">
              {t("footer.tagline")}
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {(Object.entries(FOOTER_LINK_KEYS) as [keyof typeof FOOTER_LINK_KEYS, readonly string[]][]).map(([section, linkKeys]) => (
            <div key={section}>
              <h3 className="font-semibold text-foreground mb-4">{t(`footer.sections.${section}`)}</h3>
              <ul className="space-y-3">
                {linkKeys.map((key) => (
                  <li key={key}>
                    <Link
                      href={FOOTER_LINK_HREFS[key]}
                      className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      {t(`footer.links.${key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                {t("footer.stayUpdated")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("footer.stayUpdatedDesc")}
              </p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <input
                type="email"
                placeholder={t("footer.emailPlaceholder")}
                className="flex-1 md:w-64 px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap">
                {t("footer.subscribe")}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <p className="flex items-center gap-1">
            {t("footer.madeWith")}
          </p>
        </div>
      </div>
    </footer>
  );
}
