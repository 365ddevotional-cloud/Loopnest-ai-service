import { useI18n } from "@/hooks/useI18n";
import { FeedbackReplies } from "@/components/FeedbackReplies";
import { useUser } from "@/contexts/UserContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  message: z.string().min(10, "Please enter your feedback (at least 10 characters)").max(10000),
  receiveReplies:z.boolean().default(false),
  emailConsent:z.boolean().default(false),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

export default function Feedback() {
  const {t}=useI18n();
  const feedbackTypes = [
  { value: "app_design", label: t("ui_appDesign") },
  { value: "content_quality", label: t("ui_contentQuality") },
  { value: "feature_request", label: t("ui_featureRequest") },
  { value: "bug_issue", label: t("ui_bugIssue") },
  { value: "other", label: t("ui_other") },
];


  const { toast } = useToast();
  const {user,getIdToken}=useUser();
  const cache=useQueryClient();
  const [recovery,setRecovery]=useState("");
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema.extend({email:z.string().email(t("ui_emailInvalid")).optional().or(z.literal("")),feedbackType:z.string().min(1,t("ui_chooseType")),message:z.string().min(10,t("ui_messageMin")).max(10000)})),
    defaultValues: {
      name: "",
      email: "",
      feedbackType: "",
      message: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FeedbackFormValues) => {
      const token=user?await getIdToken():null;
      const res=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});
      if(!res.ok)throw new Error(t("ui_feedbackFailed"));return res.json();
    },
    onSuccess: (data) => {
      if(data.token)setRecovery(`${data.id}.${data.token}`);
      void cache.invalidateQueries({queryKey:["feedback-private"]});
      setSubmitted(true);
      toast({
        title: t("ui_thankYou"),
        description: t("ui_thankYouNote"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("ui_bugIssue"),
        description: error.message || t("ui_feedbackFailed"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FeedbackFormValues) => {
    submitMutation.mutate({...data,emailConsent:data.receiveReplies&&data.emailConsent});
  };

  const handleFallbackEmail = () => {
    window.location.href = "mailto:365ddevotional@gmail.com?subject=Feedback%20%26%20Suggestions%20%E2%80%93%20365%20Daily%20Devotional";
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        {recovery&&<div className="rounded border p-4 mb-4"><h2 className="font-bold">{t("ui_saveCode")}</h2><p className="break-all select-all">{recovery}</p><Button onClick={()=>navigator.clipboard.writeText(recovery).then(()=>toast({title:t("ui_codeSaved")})).catch(()=>toast({title:t("ui_codeManual")}))}>{t("ui_copyCode")}</Button><p>{t("ui_keepCode")}</p></div>}
        <FeedbackReplies initialCode={recovery}/>

        <Card className="bg-card border-card-border shadow-xl shadow-primary/10 p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-primary mb-4">{t("ui_thankYou")}</h2>
          <p className="text-foreground/80 mb-6">
            {t("ui_thankYouNote")}
          </p>
          <Link href="/contact">
            <Button variant="outline" data-testid="button-back-contact">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("ui_backContact")}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <FeedbackReplies initialCode={recovery}/>
      <div className="mb-6">
        <Link href="/contact">
          <Button variant="ghost" size="sm" data-testid="button-back-contact">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("ui_backContact")}
          </Button>
        </Link>
      </div>

      <div className="text-center space-y-4">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary">{t("ui_feedbackTitle")}</h1>
        <div className="decorative-divider" />
        <p className="text-foreground/80 max-w-xl mx-auto">
          {t("ui_feedbackIntro")}
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
                    <FormLabel>{t("ui_nameOptional")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("ui_nameOptional")}
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
                    <FormLabel>{t("ui_emailOptional")}</FormLabel>
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
                      {t("ui_feedbackType")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-feedback-type">
                          <SelectValue placeholder={t("ui_chooseType")} />
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
                      {t("ui_message")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("ui_feedbackIntro")}
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
                <label className="flex gap-2"><input type="checkbox" {...form.register("receiveReplies")}/>{t("ui_replyConsent")}</label>
                <p className="text-sm">{user?t("ui_accountOptIn"):t("ui_guestOptIn")} {t("ui_noReplyOptIn")}</p>
                {form.watch("receiveReplies")&&<label className="flex gap-2"><input type="checkbox" {...form.register("emailConsent")}/>{t("ui_emailConsent")}</label>}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitMutation.isPending}
                  data-testid="button-submit-feedback"
                >
                  {submitMutation.isPending ? t("ui_sending") : t("ui_send")}
                </Button>
                
                <button
                  type="button"
                  onClick={handleFallbackEmail}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
                  data-testid="link-fallback-email"
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>{t("ui_emailFallback")}</span>
                </button>
              </div>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
}
