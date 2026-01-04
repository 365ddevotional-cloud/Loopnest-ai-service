import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Wrench, ArrowLeft, CheckCircle } from "lucide-react";
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

const supportFormSchema = z.object({
  issueDescription: z.string().min(10, "Please describe your issue in at least 10 characters"),
  deviceBrowser: z.string().optional(),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
});

type SupportFormValues = z.infer<typeof supportFormSchema>;

export default function Support() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      issueDescription: "",
      deviceBrowser: "",
      email: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: SupportFormValues) => {
      return apiRequest("POST", "/api/support-tickets", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Support Request Submitted",
        description: "We've received your request and will get back to you soon.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit support request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupportFormValues) => {
    submitMutation.mutate(data);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="bg-card border-card-border shadow-xl shadow-primary/10 p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-primary mb-4">Request Submitted</h2>
          <p className="text-foreground/80 mb-6">
            Thank you for reaching out. Our team will review your support request and respond as soon as possible.
            {form.getValues("email") && " We'll send updates to your email address."}
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
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-6">
        <Link href="/contact">
          <Button variant="ghost" size="sm" data-testid="button-back-contact">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contact
          </Button>
        </Link>
      </div>

      <div className="text-center mb-8 space-y-4">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary">Technical Support</h1>
        <div className="decorative-divider" />
      </div>

      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden">
        <div className="relative bg-gradient-to-br from-muted/30 via-secondary/10 to-primary/10 p-6 md:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <p className="text-foreground/80 leading-relaxed">
            Having trouble with the app? Let us know and we'll help you get back on track.
          </p>
        </div>

        <div className="p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="issueDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Issue Description <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe the issue you're experiencing..."
                        className="min-h-[120px] resize-none"
                        data-testid="textarea-issue-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deviceBrowser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device / Browser (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., iPhone 15, Chrome on Windows"
                        data-testid="input-device-browser"
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
                    <FormLabel>Email Address (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Provide an email if you'd like us to follow up with you.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={submitMutation.isPending}
                data-testid="button-submit-support"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Support Request"}
              </Button>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
}
