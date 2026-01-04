import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-8">
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
            Your privacy matters to us. This policy explains how we collect, use, and protect your information.
          </p>
        </div>

        <div className="p-8 md:p-12 space-y-8 text-foreground/80 leading-relaxed">
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Information We Collect</h2>
            <p>
              When you use 365 Daily Devotional, we may collect the following information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Email Address:</strong> Provided optionally when submitting prayer requests or for receiving replies.</li>
              <li><strong>Phone Number:</strong> Provided optionally if you choose to receive SMS notifications for prayer request replies.</li>
              <li><strong>Prayer Requests:</strong> The content of prayer or counseling requests you submit, including any file attachments.</li>
              <li><strong>Name:</strong> Provided optionally unless you choose to submit anonymously.</li>
            </ul>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">How We Use Your Information</h2>
            <p>We use the information you provide for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Responses:</strong> To respond to your prayer requests with encouragement and spiritual support.</li>
              <li><strong>Encouragement:</strong> To send auto-generated Scripture-based encouragement upon submission.</li>
              <li><strong>Notifications:</strong> To notify you via email or SMS (if opted in) when our team replies to your request.</li>
              <li><strong>Ministry Improvement:</strong> To improve our services and better serve our community.</li>
            </ul>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Data Security</h2>
            <p>
              We take the security of your personal information seriously. Your data is stored securely and we implement 
              appropriate technical measures to protect against unauthorized access, alteration, or destruction.
            </p>
            <p>
              Prayer requests marked as anonymous do not store your name, providing an additional layer of privacy.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">We Do Not Sell Your Data</h2>
            <p>
              <strong>We will never sell, trade, or rent your personal information to third parties.</strong> Your prayer 
              requests and contact information are treated with the utmost confidentiality and are used solely for the 
              purposes outlined in this policy.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Third-Party Services</h2>
            <p>
              We may use third-party services for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>SMS Notifications:</strong> Twilio for sending optional SMS replies (if you provide a phone number and opt in).</li>
              <li><strong>Email Services:</strong> SendGrid for sending email notifications and replies.</li>
              <li><strong>Payment Processing:</strong> PayPal and CashApp for processing optional donations (we do not store payment information).</li>
            </ul>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Request access to the personal information we hold about you.</li>
              <li>Request correction or deletion of your personal information.</li>
              <li>Opt out of SMS notifications at any time.</li>
              <li>Submit requests anonymously without providing personal information.</li>
            </ul>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Children's Privacy</h2>
            <p>
              Our app is family-friendly and suitable for all ages. We do not knowingly collect personal information from 
              children under 13 without parental consent. If you believe we have collected such information, please contact us.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us at:
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
