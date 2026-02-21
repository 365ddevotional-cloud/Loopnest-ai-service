import { Link } from "wouter";
import { Heart } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useI18n();
  
  const legalLinks = [
    { href: "/privacy-policy", label: t("privacyPolicy") },
    { href: "/terms-of-use", label: t("termsOfUse") },
    { href: "/disclaimer", label: t("disclaimer") },
    { href: "/contact", label: t("contactUs") },
  ];

  return (
    <footer className="w-full border-t border-primary/10 bg-gradient-to-b from-background to-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                data-testid={`footer-link-${link.href.replace("/", "")}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              {t("madeWithLove")} <Heart className="w-4 h-4 text-primary" /> {t("forBelievers")}
            </p>
            <p className="text-xs text-muted-foreground/70">
              &copy; {currentYear} {t("dailyDevotional")}. {t("allRightsReserved")}.
            </p>
          </div>

          <div className="w-24 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <div className="text-center space-y-3 max-w-2xl" data-testid="bible-attribution">
            <p className="text-xs text-muted-foreground/80 font-medium">
              {t("bibleTranslationsUsed")}
            </p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground/70">
              <span>King James Version (KJV) – Public Domain</span>
              <span>World English Bible (WEB) – Public Domain</span>
              <span>American Standard Version (ASV 1901) – Public Domain</span>
              <span>Douay-Rheims Bible (DRB) – Public Domain</span>
            </div>
            <p className="text-xs text-muted-foreground/60 italic">
              {t("scriptureDisclaimer")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
