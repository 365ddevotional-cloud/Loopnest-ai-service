import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";

export default function TermsOfUse() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Terms of Use</h1>
        <div className="decorative-divider" />
        <p className="text-muted-foreground">Last updated: January 2026</p>
      </div>

      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden">
        <div className="relative bg-gradient-to-br from-primary/15 via-accent/10 to-secondary/10 p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-5 shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg text-foreground/80 font-serif leading-relaxed">
            By using 365 Daily Devotional, you agree to these terms. Please read them carefully.
          </p>
        </div>

        <div className="p-8 md:p-12 space-y-8 text-foreground/80 leading-relaxed">
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Purpose of This App</h2>
            <p>
              365 Daily Devotional is a faith-based application designed to provide daily spiritual encouragement, 
              Scripture readings, prayer points, and faith declarations. Our mission is to help believers grow in 
              their relationship with God through consistent, daily devotion.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Spiritual Encouragement Only</h2>
            <p>
              <strong>This app provides spiritual encouragement and faith-based content only.</strong> The content, 
              prayer responses, and devotional materials are intended for spiritual edification and should not be 
              considered as:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Medical Advice:</strong> We do not provide medical diagnoses, treatments, or healthcare recommendations.</li>
              <li><strong>Legal Advice:</strong> We do not provide legal counsel or professional legal guidance.</li>
              <li><strong>Professional Counseling:</strong> We are not licensed therapists, psychologists, or mental health professionals.</li>
              <li><strong>Financial Advice:</strong> We do not provide investment, tax, or financial planning services.</li>
            </ul>
            <p>
              For matters requiring professional assistance, please consult appropriate licensed professionals.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Acceptable Use</h2>
            <p>When using 365 Daily Devotional, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the app for personal spiritual growth and encouragement.</li>
              <li>Submit prayer requests that are genuine and respectful.</li>
              <li>Not use the app for any unlawful or harmful purposes.</li>
              <li>Not submit content that is offensive, abusive, or inappropriate.</li>
              <li>Respect the privacy and dignity of others.</li>
              <li>Not attempt to compromise the security of the application.</li>
            </ul>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">User Content</h2>
            <p>
              When you submit prayer requests or other content, you grant us permission to use this content 
              for the purpose of providing spiritual support and encouragement. We treat all submissions 
              with confidentiality and respect.
            </p>
            <p>
              You are responsible for ensuring that any content you submit does not violate any laws or 
              infringe on the rights of others.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Donations</h2>
            <p>
              Donations to 365 Daily Devotional are entirely <strong>voluntary and optional</strong>. All features 
              of the app are available without making any donations. Donations support the continued development 
              and ministry of this platform.
            </p>
            <p>
              Donations are non-refundable unless required by applicable law.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Intellectual Property</h2>
            <p>
              All content within 365 Daily Devotional, including devotionals, prayers, graphics, and design elements, 
              is the property of 365 Daily Devotional ministry unless otherwise noted. Scripture quotations are used 
              in accordance with fair use guidelines.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Limitation of Liability</h2>
            <p>
              365 Daily Devotional is provided "as is" without warranties of any kind. We are not liable for any 
              damages arising from your use of this application. By using this app, you acknowledge that spiritual 
              content is subjective and personal results may vary.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Changes to Terms</h2>
            <p>
              We may update these Terms of Use from time to time. Continued use of the app after changes 
              constitutes acceptance of the new terms. We encourage you to review this page periodically.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Contact Us</h2>
            <p>
              If you have questions about these Terms of Use, please contact us at:
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
