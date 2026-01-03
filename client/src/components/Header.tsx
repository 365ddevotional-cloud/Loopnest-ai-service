import { Link, useLocation } from "wouter";
import { Calendar, Settings, Info, BookOpen, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import logoImage from "@assets/IMG_202512182225101_-_Copy_1767468127874.PNG";

export function Header() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Today", icon: BookOpen },
    { href: "/archive", label: "Archive", icon: Calendar },
    { href: "/about", label: "About", icon: Info },
    { href: "/donate", label: "Donate", icon: Heart },
    { href: "/admin", label: "Admin", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-primary/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <img 
            src={logoImage} 
            alt="365 Daily Devotional" 
            className="w-10 h-10 object-contain"
          />
          <span className="font-serif text-xl font-bold text-primary tracking-tight">
            Daily Devotional
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
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
        </nav>

        {/* Mobile Navigation Placeholder - keeping it simple for now */}
        <div className="md:hidden text-primary">
          <BookOpen className="w-6 h-6" />
        </div>
      </div>

      {/* Mobile Nav Bar - Fixed Bottom */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-primary/10 flex justify-around p-3 z-50 pb-safe">
        {navItems.map((item) => {
          const isActive = location === item.href;
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
      </nav>
    </header>
  );
}
