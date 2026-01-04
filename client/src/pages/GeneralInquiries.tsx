import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  BookOpen,
  Calendar,
  Heart,
  Youtube,
  ShoppingBag,
  Gift,
  HelpCircle,
  Clock
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const inquiryFormSchema = z.object({
  fullName: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email address"),
  topic: z.string().min(1, "Please select a topic"),
  message: z.string().min(10, "Please enter a message (at least 10 characters)"),
});

type InquiryFormValues = z.infer<typeof inquiryFormSchema>;

const helpTopics = [
  {
    icon: BookOpen,
    title: "About the App",
    question: "What is 365 Daily Devotional?",
    answer: "A daily Scripture-based devotional to help believers grow through the Word, prayer points, and faith declarations."
  },
  {
    icon: Calendar,
    title: "Today & Archive",
    question: null,
    answer: "Today: Read the current devotional. Archive: Browse past devotionals by date."
  },
  {
    icon: Heart,
    title: "Prayer & Counseling",
    question: null,
    answer: "For prayer requests or counseling needs, use the Prayer / Counseling page to submit your request (anonymous option available)."
  },
  {
    icon: Youtube,
    title: "YouTube",
    question: null,
    answer: "Watch prayers, devotionals, worship, and Bible stories on our YouTube section."
  },
  {
    icon: ShoppingBag,
    title: "Shop / Resources",
    question: null,
    answer: "Explore resources that support your spiritual growth. Purchases are optional."
  },
  {
    icon: Gift,
    title: "Donations",
    question: null,
    answer: "Giving is optional and never required to access devotionals."
  },
];

const topicOptions = [
  { value: "app_question", label: "App Question" },
  { value: "devotional_content", label: "Devotional Content" },
  { value: "prayer_counseling", label: "Prayer / Counseling" },
  { value: "youtube_media", label: "YouTube / Media" },
  { value: "shop_resources", label: "Shop / Resources" },
  { value: "other", label: "Other" },
];

export default function GeneralInquiries() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      topic: "",
      message: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: InquiryFormValues) => {
      return apiRequest("POST", "/api/general-inquiries", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Thank you!",
        description: "Your message has been received.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InquiryFormValues) => {
    submitMutation.mutate(data);
  };

  const handleFallbackEmail = () => {
    window.location.href = "mailto:365ddevotional@gmail.com?subject=General%20Inquiry%20%E2%80%93%20365%20Daily%20Devotional";
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="bg-card border-card-border shadow-xl shadow-primary/10 p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-primary mb-4">Thank You</h2>
          <p className="text-foreground/80 mb-6">
            Your message has been received. We'll respond as soon as possible.
          </p>
          <Link href="/contact">
            <Button variant="outline" data-testid="button-back-contact">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contact
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div className="mb-6">
        <Link href="/contact">
          <Button variant="ghost" size="sm" data-testid="button-back-contact">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contact
          </Button>
        </Link>
      </div>

      <div className="text-center space-y-4">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary">General Inquiries</h1>
        <div className="decorative-divider" />
        <p className="text-foreground/80 max-w-2xl mx-auto">
          Have a question about the app, devotionals, or ministry resources? Send us a message and we'll respond as soon as possible.
        </p>
      </div>

      {/* Quick Help Section */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-foreground flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Quick Help
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {helpTopics.map((topic, index) => (
            <Card 
              key={index} 
              className="bg-card border-card-border p-4"
              data-testid={`card-help-${index}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <topic.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-foreground">{topic.title}</h3>
                  {topic.question && (
                    <p className="text-sm text-muted-foreground italic">{topic.question}</p>
                  )}
                  <p className="text-sm text-foreground/80">{topic.answer}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Response Time Notice */}
      <Card className="bg-secondary/10 border-secondary/20 p-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-secondary flex-shrink-0" />
          <p className="text-sm text-foreground/80">
            We aim to respond within 2–3 business days. During high-volume periods, replies may take a little longer.
          </p>
        </div>
      </Card>

      {/* Inquiry Form */}
      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden">
        <div className="relative bg-gradient-to-br from-secondary/15 via-accent/10 to-primary/10 p-6 text-center">
          <h2 className="font-serif text-xl font-semibold text-foreground">General Inquiry Form</h2>
        </div>

        <div className="p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Full Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your name"
                        data-testid="input-full-name"
                        {...field}
                      />
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
                      Email Address <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Topic <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-topic">
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {topicOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        placeholder="How can we help you?"
                        className="min-h-[120px] resize-none"
                        data-testid="textarea-message"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitMutation.isPending}
                  data-testid="button-submit-inquiry"
                >
                  {submitMutation.isPending ? "Sending..." : "Submit Inquiry"}
                </Button>
                
                <button
                  type="button"
                  onClick={handleFallbackEmail}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
                  data-testid="link-fallback-email"
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>Having trouble? Open in email app instead</span>
                </button>
              </div>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
}
