import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Home } from "lucide-react";
import { Link } from "wouter";

export default function DonationSuccess() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4" data-testid="donation-success-page">
      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden text-center">
        <div className="p-8 md:p-12 space-y-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-lg">
            <Heart className="w-10 h-10 text-white" />
          </div>

          <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary">
            Thank You!
          </h1>

          <div className="space-y-4 text-lg text-muted-foreground font-serif leading-relaxed">
            <p>Thank you for supporting this ministry.</p>
            <p>
              Your generosity helps keep the devotional free for people around the world.
            </p>
            <p className="font-medium text-primary italic">
              God bless you richly.
            </p>
          </div>

          <p className="text-sm text-muted-foreground italic">
            "The Lord loves a cheerful giver." — 2 Corinthians 9:7
          </p>

          <div className="pt-4">
            <Link href="/">
              <Button size="lg" className="gap-2" data-testid="button-back-home">
                <Home className="w-5 h-5" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
