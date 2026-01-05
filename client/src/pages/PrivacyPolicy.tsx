import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Privacy Policy</h1>
        <div className="decorative-divider" />
        <p className="text-muted-foreground">Last updated: January 2026</p>
      </div>

      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden">
        <div className="relative bg-gradient-to-br from-secondary/15 via-primary/5 to-accent/10 p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg text-foreground/80 font-serif leading-relaxed">
            365 Daily Devotional respects your privacy.
          </p>
        </div>

        <div className="p-8 md:p-12 space-y-8 text-foreground/80 leading-relaxed">
          <p>
            This app does not collect, store, or share personal information such as names, email addresses, phone numbers, or precise location data.
          </p>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Information Collection</h2>
            <p>
              We do not knowingly collect personal or sensitive user data. Any data processed is used only to provide app functionality.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Third-Party Services</h2>
            <p>
              This app may rely on platform services required to operate (such as hosting or app store distribution). These services may collect limited technical information as required by their own policies.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Children's Privacy</h2>
            <p>
              This app is intended for a general audience and does not knowingly collect data from children under 13.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Changes</h2>
            <p>
              This privacy policy may be updated occasionally. Changes will be posted on this page.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Contact</h2>
            <p>
              For questions about this policy, contact:
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
