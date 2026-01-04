import { Link, useLocation } from "wouter";
import { Calendar, Settings, Info, BookOpen, Heart, ShoppingBag, MessageCircleHeart, HelpCircle, LogOut } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { cn } from "@/lib/utils";
import logoImage from "@assets/IMG_202512182225101_-_Copy_1767468127874.PNG";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const [location, setLocation] = useLocation();
  const { isAdmin, logout } = useAuth();

  const handleHowToUseClick = () => {
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
    await logout();
    setLocation("/");
  };

  const navItems = [
    { href: "/", label: "Today", icon: BookOpen, external: false, adminOnly: false },
    { href: "/archive", label: "Archive", icon: Calendar, external: false, adminOnly: false },
    { href: "https://www.youtube.com/@365DailyDevotional", label: "YouTube", icon: SiYoutube, external: true, adminOnly: false },
    { href: "https://payhip.com/SpiritToneRecords", label: "Shop", icon: ShoppingBag, external: true, adminOnly: false },
    { href: "/prayer-counseling", label: "Prayer / Counseling", icon: MessageCircleHeart, external: false, adminOnly: false },
    { href: "/about", label: "About", icon: Info, external: false, adminOnly: false },
    { href: "/donate", label: "Donate", icon: Heart, external: false, adminOnly: false },
    { href: "/admin", label: "Admin", icon: Settings, external: false, adminOnly: true },
  ];

  const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-background/98 via-background/95 to-background/98 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b border-primary/15 shadow-sm">
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

        <nav className="hidden md:flex items-center gap-1">
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
                  data-testid="link-youtube-nav"
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

        {/* Mobile Navigation Placeholder - keeping it simple for now */}
        <div className="md:hidden text-primary">
          <BookOpen className="w-6 h-6" />
        </div>
      </div>

      {/* Mobile Nav Bar - Fixed Bottom */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-primary/10 flex justify-around p-3 z-50 pb-safe">
        <button
          onClick={handleHowToUseClick}
          className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground"
          data-testid="button-how-to-use-mobile"
        >
          <HelpCircle className="w-6 h-6" />
          <span className="text-[10px] font-medium uppercase tracking-wider">How to Use</span>
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
                className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground"
                data-testid="link-youtube-nav-mobile"
              >
                <item.icon className="w-6 h-6" />
                <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
              </a>
            );
          }
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className={cn("w-6 h-6", isActive && "fill-current/20")} />
                <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
              </div>
            </Link>
          );
        })}
        {isAdmin && (
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground"
            data-testid="button-logout-mobile"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Logout</span>
          </button>
        )}
      </nav>
    </header>
  );
}
