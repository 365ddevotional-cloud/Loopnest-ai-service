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

const GROUP_TYPES = [
  { value: "family", label: "Family" },
  { value: "prayer", label: "Prayer Group" },
  { value: "workplace", label: "Workplace" },
  { value: "sports", label: "Sports Team" },
  { value: "community", label: "Community Organization" },
  { value: "other", label: "Other" },
];

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  groupType: z.enum(["family", "prayer", "workplace", "sports", "community", "other"]),
  description: z.string().max(300).optional(),
  country: z.string().optional(),
  privacy: z.enum(["join_code", "invite_only"]),
});
type FormData = z.infer<typeof schema>;

export default function GroupCreate() {
  const { user, emailVerified, getIdToken } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", groupType: "family", description: "", country: "", privacy: "join_code" },
  });

  useEffect(() => {
    if (!user || !emailVerified) navigate("/signin");
  }, [user, emailVerified]);

  if (!user || !emailVerified) return null;

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to create group");
      const group = await res.json();
      toast({ title: "Group created!", description: `Invite code: ${group.inviteCode}` });
      navigate(`/group/${group.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
        <h1 className="font-serif text-xl font-bold">Create a Group</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Users className="w-4 h-4" /> Group Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name *</FormLabel>
                  <FormControl><Input placeholder="e.g. Johnson Family, Friday Prayer Group" data-testid="input-group-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="groupType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-group-type">
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GROUP_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Textarea placeholder="What is this group for?" rows={3} data-testid="input-group-description" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel>Country (optional)</FormLabel>
                  <FormControl><Input placeholder="e.g. Nigeria, United States" data-testid="input-group-country" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="privacy" render={({ field }) => (
                <FormItem>
                  <FormLabel>Privacy</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-group-privacy">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="join_code">Join by Code — anyone with the code can join</SelectItem>
                      <SelectItem value="invite_only">Invite Only — owner must share code personally</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-create">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? "Creating…" : "Create Group"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
