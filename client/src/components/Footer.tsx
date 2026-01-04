import { Link } from "wouter";
import { Heart } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  const legalLinks = [
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms-of-use", label: "Terms of Use" },
    { href: "/disclaimer", label: "Disclaimer" },
    { href: "/contact", label: "Contact Us" },
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
              Made with <Heart className="w-4 h-4 text-primary" /> for believers everywhere
            </p>
            <p className="text-xs text-muted-foreground/70">
              &copy; {currentYear} 365 Daily Devotional. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
