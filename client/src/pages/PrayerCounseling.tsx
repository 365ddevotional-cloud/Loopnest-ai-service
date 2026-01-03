import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Loader2, Send, CheckCircle } from "lucide-react";

export default function PrayerCounseling() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/prayer-requests", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      setFormData({ fullName: "", email: "", subject: "", message: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim()) {
      toast({ title: "Please enter your full name", variant: "destructive" });
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (!formData.message.trim()) {
      toast({ title: "Please enter your message or prayer request", variant: "destructive" });
      return;
    }

    mutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-12 space-y-4">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Prayer & Counseling Request</h1>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full opacity-30" />
        </div>

        <Card className="bg-white border-primary/10 shadow-xl shadow-primary/5 p-8 md:p-12 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
            Thank You
          </h2>
          <p className="text-lg text-muted-foreground font-serif leading-relaxed mb-8">
            Your message has been received. We will respond prayerfully.
          </p>
          <Button onClick={() => setSubmitted(false)} data-testid="button-send-another">
            Send Another Request
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Prayer & Counseling Request</h1>
        <div className="w-24 h-1 bg-primary mx-auto rounded-full opacity-30" />
      </div>

      <Card className="bg-white border-primary/10 shadow-xl shadow-primary/5 overflow-hidden">
        <div className="bg-primary/5 p-8 md:p-12 text-center">
          <p className="text-lg text-muted-foreground font-serif leading-relaxed">
            You are not alone. If you need prayer, guidance, or spiritual support, we are here for you. Share your request below, and our team will respond prayerfully.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground font-medium">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              data-testid="input-fullname"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              required
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-foreground font-medium">
              Subject <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <Input
              id="subject"
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleChange}
              placeholder="e.g., Prayer for healing, Spiritual guidance"
              data-testid="input-subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-foreground font-medium">
              Message / Prayer Request <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Share your prayer request or what you need guidance with..."
              rows={6}
              required
              className="resize-none"
              data-testid="input-message"
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={mutation.isPending}
              data-testid="button-submit-prayer"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Prayer Request
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
