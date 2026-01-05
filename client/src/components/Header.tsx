import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, Settings, Info, BookOpen, Heart, ShoppingBag, MessageCircleHeart, HelpCircle, LogOut, LogIn, Menu, X, Bell, BellOff, Book } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { cn } from "@/lib/utils";
import logoImage from "@assets/IMG_202512182225101_-_Copy_1767468127874.PNG";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/use-notifications";
import { useTranslation, TRANSLATION_LABELS } from "@/contexts/TranslationContext";
import { useMenuTransition } from "@/contexts/MenuTransitionContext";
import { BIBLE_TRANSLATIONS, type BibleTranslation } from "@shared/schema";
import { Button } from "@/components/ui/button";
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

function MobileTranslationSelector() {
  const { translation, setTranslation } = useTranslation();
  
  return (
    <div className="mt-4 border-t border-primary/10 pt-4">
      <div className="px-4 pb-2">
        <span className="text-sm font-medium text-muted-foreground">Bible Translation</span>
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

export function Header() {
  const [location, setLocation] = useLocation();
  const { isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { triggerTransition } = useMenuTransition();
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
      triggerTransition(() => {
        setLocation(href);
      });
    } else {
      setMobileMenuOpen(false);
    }
  };

  const handleHowToUseClick = () => {
    navigateWithTransition("/how-to-use");
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    setLocation("/");
  };

  const handleNavClick = (href: string, isExternal: boolean) => {
    if (!isExternal) {
      navigateWithTransition(href);
    } else {
      setMobileMenuOpen(false);
    }
  };

  const navItems = [
    { href: "/", label: "Today", icon: BookOpen, external: false, adminOnly: false },
    { href: "/archive", label: "Archive", icon: Calendar, external: false, adminOnly: false },
    { href: "/bible", label: "Bible", icon: Book, external: false, adminOnly: false },
    { href: "https://www.youtube.com/@365DailyDevotional", label: "YouTube", icon: SiYoutube, external: true, adminOnly: false },
    { href: "https://payhip.com/SpiritToneRecords", label: "Shop", icon: ShoppingBag, external: true, adminOnly: false },
    { href: "/prayer-counseling", label: "Prayer / Counseling", icon: MessageCircleHeart, external: false, adminOnly: false },
    { href: "/about", label: "About", icon: Info, external: false, adminOnly: false },
    { href: "/donate", label: "Donate", icon: Heart, external: false, adminOnly: false },
  ];

  const adminNavItem = isAdmin 
    ? { href: "/admin", label: "Admin Dashboard", icon: Settings, external: false }
    : { href: "/admin-login", label: "Login", icon: LogIn, external: false };

  const visibleNavItems = [...navItems, adminNavItem];

  return (
    <header className="sticky top-2 z-50 w-full bg-gradient-to-r from-background/98 via-background/95 to-background/98 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b border-primary/15 shadow-sm mt-2">
      <div className="container mx-auto px-4 h-16 flex items-center justify-center lg:justify-between gap-4 relative">
        {/* Centered Logo and Title */}
        <button 
          onClick={() => navigateWithTransition("/")}
          className="flex items-center gap-3 group"
        >
          <img 
            src={logoImage} 
            alt="365 Daily Devotional" 
            className="w-12 h-12 object-contain transition-transform group-hover:scale-105"
          />
          <span className="font-serif text-2xl font-semibold text-primary tracking-wide">
            Daily Devotional
          </span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          <button
            onClick={handleHowToUseClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-muted-foreground hover:bg-primary/5 hover:text-primary"
            data-testid="button-how-to-use"
          >
            <HelpCircle className="w-4 h-4" />
            How to Use
          </button>
          {visibleNavItems.map((item) => {
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
                onClick={() => handleNavClick(item.href, item.external)}
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
          {isAdmin && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          )}
          <TranslationSelector />
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

        {/* Mobile Menu Button - Positioned absolutely on the right */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden absolute right-4">
            <Button variant="ghost" size="icon" className="h-12 w-12" data-testid="button-mobile-menu">
              <Menu className="w-8 h-8" strokeWidth={3} />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[350px]">
            <SheetHeader className="border-b border-primary/10 pb-4 mb-4">
              <SheetTitle className="flex items-center gap-3">
                <img 
                  src={logoImage} 
                  alt="365 Daily Devotional" 
                  className="w-10 h-10 object-contain"
                />
                <span className="font-serif text-xl font-semibold text-primary tracking-wide">
                  Daily Devotional
                </span>
              </SheetTitle>
            </SheetHeader>
            
            <nav className="flex flex-col gap-2">
              <button
                onClick={handleHowToUseClick}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 cursor-pointer text-muted-foreground hover:bg-primary/5 hover:text-primary text-left"
                data-testid="button-how-to-use-mobile"
              >
                <HelpCircle className="w-5 h-5" />
                How to Use
              </button>
              
              {visibleNavItems.map((item) => {
                const isActive = !item.external && location === item.href;
                if (item.external) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 cursor-pointer text-muted-foreground hover:bg-primary/5 hover:text-primary"
                      data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}-nav-mobile`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </a>
                  );
                }
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavClick(item.href, item.external)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 cursor-pointer text-left",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                    )}
                    data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}-nav-mobile`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
              
              <MobileTranslationSelector />
              
              <MobileSettingsSection />
              
              {notificationsSupported && (
                <div className="flex items-center justify-between px-4 py-3 mt-4 border-t border-primary/10 pt-6">
                  <div className="flex items-center gap-3">
                    {notificationsEnabled && notificationPermission === "granted" ? (
                      <Bell className="w-5 h-5 text-primary" />
                    ) : (
                      <BellOff className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-base font-medium text-muted-foreground">
                      Daily Reminders
                    </span>
                  </div>
                  <Switch
                    checked={notificationsEnabled && notificationPermission === "granted"}
                    onCheckedChange={handleNotificationToggle}
                    disabled={notificationPermission === "denied"}
                    data-testid="switch-notifications-mobile"
                  />
                </div>
              )}
              
              {isAdmin && (
                <button
                  onClick={handleLogout}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                    notificationsSupported ? "" : "mt-4 border-t border-primary/10 pt-6"
                  )}
                  data-testid="button-logout-mobile"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
