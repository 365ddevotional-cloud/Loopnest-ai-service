import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, Settings, Info, BookOpen, Heart, ShoppingBag, MessageCircleHeart, HelpCircle, LogOut, LogIn, Menu, X, Bell, BellOff, Book, GraduationCap, Star, HandHeart, Sparkles, Inbox, Music2, Library, UserCircle, Building2, ChevronDown, Smartphone } from "lucide-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { GameConsoleIcon } from "@/interactive/GameConsoleIcon";
import { SiYoutube } from "react-icons/si";
import { cn } from "@/lib/utils";
import { MinistryLogo } from "@/components/MinistryLogo";
import { isStillLogoRoute } from "@/lib/ministry-logo";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { useNotifications } from "@/hooks/use-notifications";
import { useTranslation, TRANSLATION_LABELS } from "@/contexts/TranslationContext";
import { useMenuTransition } from "@/contexts/MenuTransitionContext";
import { BIBLE_TRANSLATIONS, type BibleTranslation } from "@shared/schema";
import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { TranslationSelector } from "@/components/TranslationSelector";
import { SettingsModal, MobileSettingsSection } from "@/components/SettingsModal";
import { LanguageSwitcher, MobileLanguageSwitcher } from "@/components/LanguageSwitcher";

const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=app.replit.attachment_parser__365ddevotional.twa";

function MobileTranslationSelector() {
  const { translation, setTranslation } = useTranslation();
  const { t: mt } = useI18n();
  
  return (
    <div className="mt-4 border-t border-primary/10 pt-4">
      <div className="px-4 pb-2">
        <span className="text-sm font-medium text-muted-foreground">{mt("bibleTranslation")}</span>
      </div>
      <div className="flex flex-col gap-1 px-2">
        {BIBLE_TRANSLATIONS.map((t) => (
          <button
            key={t}
            onClick={() => setTranslation(t as BibleTranslation)}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-lg text-base font-medium transition-all duration-200",
              translation === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
            )}
            data-testid={`button-translation-mobile-${t}`}
          >
            <Book className="w-4 h-4" />
            <div className="flex flex-col items-start gap-0.5">
              <span>{t}</span>
              <span className="text-xs opacity-75">{TRANSLATION_LABELS[t as BibleTranslation]}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface MobileNavGroupProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  "data-testid"?: string;
}

function MobileNavGroup({ label, isOpen, onToggle, children, "data-testid": testId }: MobileNavGroupProps) {
  return (
    <div className="border border-primary/10 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors uppercase tracking-wider"
        data-testid={testId}
      >
        <span>{label}</span>
        <ChevronDown
          className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>
      {isOpen && (
        <div className="border-t border-primary/10 bg-background/40 flex flex-col py-1">
          {children}
        </div>
      )}
    </div>
  );
}

interface MobileNavItemProps {
  onClick: () => void;
  isActive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  "data-testid"?: string;
  href?: string;
  external?: boolean;
}

function MobileNavItem({ onClick, isActive, icon: Icon, label, "data-testid": testId, href, external }: MobileNavItemProps) {
  const inner = (
    <>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </>
  );
  if (external && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
        data-testid={testId}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left",
        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
      )}
      data-testid={testId}
    >
      {inner}
    </button>
  );
}

