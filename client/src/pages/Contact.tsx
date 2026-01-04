import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, MessageCircle, Heart, Lightbulb, Wrench, ExternalLink, HandHeart, Clock, CheckCircle, AlertCircle, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const composeFormSchema = z.object({
  fullName: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(3, "Please enter a subject"),
  message: z.string().min(10, "Please enter a message (at least 10 characters)"),
  isUrgent: z.boolean().default(false),
  isPrayerRelated: z.boolean().default(false),
});

type ComposeFormValues = z.infer<typeof composeFormSchema>;

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
  const { toast } = useToast();
  const [composeOpen, setComposeOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ComposeFormValues>({
    resolver: zodResolver(composeFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      subject: "Contact – 365 Daily Devotional",
      message: "",
      isUrgent: false,
      isPrayerRelated: false,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: ComposeFormValues) => {
      return apiRequest("POST", "/api/contact-messages", data);
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ComposeFormValues) => {
    submitMutation.mutate(data);
  };

  const handleFallbackEmail = () => {
    const subject = encodeURIComponent(form.getValues("subject") || "Contact – 365 Daily Devotional");
    const body = encodeURIComponent(form.getValues("message") || "");
    window.location.href = `mailto:365ddevotional@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleMinistryEmailClick = () => {
    setSubmitted(false);
    form.reset({
      fullName: "",
      email: "",
      subject: "Contact – 365 Daily Devotional",
      message: "",
      isUrgent: false,
      isPrayerRelated: false,
    });
    setComposeOpen(true);
  };

  const handleCloseModal = () => {
    setComposeOpen(false);
    setSubmitted(false);
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

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Compose Message
            </DialogTitle>
          </DialogHeader>
          
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground mb-2">Thank You</h3>
              <p className="text-muted-foreground mb-4">
                Your message has been sent successfully.
              </p>
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mb-4">
                <p className="font-serif text-primary italic">
                  "The Lord bless you and keep you."
                </p>
                <p className="text-xs text-muted-foreground mt-1">– Numbers 6:24</p>
              </div>
              <Button variant="outline" onClick={handleCloseModal} data-testid="button-close-modal">
                Close
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Full Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" data-testid="input-modal-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your.email@example.com" data-testid="input-modal-email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Subject <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Message subject" data-testid="input-modal-subject" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Message <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write your message here..."
                          className="min-h-[100px] resize-none"
                          data-testid="textarea-modal-message"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="isUrgent"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-modal-urgent"
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer text-sm">Urgent</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isPrayerRelated"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-modal-prayer"
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer text-sm">Prayer-related</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitMutation.isPending}
                    data-testid="button-modal-send"
                  >
                    {submitMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                  
                  <button
                    type="button"
                    onClick={handleFallbackEmail}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                    data-testid="link-modal-fallback"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Having trouble? Open in email app
                  </button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
