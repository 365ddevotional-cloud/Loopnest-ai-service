import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, MessageCircle, Heart } from "lucide-react";

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Contact Us</h1>
        <div className="decorative-divider" />
      </div>

      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden">
        <div className="relative bg-gradient-to-br from-secondary/15 via-accent/10 to-primary/10 p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg text-foreground/80 font-serif leading-relaxed">
            We would love to hear from you. Reach out with questions, feedback, or partnership inquiries.
          </p>
        </div>

        <div className="p-8 md:p-12 space-y-8 text-foreground/80 leading-relaxed">
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Ministry Email</h2>
            <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email Address</p>
                  <a 
                    href="mailto:365ddevotional@gmail.com" 
                    className="text-xl font-bold text-primary hover:underline"
                    data-testid="link-contact-email"
                  >
                    365ddevotional@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Purpose of Contact</h2>
            <p>You may contact us for:</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-secondary/5 rounded-xl p-5 border border-secondary/10">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-secondary mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">General Inquiries</h3>
                    <p className="text-sm text-muted-foreground">Questions about the app, our ministry, or devotional content.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-accent/5 rounded-xl p-5 border border-accent/10">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-accent mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Feedback & Suggestions</h3>
                    <p className="text-sm text-muted-foreground">Share ideas for improving the app or devotional content.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Partnership Opportunities</h3>
                    <p className="text-sm text-muted-foreground">Collaborate with us on ministry projects or outreach.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/30 rounded-xl p-5 border border-muted">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Technical Support</h3>
                    <p className="text-sm text-muted-foreground">Report issues or get help with using the app.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Prayer Requests</h2>
            <p>
              For prayer requests or counseling needs, please use our dedicated{" "}
              <a href="/prayer-counseling" className="text-primary font-medium hover:underline" data-testid="link-prayer-page">
                Prayer & Counseling
              </a>{" "}
              page, which allows you to submit requests (including anonymously) and receive personalized 
              spiritual encouragement.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Response Time</h2>
            <p>
              We strive to respond to all inquiries within 2-3 business days. During high-volume periods, 
              responses may take slightly longer. Thank you for your patience and understanding.
            </p>
          </section>

          <div className="text-center pt-6">
            <p className="font-serif text-primary italic">
              "Therefore encourage one another and build each other up." — 1 Thessalonians 5:11
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