export function Header() {
  const [location, setLocation] = useLocation();
  const { isAdmin, logout } = useAuth();
  const { user: appUser, emailVerified: appEmailVerified, signUserOut } = useUser();
  const { currentSong, isPlaying, miniPlayerDismissed } = useMusicPlayer();
  // Hide the chip when already on the detail page of the currently playing song
  const isOnCurrentSongPage = !!currentSong && location === `/music/${currentSong.slug}`;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    // Auto-open the group containing the current route
    if (location === "/" || location.startsWith("/archive") || location.startsWith("/bible") || location.startsWith("/sunday-school") || location.startsWith("/daily-promise")) return "daily-faith";
    if (location.startsWith("/music") || location.startsWith("/interactive")) return "worship-media";
    if (location.startsWith("/prayer") || location.startsWith("/inbox") || location.startsWith("/testimonies") || location.startsWith("/quick-prayer")) return "prayer-community";
    if (location.startsWith("/church") || location.startsWith("/about") || location.startsWith("/donate")) return "church-ministry";
    if (location.startsWith("/my-library") || location.startsWith("/signin")) return "my-account";
    if (location.startsWith("/admin")) return "administration";
    return "daily-faith";
  });
  // Animate the now-playing chip on enter/exit/song-change
  const [displaySong, setDisplaySong] = useState(currentSong);
  const [chipAnim, setChipAnim] = useState<"entering" | "idle" | "exiting" | "pulsing">("idle");
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSongIdRef = useRef<number | null>(currentSong?.id ?? null);
  const prevIsOnCurrentSongPageRef = useRef<boolean>(isOnCurrentSongPage);

  useEffect(() => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (currentSong) {
      const prevId = prevSongIdRef.current;
      prevSongIdRef.current = currentSong.id;
      setDisplaySong(currentSong);
      if (prevId !== null && prevId !== currentSong.id) {
        // Song changed mid-playlist — pulse the chip
        setChipAnim("idle"); // reset first so re-triggering works
        requestAnimationFrame(() => {
          setChipAnim("pulsing");
          exitTimerRef.current = setTimeout(() => setChipAnim("idle"), 370);
        });
      } else {
        // Chip entering for the first time
        setChipAnim("entering");
        const t = setTimeout(() => setChipAnim("idle"), 350);
        return () => clearTimeout(t);
      }
    } else {
      prevSongIdRef.current = null;
      setChipAnim("exiting");
      exitTimerRef.current = setTimeout(() => {
        setDisplaySong(null);
        setChipAnim("idle");
      }, 220);
    }
  }, [currentSong]);

  // Re-animate the chip when the user navigates away from the song detail page
  // while the same song is still playing (isOnCurrentSongPage: true → false)
  useEffect(() => {
    const wasOnPage = prevIsOnCurrentSongPageRef.current;
    prevIsOnCurrentSongPageRef.current = isOnCurrentSongPage;
    if (wasOnPage && !isOnCurrentSongPage && currentSong) {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      setDisplaySong(currentSong);
      setChipAnim("entering");
      exitTimerRef.current = setTimeout(() => setChipAnim("idle"), 350);
    }
  }, [isOnCurrentSongPage, currentSong]);

  const chipAnimClass =
    chipAnim === "entering" ? "animate-chip-enter" :
    chipAnim === "exiting"  ? "animate-chip-exit"  :
    chipAnim === "pulsing"  ? "animate-chip-pulse" : "";

  const { triggerTransition } = useMenuTransition();
  const { t } = useI18n();
  const { 
    isSupported: notificationsSupported, 
    permission: notificationPermission,
    isEnabled: notificationsEnabled, 
    setEnabled: setNotificationsEnabled,
    requestPermission 
  } = useNotifications();

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && notificationPermission === "default") {
      await requestPermission();
    } else {
      setNotificationsEnabled(enabled);
    }
  };

  const navigateWithTransition = (href: string) => {
    if (location !== href) {
      setMobileMenuOpen(false);
      triggerTransition(() => { setLocation(href); });
    } else {
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    setLocation("/");
  };

  const navItems = [
    { href: "/", label: t("today"), icon: BookOpen, external: false },
    { href: "/archive", label: t("archive"), icon: Calendar, external: false },
    { href: "/bible", label: t("bible"), icon: Book, external: false },
    { href: "/sunday-school", label: t("sundaySchool"), icon: GraduationCap, external: false },
    { href: "/daily-promise", label: "God's Promises", icon: Sparkles, external: false },
    { href: "/music", label: "SpiritTone Music", icon: Music2, external: false },
    { href: "https://www.youtube.com/@365DailyDevotional", label: "YouTube", icon: SiYoutube, external: true },
    { href: "/shop", label: "Shop", icon: ShoppingBag, external: false },
    { href: "/prayer-counseling", label: t("prayerCounseling"), icon: MessageCircleHeart, external: false },
    { href: "/inbox", label: "Inbox", icon: Inbox, external: false },
    { href: "/testimonies", label: "Testimonies", icon: Star, external: false },
    { href: "/about", label: t("about"), icon: Info, external: false },
    { href: "/donate", label: t("donate"), icon: Heart, external: false },
    { href: "/church", label: "Church Mode", icon: Building2, external: false },
  ];

  const adminNavItem = isAdmin 
    ? { href: "/admin", label: t("adminDashboard"), icon: Settings, external: false }
    : { href: "/admin-login", label: t("login"), icon: LogIn, external: false };

  const visibleNavItems = [...navItems, adminNavItem];
  // Keep primary navigation readable on a laptop; secondary links stay one click away.
  const primaryNavItems = visibleNavItems.filter(item => ["/", "/archive", "/bible", "/music", "/prayer-counseling"].includes(item.href));
  const secondaryNavItems = visibleNavItems.filter(item => !primaryNavItems.includes(item));

  const toggleGroup = (group: string) => {
    setOpenGroup(prev => prev === group ? null : group);
  };

  return (
    <header className="sticky top-2 z-50 w-full bg-gradient-to-r from-background/98 via-background/95 to-background/98 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b border-primary/15 shadow-sm mt-2">
      <div className="container mx-auto px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 relative">
        {/* Always-visible ministry identity: full-size still logo beside the name. */}
        <button
          onClick={() => navigateWithTransition("/")}
          className="flex min-w-0 items-center gap-2 sm:gap-3 group"
          data-testid="header-devotional-brand"
        >
          <img
            src="/365-logo.jpeg"
            alt="365 Daily Devotional ministry logo"
            className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-md object-contain"
            onError={(event) => { event.currentTarget.src = "/branding/365-jesus-christ-is-lord.gif"; }}
          />
          <span className="font-serif text-xl sm:text-2xl font-bold text-primary tracking-wide leading-tight">
            {t("dailyDevotionalShort")}
          </span>
        </button>
        <a
          href={GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
          data-testid="header-continue-to-app"
          aria-label="Continue to App — install 365 Daily Devotional from Google Play"
        >
          <Smartphone className="h-4 w-4" />
          <span>Continue to App</span>
        </a>

        {/* Desktop Navigation — separate scrollable row so the brand and app button remain visible. */}
        <nav className="hidden lg:flex order-3 w-full items-center gap-1 overflow-x-auto whitespace-nowrap pb-1">
          {/* Sign In / authenticated account — always first */}
          {appUser && appEmailVerified ? (
            <>
              <button
                onClick={() => navigateWithTransition("/my-library")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                  location === "/my-library"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
                data-testid="button-my-library-nav"
              >
                <Library className="w-4 h-4" />
                My Library
              </button>
              <button
                onClick={() => navigateWithTransition("/account")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                  location === "/account"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
                data-testid="button-my-account-nav"
              >
                <UserCircle className="w-4 h-4" />
                My Account
              </button>
              <button
                onClick={async () => { await signUserOut(); setLocation("/signin"); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                data-testid="button-user-signout-nav"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => navigateWithTransition("/signin")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                location === "/signin"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
              )}
              data-testid="button-signin-nav"
            >
              <UserCircle className="w-4 h-4" />
              Sign In
            </button>
          )}
          <button
            onClick={() => navigateWithTransition("/how-to-use")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-muted-foreground hover:bg-primary/5 hover:text-primary"
            data-testid="button-how-to-use"
          >
            <HelpCircle className="w-4 h-4" />
            {t("howToUse")}
          </button>
          {primaryNavItems.map((item) => {
            const isActive = !item.external && location === item.href;
            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}-nav`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </a>
              );
            }
            return (
              <button
                key={item.href}
                onClick={() => navigateWithTransition(item.href)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}-nav`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
          <button onClick={() => navigateWithTransition("/promotions")} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-500/10" data-testid="nav-promotions">Promotions</button>
          <button onClick={() => navigateWithTransition("/updates")} className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/5" data-testid="nav-whats-new">What's New</button>
          <button onClick={() => navigateWithTransition("/discipleship")} className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/5" data-testid="nav-discipleship">Discipleship</button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="shrink-0" data-testid="nav-more">More <ChevronDown className="ml-1 h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto">
              {secondaryNavItems.map(item => <DropdownMenuItem key={item.href} onSelect={() => { if (item.external) window.open(item.href, "_blank", "noopener,noreferrer"); else navigateWithTransition(item.href); }}>{item.label}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          {isAdmin && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              {t("logout")}
            </button>
          )}
          {/* Now-playing chip — desktop */}
          {displaySong && !isOnCurrentSongPage && (
            <button
              onClick={() => {
                if (miniPlayerDismissed) {
                  // Mini-player is hidden — restore it
                  localStorage.removeItem("miniplayer-dismissed");
                  window.dispatchEvent(new CustomEvent("miniplayer-restore"));
                } else {
                  // Mini-player is already visible — draw attention to it
                  window.dispatchEvent(new CustomEvent("miniplayer-highlight"));
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors text-xs font-medium max-w-[180px]",
                chipAnimClass
              )}
              aria-label={`Now playing: ${displaySong.title}`}
              data-testid="header-now-playing"
              title={`Now playing: ${displaySong.title}`}
            >
              <span className="relative flex-shrink-0 w-3 h-3">
                <Music2 className="w-3 h-3" />
                {isPlaying && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </span>
              <span className="truncate">{displaySong.title}</span>
            </button>
          )}
          <TranslationSelector />
          <LanguageSwitcher />
          <SettingsModal />
          {notificationsSupported && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleNotificationToggle(!notificationsEnabled)}
              disabled={notificationPermission === "denied"}
              className={cn(
                "ml-1",
                notificationsEnabled && notificationPermission === "granted" 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
              title={notificationsEnabled ? "Disable daily reminders" : "Enable daily reminders"}
              data-testid="button-notifications-desktop"
            >
              {notificationsEnabled && notificationPermission === "granted" ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </Button>
          )}
        </nav>

        {/* Now-playing chip — mobile */}
        {displaySong && !isOnCurrentSongPage && (
          <button
            onClick={() => {
              if (miniPlayerDismissed) {
                // Mini-player is hidden — restore it
                localStorage.removeItem("miniplayer-dismissed");
                window.dispatchEvent(new CustomEvent("miniplayer-restore"));
              } else {
                // Mini-player is already visible — draw attention to it
                window.dispatchEvent(new CustomEvent("miniplayer-highlight"));
              }
            }}
            className={cn(
              "lg:hidden absolute right-16 flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors text-xs font-medium max-w-[110px]",
              chipAnimClass
            )}
            aria-label={`Now playing: ${displaySong.title}`}
            data-testid="header-now-playing-mobile"
            title={`Now playing: ${displaySong.title}`}
          >
            <span className="relative flex-shrink-0 w-3 h-3">
              <Music2 className="w-3 h-3" />
              {isPlaying && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </span>
            <span className="truncate">{displaySong.title}</span>
          </button>
        )}

        {/* Mobile Menu Button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden absolute right-4">
            <Button variant="ghost" size="icon" className="h-12 w-12" data-testid="button-mobile-menu">
              <Menu className="w-8 h-8" strokeWidth={3} />
              <span className="sr-only">{t("openMenu")}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[360px] overflow-y-auto">
            <SheetHeader className="border-b border-primary/10 pb-4 mb-4">
              <SheetTitle className="flex items-center gap-3">
                <MinistryLogo
                  seed={location} animated={!isStillLogoRoute(location)}
                  className="w-10 h-10 object-contain"
                />
                <span className="font-serif text-xl font-semibold text-primary tracking-wide">
                  {t("dailyDevotionalShort")}
                </span>
              </SheetTitle>
            </SheetHeader>
            
            <nav className="flex flex-col gap-2 pb-6">
              <MobileNavItem onClick={() => navigateWithTransition("/promotions")} icon={ShoppingBag} label="Promotions" />
              <MobileNavItem onClick={() => navigateWithTransition("/updates")} icon={Sparkles} label="What\u0027s New" />
              <MobileNavItem onClick={() => navigateWithTransition("/discipleship")} icon={GraduationCap} label="Discipleship" />
              <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 p-3 font-semibold text-white" data-testid="mobile-continue-to-app"><Smartphone className="h-5 w-5"/>Continue to App</a>
              {/* Sign In / Account — first item */}
              {appUser && appEmailVerified ? (
                <div className="flex flex-col gap-1 border border-primary/10 rounded-xl overflow-hidden">
                  <MobileNavItem
                    onClick={() => navigateWithTransition("/my-library")}
                    isActive={location === "/my-library"}
                    icon={Library}
                    label="My Library"
                    data-testid="button-my-library-nav-mobile-top"
                  />
                  <MobileNavItem
                    onClick={() => navigateWithTransition("/account")}
                    isActive={location === "/account"}
                    icon={UserCircle}
                    label="My Account"
                    data-testid="button-my-account-nav-mobile-top"
                  />
                  <button
                    onClick={async () => { setMobileMenuOpen(false); await signUserOut(); setLocation("/signin"); }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    data-testid="button-user-signout-nav-mobile-top"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <MobileNavItem
                  onClick={() => navigateWithTransition("/signin")}
                  isActive={location === "/signin"}
                  icon={UserCircle}
                  label="Sign In"
                  data-testid="button-signin-nav-mobile-top"
                />
              )}

              {/* Daily Faith */}
              <MobileNavGroup
                label="Daily Faith"
                isOpen={openGroup === "daily-faith"}
                onToggle={() => toggleGroup("daily-faith")}
                data-testid="group-daily-faith"
              >
                <MobileNavItem
                  onClick={() => navigateWithTransition("/")}
                  isActive={location === "/"}
                  icon={BookOpen}
                  label={t("today")}
                  data-testid="link-today-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => navigateWithTransition("/archive")}
                  isActive={location === "/archive"}
                  icon={Calendar}
                  label={t("archive")}
                  data-testid="link-archive-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => navigateWithTransition("/bible")}
                  isActive={location === "/bible"}
                  icon={Book}
                  label={t("bible")}
                  data-testid="link-bible-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => navigateWithTransition("/sunday-school")}
                  isActive={location.startsWith("/sunday-school")}
                  icon={GraduationCap}
                  label={t("sundaySchool")}
                  data-testid="link-sunday-school-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => navigateWithTransition("/daily-promise")}
                  isActive={location === "/daily-promise"}
                  icon={Sparkles}
                  label="God's Promises"
                  data-testid="link-gods-promises-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => navigateWithTransition("/how-to-use")}
                  isActive={location === "/how-to-use"}
                  icon={HelpCircle}
                  label={t("howToUse")}
                  data-testid="button-how-to-use-mobile"
                />
              </MobileNavGroup>

              {/* Worship & Media */}
              <MobileNavGroup
                label="Worship & Media"
                isOpen={openGroup === "worship-media"}
                onToggle={() => toggleGroup("worship-media")}
                data-testid="group-worship-media"
              >
                <MobileNavItem
                  onClick={() => navigateWithTransition("/music")}
                  isActive={location.startsWith("/music")}
                  icon={Music2}
                  label="SpiritTone Music"
                  data-testid="link-spirittone-music-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => setMobileMenuOpen(false)}
                  icon={SiYoutube}
                  label="YouTube"
                  href="https://www.youtube.com/@365DailyDevotional"
                  external
                  data-testid="link-youtube-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => navigateWithTransition("/shop")}
                  isActive={location === "/shop"}
                  icon={ShoppingBag}
                  label="Shop"
                  data-testid="link-shop-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => navigateWithTransition("/interactive/tap-the-promise")}
                  isActive={location === "/interactive/tap-the-promise"}
                  icon={GameConsoleIcon as any}
                  label="Tap The Promise"
                  data-testid="link-tap-the-promise-nav-mobile"
                />
              </MobileNavGroup>

              {/* Prayer & Community */}
              <MobileNavGroup
                label="Prayer & Community"
                isOpen={openGroup === "prayer-community"}
                onToggle={() => toggleGroup("prayer-community")}
                data-testid="group-prayer-community"
              >
                <MobileNavItem
                  onClick={() => navigateWithTransition("/prayer-counseling")}
                  isActive={location === "/prayer-counseling"}
                  icon={MessageCircleHeart}
                  label={t("prayerCounseling")}
                  data-testid="link-prayer-counseling-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => navigateWithTransition("/quick-prayer")}
                  isActive={location === "/quick-prayer"}
                  icon={HandHeart}
                  label="Pray Now"
                  data-testid="link-quick-prayer-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => navigateWithTransition("/inbox")}
                  isActive={location === "/inbox"}
                  icon={Inbox}
                  label="Inbox"
                  data-testid="link-inbox-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => navigateWithTransition("/testimonies")}
                  isActive={location === "/testimonies"}
                  icon={Star}
                  label="Testimonies"
                  data-testid="link-testimonies-nav-mobile"
                />
              </MobileNavGroup>

              {/* Church & Ministry */}
              <MobileNavGroup
                label="Church & Ministry"
                isOpen={openGroup === "church-ministry"}
                onToggle={() => toggleGroup("church-ministry")}
                data-testid="group-church-ministry"
              >
                <MobileNavItem
                  onClick={() => navigateWithTransition("/church")}
                  isActive={location.startsWith("/church")}
                  icon={Building2}
                  label="Church Mode"
                  data-testid="link-church-mode-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => navigateWithTransition("/about")}
                  isActive={location === "/about"}
                  icon={Info}
                  label={t("about")}
                  data-testid="link-about-nav-mobile"
                />
                <MobileNavItem
                  onClick={() => navigateWithTransition("/donate")}
                  isActive={location === "/donate"}
                  icon={Heart}
                  label={t("donate")}
                  data-testid="link-donate-nav-mobile"
                />
              </MobileNavGroup>

              {/* My Account — only shown when authenticated; Sign In is shown at the top when not */}
              {appUser && appEmailVerified && (
                <MobileNavGroup
                  label="My Account"
                  isOpen={openGroup === "my-account"}
                  onToggle={() => toggleGroup("my-account")}
                  data-testid="group-my-account"
                >
                  <MobileNavItem
                    onClick={() => navigateWithTransition("/my-library")}
                    isActive={location === "/my-library"}
                    icon={Library}
                    label="My Library"
                    data-testid="button-my-library-nav-mobile"
                  />
                  <MobileNavItem
                    onClick={() => navigateWithTransition("/account")}
                    isActive={location === "/account"}
                    icon={UserCircle}
                    label="My Account"
                    data-testid="button-my-account-nav-mobile"
                  />
                  <button
                    onClick={async () => { setMobileMenuOpen(false); await signUserOut(); setLocation("/signin"); }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    data-testid="button-user-signout-nav-mobile"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </MobileNavGroup>
              )}

              {/* Administration */}
              <MobileNavGroup
                label="Administration"
                isOpen={openGroup === "administration"}
                onToggle={() => toggleGroup("administration")}
                data-testid="group-administration"
              >
                <MobileNavItem
                  onClick={() => navigateWithTransition(isAdmin ? "/admin" : "/admin-login")}
                  isActive={location === "/admin" || location === "/admin-login"}
                  icon={isAdmin ? Settings : LogIn}
                  label={isAdmin ? t("adminDashboard") : t("login")}
                  data-testid="link-admin-nav-mobile"
                />
                {isAdmin && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    data-testid="button-logout-mobile"
                  >
                    <LogOut className="w-4 h-4" />
                    {t("logout")}
                  </button>
                )}
              </MobileNavGroup>

              {/* Settings strip */}
              <div className="mt-2 space-y-1">
                <MobileLanguageSwitcher />
                <MobileTranslationSelector />
                <MobileSettingsSection />
                {notificationsSupported && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10 mt-2 pt-4">
                    <div className="flex items-center gap-3">
                      {notificationsEnabled && notificationPermission === "granted" ? (
                        <Bell className="w-4 h-4 text-primary" />
                      ) : (
                        <BellOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium text-muted-foreground">{t("dailyReminders")}</span>
                    </div>
                    <Switch
                      checked={notificationsEnabled && notificationPermission === "granted"}
                      onCheckedChange={handleNotificationToggle}
                      disabled={notificationPermission === "denied"}
                      data-testid="switch-notifications-mobile"
                    />
                  </div>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

