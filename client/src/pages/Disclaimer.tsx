import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Phone } from "lucide-react";

export default function Disclaimer() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Disclaimer</h1>
        <div className="decorative-divider" />
        <p className="text-muted-foreground">Last updated: January 2026</p>
      </div>

      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden">
        <div className="relative bg-gradient-to-br from-accent/20 via-primary/10 to-secondary/10 p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center mx-auto mb-5 shadow-lg">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg text-foreground/80 font-serif leading-relaxed">
            Please read this disclaimer carefully before using 365 Daily Devotional.
          </p>
        </div>

        <div className="p-8 md:p-12 space-y-8 text-foreground/80 leading-relaxed">
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Faith-Based Content</h2>
            <p>
              365 Daily Devotional is a <strong>faith-based Christian ministry application</strong>. All content, 
              including daily devotionals, prayers, Scripture readings, and responses to prayer requests, is 
              rooted in Christian faith and biblical principles.
            </p>
            <p>
              The spiritual guidance and encouragement provided through this app reflect our sincere belief 
              in the power of prayer and God's Word. Users of all backgrounds are welcome, but should understand 
              the faith-based nature of our content.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Not a Substitute for Professional Care</h2>
            <p>
              <strong>365 Daily Devotional is not a substitute for professional medical, psychological, legal, 
              or financial care.</strong> While we offer spiritual encouragement and prayer support:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We are not licensed healthcare providers, therapists, or counselors.</li>
              <li>Our responses should not replace consultation with qualified professionals.</li>
              <li>Spiritual encouragement complements but does not replace professional treatment.</li>
              <li>We encourage users to seek appropriate professional help when needed.</li>
            </ul>
          </section>

          <Separator className="bg-primary/10" />

          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="w-6 h-6 text-destructive" />
              <h2 className="font-serif text-xl font-bold text-destructive">Crisis & Emergency Information</h2>
            </div>
            <p className="text-foreground/90">
              <strong>If you are in crisis or experiencing a life-threatening emergency, please contact 
              emergency services immediately:</strong>
            </p>
            <ul className="space-y-3 text-foreground/90">
              <li className="flex items-center gap-2">
                <span className="font-bold">Emergency Services:</span> Call 911 (US) or your local emergency number
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold">National Suicide Prevention Lifeline:</span> 988 (US)
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold">Crisis Text Line:</span> Text HOME to 741741
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold">International Association for Suicide Prevention:</span> https://www.iasp.info/resources/Crisis_Centres/
              </li>
            </ul>
            <p className="text-foreground/80 text-sm italic">
              Prayer support is valuable, but immediate professional help is essential in crisis situations.
            </p>
          </div>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Individual Results May Vary</h2>
            <p>
              Spiritual experiences and outcomes are deeply personal. While we believe in the power of prayer 
              and faith, we cannot guarantee specific results from using this application. Your spiritual 
              journey is unique, and we encourage you to approach devotional content with an open heart.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Third-Party Content</h2>
            <p>
              Our app may contain links to external websites or resources. We are not responsible for the 
              content, accuracy, or practices of third-party sites. Inclusion of links does not imply endorsement.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Acceptance of Disclaimer</h2>
            <p>
              By using 365 Daily Devotional, you acknowledge that you have read, understood, and agree to 
              this disclaimer. If you do not agree with any part of this disclaimer, please discontinue 
              use of the application.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Contact Us</h2>
            <p>
              If you have questions about this Disclaimer, please contact us at:
            </p>
            <p className="font-medium text-primary">
              365ddevotional@gmail.com
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
