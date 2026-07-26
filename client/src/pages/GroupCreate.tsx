import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUser } from "@/contexts/UserContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { GROUP_TYPES } from "@/lib/groupTypes";
import { useI18n } from "@/hooks/useI18n";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  groupType: z.string().min(1, "Please select a group type"),
  customGroupType: z.string().max(60, "Group type must be 60 characters or less").optional(),
  description: z.string().max(300).optional(),
  country: z.string().optional(),
  privacy: z.enum(["join_code", "invite_only"]),
}).superRefine((data, ctx) => {
  if (data.groupType === "custom") {
    const trimmed = (data.customGroupType ?? "").trim();
    if (!trimmed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a custom group type.",
        path: ["customGroupType"],
      });
    }
  }
});

type FormData = z.infer<typeof schema>;

export default function GroupCreate() {
  const { user, emailVerified, getIdToken } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", groupType: "family", customGroupType: "", description: "", country: "", privacy: "join_code" },
  });

  const watchedType = form.watch("groupType");

  useEffect(() => {
    if (!user || !emailVerified) navigate("/signin");
  }, [user, emailVerified]);

  if (!user || !emailVerified) return null;

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const token = await getIdToken();
      const finalType = data.groupType === "custom"
        ? (data.customGroupType ?? "").trim()
        : data.groupType;
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...data, groupType: finalType }),
      });
      if (!res.ok) throw new Error((await res.json()).message || t("gm_createError"));
      const group = await res.json();
      toast({ title: t("gm_groupCreated"), description: `${t("gm_inviteCodeLabel")}: ${group.inviteCode}` });
      navigate(`/group/${group.id}`);
    } catch (err: any) {
      toast({ title: t("gm_error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-6 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/groups")} className="p-2 -ml-2 rounded-lg hover:bg-muted/60 text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-xl font-bold">{t("gm_createGroup")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Users className="w-4 h-4" /> {t("gm_groupDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("gm_groupName")} *</FormLabel>
                  <FormControl><Input placeholder={t("gm_groupNamePlaceholder")} data-testid="input-group-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="groupType" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("gm_groupType")} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-group-type">
                        <SelectValue placeholder={t("gm_selectType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GROUP_TYPES.map(gt => (
                        <SelectItem key={gt.value} value={gt.value}>{gt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {watchedType === "custom" && (
                <FormField control={form.control} name="customGroupType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("gm_customGroupType")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("gm_customGroupTypePlaceholder")}
                        maxLength={60}
                        data-testid="input-custom-group-type"
                        {...field}
                        onChange={e => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("gm_description")}</FormLabel>
                  <FormControl><Textarea placeholder={t("gm_descriptionPlaceholder")} rows={3} data-testid="input-group-description" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("gm_country")}</FormLabel>
                  <FormControl><Input placeholder="e.g. Nigeria, United States" data-testid="input-group-country" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="privacy" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("gm_privacy")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-group-privacy">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="join_code">{t("gm_privacyJoinCode")}</SelectItem>
                      <SelectItem value="invite_only">{t("gm_privacyInviteOnly")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-create">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? t("gm_creating") : t("gm_createGroup")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
