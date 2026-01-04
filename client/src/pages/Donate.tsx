import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink } from "lucide-react";
import { SiPaypal, SiCashapp } from "react-icons/si";

export default function Donate() {
  return (
    <div id="donate" className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Support the Daily Devotional</h1>
        <div className="decorative-divider" />
      </div>

      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden">
        <div className="relative bg-gradient-to-br from-accent/20 via-primary/10 to-secondary/15 p-8 md:p-12 text-center">
          <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h20v20H0z%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M10%2010m-1%200a1%201%200%201%200%202%200a1%201%200%201%200-2%200%22%20fill%3D%22%23C58E45%22%20fill-opacity%3D%220.1%22%2F%3E%3C%2Fsvg%3E')]" />
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg text-primary font-medium italic font-serif">
              "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."
            </p>
            <p className="text-sm text-muted-foreground mt-2 font-medium">— 2 Corinthians 9:7</p>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-8 font-serif leading-relaxed text-lg text-muted-foreground">
          <p>
            Your generous support helps us continue our mission of spreading God's Word daily. 
            Every contribution, no matter the size, makes a meaningful difference in our ability to serve believers around the world.
          </p>
          
          <div className="bg-muted/30 p-6 rounded-xl border border-primary/10">
            <h3 className="font-sans font-bold text-primary mb-4 uppercase tracking-wide text-sm">Your Donations Support</h3>
            <ul className="space-y-3 text-base">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Daily devotional creation and curation</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Faith-based outreach and ministry expansion</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Platform maintenance and growth</span>
              </li>
            </ul>
          </div>

          <Separator className="bg-primary/10" />

          <div className="text-center space-y-6">
            <p className="font-bold text-foreground text-xl">
              Your generosity helps spread God's Word daily.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <a
                href="https://www.paypal.com/donate/?hosted_button_id=Y9PAZK36FKT8L"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-paypal-donate"
              >
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  <SiPaypal className="w-5 h-5" />
                  Donate with PayPal
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>

            <div className="bg-muted/50 p-6 rounded-xl border border-primary/10 inline-block">
              <div className="flex items-center justify-center gap-3">
                <SiCashapp className="w-6 h-6 text-primary" />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground font-sans">CashApp</p>
                  <p className="text-xl font-bold text-foreground font-sans" data-testid="text-cashapp-tag">$MuzAfo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="text-center mt-12 text-sm text-muted-foreground opacity-60">
        <p className="font-serif italic">"Give, and it will be given to you. A good measure, pressed down, shaken together and running over." — Luke 6:38</p>
      </div>
    </div>
  );
}
