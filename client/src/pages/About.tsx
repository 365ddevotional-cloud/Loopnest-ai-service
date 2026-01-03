import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">About Us</h1>
        <div className="w-24 h-1 bg-primary mx-auto rounded-full opacity-30" />
      </div>

      <Card className="bg-white border-primary/10 shadow-xl shadow-primary/5 overflow-hidden">
        {/* Hero Section of About Page */}
        <div className="bg-primary/5 p-8 md:p-12 text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
            365 Daily Devotional
          </h2>
          <p className="text-lg text-primary font-medium italic">
            "Daily encouragement to grow your faith, renew your mind, and walk closely with God."
          </p>
        </div>

        <div className="p-8 md:p-12 space-y-8 font-serif leading-relaxed text-lg text-muted-foreground">
          <p>
            365 Daily Devotional is a faith-based ministry created to help believers stay rooted in God's Word every day.
          </p>
          
          <p>
            Our focus is simple—consistent spiritual nourishment through daily devotionals, prayer points, Scripture reflections, and encouragement that speaks to real life.
          </p>
          
          <p>
            Each devotional is designed to strengthen your faith, renew your mind, and help you walk confidently with God, one day at a time.
          </p>
          
          <p>
            Whether you are new to the faith or have walked with God for years, 365 Daily Devotional exists to support your daily journey with clarity, truth, and hope.
          </p>

          <Separator className="bg-primary/10" />

          <div className="text-center space-y-4">
            <h3 className="font-bold text-foreground">Support This Kingdom Work</h3>
            <p>
              If 365 Daily Devotional has been a blessing to you, consider supporting this Kingdom work. Your support helps us continue providing daily devotionals, prayers, and faith-building resources to people around the world.
            </p>
            <div className="pt-4">
              <Link href="/donate">
                <Button size="lg" data-testid="button-donate">Donate</Button>
              </Link>
            </div>
          </div>

          <Separator className="bg-primary/10" />

          <div className="text-center space-y-4">
            <h3 className="font-bold text-foreground">Connect With Us</h3>
            <p>Email: 365ddevotional@gmail.com</p>
          </div>
        </div>
      </Card>
      
      {/* Decorative Footer */}
      <div className="text-center mt-12 text-sm text-muted-foreground opacity-60">
        <p>&copy; {new Date().getFullYear()} 365 Daily Devotional. All rights reserved.</p>
        <p className="mt-2 font-serif italic">"Thy word is a lamp unto my feet, and a light unto my path." — Psalm 119:105</p>
      </div>
    </div>
  );
}
