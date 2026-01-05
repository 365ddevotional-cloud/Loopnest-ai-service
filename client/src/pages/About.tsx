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
        <div className="decorative-divider" />
      </div>

      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden">
        {/* Hero Section of About Page */}
        <div className="relative bg-gradient-to-br from-primary/15 via-accent/10 to-secondary/15 p-8 md:p-12 text-center">
          <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h20v20H0z%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M10%2010m-1%200a1%201%200%201%200%202%200a1%201%200%201%200-2%200%22%20fill%3D%22%237C3A2A%22%20fill-opacity%3D%220.08%22%2F%3E%3C%2Fsvg%3E')]" />
          <div className="relative">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
              365 Daily Devotional
            </h2>
            <p className="text-lg text-primary font-medium italic">
              "Daily encouragement to grow your faith, renew your mind, and walk closely with God."
            </p>
          </div>
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

          <div id="youtube" className="text-center space-y-4">
            <h3 className="font-bold text-foreground">YouTube Channel</h3>
            <p>
              Watch inspiring devotionals, Bible stories, and worship content. Subscribe to stay encouraged in your faith journey.
            </p>
            <div className="flex flex-col items-center gap-3 pt-2">
              <a
                href="https://www.youtube.com/@365DailyDevotional"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-youtube-channel"
              >
                <Button size="lg">365 Daily Devotional YouTube Channel</Button>
              </a>
              <a
                href="https://www.youtube.com/playlist?list=PLHL1Z_pQ6EgOUMxzdVEfurQCsQqjY3SQJ"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                data-testid="link-bible-story-playlist"
              >
                Bible Story Playlist
              </a>
              <a
                href="https://www.youtube.com/playlist?list=PLHL1Z_pQ6EgObNHc5DAdI_xU3mgQRTdil"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                data-testid="link-prayer-playlist"
              >
                Prayer Playlist
              </a>
              <a
                href="https://www.youtube.com/playlist?list=PLHL1Z_pQ6EgP8xwd3fd3JDjIzIjLxBUU6"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                data-testid="link-christmas-songs-playlist"
              >
                Christmas Songs Playlist
              </a>
            </div>
          </div>

          <Separator className="bg-primary/10" />

          <div className="text-center space-y-4">
            <h3 className="font-bold text-foreground">Connect With Us</h3>
            <p>Email: 365ddevotional@gmail.com</p>
          </div>

          <Separator className="bg-primary/10" />

          <div className="text-center space-y-4" data-testid="bible-attribution-about">
            <h3 className="font-bold text-foreground">Bible Translations</h3>
            <p>Bible translations used in this app include:</p>
            <ul className="space-y-1 text-base">
              <li>King James Version (KJV) – Public Domain</li>
              <li>World English Bible (WEB) – Public Domain</li>
              <li>American Standard Version (ASV 1901) – Public Domain</li>
              <li>Douay-Rheims Bible (DRB) – Public Domain</li>
            </ul>
            <p className="text-sm italic text-muted-foreground/80 pt-2">
              Scripture quotations are from public-domain Bible translations.
              This app is not affiliated with or endorsed by any Bible publisher or denomination.
            </p>
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
