import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Loader2, Send, CheckCircle, AlertTriangle } from "lucide-react";
import type { AutoReplyTemplate, PrayerRequest } from "@shared/schema";

const PRIORITY_OPTIONS = [
  { value: "prayer_normal", label: "Prayer Request (Normal)" },
  { value: "prayer_urgent", label: "Urgent Prayer" },
  { value: "counseling_normal", label: "Counseling Request" },
  { value: "counseling_urgent", label: "Urgent Counseling" },
];

export default function PrayerCounseling() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<PrayerRequest | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: "",
    isAnonymous: false,
    priority: "prayer_normal",
  });

  const { data: autoReplyTemplate } = useQuery<AutoReplyTemplate>({
    queryKey: ["/api/auto-reply-templates", formData.priority],
    enabled: submitted,
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        fullName: data.isAnonymous ? null : data.fullName,
        email: data.email || null,
        subject: data.subject || null,
        message: data.message,
        isAnonymous: data.isAnonymous,
        priority: data.priority,
      };
      const response = await apiRequest("POST", "/api/prayer-requests", payload);
      return response.json();
    },
    onSuccess: (data) => {
      setSubmittedRequest(data);
      setSubmitted(true);
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
    
    if (!formData.isAnonymous && !formData.fullName.trim()) {
      toast({ title: "Please enter your full name", variant: "destructive" });
      return;
    }
    if (!formData.message.trim()) {
      toast({ title: "Please enter your message or prayer request", variant: "destructive" });
      return;
    }
    if (formData.isAnonymous && !formData.email.trim()) {
      toast({ 
        title: "Email needed for replies", 
        description: "Add an email if you want to receive replies in the app.",
        variant: "default" 
      });
    }

    mutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setSubmitted(false);
    setSubmittedRequest(null);
    setFormData({
      fullName: "",
      email: "",
      subject: "",
      message: "",
      isAnonymous: false,
      priority: "prayer_normal",
    });
  };

  if (submitted && submittedRequest) {
    const priorityLabel = PRIORITY_OPTIONS.find(p => p.value === submittedRequest.priority)?.label || "Prayer Request";
    const isUrgent = submittedRequest.priority?.includes("urgent");
    
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-12 space-y-4">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Prayer & Counseling Request</h1>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full opacity-30" />
        </div>

        <Card className="bg-white border-primary/10 shadow-xl shadow-primary/5 p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
              Thank You
            </h2>
            <p className="text-lg text-muted-foreground font-serif leading-relaxed">
              Your message has been received. We will respond prayerfully.
            </p>
            {isUrgent && (
              <div className="mt-4 inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                URGENT - {priorityLabel}
              </div>
            )}
          </div>

          {autoReplyTemplate && (
            <div className="bg-primary/5 rounded-lg p-6 mb-8 space-y-4">
              <p className="font-serif text-foreground leading-relaxed">
                {autoReplyTemplate.encouragement}
              </p>
              <div className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
                <p className="font-serif">"{autoReplyTemplate.scriptureText}"</p>
                <p className="text-sm mt-2 not-italic font-medium">— {autoReplyTemplate.scriptureReference}</p>
              </div>
              <p className="font-serif text-muted-foreground">
                {autoReplyTemplate.prayer}
              </p>
            </div>
          )}

          <div className="text-center space-y-4">
            <Button onClick={resetForm} data-testid="button-send-another">
              Send Another Request
            </Button>
            {!submittedRequest?.isAnonymous && submittedRequest?.email && (
              <p className="text-sm text-muted-foreground">
                <a href="/my-requests" className="text-primary underline" data-testid="link-my-requests">
                  View your requests and replies
                </a>
              </p>
            )}
          </div>
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAnonymous"
              checked={formData.isAnonymous}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, isAnonymous: checked === true })
              }
              data-testid="checkbox-anonymous"
            />
            <Label htmlFor="isAnonymous" className="text-foreground font-medium cursor-pointer">
              Send anonymously
            </Label>
          </div>

          {!formData.isAnonymous && (
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
                required={!formData.isAnonymous}
                data-testid="input-fullname"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">
              Email Address <span className="text-muted-foreground text-sm">(for receiving replies)</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              data-testid="input-email"
            />
            {formData.isAnonymous && !formData.email && (
              <p className="text-sm text-muted-foreground">
                Add an email if you want to receive replies in the app.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority" className="text-foreground font-medium">
              Request Type / Priority <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger data-testid="select-priority">
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="pt-4 text-xs text-muted-foreground space-y-2 border-t border-primary/10 mt-6">
            <p>Please do not share passwords or financial details.</p>
            <p>If this is an emergency or you feel unsafe, contact local emergency services.</p>
          </div>
        </form>
      </Card>
    </div>
  );
}
