import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle, AlertCircle, Handshake, Users, Video, Globe, Calendar, Package } from "lucide-react";
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

const partnershipFormSchema = z.object({
  fullName: z.string().min(2, "Please enter your name"),
  organization: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  partnershipType: z.string().min(1, "Please select a partnership type"),
  message: z.string().min(20, "Please describe your proposal (at least 20 characters)"),
});

type PartnershipFormValues = z.infer<typeof partnershipFormSchema>;

const partnershipTypes = [
  { value: "ministry_collaboration", label: "Ministry Collaboration", icon: Users },
  { value: "media_content", label: "Media & Content Creation", icon: Video },
  { value: "outreach_missions", label: "Outreach & Missions", icon: Globe },
  { value: "events_speaking", label: "Events & Speaking Invitations", icon: Calendar },
  { value: "resource_distribution", label: "Resource Distribution", icon: Package },
];

export default function Partnership() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<PartnershipFormValues>({
    resolver: zodResolver(partnershipFormSchema),
    defaultValues: {
      fullName: "",
      organization: "",
      email: "",
      partnershipType: "",
      message: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: PartnershipFormValues) => {
      return apiRequest("POST", "/api/partnership", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Thank you",
        description: "We will prayerfully review your message.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send inquiry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PartnershipFormValues) => {
    submitMutation.mutate(data);
  };

  const handleFallbackEmail = () => {
    window.location.href = "mailto:365ddevotional@gmail.com?subject=Partnership%20Inquiry%20%E2%80%93%20365%20Daily%20Devotional";
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
            We will prayerfully review your message.
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
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <div className="mb-6">
        <Link href="/contact">
          <Button variant="ghost" size="sm" data-testid="button-back-contact">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contact
          </Button>
        </Link>
      </div>

      <div className="text-center space-y-4">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary">Partnership Opportunities</h1>
        <div className="decorative-divider" />
        <p className="text-foreground/80 max-w-2xl mx-auto">
          We welcome partnerships aligned with our mission of sharing God's Word and encouraging believers worldwide.
        </p>
      </div>

      {/* Partnership Types */}
      <div className="space-y-4">
        <h2 className="font-serif text-lg font-semibold text-foreground text-center">Types of Partnership</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {partnershipTypes.map((type) => (
            <Card 
              key={type.value} 
              className="bg-card border-card-border p-4"
              data-testid={`card-partnership-${type.value}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <type.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">{type.label}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Partnership Form */}
      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden">
        <div className="relative bg-gradient-to-br from-secondary/15 via-accent/10 to-primary/10 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Handshake className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-serif text-xl font-semibold text-foreground">Partnership Inquiry Form</h2>
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
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization / Ministry (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your organization or ministry"
                        data-testid="input-organization"
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
                name="partnershipType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Partnership Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-partnership-type">
                          <SelectValue placeholder="Select partnership type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partnershipTypes.map((type) => (
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
                      Message / Proposal <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your partnership idea or proposal..."
                        className="min-h-[150px] resize-none"
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
                  data-testid="button-submit-partnership"
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
