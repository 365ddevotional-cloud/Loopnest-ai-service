import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, MessageCircle, Heart, Lightbulb, Wrench, ExternalLink, HandHeart, Clock } from "lucide-react";
import { useLocation } from "wouter";

interface ContactCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  colorClass: string;
  borderClass: string;
  testId: string;
}

function ContactCard({ icon, title, description, onClick, colorClass, borderClass, testId }: ContactCardProps) {
  return (
    <button
      onClick={onClick}
      className={`${colorClass} ${borderClass} rounded-xl p-5 text-left w-full cursor-pointer hover-elevate active-elevate-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50`}
      data-testid={testId}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            {title}
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function Contact() {
  const [, navigate] = useLocation();

  const openEmail = (subject: string, body: string) => {
    const mailto = `mailto:365ddevotional@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleMinistryEmailClick = () => {
    navigate("/contact/compose");
  };

  const handleGeneralInquiries = () => {
    navigate("/contact/general");
  };

  const handleFeedbackSuggestions = () => {
    navigate("/contact/feedback");
  };

  const handlePartnership = () => {
    navigate("/contact/partnership");
  };

  const handlePrayerRequests = () => {
    navigate("/prayer");
  };

  const handleTechnicalSupport = () => {
    navigate("/support");
  };

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
          <a 
            href="#response-time" 
            className="text-sm text-foreground/60 hover:text-primary transition-colors inline-flex items-center gap-1 mt-3"
            data-testid="link-response-time"
          >
            <Clock className="w-3 h-3" />
            See response times
          </a>
        </div>

        <div className="p-8 md:p-12 space-y-8 text-foreground/80 leading-relaxed">
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Ministry Email</h2>
            <button
              onClick={handleMinistryEmailClick}
              className="w-full bg-primary/5 rounded-xl p-6 border border-primary/10 cursor-pointer hover-elevate active-elevate-2 transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="card-ministry-email"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Click to send an email</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">
                      365ddevotional@gmail.com
                    </span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </button>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">Purpose of Contact</h2>
            <p>Click a card below to contact us:</p>
            <div className="grid gap-4 md:grid-cols-2">
              <ContactCard
                icon={<MessageCircle className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />}
                title="General Inquiries"
                description="Questions about the app, our ministry, or devotional content."
                onClick={handleGeneralInquiries}
                colorClass="bg-secondary/5"
                borderClass="border border-secondary/10"
                testId="card-general-inquiries"
              />
              
              <ContactCard
                icon={<Lightbulb className="w-5 h-5 text-accent mt-1 flex-shrink-0" />}
                title="Feedback & Suggestions"
                description="Share ideas for improving the app or devotional content."
                onClick={handleFeedbackSuggestions}
                colorClass="bg-accent/5"
                borderClass="border border-accent/10"
                testId="card-feedback-suggestions"
              />
              
              <ContactCard
                icon={<Heart className="w-5 h-5 text-primary mt-1 flex-shrink-0" />}
                title="Partnership Opportunities"
                description="Collaborate with us on ministry projects or outreach."
                onClick={handlePartnership}
                colorClass="bg-primary/5"
                borderClass="border border-primary/10"
                testId="card-partnership"
              />
              
              <ContactCard
                icon={<Wrench className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />}
                title="Technical Support"
                description="Report issues or get help with using the app."
                onClick={handleTechnicalSupport}
                colorClass="bg-muted/30"
                borderClass="border border-muted"
                testId="card-technical-support"
              />
              
              <ContactCard
                icon={<HandHeart className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />}
                title="Prayer Requests"
                description="Submit a prayer request and our team will pray for you."
                onClick={handlePrayerRequests}
                colorClass="bg-secondary/5"
                borderClass="border border-secondary/10"
                testId="card-prayer-requests"
              />
            </div>
          </section>

          <Separator className="bg-primary/10" />

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-primary">About Prayer Requests</h2>
            <p>
              You are not alone. Our dedicated{" "}
              <a href="/prayer" className="text-primary font-medium hover:underline" data-testid="link-prayer-page">
                Prayer & Counseling
              </a>{" "}
              page allows you to submit requests (including anonymously) and receive personalized 
              spiritual encouragement. Your requests are kept private and reviewed with care.
            </p>
          </section>

          <Separator className="bg-primary/10" />

          <section id="response-time" className="space-y-4 scroll-mt-24">
            <h2 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Response Time
            </h2>
            <div className="space-y-3 text-foreground/80">
              <p>
                We aim to respond to messages within 2–3 business days.
              </p>
              <p>
                Prayer requests marked Urgent are reviewed as quickly as possible.
              </p>
              <p>
                During high-volume periods, replies may take slightly longer.
              </p>
            </div>
          </section>

          <div className="text-center pt-6">
            <p className="font-serif text-primary italic">
              "Encourage one another and build each other up." — 1 Thessalonians 5:11
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
