import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, Settings, Info, BookOpen, Heart, ShoppingBag, MessageCircleHeart, HelpCircle, LogOut, LogIn, Menu, X } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { cn } from "@/lib/utils";
import logoImage from "@assets/IMG_202512182225101_-_Copy_1767468127874.PNG";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Header() {
  const [location, setLocation] = useLocation();
  const { isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleHowToUseClick = () => {
    setMobileMenuOpen(false);
    if (location !== "/") {
      setLocation("/");
      setTimeout(() => {
        const element = document.getElementById("how-to-use");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      const element = document.getElementById("how-to-use");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    setLocation("/");
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  const navItems = [
    { href: "/", label: "Today", icon: BookOpen, external: false, adminOnly: false },
    { href: "/archive", label: "Archive", icon: Calendar, external: false, adminOnly: false },
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
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <img 
            src={logoImage} 
            alt="365 Daily Devotional" 
            className="w-10 h-10 object-contain transition-transform group-hover:scale-105"
          />
          <span className="font-serif text-xl font-bold text-primary tracking-tight">
            Daily Devotional
          </span>
        </Link>

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
              <Link key={item.href} href={item.href}>
                <div
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
                </div>
              </Link>
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
        </nav>

        {/* Mobile Menu Button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
              <Menu className="w-6 h-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[350px]">
            <SheetHeader className="border-b border-primary/10 pb-4 mb-4">
              <SheetTitle className="flex items-center gap-3">
                <img 
                  src={logoImage} 
                  alt="365 Daily Devotional" 
                  className="w-8 h-8 object-contain"
                />
                <span className="font-serif text-lg font-bold text-primary">
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
                      onClick={handleNavClick}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 cursor-pointer text-muted-foreground hover:bg-primary/5 hover:text-primary"
                      data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}-nav-mobile`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link key={item.href} href={item.href} onClick={handleNavClick}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 cursor-pointer",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                      )}
                      data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}-nav-mobile`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
              
              {isAdmin && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive mt-4 border-t border-primary/10 pt-6"
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
