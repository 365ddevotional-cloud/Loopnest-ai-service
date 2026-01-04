import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
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

const feedbackFormSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  feedbackType: z.string().min(1, "Please select a feedback type"),
  message: z.string().min(10, "Please enter your feedback (at least 10 characters)"),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

const feedbackTypes = [
  { value: "app_design", label: "App Design" },
  { value: "content_quality", label: "Content Quality" },
  { value: "feature_request", label: "Feature Request" },
  { value: "bug_issue", label: "Bug / Issue" },
  { value: "other", label: "Other" },
];

export default function Feedback() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      name: "",
      email: "",
      feedbackType: "",
      message: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FeedbackFormValues) => {
      return apiRequest("POST", "/api/feedback", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Thank you",
        description: "Thank you for helping us improve.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FeedbackFormValues) => {
    submitMutation.mutate(data);
  };

  const handleFallbackEmail = () => {
    window.location.href = "mailto:365ddevotional@gmail.com?subject=Feedback%20%26%20Suggestions%20%E2%80%93%20365%20Daily%20Devotional";
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
            Thank you for helping us improve.
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
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="mb-6">
        <Link href="/contact">
          <Button variant="ghost" size="sm" data-testid="button-back-contact">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contact
          </Button>
        </Link>
      </div>

      <div className="text-center space-y-4">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary">Feedback & Suggestions</h1>
        <div className="decorative-divider" />
        <p className="text-foreground/80 max-w-xl mx-auto">
          Your feedback helps us improve. Share ideas, suggestions, or concerns to help us serve you better.
        </p>
      </div>

      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden">
        <div className="relative bg-gradient-to-br from-secondary/15 via-accent/10 to-primary/10 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
        </div>

        <div className="p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your name"
                        data-testid="input-name"
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
                    <FormLabel>Email (optional)</FormLabel>
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
                name="feedbackType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Feedback Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-feedback-type">
                          <SelectValue placeholder="Select feedback type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {feedbackTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                        placeholder="Share your feedback, ideas, or suggestions..."
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
                  data-testid="button-submit-feedback"
                >
                  {submitMutation.isPending ? "Sending..." : "Submit Feedback"}
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
