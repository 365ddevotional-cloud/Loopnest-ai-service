import { CreateDevotionalForm } from "@/components/CreateDevotionalForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Inbox, MessageSquare, Send, Loader2, CheckCircle, CheckCheck, XCircle, RefreshCw, AlertTriangle, User, Paperclip, FileText, Image, Download, Smartphone, Search, Sparkles, Archive, Calendar, Edit, Eye, Trash2, Clock, X, Copy, Telescope, GraduationCap, Plus, Star, ThumbsUp, Flag, Heart, BarChart3, TrendingUp, Music, Music2, CheckCircle2, Upload, Gift, Video, Building2, DollarSign, Menu } from "lucide-react";
import { useUpload } from "@/hooks/use-upload";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/hooks/useI18n";
import { format, parseISO } from "date-fns";
import { useLocation } from "wouter";
import type { PrayerRequest, ThreadMessage, PrayerAttachment, Devotional, SundaySchoolLesson, InboxThread, InboxMessage, Song, SongTestimony, GivingMethod, DonationConfirmation } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getDevotionalStatus } from "@/lib/date-utils";
import { RedLetterScripture } from "@/components/RedLetterScripture";

const PRIORITY_LABELS: Record<string, string> = {
  prayer_normal: "Prayer Request",
  prayer_urgent: "Urgent Prayer",
  counseling_normal: "Counseling",
  counseling_urgent: "Urgent Counseling",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-800" },
  replied: { label: "Being Prayed For", color: "bg-green-100 text-green-800" },
  answered: { label: "Answered", color: "bg-amber-100 text-amber-800" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800" },
};

const CATEGORY_LABELS: Record<string, string> = {
  healing: "Healing",
  marriage: "Marriage",
  finance: "Finance",
  deliverance: "Deliverance",
  guidance: "Guidance",
  family: "Family",
  salvation: "Salvation",
  other: "Other",
};

const CATEGORY_OPTIONS = [
  { value: "healing", label: "Healing" },
  { value: "marriage", label: "Marriage" },
  { value: "finance", label: "Finance" },
  { value: "deliverance", label: "Deliverance" },
  { value: "guidance", label: "Guidance" },
  { value: "family", label: "Family" },
  { value: "salvation", label: "Salvation" },
  { value: "other", label: "Other" },
];

const QUICK_REPLY_SNIPPETS = [
  { label: "General Encouragement", text: "Thank you for reaching out. We are lifting your request in prayer and trust that God is working in your situation. Remember, 'The Lord is near to the brokenhearted and saves the crushed in spirit.' (Psalm 34:18)" },
  { label: "Healing Prayer", text: "We are praying for your complete healing. 'By His stripes we are healed.' (Isaiah 53:5) May the Lord restore your health and grant you peace during this time." },
  { label: "Financial Blessing", text: "God knows your needs before you ask. We're standing with you in prayer for provision. 'And my God will supply every need of yours according to his riches in glory in Christ Jesus.' (Philippians 4:19)" },
  { label: "Marriage/Family", text: "We're praying for restoration and peace in your family. May God's love bind your hearts together. 'Above all, clothe yourselves with love, which binds us all together in perfect harmony.' (Colossians 3:14)" },
  { label: "Guidance & Direction", text: "We're asking God to guide your steps and make your path clear. 'Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.' (Proverbs 3:5-6)" },
  { label: "Deliverance", text: "We declare freedom over your life in Jesus' name. 'So if the Son sets you free, you will be free indeed.' (John 8:36) God is breaking every chain and setting you free." },
];

interface SeedResponse {
  success: boolean;
  message: string;
  stats: { beforeCount: number; afterCount: number; inserted: number };
}

function SeedDevotionalsButton() {
  const { toast } = useToast();
  const [hasSeeded, setHasSeeded] = useState(false);
  
  const seedMutation = useMutation({
    mutationFn: async (): Promise<SeedResponse> => {
      const response = await apiRequest("POST", "/api/admin/seed-devotionals");
      return response.json();
    },
    onSuccess: (data: SeedResponse) => {
      setHasSeeded(true);
      toast({ 
        title: "Seed completed successfully", 
        description: `Total: ${data.stats.afterCount} devotionals. Inserted: ${data.stats.inserted} new entries.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/devotionals"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Seed failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  return (
    <Button 
      onClick={() => seedMutation.mutate()}
      disabled={seedMutation.isPending || hasSeeded}
      variant="outline"
      size="sm"
      className="gap-2"
      data-testid="button-seed-devotionals"
    >
      {seedMutation.isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Seeding...
        </>
      ) : hasSeeded ? (
        <>
          <CheckCircle className="w-4 h-4 text-green-600" />
          Seeded
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          Seed Devotionals
        </>
      )}
    </Button>
  );
}

function PromiseAdmin() {
  const { toast } = useToast();
  const [promiseLookup, setPromiseLookup] = useState<Record<number, { heading: string; reference: string }>>({});

  useEffect(() => {
    import("@/promises/promises.json").then((mod) => {
      const map: Record<number, { heading: string; reference: string }> = {};
      for (const p of mod.default) {
        map[p.id] = { heading: p.heading, reference: p.reference };
      }
      setPromiseLookup(map);
    });
  }, []);

  const { data: stats, isLoading } = useQuery<{
    total: number;
    currentIndex: number;
    isEnabled: boolean;
    currentPromise: { id: number; heading: string; text: string; reference: string };
    nextPromise: { id: number; heading: string; text: string; reference: string };
  }>({
    queryKey: ["/api/promise/stats"],
  });

  const { data: analytics } = useQuery<{
    totalAmens: number;
    topToday: { promiseId: number; count: number }[];
    topWeek: { promiseId: number; count: number }[];
    topAllTime: { promiseId: number; count: number }[];
  }>({
    queryKey: ["/api/promise/amen-analytics"],
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest("PATCH", "/api/promise/toggle", { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promise/stats"] });
      toast({ title: "Promise notifications updated" });
    },
  });

  const advanceMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/promise/advance"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promise/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promise/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promise/next"] });
      toast({ title: "Advanced to next promise" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/promise/reset"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promise/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promise/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promise/next"] });
      toast({ title: "Promise rotation reset to beginning" });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">Total Promises</p>
          <p className="text-3xl font-bold text-primary" data-testid="text-total-promises">{stats.total}</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">Current Position</p>
          <p className="text-3xl font-bold text-primary" data-testid="text-current-index">{stats.currentIndex + 1} / {stats.total}</p>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge
            data-testid="badge-promise-status"
            variant={stats.isEnabled ? "default" : "secondary"}
            className={stats.isEnabled ? "bg-green-600" : ""}
          >
            {stats.isEnabled ? "Active" : "Disabled"}
          </Badge>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button
          data-testid="button-toggle-promises"
          variant={stats.isEnabled ? "destructive" : "default"}
          onClick={() => toggleMutation.mutate(!stats.isEnabled)}
          disabled={toggleMutation.isPending}
        >
          {stats.isEnabled ? "Disable Notifications" : "Enable Notifications"}
        </Button>
        <Button
          data-testid="button-advance-promise"
          variant="outline"
          onClick={() => advanceMutation.mutate()}
          disabled={advanceMutation.isPending}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Advance to Next
        </Button>
        <Button
          data-testid="button-reset-promises"
          variant="outline"
          onClick={() => {
            if (confirm("Reset promise rotation to the beginning?")) {
              resetMutation.mutate();
            }
          }}
          disabled={resetMutation.isPending}
        >
          Reset Rotation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Current Promise (#{stats.currentIndex + 1})
          </h3>
          <p className="font-bold text-lg mb-2" data-testid="text-current-promise-heading">{stats.currentPromise.heading}</p>
          <p className="italic text-muted-foreground mb-2">"{stats.currentPromise.text}"</p>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">— {stats.currentPromise.reference}</p>
        </div>

        <div className="p-5 border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl">
          <h3 className="text-sm font-semibold text-sky-800 dark:text-sky-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Next Promise (#{stats.currentIndex + 2})
          </h3>
          <p className="font-bold text-lg mb-2" data-testid="text-next-promise-heading">{stats.nextPromise.heading}</p>
          <p className="italic text-muted-foreground mb-2">"{stats.nextPromise.text}"</p>
          <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">— {stats.nextPromise.reference}</p>
        </div>
      </div>

      {analytics && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Promises Analytics
          </h3>

          <div className="p-4 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-muted-foreground">Total Amens</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2" data-testid="text-total-amens">
              <Heart className="w-6 h-6 fill-current" />
              {analytics.totalAmens.toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Most Loved Today
              </h4>
              {analytics.topToday.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No amens today yet</p>
              ) : (
                <div className="space-y-2">
                  {analytics.topToday.map((item, i) => {
                    const info = promiseLookup[item.promiseId];
                    return (
                      <div key={item.promiseId} className="flex items-start gap-2 text-sm" data-testid={`amen-today-${i}`}>
                        <span className="text-muted-foreground font-mono text-xs mt-0.5">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{info?.heading || `Promise #${item.promiseId}`}</p>
                          <p className="text-xs text-muted-foreground">{info?.reference}</p>
                        </div>
                        <span className="text-red-500 font-semibold flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-current" /> {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border border-border rounded-lg">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Most Loved This Week
              </h4>
              {analytics.topWeek.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No amens this week yet</p>
              ) : (
                <div className="space-y-2">
                  {analytics.topWeek.map((item, i) => {
                    const info = promiseLookup[item.promiseId];
                    return (
                      <div key={item.promiseId} className="flex items-start gap-2 text-sm" data-testid={`amen-week-${i}`}>
                        <span className="text-muted-foreground font-mono text-xs mt-0.5">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{info?.heading || `Promise #${item.promiseId}`}</p>
                          <p className="text-xs text-muted-foreground">{info?.reference}</p>
                        </div>
                        <span className="text-red-500 font-semibold flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-current" /> {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border border-border rounded-lg">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <Star className="w-4 h-4" />
                All Time Top Promises
              </h4>
              {analytics.topAllTime.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No amens recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {analytics.topAllTime.map((item, i) => {
                    const info = promiseLookup[item.promiseId];
                    return (
                      <div key={item.promiseId} className="flex items-start gap-2 text-sm" data-testid={`amen-alltime-${i}`}>
                        <span className="text-muted-foreground font-mono text-xs mt-0.5">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{info?.heading || `Promise #${item.promiseId}`}</p>
                          <p className="text-xs text-muted-foreground">{info?.reference}</p>
                        </div>
                        <span className="text-red-500 font-semibold flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-current" /> {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TestimonyManager() {
  const { toast } = useToast();
  const { data: allTestimonies = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/testimonies/all"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/testimonies/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testimonies/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/testimonies"] });
      toast({ title: "Testimony approved" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/testimonies/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testimonies/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/testimonies"] });
      toast({ title: "Testimony returned to user for revision" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/testimonies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testimonies/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/testimonies"] });
      toast({ title: "Testimony deleted" });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const pending = allTestimonies.filter((t: any) => !t.isApproved);
  const approved = allTestimonies.filter((t: any) => t.isApproved);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
          <Flag className="w-5 h-5 text-amber-500" />
          Pending Review ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No testimonies awaiting review.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((testimony: any) => (
              <div key={testimony.id} className="p-4 border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800 rounded-lg" data-testid={`testimony-pending-${testimony.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-foreground">{testimony.name || "Anonymous"}</p>
                      {testimony.requestId && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          Prayer #{testimony.requestId}
                        </span>
                      )}
                    </div>
                    {testimony.country && <p className="text-xs text-muted-foreground">{testimony.country}</p>}
                    <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{testimony.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {testimony.createdAt ? format(new Date(testimony.createdAt), "MMM d, yyyy h:mm a") : ""}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approveMutation.mutate(testimony.id)}
                      disabled={approveMutation.isPending}
                      data-testid={`approve-testimony-${testimony.id}`}
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-300"
                      onClick={() => rejectMutation.mutate(testimony.id)}
                      disabled={rejectMutation.isPending}
                      data-testid={`reject-testimony-${testimony.id}`}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(testimony.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`delete-testimony-${testimony.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Approved ({approved.length})
        </h3>
        {approved.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approved testimonies yet.</p>
        ) : (
          <div className="space-y-3">
            {approved.map((testimony: any) => (
              <div key={testimony.id} className="p-4 border border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800 rounded-lg" data-testid={`testimony-approved-${testimony.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{testimony.name || "Anonymous"}</p>
                    {testimony.country && <p className="text-xs text-muted-foreground">{testimony.country}</p>}
                    <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{testimony.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {testimony.createdAt ? format(new Date(testimony.createdAt), "MMM d, yyyy h:mm a") : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-shrink-0"
                    onClick={() => deleteMutation.mutate(testimony.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`delete-approved-testimony-${testimony.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminArchive() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "past" | "today" | "future">("all");
  const [selectedDevotional, setSelectedDevotional] = useState<Devotional | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    scriptureReference: "",
    scriptureText: "",
    content: "",
    prayerPoints: "",
    faithDeclarations: "",
    christianQuotes: "",
    propheticDeclaration: "",
    author: "",
  });

  const { data: devotionals = [], isLoading } = useQuery<Devotional[]>({
    queryKey: ["/api/devotionals"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Devotional> }) => {
      return apiRequest("PATCH", `/api/devotionals/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Devotional updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/devotionals"] });
      setIsEditDialogOpen(false);
      setSelectedDevotional(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // SAFETY: confirm=true is required by the API to prevent accidental deletions
      // This triggers soft-delete (data is preserved but hidden)
      return apiRequest("DELETE", `/api/devotionals/${id}?confirm=true`);
    },
    onSuccess: () => {
      toast({ 
        title: "Devotional archived", 
        description: "The devotional has been moved to trash and can be restored if needed." 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/devotionals"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to archive", description: error.message, variant: "destructive" });
    },
  });

  const filteredDevotionals = devotionals.filter((d) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      d.title.toLowerCase().includes(query) ||
      d.date.includes(query) ||
      d.scriptureReference.toLowerCase().includes(query);
    
    const matchesDate = !dateFilter || d.date === dateFilter;
    
    const matchesStatus = statusFilter === "all" || getDevotionalStatus(d.date) === statusFilter;
    
    return matchesSearch && matchesDate && matchesStatus;
  });

  const openEditDialog = (devotional: Devotional) => {
    setSelectedDevotional(devotional);
    setEditForm({
      title: devotional.title,
      scriptureReference: devotional.scriptureReference,
      scriptureText: devotional.scriptureText,
      content: devotional.content,
      prayerPoints: devotional.prayerPoints.join("\n"),
      faithDeclarations: devotional.faithDeclarations.join("\n"),
      christianQuotes: devotional.christianQuotes || "",
      propheticDeclaration: devotional.propheticDeclaration || "",
      author: devotional.author || "",
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (devotional: Devotional) => {
    setSelectedDevotional(devotional);
    setIsViewDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedDevotional) return;
    
    const prayerPointsArray = editForm.prayerPoints
      .split("\n")
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    const faithDeclarationsArray = editForm.faithDeclarations
      .split("\n")
      .map(d => d.trim())
      .filter(d => d.length > 0);
    
    updateMutation.mutate({
      id: selectedDevotional.id,
      data: {
        title: editForm.title.trim(),
        scriptureReference: editForm.scriptureReference.trim(),
        scriptureText: editForm.scriptureText.trim(),
        content: editForm.content.trim(),
        prayerPoints: prayerPointsArray.length > 0 ? prayerPointsArray : selectedDevotional.prayerPoints,
        faithDeclarations: faithDeclarationsArray.length > 0 ? faithDeclarationsArray : selectedDevotional.faithDeclarations,
        christianQuotes: editForm.christianQuotes.trim() || null,
        propheticDeclaration: editForm.propheticDeclaration.trim() || null,
        author: editForm.author.trim() || selectedDevotional.author || undefined,
      },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this devotional?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pastCount = devotionals.filter(d => getDevotionalStatus(d.date) === "past").length;
  const todayCount = devotionals.filter(d => getDevotionalStatus(d.date) === "today").length;
  const futureCount = devotionals.filter(d => getDevotionalStatus(d.date) === "future").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            data-testid="button-filter-all"
          >
            <Archive className="w-3 h-3 mr-1" />
            All ({devotionals.length})
          </Button>
          <Button
            variant={statusFilter === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("past")}
            data-testid="button-filter-past"
          >
            <Clock className="w-3 h-3 mr-1" />
            Past ({pastCount})
          </Button>
          <Button
            variant={statusFilter === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("today")}
            data-testid="button-filter-today"
          >
            <Calendar className="w-3 h-3 mr-1" />
            Today ({todayCount})
          </Button>
          <Button
            variant={statusFilter === "future" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("future")}
            data-testid="button-filter-future"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Future ({futureCount})
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing: {filteredDevotionals.length} of {devotionals.length}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, date, or scripture..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-archive-search"
          />
        </div>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full sm:w-48"
          data-testid="input-archive-date"
        />
        {dateFilter && (
          <Button variant="ghost" size="icon" onClick={() => setDateFilter("")} data-testid="button-clear-date">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredDevotionals.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No devotionals found.</p>
        ) : (
          filteredDevotionals.map((devotional) => {
            const status = getDevotionalStatus(devotional.date);
            const isPast = status === "past";
            const isToday = status === "today";
            const isFuture = status === "future";

            return (
              <div
                key={devotional.id}
                className={`p-4 border rounded-lg transition-colors ${
                  isPast ? "border-border bg-muted/30 opacity-80" : 
                  isToday ? "border-primary bg-primary/5" : 
                  "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30"
                }`}
                data-testid={`archive-item-${devotional.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-foreground truncate">{devotional.title}</span>
                      {isPast && (
                        <Badge variant="secondary" className="text-xs">Past</Badge>
                      )}
                      {isToday && (
                        <Badge className="text-xs bg-primary/20 text-primary border-primary">Today</Badge>
                      )}
                      {isFuture && (
                        <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Scheduled</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{devotional.scriptureReference}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(devotional.date), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openViewDialog(devotional)}
                      data-testid={`button-view-${devotional.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {!isPast && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(devotional)}
                          data-testid={`button-edit-${devotional.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(devotional.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${devotional.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                    {isPast && (
                      <Badge variant="outline" className="text-xs text-muted-foreground ml-2">Read-only</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{selectedDevotional?.title}</DialogTitle>
          </DialogHeader>
          {selectedDevotional && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Date</Label>
                <p>{format(parseISO(selectedDevotional.date), "MMMM d, yyyy")}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Scripture Reference</Label>
                <p className="font-medium">{selectedDevotional.scriptureReference}</p>
                <p className="italic text-muted-foreground mt-1">
                  <RedLetterScripture 
                    text={selectedDevotional.scriptureText} 
                    enabled={selectedDevotional.redLetterEnabled !== false}
                  />
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Content</Label>
                <p className="whitespace-pre-wrap">{selectedDevotional.content}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Prayer Points</Label>
                <ul className="list-disc list-inside">
                  {selectedDevotional.prayerPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <Label className="text-muted-foreground">Faith Declarations</Label>
                <ul className="list-disc list-inside">
                  {selectedDevotional.faithDeclarations.map((dec, i) => (
                    <li key={i}>{dec}</li>
                  ))}
                </ul>
              </div>
              {selectedDevotional.christianQuotes && (
                <div>
                  <Label className="text-muted-foreground">Christian Quotes</Label>
                  <p className="whitespace-pre-wrap" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{selectedDevotional.christianQuotes}</p>
                </div>
              )}
              {selectedDevotional.propheticDeclaration && (
                <div>
                  <Label className="text-muted-foreground">Prophetic Declaration</Label>
                  <p className="whitespace-pre-wrap" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{selectedDevotional.propheticDeclaration}</p>
                </div>
              )}
              {selectedDevotional.author && (
                <div>
                  <Label className="text-muted-foreground">Author</Label>
                  <p>{selectedDevotional.author}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Devotional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                data-testid="input-edit-title"
              />
            </div>
            <div>
              <Label htmlFor="edit-scripture-ref">Scripture Reference</Label>
              <Input
                id="edit-scripture-ref"
                value={editForm.scriptureReference}
                onChange={(e) => setEditForm({ ...editForm, scriptureReference: e.target.value })}
                data-testid="input-edit-scripture-ref"
              />
            </div>
            <div>
              <Label htmlFor="edit-scripture-text">Scripture Text</Label>
              <Textarea
                id="edit-scripture-text"
                value={editForm.scriptureText}
                onChange={(e) => setEditForm({ ...editForm, scriptureText: e.target.value })}
                rows={3}
                data-testid="textarea-edit-scripture-text"
              />
            </div>
            <div>
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                rows={6}
                data-testid="textarea-edit-content"
              />
            </div>
            <div>
              <Label htmlFor="edit-prayer-points">Prayer Points (one per line)</Label>
              <Textarea
                id="edit-prayer-points"
                value={editForm.prayerPoints}
                onChange={(e) => setEditForm({ ...editForm, prayerPoints: e.target.value })}
                rows={4}
                data-testid="textarea-edit-prayer-points"
              />
            </div>
            <div>
              <Label htmlFor="edit-declarations">Faith Declarations (one per line)</Label>
              <Textarea
                id="edit-declarations"
                value={editForm.faithDeclarations}
                onChange={(e) => setEditForm({ ...editForm, faithDeclarations: e.target.value })}
                rows={4}
                data-testid="textarea-edit-declarations"
              />
            </div>
            <div>
              <Label htmlFor="edit-christian-quotes">Christian Quotes (one per line)</Label>
              <Textarea
                id="edit-christian-quotes"
                value={editForm.christianQuotes}
                onChange={(e) => setEditForm({ ...editForm, christianQuotes: e.target.value })}
                rows={4}
                className="whitespace-pre-wrap"
                data-testid="textarea-edit-christian-quotes"
              />
            </div>
            <div>
              <Label htmlFor="edit-prophetic-declaration">Prophetic Declaration</Label>
              <Textarea
                id="edit-prophetic-declaration"
                value={editForm.propheticDeclaration}
                onChange={(e) => setEditForm({ ...editForm, propheticDeclaration: e.target.value })}
                rows={4}
                className="whitespace-pre-wrap"
                data-testid="textarea-edit-prophetic-declaration"
              />
            </div>
            <div>
              <Label htmlFor="edit-author">Author</Label>
              <Input
                id="edit-author"
                value={editForm.author}
                onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                data-testid="input-edit-author"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} data-testid="button-save-edit">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrayerInbox() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<PrayerRequest | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: requests = [], isLoading } = useQuery<PrayerRequest[]>({
    queryKey: ["/api/prayer-requests"],
  });

  const { data: threadMessages = [] } = useQuery<ThreadMessage[]>({
    queryKey: ["/api/prayer-requests", selectedRequest?.id, "thread"],
    enabled: !!selectedRequest,
  });

  const { data: attachments = [] } = useQuery<PrayerAttachment[]>({
    queryKey: ["/api/prayer-requests", selectedRequest?.id, "attachments"],
    enabled: !!selectedRequest,
  });

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const sendReplyMutation = useMutation({
    mutationFn: async ({ requestId, message }: { requestId: number; message: string }) => {
      const res = await apiRequest("POST", `/api/prayer-requests/${requestId}/thread`, {
        message,
        senderType: "admin",
      });
      return await res.json();
    },
    onSuccess: () => {
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-requests", selectedRequest?.id, "thread"] });
      toast({ title: "Reply sent successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send reply", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: string }) => {
      return apiRequest("PATCH", `/api/prayer-requests/${requestId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-requests"] });
      if (selectedRequest) {
        setSelectedRequest({ ...selectedRequest, status: updateStatusMutation.variables?.status || selectedRequest.status });
      }
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ requestId, category }: { requestId: number; category: string }) => {
      return apiRequest("PATCH", `/api/prayer-requests/${requestId}/category`, { category });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-requests"] });
      if (selectedRequest && updateCategoryMutation.variables) {
        setSelectedRequest({ ...selectedRequest, category: updateCategoryMutation.variables.category });
      }
    },
  });

  const filteredRequests = requests.filter((r) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      (r.message && r.message.toLowerCase().includes(query)) ||
      (r.fullName && r.fullName.toLowerCase().includes(query)) ||
      (r.subject && r.subject.toLowerCase().includes(query)) ||
      (r.email && r.email.toLowerCase().includes(query));
    
    if (!matchesSearch) return false;
    
    if (filter === "all") return true;
    if (filter === "unreplied") return r.status === "new";
    if (filter === "being_prayed") return r.status === "replied";
    if (filter === "answered") return r.status === "answered";
    if (filter === "urgent") return r.priority?.includes("urgent");
    if (filter === "counseling") return r.priority?.includes("counseling");
    if (filter === "anonymous") return r.isAnonymous;
    if (CATEGORY_LABELS[filter]) return r.category === filter;
    return true;
  });
  
  const [quickReplyKey, setQuickReplyKey] = useState(0);
  
  const handleQuickReply = (snippet: typeof QUICK_REPLY_SNIPPETS[0]) => {
    setReplyMessage(prev => {
      if (prev && prev.trim()) {
        return `${prev.trim()}\n\n${snippet.text}`;
      }
      return snippet.text;
    });
    setQuickReplyKey(k => k + 1);
  };

  const handleSendReply = () => {
    if (!selectedRequest || !replyMessage.trim()) return;
    sendReplyMutation.mutate({ requestId: selectedRequest.id, message: replyMessage });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-serif text-lg font-semibold text-foreground">Prayer Requests</h3>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44" data-testid="select-filter">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unreplied">Unreplied</SelectItem>
              <SelectItem value="being_prayed">Being Prayed For</SelectItem>
              <SelectItem value="answered">Answered</SelectItem>
              <SelectItem value="urgent">Urgent Only</SelectItem>
              <SelectItem value="counseling">Counseling Only</SelectItem>
              <SelectItem value="anonymous">Anonymous</SelectItem>
              <SelectItem value="healing">Category: Healing</SelectItem>
              <SelectItem value="marriage">Category: Marriage</SelectItem>
              <SelectItem value="finance">Category: Finance</SelectItem>
              <SelectItem value="deliverance">Category: Deliverance</SelectItem>
              <SelectItem value="guidance">Category: Guidance</SelectItem>
              <SelectItem value="family">Category: Family</SelectItem>
              <SelectItem value="salvation">Category: Salvation</SelectItem>
              <SelectItem value="other">Category: Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, subject, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No requests found.</p>
          ) : (
            filteredRequests.map((request) => (
              <div
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedRequest?.id === request.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
                data-testid={`request-item-${request.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {request.isAnonymous ? "Anonymous" : request.fullName || "Unknown"}
                    </span>
                    {request.priority?.includes("urgent") && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        URGENT
                      </Badge>
                    )}
                  </div>
                  <Badge className={`text-xs ${STATUS_LABELS[request.status || "new"]?.color}`}>
                    {STATUS_LABELS[request.status || "new"]?.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{request.message}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span>{PRIORITY_LABELS[request.priority || "prayer_normal"]}</span>
                  <span>|</span>
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORY_LABELS[request.category || "other"]}
                  </Badge>
                  <span>|</span>
                  <span>{request.createdAt ? format(new Date(request.createdAt), "MMM d, h:mm a") : "Unknown"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        {selectedRequest ? (
          <Card className="border-primary/10">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="font-serif text-xl text-foreground flex items-center gap-2">
                    {selectedRequest.isAnonymous ? (
                      <>
                        <User className="w-5 h-5" />
                        Anonymous
                      </>
                    ) : (
                      selectedRequest.fullName || "Unknown"
                    )}
                  </CardTitle>
                  {selectedRequest.email && (
                    <p className="text-sm text-muted-foreground">{selectedRequest.email}</p>
                  )}
                  {selectedRequest.smsEnabled && (
                    <Badge variant="outline" className="text-xs mt-1">
                      <Smartphone className="w-3 h-3 mr-1" />
                      SMS Enabled
                    </Badge>
                  )}
                </div>
                <Badge className={STATUS_LABELS[selectedRequest.status || "new"]?.color}>
                  {STATUS_LABELS[selectedRequest.status || "new"]?.label}
                </Badge>
              </div>
              {selectedRequest.subject && (
                <p className="text-sm text-foreground mt-2 font-medium">Subject: {selectedRequest.subject}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline">{PRIORITY_LABELS[selectedRequest.priority || "prayer_normal"]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {selectedRequest.createdAt ? format(new Date(selectedRequest.createdAt), "MMMM d, yyyy 'at' h:mm a") : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-sm text-muted-foreground">Category:</span>
                <Select
                  value={selectedRequest.category || "other"}
                  onValueChange={(value) => updateCategoryMutation.mutate({ requestId: selectedRequest.id, category: value })}
                >
                  <SelectTrigger className="w-36" data-testid="select-edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updateCategoryMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-foreground whitespace-pre-wrap">{selectedRequest.message}</p>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Attachments ({attachments.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.objectPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-muted/30 rounded-md text-sm hover:bg-muted/50 transition-colors"
                        data-testid={`attachment-${attachment.id}`}
                      >
                        {getFileIcon(attachment.contentType)}
                        <span className="truncate max-w-[150px]">{attachment.fileName}</span>
                        <Download className="w-3 h-3 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {threadMessages.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Conversation</h4>
                  {threadMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.senderType === "admin"
                          ? "bg-primary/10 ml-4"
                          : "bg-muted/30 mr-4"
                      }`}
                      data-testid={`admin-thread-message-${msg.id}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground">
                          {msg.senderType === "admin" ? "Admin" : "User"}
                        </span>
                        <div className="flex items-center gap-2">
                          {msg.senderType === "admin" && (
                            <span className={`text-xs flex items-center gap-1 ${msg.isRead ? "text-green-600" : "text-muted-foreground"}`} data-testid={`read-status-${msg.id}`}>
                              {msg.isRead ? (
                                <>
                                  <CheckCheck className="w-3 h-3" />
                                  Read{msg.readAt ? ` at ${format(new Date(msg.readAt), "MMM d, h:mm a")}` : ""}
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />
                                  Delivered
                                </>
                              )}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {msg.createdAt ? format(new Date(msg.createdAt), "MMM d, h:mm a") : ""}
                          </span>
                        </div>
                      </div>
                      <p className="text-foreground text-sm">{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Quick Replies:</span>
                  <Select 
                    key={quickReplyKey}
                    onValueChange={(value) => {
                      const snippet = QUICK_REPLY_SNIPPETS.find(s => s.label === value);
                      if (snippet) handleQuickReply(snippet);
                    }}
                  >
                    <SelectTrigger className="w-48" data-testid="select-quick-reply">
                      <SelectValue placeholder="Insert snippet..." />
                    </SelectTrigger>
                    <SelectContent>
                      {QUICK_REPLY_SNIPPETS.map((snippet) => (
                        <SelectItem key={snippet.label} value={snippet.label}>
                          {snippet.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Write your reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                  data-testid="textarea-reply"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    onClick={handleSendReply}
                    disabled={sendReplyMutation.isPending || !replyMessage.trim()}
                    data-testid="button-send-reply"
                  >
                    {sendReplyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send Reply
                  </Button>
                  {selectedRequest.status !== "replied" && selectedRequest.status !== "answered" && (
                    <Button
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ requestId: selectedRequest.id, status: "replied" })}
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-mark-replied"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Being Prayed For
                    </Button>
                  )}
                  {selectedRequest.status !== "answered" && (
                    <Button
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ requestId: selectedRequest.id, status: "answered" })}
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-mark-answered"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Answered
                    </Button>
                  )}
                  {selectedRequest.status !== "closed" ? (
                    <Button
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ requestId: selectedRequest.id, status: "closed" })}
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-close"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Close
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ requestId: selectedRequest.id, status: "new" })}
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-reopen"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
            <p>Select a request to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SundaySchoolAdmin() {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<SundaySchoolLesson | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formScriptureRefs, setFormScriptureRefs] = useState("");
  const [formScriptureText, setFormScriptureText] = useState("");
  const [formLessonContent, setFormLessonContent] = useState("");
  const [formQuestions, setFormQuestions] = useState("");
  const [formPrayerFocus, setFormPrayerFocus] = useState("");
  const [formAssignment, setFormAssignment] = useState("");

  const { data: lessons, isLoading } = useQuery<SundaySchoolLesson[]>({
    queryKey: ["/api/sunday-school"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/sunday-school", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sunday-school"] });
      toast({ title: "Lesson created successfully." });
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Failed to create lesson.", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/sunday-school/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sunday-school"] });
      toast({ title: "Lesson updated successfully." });
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Failed to update lesson.", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sunday-school/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sunday-school"] });
      toast({ title: "Lesson deleted." });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete lesson.", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingLesson(null);
    setFormErrors([]);
    setFormTitle("");
    setFormDate("");
    setFormScriptureRefs("");
    setFormScriptureText("");
    setFormLessonContent("");
    setFormQuestions("");
    setFormPrayerFocus("");
    setFormAssignment("");
  };

  const openEdit = (lesson: SundaySchoolLesson) => {
    setEditingLesson(lesson);
    setShowCreateForm(true);
    setFormTitle(lesson.title);
    setFormDate(lesson.date);
    setFormScriptureRefs(lesson.scriptureReferences);
    setFormScriptureText(lesson.scriptureText);
    setFormLessonContent(lesson.lessonContent);
    setFormQuestions(lesson.discussionQuestions.join("\n"));
    setFormPrayerFocus(lesson.prayerFocus);
    setFormAssignment(lesson.weeklyAssignment);
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    if (!formTitle.trim()) errors.push("Title is required");
    if (!formDate.trim()) errors.push("Sunday Date is required");
    if (!formScriptureRefs.trim()) errors.push("Scripture References is required");
    if (!formScriptureText.trim()) errors.push("Scripture Text (KJV) is required");
    if (!formLessonContent.trim()) errors.push("Lesson Content is required");
    const questionLines = formQuestions.split("\n").map((q) => q.trim()).filter(Boolean);
    if (questionLines.length < 3) errors.push("Discussion Questions requires at least 3 questions (one per line)");
    if (!formPrayerFocus.trim()) errors.push("Prayer Focus is required");
    if (!formAssignment.trim()) errors.push("Weekly Assignment is required");
    return errors;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const errors = validateForm();
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    const questions = formQuestions.split("\n").map((q) => q.trim()).filter(Boolean);
    const data = {
      title: formTitle,
      date: formDate,
      scriptureReferences: formScriptureRefs,
      scriptureText: formScriptureText,
      lessonContent: formLessonContent,
      discussionQuestions: questions,
      prayerFocus: formPrayerFocus,
      weeklyAssignment: formAssignment,
    };
    if (editingLesson) {
      updateMutation.mutate({ id: editingLesson.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {lessons ? `${lessons.length} lesson(s)` : "Loading..."}
        </p>
        <Button
          onClick={() => { resetForm(); setShowCreateForm(true); }}
          className="gap-2"
          data-testid="button-create-lesson"
        >
          <Plus className="w-4 h-4" />
          New Lesson
        </Button>
      </div>

      {showCreateForm && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {editingLesson ? "Edit Lesson" : "Create New Lesson"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 pb-[120px] md:pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Lesson title" data-testid="input-lesson-title" />
                </div>
                <div className="space-y-2">
                  <Label>Sunday Date</Label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} data-testid="input-lesson-date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Scripture References</Label>
                <Input value={formScriptureRefs} onChange={(e) => setFormScriptureRefs(e.target.value)} placeholder="e.g. Ephesians 2:8-9 (KJV)" data-testid="input-lesson-refs" />
              </div>
              <div className="space-y-2">
                <Label>Scripture Text (KJV)</Label>
                <Textarea value={formScriptureText} onChange={(e) => setFormScriptureText(e.target.value)} placeholder="Full KJV scripture text" rows={3} data-testid="input-lesson-scripture" />
              </div>
              <div className="space-y-2">
                <Label>Lesson Content</Label>
                <Textarea value={formLessonContent} onChange={(e) => setFormLessonContent(e.target.value)} placeholder="Full lesson content with outline points, teacher emphasis, and application" rows={10} data-testid="input-lesson-content" />
              </div>
              <div className="space-y-2">
                <Label>Discussion Questions (one per line)</Label>
                <Textarea value={formQuestions} onChange={(e) => setFormQuestions(e.target.value)} placeholder="Enter each question on a new line" rows={4} data-testid="input-lesson-questions" />
                <p className="text-xs text-muted-foreground">Enter at least 3 questions, each on a new line.</p>
              </div>
              <div className="space-y-2">
                <Label>Prayer Focus</Label>
                <Textarea value={formPrayerFocus} onChange={(e) => setFormPrayerFocus(e.target.value)} placeholder="Prayer focus text" rows={3} data-testid="input-lesson-prayer" />
              </div>
              <div className="space-y-2">
                <Label>Weekly Assignment</Label>
                <Textarea value={formAssignment} onChange={(e) => setFormAssignment(e.target.value)} placeholder="Weekly assignment text" rows={3} data-testid="input-lesson-assignment" />
              </div>
              {formErrors.length > 0 && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1" data-testid="form-errors">
                  {formErrors.map((err, i) => (
                    <p key={i} className="text-sm text-destructive">{err}</p>
                  ))}
                </div>
              )}
              <div className="flex gap-3 relative z-50" style={{ pointerEvents: "auto" }}>
                <Button type="submit" disabled={isPending} className="gap-2" data-testid="button-submit-lesson">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingLesson ? "Update Lesson" : "Create Lesson"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} data-testid="button-cancel-lesson">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {lessons && lessons.length > 0 && (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <Card key={lesson.id} data-testid={`card-admin-lesson-${lesson.id}`}>
              <CardContent className="flex items-center justify-between gap-4 py-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{lesson.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(lesson.date), "MMMM d, yyyy")} &middot; {lesson.scriptureReferences}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(lesson)} data-testid={`button-edit-lesson-${lesson.id}`}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteId(lesson.id)} data-testid={`button-delete-lesson-${lesson.id}`}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this lesson?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-lesson"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDevotionalForCopy(d: Devotional): string {
  const faithItems = d.faithDeclarations || [];
  const quoteItems = d.christianQuotes
    ? d.christianQuotes.split("\n").map(q => q.trim()).filter(Boolean)
    : [];
  const propheticItems = d.propheticDeclaration
    ? d.propheticDeclaration.split("\n").map(p => p.trim()).filter(Boolean)
    : [];

  const lines: string[] = [];
  lines.push(`*365 DAILY DEVOTIONAL*`);
  lines.push(``);
  lines.push(`*${d.title}*`);
  lines.push(`${format(parseISO(d.date), "MMMM d, yyyy")}`);
  lines.push(``);
  lines.push(`*Scripture:*`);
  lines.push(`"${d.scriptureText.replace(/\[\[RED\]\]/g, '').replace(/\[\[\/RED\]\]/g, '')}"`);
  lines.push(`-- ${d.scriptureReference}`);
  lines.push(``);
  lines.push(`*Devotional:*`);
  lines.push(d.content);
  lines.push(``);
  lines.push(`*Prayer Points:*`);
  d.prayerPoints.forEach(p => lines.push(`- ${p}`));

  if (faithItems.length > 0) {
    lines.push(``);
    lines.push(`*Faith Declaration:*`);
    faithItems.forEach(f => lines.push(`- ${f}`));
  }

  if (quoteItems.length > 0) {
    lines.push(``);
    lines.push(`*Christian Quotes:*`);
    quoteItems.forEach(q => lines.push(`- ${q}`));
  }

  if (propheticItems.length > 0) {
    lines.push(``);
    lines.push(`*Prophetic Declaration:*`);
    propheticItems.forEach(p => lines.push(`- ${p}`));
  }

  lines.push(``);
  lines.push(`Written by ${d.author || "Moses Afolabi"}`);
  lines.push(``);
  lines.push(`-- Shared from 365 Daily Devotional App`);

  return lines.join('\n');
}

interface ExtendedInboxThread extends InboxThread {
  lastMessage?: string;
  lastMessageDate?: string;
  lastMessageSender?: string;
}

const INBOX_CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Prayer", label: "Prayer" },
  { value: "Counseling", label: "Counseling" },
  { value: "Scripture Question", label: "Scripture Question" },
  { value: "Support", label: "Support" },
  { value: "General", label: "General" },
];

const INBOX_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
];

const INBOX_STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  replied: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

function MessagesInbox() {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const queryParams = new URLSearchParams();
  if (categoryFilter !== "all") queryParams.set("category", categoryFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  const queryString = queryParams.toString();

  const { data: threads = [], isLoading: threadsLoading } = useQuery<ExtendedInboxThread[]>({
    queryKey: ["/api/admin/inbox/threads", categoryFilter, statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/inbox/threads${queryString ? `?${queryString}` : ""}`);
      if (!res.ok) throw new Error("Failed to load threads");
      return res.json();
    },
  });

  const { data: threadDetail, isLoading: detailLoading } = useQuery<{ thread: ExtendedInboxThread; messages: InboxMessage[] }>({
    queryKey: ["/api/admin/inbox/threads", selectedThreadId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/inbox/threads/${selectedThreadId}`);
      if (!res.ok) throw new Error("Failed to load thread");
      return res.json();
    },
    enabled: !!selectedThreadId,
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ threadId, message }: { threadId: number; message: string }) => {
      const res = await apiRequest("POST", `/api/admin/inbox/threads/${threadId}/messages`, { message });
      return res.json();
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox/threads", selectedThreadId] });
      toast({ title: "Reply sent" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send reply", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ threadId, status }: { threadId: number; status: string }) => {
      return apiRequest("PATCH", `/api/admin/inbox/threads/${threadId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox/threads", selectedThreadId] });
      toast({ title: "Status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const handleSendReply = () => {
    if (!selectedThreadId || !replyText.trim()) return;
    sendReplyMutation.mutate({ threadId: selectedThreadId, message: replyText });
  };

  if (threadsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedThread = threadDetail?.thread;
  const messages = threadDetail?.messages || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-serif text-lg font-semibold text-foreground">Message Threads</h3>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44" data-testid="admin-inbox-select-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {INBOX_CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" data-testid="admin-inbox-select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {INBOX_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {threads.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No threads found.</p>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedThreadId === thread.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
                data-testid={`admin-inbox-thread-${thread.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {thread.hasUnreadAdmin && (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" data-testid={`admin-inbox-unread-${thread.id}`} />
                    )}
                    <span className="font-medium text-foreground">{thread.userName}</span>
                    <span className="text-xs text-muted-foreground">{thread.userEmail}</span>
                  </div>
                  <Badge className={`text-xs ${INBOX_STATUS_COLORS[thread.status] || ""}`}>
                    {thread.status.charAt(0).toUpperCase() + thread.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">{thread.subject}</p>
                {thread.lastMessage && (
                  <p className="text-sm text-muted-foreground line-clamp-1">{thread.lastMessage}</p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                  <Badge variant="secondary" className="text-xs">{thread.category}</Badge>
                  <span>|</span>
                  <span>{thread.updatedAt ? format(new Date(thread.updatedAt), "MMM d, h:mm a") : ""}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        {selectedThreadId && selectedThread ? (
          <Card className="border-primary/10">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="font-serif text-xl text-foreground">{selectedThread.subject}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedThread.userName} &lt;{selectedThread.userEmail}&gt;</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{selectedThread.category}</Badge>
                  <Select
                    value={selectedThread.status}
                    onValueChange={(value) => updateStatusMutation.mutate({ threadId: selectedThread.id, status: value })}
                  >
                    <SelectTrigger className="w-28" data-testid="admin-inbox-select-thread-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="replied">Replied</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {messages.map((msg) => {
                    const isUser = msg.senderType === "user";
                    const isAi = msg.senderType === "ai";
                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg max-w-[85%] ${
                          isUser
                            ? "bg-muted/30 ml-auto"
                            : isAi
                              ? "bg-violet-50 dark:bg-violet-950/20 mr-auto"
                              : "bg-primary/10 mr-auto"
                        }`}
                        data-testid={`admin-inbox-message-${msg.id}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            {isUser ? "User" : isAi ? (
                              <>
                                <Sparkles className="w-3 h-3" />
                                AI Assistant
                              </>
                            ) : "Admin"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {msg.createdAt ? format(new Date(msg.createdAt), "MMM d, h:mm a") : ""}
                          </span>
                        </div>
                        <p className="text-foreground text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-border">
                <Textarea
                  placeholder="Write your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  className="resize-none"
                  data-testid="admin-inbox-textarea-reply"
                />
                <Button
                  type="button"
                  onClick={handleSendReply}
                  disabled={sendReplyMutation.isPending || !replyText.trim()}
                  data-testid="admin-inbox-button-send-reply"
                >
                  {sendReplyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Reply
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
            <p>Select a thread to view conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DevotionalPreviewTools() {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [previewDate, setPreviewDate] = useState(today);

  const { data: previewDevotional, isLoading, error } = useQuery<Devotional | null>({
    queryKey: ["/api/devotionals/date", previewDate],
    queryFn: async () => {
      const res = await fetch(`/api/devotionals/date/${previewDate}?clientDate=${today}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch devotional");
      return res.json();
    },
    enabled: !!previewDate,
  });

  const handleCopy = async () => {
    if (!previewDevotional) return;
    const text = formatDevotionalForCopy(previewDevotional);
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Devotional copied successfully." });
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast({ title: "Devotional copied successfully." });
    }
  };

  const faithItems = previewDevotional?.faithDeclarations || [];
  const quoteItems = previewDevotional?.christianQuotes
    ? previewDevotional.christianQuotes.split("\n").map(q => q.trim()).filter(Boolean)
    : [];
  const propheticItems = previewDevotional?.propheticDeclaration
    ? previewDevotional.propheticDeclaration.split("\n").map(p => p.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="preview-date">Preview Date</Label>
          <Input
            id="preview-date"
            type="date"
            value={previewDate}
            onChange={(e) => setPreviewDate(e.target.value)}
            className="w-full sm:w-56"
            data-testid="input-preview-date"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreviewDate(today)}
          data-testid="button-preview-today"
        >
          <Calendar className="w-4 h-4 mr-1" />
          Today
        </Button>
        {previewDevotional && (
          <Button
            onClick={handleCopy}
            className="gap-2"
            data-testid="button-copy-devotional"
          >
            <Copy className="w-4 h-4" />
            Copy This Devotional
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-destructive">
          Failed to load devotional for this date.
        </div>
      )}

      {!isLoading && !error && !previewDevotional && (
        <div className="text-center py-8 text-muted-foreground">
          No devotional found for {format(parseISO(previewDate), "MMMM d, yyyy")}.
        </div>
      )}

      {previewDevotional && (
        <div className="border rounded-lg overflow-hidden" data-testid="preview-devotional-content">
          <div className="bg-primary/5 p-6 border-b">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-2" data-testid="text-preview-title">
              {previewDevotional.title}
            </h2>
            <p className="text-sm text-muted-foreground" data-testid="text-preview-date">
              {format(parseISO(previewDevotional.date), "MMMM d, yyyy")}
            </p>
            {previewDevotional.seasonalOverride && (
              <Badge className="mt-2 text-xs">Seasonal Override</Badge>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Scripture</Label>
              <p className="font-medium mt-1">{previewDevotional.scriptureReference}</p>
              <p className="italic text-muted-foreground mt-1">
                <RedLetterScripture
                  text={previewDevotional.scriptureText}
                  enabled={previewDevotional.redLetterEnabled !== false}
                />
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Devotional</Label>
              <div className="mt-1 whitespace-pre-wrap text-foreground/90 leading-relaxed">
                {previewDevotional.content}
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Prayer Points</Label>
              <ul className="mt-1 space-y-2">
                {previewDevotional.prayerPoints.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-primary font-bold mt-0.5">{'\u2022'}</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {faithItems.length > 0 && (
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Faith Declaration</Label>
                <ul className="mt-1 space-y-2">
                  {faithItems.map((d, i) => (
                    <li key={i} className="flex gap-2 text-sm italic">
                      <span className="text-sky-600 font-bold mt-0.5">{'\u2022'}</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {quoteItems.length > 0 && (
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Christian Quotes</Label>
                <ul className="mt-1 space-y-2">
                  {quoteItems.map((q, i) => (
                    <li key={i} className="flex gap-2 text-sm italic">
                      <span className="text-green-600 font-bold mt-0.5">{'\u2022'}</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {propheticItems.length > 0 && (
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Prophetic Declaration</Label>
                <ul className="mt-1 space-y-2">
                  {propheticItems.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm italic">
                      <span className="text-amber-600 font-bold mt-0.5">{'\u2022'}</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {previewDevotional.author && (
              <div className="pt-4 text-sm text-muted-foreground text-center">
                Written by {previewDevotional.author}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DonationConfirmationsAdmin() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "once" | "monthly" | "pending">("all");
  const [selected, setSelected] = useState<DonationConfirmation | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [thankYouMsg, setThankYouMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [copyCheck, setCopyCheck] = useState(false);

  const { data: confirmations = [], isLoading, refetch } = useQuery<DonationConfirmation[]>({
    queryKey: ["/api/admin/donation-confirmations"],
  });

  const markSentMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/admin/donation-confirmations/${id}/thank-you-status`, { status: "sent" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/donation-confirmations"] });
      toast({ title: "Marked as thank-you sent." });
      setComposerOpen(false);
    },
    onError: () => toast({ title: "Failed to update status.", variant: "destructive" }),
  });

  const openComposer = (c: DonationConfirmation) => {
    setSelected(c);
    const msg = `Dear ${c.fullName},\n\nThank you so much for your generous ${c.givingType === "Monthly Support" ? "monthly support" : "gift"} of ${c.amount} ${c.currency} to 365 Daily Devotional. Your support means everything to us and helps us continue sharing God's Word with people around the world.\n\nGod bless you richly for your faithfulness. "God loves a cheerful giver" (2 Corinthians 9:7), and your sacrifice will not go unnoticed by the Lord.\n\nWith gratitude,\nMoses Afolabi\n365 Daily Devotional Ministry`;
    setThankYouMsg(msg);
    setComposerOpen(true);
  };

  const handleSendEmail = async () => {
    if (!selected) return;
    setSending(true);
    try {
      await apiRequest("POST", `/api/admin/donation-confirmations/${selected.id}/send-thank-you`, { message: thankYouMsg });
      toast({ title: "Thank-you email sent!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/donation-confirmations"] });
      setComposerOpen(false);
    } catch {
      toast({ title: "Failed to send email.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleCopyMsg = async () => {
    await navigator.clipboard.writeText(thankYouMsg);
    setCopyCheck(true);
    setTimeout(() => setCopyCheck(false), 2000);
    toast({ title: "Message copied." });
  };

  const filtered = confirmations.filter(c => {
    if (filter === "once") return c.givingType === "One-Time Donation";
    if (filter === "monthly") return c.givingType === "Monthly Support";
    if (filter === "pending") return c.thankYouStatus !== "sent";
    return true;
  });

  const filterButtons: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "once", label: "One-Time" },
    { key: "monthly", label: "Monthly" },
    { key: "pending", label: "Thank-You Pending" },
  ];

  return (
    <div className="space-y-6">
      {/* Filters + Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filterButtons.map(f => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              onClick={() => setFilter(f.key)}
              data-testid={`filter-donations-${f.key}`}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()} data-testid="button-refresh-donations">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          Loading donation confirmations…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No donation confirmations yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <Card key={c.id} className="border-primary/10">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{c.fullName}</p>
                      <Badge variant={c.givingType === "Monthly Support" ? "default" : "secondary"} className="text-xs">
                        {c.givingType}
                      </Badge>
                      <Badge variant={c.thankYouStatus === "sent" ? "outline" : "destructive"} className="text-xs">
                        {c.thankYouStatus === "sent" ? "Thank-You Sent" : "Pending Thank-You"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{c.amount} {c.currency}</span>
                      {" · "}{c.paymentMethod}
                      {c.country ? ` · ${c.country}` : ""}
                    </p>
                    {(c.email || c.phoneWhatsapp) && (
                      <p className="text-xs text-muted-foreground">
                        {c.email}{c.email && c.phoneWhatsapp ? " · " : ""}{c.phoneWhatsapp}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {c.createdAt ? format(new Date(c.createdAt), "MMM d, yyyy 'at' h:mm a") : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline"
                      onClick={() => { setSelected(c); setViewOpen(true); }}
                      data-testid={`button-view-donation-${c.id}`}>
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                    <Button size="sm"
                      onClick={() => openComposer(c)}
                      data-testid={`button-thank-you-${c.id}`}>
                      <Send className="w-3.5 h-3.5 mr-1" /> Thank-You
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={viewOpen} onOpenChange={v => !v && setViewOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-primary">Donation Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {([
                ["Full Name", selected.fullName],
                ["Email", selected.email || "—"],
                ["WhatsApp / Phone", selected.phoneWhatsapp || "—"],
                ["Country", selected.country || "—"],
                ["Amount", `${selected.amount} ${selected.currency}`],
                ["Payment Method", selected.paymentMethod],
                ["Giving Type", selected.givingType],
                ["Reference", selected.paymentReference || "—"],
                ["Wants Thank-You", selected.wantsThankYou ? "Yes" : "No"],
                ["Status", selected.thankYouStatus === "sent" ? "Thank-You Sent" : "Pending"],
                ["Submitted", selected.createdAt ? format(new Date(selected.createdAt), "PPP p") : "—"],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground font-medium">{label}</span>
                  <span className="text-foreground text-right">{val}</span>
                </div>
              ))}
              {selected.message && (
                <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Message / Prayer Request</p>
                  <p className="text-sm text-foreground leading-relaxed">{selected.message}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 mt-2">
            {selected && selected.thankYouStatus !== "sent" && (
              <Button size="sm" onClick={() => { setViewOpen(false); openComposer(selected); }}>
                <Send className="w-3.5 h-3.5 mr-1" /> Send Thank-You
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thank-You Composer Dialog */}
      <Dialog open={composerOpen} onOpenChange={v => !v && setComposerOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-primary">
              Send Thank-You — {selected?.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Edit your message below before sending</Label>
              <Textarea
                value={thankYouMsg}
                onChange={e => setThankYouMsg(e.target.value)}
                rows={10}
                className="resize-none text-sm leading-relaxed"
                data-testid="textarea-thank-you-message"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {selected?.email && (
                <Button className="gap-1.5" onClick={handleSendEmail} disabled={sending}
                  data-testid="button-send-thank-you-email">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Email
                </Button>
              )}
              {selected?.phoneWhatsapp && (
                <a
                  href={`https://wa.me/${selected.phoneWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(thankYouMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-open-whatsapp"
                >
                  <Button variant="outline" className="gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    Open in WhatsApp
                  </Button>
                </a>
              )}
              <Button variant="outline" className="gap-1.5" onClick={handleCopyMsg}
                data-testid="button-copy-thank-you">
                {copyCheck ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                Copy Message
              </Button>
              {selected && selected.thankYouStatus !== "sent" && (
                <Button variant="ghost" className="gap-1.5 text-muted-foreground"
                  onClick={() => selected && markSentMutation.mutate(selected.id)}
                  disabled={markSentMutation.isPending}
                  data-testid="button-mark-as-sent">
                  <CheckCheck className="w-4 h-4" />
                  Mark as Sent
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Admin() {
  const { isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("inbox");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: prayerRequests = [] } = useQuery<PrayerRequest[]>({
    queryKey: ["/api/prayer-requests"],
    enabled: isAdmin,
  });
  const { data: inboxThreads = [] } = useQuery<InboxThread[]>({
    queryKey: ["/api/inbox/threads"],
    enabled: isAdmin,
  });
  const { data: allTestimonies = [] } = useQuery<any[]>({
    queryKey: ["/api/testimonies/all"],
    enabled: isAdmin,
  });

  const prayerNewCount = prayerRequests.filter(r => r.status === "new").length;
  const inboxUnreadCount = inboxThreads.filter((t: any) => t.hasUnreadAdmin).length;
  const testimoniesPendingCount = allTestimonies.filter(t => t.status === "pending").length;

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      setLocation("/admin-login");
    }
  }, [isAdmin, isLoading, setLocation]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const ADMIN_TABS = [
    { value: "inbox",                  label: "Prayer Inbox",       icon: Inbox,         count: prayerNewCount },
    { value: "messages",               label: "Messages",           icon: MessageSquare, count: inboxUnreadCount },
    { value: "testimonies",            label: "Testimonies",        icon: Star,          count: testimoniesPendingCount },
    { value: "archive",                label: "Archive",            icon: Archive,       count: 0 },
    { value: "preview",                label: "Preview",            icon: Telescope,     count: 0 },
    { value: "sunday-school",          label: "Sunday School",      icon: GraduationCap, count: 0 },
    { value: "devotionals",            label: "Create New",         icon: ShieldCheck,   count: 0 },
    { value: "promises",               label: "Promises",           icon: Sparkles,      count: 0 },
    { value: "songs",                  label: "Songs",              icon: Music,         count: 0 },
    { value: "donations",              label: "Donations",          icon: Gift,          count: 0 },
    { value: "churches",               label: "Churches",           icon: Building2,     count: 0 },
    { value: "church-oversight",       label: "Oversight",          icon: TrendingUp,    count: 0 },
    { value: "church-deletions",       label: "Deletion Requests",  icon: Trash2,        count: 0 },
    { value: "analytics",              label: "Analytics",          icon: BarChart3,     count: 0 },
    { value: "org-applications",       label: "Applications",       icon: ShieldCheck,   count: 0 },
    { value: "compliance",             label: "Compliance",         icon: Flag,          count: 0 },
    { value: "appeals",                label: "Appeals",            icon: ThumbsUp,      count: 0 },
    { value: "platform-threads",       label: "Org Messages",       icon: MessageSquare, count: 0 },
    { value: "platform-announcements", label: "Announcements",      icon: Send,          count: 0 },
  ] as const;

  const activeTabInfo = ADMIN_TABS.find(t => t.value === activeTab);
  const ActiveIcon = activeTabInfo?.icon;

  if (isLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage devotionals and prayer requests.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); setMenuOpen(false); }} className="space-y-6">
        {/* Hamburger navigation bar */}
        <div className="relative" ref={menuRef}>
          <div className="flex items-center justify-between bg-card border border-border/40 rounded-xl px-4 py-2.5 shadow-sm gap-3" data-testid="admin-nav-bar">
            <div className="flex items-center gap-2 min-w-0">
              {ActiveIcon && <ActiveIcon className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />}
              <span className="font-semibold text-foreground text-sm truncate" data-testid="admin-nav-active-label">
                {activeTabInfo?.label ?? "Dashboard"}
              </span>
              {activeTabInfo && activeTabInfo.count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold px-1.5 flex-shrink-0" aria-label={`${activeTabInfo.count} items`}>
                  {activeTabInfo.count > 99 ? "99+" : activeTabInfo.count}
                </span>
              )}
            </div>
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-controls="admin-nav-menu"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted/70 transition-colors text-foreground min-h-[44px] flex-shrink-0"
              data-testid="button-admin-hamburger"
            >
              {menuOpen
                ? <X className="w-5 h-5" aria-hidden="true" />
                : <Menu className="w-5 h-5" aria-hidden="true" />}
              <span className="text-sm font-medium hidden sm:inline select-none">
                {menuOpen ? "Close" : "Sections"}
              </span>
            </button>
          </div>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20"
                aria-hidden="true"
                onClick={() => setMenuOpen(false)}
              />
              <nav
                id="admin-nav-menu"
                className="absolute left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                aria-label="Admin Dashboard sections"
                data-testid="admin-nav-menu"
              >
                <div className="max-h-[70vh] overflow-y-auto divide-y divide-border/20">
                  {ADMIN_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tab.value === activeTab;
                    return (
                      <button
                        key={tab.value}
                        onClick={() => { setActiveTab(tab.value); setMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 min-h-[48px] text-left transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted/60"
                        }`}
                        data-testid={`admin-menu-item-${tab.value}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                        <span className="flex-1 text-sm">{tab.label}</span>
                        {tab.count > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold px-1.5" aria-label={`${tab.count} pending`}>
                            {tab.count > 99 ? "99+" : tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </nav>
            </>
          )}
        </div>

        {/* Hidden TabsList — required by Radix Tabs for keyboard association */}
        <TabsList className="sr-only" aria-hidden="true">
          {ADMIN_TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} data-testid={`tab-${tab.value}`}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="inbox">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <Inbox className="w-6 h-6" />
                Prayer & Counseling Inbox
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <PrayerInbox />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                Messages Inbox
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage user message threads and conversations.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <MessagesInbox />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testimonies">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <Star className="w-6 h-6" />
                Testimony Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review and approve testimonies submitted by users.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <TestimonyManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archive">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                  <Archive className="w-6 h-6" />
                  Devotional Archive
                </CardTitle>
                <SeedDevotionalsButton />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                View all devotionals. Edit present and future entries only.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <AdminArchive />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <Telescope className="w-6 h-6" />
                Devotional Preview Tools
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Preview any date's devotional and copy for sharing.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <DevotionalPreviewTools />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sunday-school">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <GraduationCap className="w-6 h-6" />
                Sunday School Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create, edit, and delete Sunday School lessons.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <SundaySchoolAdmin />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devotionals">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary">Create New Devotional</CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <CreateDevotionalForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promises">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                Daily Promises of God
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <PromiseAdmin />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="songs">
          <SongsAdmin />
        </TabsContent>

        <TabsContent value="donations">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <Gift className="w-6 h-6" />
                Donation Confirmations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <DonationConfirmationsAdmin />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="churches">
          <div className="space-y-6">
            <ChurchModerationAdmin />
            <ChurchFinanceAdmin />
          </div>
        </TabsContent>

        <TabsContent value="church-oversight">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Church Oversight
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Operational statistics for all registered churches. Private messages and counseling content are not shown here.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <ChurchOversightAdmin />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="church-deletions">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <Trash2 className="w-6 h-6" />
                Church Deletion Requests
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review and action deletion requests submitted by church owners.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <ChurchDeletionRequestsAdmin />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                App Analytics
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Database-backed user activity. Counts distinct signed-in users per day, week, and month.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <AppAnalyticsAdmin />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="org-applications">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <ShieldCheck className="w-6 h-6" />
                Organization Applications
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review organizations pending platform approval. New churches start in <strong>pending_review</strong> state.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <GovernanceApplicationsAdmin />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <Flag className="w-6 h-6" />
                Compliance Cases
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Open and manage compliance investigations for church organizations.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <ComplianceCasesAdmin />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appeals">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <ThumbsUp className="w-6 h-6" />
                Appeals
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review and action appeals submitted by organization owners against enforcement decisions.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <ComplianceAppealsAdmin />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform-threads">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                Organization Messages
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Private messages between platform administrators and organization owners.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <PlatformThreadsAdmin />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform-announcements">
          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <Send className="w-6 h-6" />
                Platform Announcements
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Broadcast announcements to church organizations and their members.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <PlatformAnnouncementsAdmin />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Songs Admin ───────────────────────────────────────────────────────────────

interface BatchSong {
  id: string;
  file: File;
  title: string;
  slug: string;
  artist: string;
  featuredArtist: string;
  labelName: string;
  producer: string;
  composer: string;
  lyricist: string;
  language: string;
  scriptureReference: string;
  scriptureText: string;
  lyrics: string;
  shortDescription: string;
  coverFile: File | null;
  coverPreview: string | null;
  videoFile: File | null;
  videoUploadStatus: "none" | "uploading" | "completed" | "failed";
  videoDownloadEnabled: boolean;
  videoError: string | null;
  downloadEnabled: boolean;
  isActive: boolean;
  releaseYear: number;
  status: "waiting" | "uploading" | "completed" | "failed";
  error: string | null;
  expanded: boolean;
}

async function doFileUpload(file: File): Promise<string> {
  const r = await fetch("/api/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }),
  });
  if (!r.ok) throw new Error("Could not get upload URL");
  const { uploadURL, objectPath } = await r.json();
  const up = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
  if (!up.ok) throw new Error("File upload to storage failed");
  return objectPath;
}

function SongsAdmin() {
  const { toast } = useToast();
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewTestimonyFor, setViewTestimonyFor] = useState<number | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchSongs, setBatchSongs] = useState<BatchSong[]>([]);
  const [batchUploading, setBatchUploading] = useState(false);

  const { data: songs = [], isLoading, refetch } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const { data: testimonies = [] } = useQuery<SongTestimony[]>({
    queryKey: ["/api/song-testimonies"],
  });

  const updateSongMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Song> }) =>
      apiRequest("PATCH", `/api/songs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({ title: "Song updated" });
      setEditingSong(null);
      setShowForm(false);
    },
    onError: () => toast({ title: "Error", description: "Could not update song.", variant: "destructive" }),
  });

  const createSongMutation = useMutation({
    mutationFn: (data: Partial<Song>) => apiRequest("POST", "/api/songs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({ title: "Song created" });
      setShowForm(false);
      setEditingSong(null);
    },
    onError: () => toast({ title: "Error", description: "Could not create song.", variant: "destructive" }),
  });

  const updateTestimonyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SongTestimony> }) =>
      apiRequest("PATCH", `/api/song-testimonies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/song-testimonies"] });
      toast({ title: "Testimony updated" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const deleteTestimonyMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/song-testimonies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/song-testimonies"] });
      toast({ title: "Testimony deleted" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const [showMethodForm, setShowMethodForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<Partial<GivingMethod> | null>(null);

  const { data: givingMethodsList = [] } = useQuery<GivingMethod[]>({
    queryKey: ["/api/giving-methods/all"],
  });

  const deleteSongMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/songs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs/library"] });
      toast({ title: "Song deleted" });
    },
    onError: () => toast({ title: "Error", description: "Could not delete song.", variant: "destructive" }),
  });

  const audioUpload = useUpload();
  const videoUpload = useUpload();
  const coverUpload = useUpload();
  const logoUpload = useUpload();

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 80 * 1024 * 1024) {
      toast({ title: "File too large", description: "Audio must be under 80MB.", variant: "destructive" });
      return;
    }
    const result = await audioUpload.uploadFile(file);
    if (result) {
      setEditingSong((prev) => (prev ? { ...prev, audioUrl: result.objectPath } : null));
      toast({ title: "✓ Audio uploaded", description: file.name });
    } else {
      toast({ title: "Upload failed", description: "Could not upload audio.", variant: "destructive" });
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.name.toLowerCase().endsWith(".mp4") && file.type !== "video/mp4") {
      toast({ title: "Invalid file", description: "Please upload an MP4 video file.", variant: "destructive" });
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast({ title: "File too large", description: "Video must be under 500MB.", variant: "destructive" });
      return;
    }
    const result = await videoUpload.uploadFile(file);
    if (result) {
      setEditingSong((prev) => (prev ? { ...prev, videoUrl: result.objectPath, videoDownloadStatus: "free" } as any : null));
      toast({ title: "✓ Video uploaded", description: file.name });
    } else {
      toast({ title: "Upload failed", description: "Could not upload video.", variant: "destructive" });
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Images must be under 10MB.", variant: "destructive" });
      return;
    }
    const result = await coverUpload.uploadFile(file);
    if (result) {
      setEditingSong((prev) => (prev ? { ...prev, coverImageUrl: result.objectPath } : null));
      toast({ title: "✓ Cover uploaded" });
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logos must be under 5MB.", variant: "destructive" });
      return;
    }
    const result = await logoUpload.uploadFile(file);
    if (result) {
      setEditingSong((prev) => (prev ? { ...prev, labelLogoUrl: result.objectPath } : null));
      toast({ title: "✓ Logo uploaded" });
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const createMethodMutation = useMutation({
    mutationFn: (data: Partial<GivingMethod>) => apiRequest("POST", "/api/giving-methods", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/giving-methods/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/giving-methods"] });
      setShowMethodForm(false);
      setEditingMethod(null);
      toast({ title: "Giving method saved" });
    },
    onError: () => toast({ title: "Error saving method", variant: "destructive" }),
  });

  const updateMethodMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GivingMethod> }) =>
      apiRequest("PATCH", `/api/giving-methods/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/giving-methods/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/giving-methods"] });
      toast({ title: "Giving method updated" });
    },
    onError: () => toast({ title: "Error updating method", variant: "destructive" }),
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/giving-methods/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/giving-methods/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/giving-methods"] });
      toast({ title: "Giving method deleted" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const handleSaveMethod = () => {
    if (!editingMethod) return;
    const payload = {
      name: editingMethod.name || "",
      type: editingMethod.type || "other",
      url: editingMethod.url || null,
      handle: editingMethod.handle || null,
      instructions: editingMethod.instructions || null,
      isActive: !!editingMethod.isActive,
      displayOrder: Number(editingMethod.displayOrder) || 0,
    };
    if (editingMethod.id) {
      updateMethodMutation.mutate({ id: editingMethod.id, data: payload });
    } else {
      createMethodMutation.mutate(payload);
    }
  };

  const openEdit = (song: Song) => {
    setEditingSong({ ...song });
    setShowForm(true);
  };

  const openNew = () => {
    setEditingSong({
      id: 0,
      title: "",
      slug: "",
      artist: null,
      featuredArtist: null,
      labelName: "SpiritTone Records",
      labelLogoUrl: null,
      producer: "Moses Afolabi",
      composer: null,
      lyricist: null,
      choir: null,
      instrumentalist: null,
      genre: null,
      language: "English",
      scriptureReference: "",
      scriptureText: null,
      lyrics: null,
      audioUrl: null,
      coverImageUrl: null,
      shortDescription: null,
      description: null,
      isActive: true,
      featuredWeekStart: null,
      featuredWeekEnd: null,
      releaseYear: new Date().getFullYear(),
      copyrightNotice: `© ${new Date().getFullYear()} SpiritTone Records. All rights reserved.`,
      downloadStatus: "free",
      videoUrl: null,
      videoDownloadStatus: "disabled",
      createdAt: null,
      updatedAt: null,
    } as unknown as Song);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!editingSong) return;
    if (!editingSong.title || !editingSong.slug || !editingSong.scriptureReference) {
      toast({ title: "Required fields missing", description: "Title, slug, and scripture reference are required.", variant: "destructive" });
      return;
    }
    const { id, createdAt, updatedAt, ...rest } = editingSong as any;
    if (id && id > 0) {
      updateSongMutation.mutate({ id, data: rest });
    } else {
      createSongMutation.mutate(rest);
    }
  };

  const filteredTestimonies = viewTestimonyFor
    ? testimonies.filter((t) => t.songId === viewTestimonyFor)
    : testimonies;

  const updateBatchSong = (id: string, updates: Partial<BatchSong>) => {
    setBatchSongs(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleBatchFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const oversized = files.filter(f => f.size > 80 * 1024 * 1024);
    if (oversized.length > 0) {
      toast({ title: "File too large", description: `${oversized.map(f => f.name).join(", ")} exceed 80 MB.`, variant: "destructive" });
    }
    const validFiles = files.filter(f => f.size <= 80 * 1024 * 1024);
    const newSongs: BatchSong[] = validFiles.map((file) => {
      const rawTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
      const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return {
        id: `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file, title, slug,
        artist: "", featuredArtist: "",
        labelName: "SpiritTone Records",
        producer: "Moses Afolabi",
        composer: "", lyricist: "",
        language: "English",
        scriptureReference: "", scriptureText: "",
        lyrics: "", shortDescription: "",
        coverFile: null, coverPreview: null,
        videoFile: null, videoUploadStatus: "none" as const, videoDownloadEnabled: false, videoError: null,
        downloadEnabled: true, isActive: true,
        releaseYear: new Date().getFullYear(),
        status: "waiting", error: null, expanded: true,
      };
    });
    setBatchSongs(prev => [...prev, ...newSongs]);
  };

  const handleUploadAll = async (asDraft = false) => {
    const queue = batchSongs.filter(s => s.status === "waiting" || s.status === "failed");
    if (queue.length === 0) return;
    setBatchUploading(true);

    const processOne = async (bsong: BatchSong) => {
      if (!bsong.title || !bsong.scriptureReference) {
        setBatchSongs(prev => prev.map(s => s.id === bsong.id ? { ...s, status: "failed", error: "Title and scripture reference are required." } : s));
        return;
      }
      setBatchSongs(prev => prev.map(s => s.id === bsong.id ? { ...s, status: "uploading" } : s));
      try {
        const audioPath = await doFileUpload(bsong.file);
        let coverPath: string | null = null;
        if (bsong.coverFile) coverPath = await doFileUpload(bsong.coverFile);

        let videoPath: string | null = null;
        if (bsong.videoFile) {
          setBatchSongs(prev => prev.map(s => s.id === bsong.id ? { ...s, videoUploadStatus: "uploading" } : s));
          try {
            videoPath = await doFileUpload(bsong.videoFile);
            setBatchSongs(prev => prev.map(s => s.id === bsong.id ? { ...s, videoUploadStatus: "completed" } : s));
          } catch (videoErr) {
            const vmsg = videoErr instanceof Error ? videoErr.message : "Video upload failed";
            setBatchSongs(prev => prev.map(s => s.id === bsong.id ? { ...s, videoUploadStatus: "failed", videoError: vmsg } : s));
          }
        }

        const songSlug = bsong.slug || bsong.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        await apiRequest("POST", "/api/songs", {
          title: bsong.title, slug: songSlug,
          artist: bsong.artist || null,
          featuredArtist: bsong.featuredArtist || null,
          labelName: bsong.labelName || "SpiritTone Records",
          producer: bsong.producer || "Moses Afolabi",
          composer: bsong.composer || null,
          lyricist: bsong.lyricist || null,
          language: bsong.language || "English",
          scriptureReference: bsong.scriptureReference,
          scriptureText: bsong.scriptureText || null,
          lyrics: bsong.lyrics || null,
          shortDescription: bsong.shortDescription || null,
          audioUrl: audioPath,
          coverImageUrl: coverPath,
          downloadStatus: bsong.downloadEnabled ? "free" : "disabled",
          videoUrl: videoPath,
          videoDownloadStatus: bsong.videoDownloadEnabled && videoPath ? "free" : "disabled",
          isActive: asDraft ? false : bsong.isActive,
          releaseYear: bsong.releaseYear || null,
        });
        setBatchSongs(prev => prev.map(s => s.id === bsong.id ? { ...s, status: "completed", expanded: false } : s));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setBatchSongs(prev => prev.map(s => s.id === bsong.id ? { ...s, status: "failed", error: msg } : s));
      }
    };

    for (let i = 0; i < queue.length; i += 2) {
      const chunk = queue.slice(i, i + 2);
      await Promise.all(chunk.map(processOne));
    }

    setBatchUploading(false);
    queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/songs/featured"] });
    queryClient.invalidateQueries({ queryKey: ["/api/songs/library"] });
  };

  return (
    <div className="space-y-6">
      {/* Batch Upload Panel */}
      {batchMode && (
        <Card className="border-primary/10 shadow-lg shadow-primary/5">
          <CardHeader className="bg-muted/30 border-b border-border">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <CardTitle className="font-serif text-xl text-primary flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Batch Upload Songs
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <label className={`inline-flex items-center gap-1.5 text-xs border border-primary/30 rounded-md px-3 py-2 cursor-pointer hover:bg-muted transition-colors ${batchUploading ? "opacity-60 pointer-events-none" : ""}`} data-testid="label-add-batch-files">
                  <Plus className="w-3.5 h-3.5" />
                  Add Audio Files
                  <input type="file" multiple className="hidden" accept=".mp3,.m4a,.wav,.aac,.ogg" disabled={batchUploading} onChange={handleBatchFilesSelected} data-testid="input-batch-audio-files" />
                </label>
                <Button size="sm" variant="outline" disabled={batchUploading || batchSongs.filter(s => s.status === "waiting" || s.status === "failed").length === 0} onClick={() => handleUploadAll(true)} data-testid="button-save-all-drafts">
                  Save All as Drafts
                </Button>
                <Button size="sm" disabled={batchUploading || batchSongs.filter(s => s.status === "waiting" || s.status === "failed").length === 0} onClick={() => handleUploadAll(false)} data-testid="button-upload-all-songs">
                  {batchUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Upload className="w-4 h-4 mr-1.5" />}
                  Upload All Songs
                </Button>
                <Button size="sm" variant="ghost" disabled={batchUploading} onClick={() => { setBatchMode(false); setBatchSongs([]); setBatchUploading(false); }} data-testid="button-cancel-batch">
                  <X className="w-4 h-4 mr-1" />
                  Cancel Batch
                </Button>
              </div>
            </div>
            {batchSongs.length > 0 && (
              <div className="flex gap-3 mt-2 text-xs flex-wrap pt-1">
                <span className="text-muted-foreground">{batchSongs.filter(s => s.status === "waiting").length} Waiting</span>
                <span className="text-blue-600 dark:text-blue-400">{batchSongs.filter(s => s.status === "uploading").length} Uploading</span>
                <span className="text-green-600 dark:text-green-400">{batchSongs.filter(s => s.status === "completed").length} Completed</span>
                <span className="text-red-600 dark:text-red-400">{batchSongs.filter(s => s.status === "failed").length} Failed</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-4">
            {batchSongs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground space-y-2">
                <Music2 className="w-10 h-10 mx-auto opacity-40" />
                <p className="text-sm">No songs added yet. Tap "Add Audio Files" to select multiple songs at once.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {batchSongs.map((song, idx) => (
                  <div key={song.id} className={`rounded-lg border p-3 transition-colors ${song.status === "completed" ? "border-green-400/50 bg-green-50/20 dark:bg-green-950/20" : song.status === "failed" ? "border-red-400/50 bg-red-50/20 dark:bg-red-950/20" : song.status === "uploading" ? "border-blue-400/50 bg-blue-50/20 dark:bg-blue-950/20" : "border-border/50 bg-card"}`} data-testid={`card-batch-song-${idx}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${song.status === "completed" ? "bg-green-500" : song.status === "failed" ? "bg-red-500" : song.status === "uploading" ? "bg-blue-500 animate-pulse" : "bg-muted-foreground/30"}`} />
                      <span className="text-xs font-semibold flex-1 truncate">{song.title || song.file.name}</span>
                      <Badge variant="outline" className={`text-xs flex-shrink-0 ${song.status === "completed" ? "border-green-400 text-green-700" : song.status === "failed" ? "border-red-400 text-red-700" : song.status === "uploading" ? "border-blue-400 text-blue-700" : ""}`}>
                        {song.status === "waiting" ? "Waiting" : song.status === "uploading" ? "Uploading…" : song.status === "completed" ? "Completed ✓" : "Failed"}
                      </Badge>
                      {song.videoFile && (
                        <Badge variant="outline" className={`text-xs flex-shrink-0 ${song.videoUploadStatus === "completed" ? "border-green-400 text-green-700" : song.videoUploadStatus === "failed" ? "border-red-400 text-red-700" : song.videoUploadStatus === "uploading" ? "border-blue-400 text-blue-700" : "border-blue-300/60 text-blue-600"}`}>
                          <Video className="w-2.5 h-2.5 mr-0.5" />
                          {song.videoUploadStatus === "none" ? "MP4" : song.videoUploadStatus === "uploading" ? "Video…" : song.videoUploadStatus === "completed" ? "Video ✓" : "Video ✗"}
                        </Badge>
                      )}
                      {!batchUploading && song.status !== "uploading" && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title={song.expanded ? "Collapse" : "Edit"} onClick={() => updateBatchSong(song.id, { expanded: !song.expanded })}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          {song.status !== "completed" && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => setBatchSongs(prev => prev.filter(s => s.id !== song.id))} data-testid={`button-remove-batch-${idx}`}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    {song.error && <p className="text-xs text-red-600 mt-1 ml-4">{song.error}</p>}
                    {song.status === "failed" && !batchUploading && (
                      <Button size="sm" variant="outline" className="mt-2 text-xs h-7 ml-4" onClick={() => updateBatchSong(song.id, { status: "waiting", error: null })} data-testid={`button-retry-batch-${idx}`}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Retry
                      </Button>
                    )}
                    {song.expanded && song.status !== "completed" && (
                      <div className="mt-3 space-y-2 border-t border-border/30 pt-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <Label className="text-xs">Title *</Label>
                            <Input className="h-7 text-xs" value={song.title} onChange={(e) => updateBatchSong(song.id, { title: e.target.value })} placeholder="Song title" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-xs">Slug</Label>
                            <Input className="h-7 text-xs" value={song.slug} onChange={(e) => updateBatchSong(song.id, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="song-url-slug" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <Label className="text-xs">Scripture Reference *</Label>
                            <Input className="h-7 text-xs" value={song.scriptureReference} onChange={(e) => updateBatchSong(song.id, { scriptureReference: e.target.value })} placeholder="Psalm 23:1" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-xs">Artist / Vocalist</Label>
                            <Input className="h-7 text-xs" value={song.artist} onChange={(e) => updateBatchSong(song.id, { artist: e.target.value })} placeholder="Optional" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <Label className="text-xs">Producer</Label>
                            <Input className="h-7 text-xs" value={song.producer} onChange={(e) => updateBatchSong(song.id, { producer: e.target.value })} placeholder="Moses Afolabi" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-xs">Composer</Label>
                            <Input className="h-7 text-xs" value={song.composer} onChange={(e) => updateBatchSong(song.id, { composer: e.target.value })} placeholder="Optional" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <Label className="text-xs">Lyricist</Label>
                            <Input className="h-7 text-xs" value={song.lyricist} onChange={(e) => updateBatchSong(song.id, { lyricist: e.target.value })} placeholder="Optional" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-xs">Language</Label>
                            <Input className="h-7 text-xs" value={song.language} onChange={(e) => updateBatchSong(song.id, { language: e.target.value })} placeholder="English" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <Label className="text-xs">Label / Ministry</Label>
                            <Input className="h-7 text-xs" value={song.labelName} onChange={(e) => updateBatchSong(song.id, { labelName: e.target.value })} placeholder="SpiritTone Records" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-xs">Release Year</Label>
                            <Input className="h-7 text-xs" type="number" value={song.releaseYear} onChange={(e) => updateBatchSong(song.id, { releaseYear: Number(e.target.value) })} />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-xs">Scripture Text</Label>
                          <Input className="h-7 text-xs" value={song.scriptureText} onChange={(e) => updateBatchSong(song.id, { scriptureText: e.target.value })} placeholder="Optional scripture text" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-xs">Short Description</Label>
                          <Input className="h-7 text-xs" value={song.shortDescription} onChange={(e) => updateBatchSong(song.id, { shortDescription: e.target.value })} placeholder="Brief summary" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-xs">Lyrics</Label>
                          <Textarea className="text-xs" value={song.lyrics} onChange={(e) => updateBatchSong(song.id, { lyrics: e.target.value })} placeholder="[Verse 1]..." rows={3} />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-xs">Cover Image <span className="text-muted-foreground">(optional, max 10MB)</span></Label>
                          <div className="flex items-center gap-2">
                            {song.coverPreview && <img src={song.coverPreview} alt="Cover" className="w-10 h-10 rounded object-cover border flex-shrink-0" />}
                            <label className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 cursor-pointer hover:bg-muted transition-colors">
                              <Upload className="w-3 h-3" />
                              {song.coverPreview ? "Change" : "Add Cover"}
                              <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => {
                                const f = e.target.files?.[0]; e.target.value = "";
                                if (!f) return;
                                if (f.size > 10 * 1024 * 1024) { toast({ title: "File too large", description: "Cover must be under 10MB.", variant: "destructive" }); return; }
                                updateBatchSong(song.id, { coverFile: f, coverPreview: URL.createObjectURL(f) });
                              }} />
                            </label>
                            {song.coverPreview && (
                              <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => updateBatchSong(song.id, { coverFile: null, coverPreview: null })}>Remove</Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-xs">MP4 Video <span className="text-muted-foreground">(optional, max 500MB)</span></Label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {song.videoFile && <span className="text-xs text-foreground truncate max-w-[140px]">{song.videoFile.name}</span>}
                            {song.videoUploadStatus === "failed" && song.videoError && <span className="text-xs text-red-600">{song.videoError}</span>}
                            <label className={`inline-flex items-center gap-1 text-xs border rounded px-2 py-1 cursor-pointer hover:bg-muted transition-colors ${song.videoUploadStatus === "uploading" ? "opacity-60 pointer-events-none" : ""}`}>
                              <Video className="w-3 h-3" />
                              {song.videoFile ? "Change MP4" : "Add MP4"}
                              <input type="file" className="hidden" accept=".mp4,video/mp4" onChange={(e) => {
                                const f = e.target.files?.[0]; e.target.value = "";
                                if (!f) return;
                                if (!f.name.toLowerCase().endsWith(".mp4") && f.type !== "video/mp4") { toast({ title: "Invalid file", description: "Please upload an MP4 video file.", variant: "destructive" }); return; }
                                if (f.size > 500 * 1024 * 1024) { toast({ title: "File too large", description: "Video must be under 500MB.", variant: "destructive" }); return; }
                                updateBatchSong(song.id, { videoFile: f, videoDownloadEnabled: true, videoUploadStatus: "none", videoError: null });
                              }} />
                            </label>
                            {song.videoFile && <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => updateBatchSong(song.id, { videoFile: null, videoDownloadEnabled: false, videoUploadStatus: "none", videoError: null })}>Remove</Button>}
                          </div>
                        </div>
                        <div className="flex items-center gap-5 pt-1 flex-wrap">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={song.downloadEnabled} onChange={(e) => updateBatchSong(song.id, { downloadEnabled: e.target.checked })} className="w-3.5 h-3.5" />
                            Audio Download Enabled
                          </label>
                          {song.videoFile && (
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input type="checkbox" checked={song.videoDownloadEnabled} onChange={(e) => updateBatchSong(song.id, { videoDownloadEnabled: e.target.checked })} className="w-3.5 h-3.5" />
                              Video Download Enabled
                            </label>
                          )}
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={song.isActive} onChange={(e) => updateBatchSong(song.id, { isActive: e.target.checked })} className="w-3.5 h-3.5" />
                            Active (visible to public)
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!batchUploading && batchSongs.length > 0 && batchSongs.every(s => s.status === "completed" || s.status === "failed") && (
                  <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                    <p className="text-sm font-semibold text-foreground">Upload Complete</p>
                    <p className="text-xs text-muted-foreground">
                      {batchSongs.filter(s => s.status === "completed").length} completed · {batchSongs.filter(s => s.status === "failed").length} failed
                    </p>
                    {batchSongs.some(s => s.status === "failed") && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => setBatchSongs(prev => prev.map(s => s.status === "failed" ? { ...s, status: "waiting", error: null } : s))} data-testid="button-retry-all-failed">
                        <RefreshCw className="w-3 h-3 mr-1" /> Retry Failed
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Songs List */}
      <Card className="border-primary/10 shadow-lg shadow-primary/5">
        <CardHeader className="bg-muted/30 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
              <Music2 className="w-6 h-6" />
              Song of the Week
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={openNew} data-testid="button-new-song">
                <Upload className="w-4 h-4 mr-1.5" />
                Upload One Song
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setBatchMode(true); setBatchSongs([]); setBatchUploading(false); }} data-testid="button-batch-upload">
                <Plus className="w-4 h-4 mr-1.5" />
                Upload Multiple Songs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : songs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No songs yet.</p>
          ) : (
            <div className="space-y-3">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card"
                  data-testid={`card-song-${song.id}`}
                >
                  {song.coverImageUrl ? (
                    <img src={song.coverImageUrl} alt={song.title} className="w-12 h-12 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Music2 className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{song.title}</p>
                    <p className="text-xs text-muted-foreground">{song.labelName} · {song.scriptureReference}</p>
                    {song.featuredWeekStart && (
                      <p className="text-xs text-muted-foreground">
                        Featured: {song.featuredWeekStart} – {song.featuredWeekEnd}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                    {song.audioUrl && (
                      <Badge variant="outline" className="text-xs border-amber-400/50 text-amber-600">
                        <Music className="w-2.5 h-2.5 mr-1" />
                        Audio
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-xs ${song.downloadStatus === "disabled" ? "border-muted-foreground/40 text-muted-foreground" : "border-green-400/60 text-green-700"}`}>
                      <Download className="w-2.5 h-2.5 mr-1" />
                      {song.downloadStatus === "disabled" ? "Audio DL Off" : "Audio DL On"}
                    </Badge>
                    {(song as any).videoUrl ? (
                      <Badge variant="outline" className="text-xs border-blue-400/50 text-blue-600">
                        <Video className="w-2.5 h-2.5 mr-1" />
                        MP4
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground/60">
                        No Video
                      </Badge>
                    )}
                    {(song as any).videoUrl && (
                      <Badge variant="outline" className={`text-xs ${(song as any).videoDownloadStatus === "disabled" ? "border-muted-foreground/40 text-muted-foreground" : "border-blue-400/60 text-blue-700"}`}>
                        <Download className="w-2.5 h-2.5 mr-1" />
                        {(song as any).videoDownloadStatus === "disabled" ? "Video DL Off" : "Video DL On"}
                      </Badge>
                    )}
                    <Badge variant={song.isActive ? "default" : "secondary"} className="text-xs">
                      {song.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewTestimonyFor(viewTestimonyFor === song.id ? null : song.id)}
                      data-testid={`button-view-testimonies-${song.id}`}
                      className="text-xs"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {testimonies.filter((t) => t.songId === song.id).length}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(song)}
                      data-testid={`button-edit-song-${song.id}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete "${song.title}"? This cannot be undone.`)) {
                          deleteSongMutation.mutate(song.id);
                        }
                      }}
                      data-testid={`button-delete-song-${song.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Song Testimonies */}
      <Card className="border-primary/10 shadow-lg shadow-primary/5">
        <CardHeader className="bg-muted/30 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-xl text-primary flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Song Testimonies {viewTestimonyFor && <span className="text-sm font-normal text-muted-foreground">— filtered by song</span>}
            </CardTitle>
            {viewTestimonyFor && (
              <Button size="sm" variant="outline" onClick={() => setViewTestimonyFor(null)}>Show All</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {filteredTestimonies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No testimonies yet.</p>
          ) : (
            <div className="space-y-3">
              {filteredTestimonies.map((t) => (
                <div key={t.id} className="p-3 rounded-lg border border-border/50 space-y-1" data-testid={`card-song-testimony-${t.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t.isAnonymous ? "Anonymous" : t.name}
                        {t.isApproved && <span className="ml-2 text-xs text-green-600 dark:text-green-400">✓ Approved</span>}
                        {t.isFeatured && <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">★ Featured</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Song: {t.songTitle} · {t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : ""}
                        {t.consentToPublish ? " · Consented to publish" : ""}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={t.isApproved ? "secondary" : "outline"}
                        className="text-xs"
                        onClick={() => updateTestimonyMutation.mutate({ id: t.id, data: { isApproved: !t.isApproved } })}
                        data-testid={`button-approve-testimony-${t.id}`}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {t.isApproved ? "Approved" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant={t.isFeatured ? "secondary" : "outline"}
                        className="text-xs"
                        onClick={() => updateTestimonyMutation.mutate({ id: t.id, data: { isFeatured: !t.isFeatured } })}
                        data-testid={`button-feature-testimony-${t.id}`}
                      >
                        <Star className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive text-xs"
                        onClick={() => {
                          if (confirm("Delete this testimony?")) deleteTestimonyMutation.mutate(t.id);
                        }}
                        data-testid={`button-delete-testimony-${t.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{t.testimony}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Song Edit/Create Dialog */}
      {/* ── Giving Methods ── */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
              <Gift className="w-6 h-6" />
              Giving Methods
            </CardTitle>
            <Button
              size="sm"
              onClick={() => { setEditingMethod({ type: "other", isActive: false, displayOrder: givingMethodsList.length }); setShowMethodForm(true); }}
              data-testid="button-add-giving-method"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Method
            </Button>
          </div>
          <p className="text-sm text-muted-foreground pt-1">
            Configure voluntary support options shown on the SpiritTone Music pages. Giving is never required and never unlocks content.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {givingMethodsList.length === 0 && !showMethodForm && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No giving methods configured. Click "Add Method" to add PayPal, Cash App, Venmo, or other options.
            </p>
          )}
          <div className="space-y-2">
            {givingMethodsList.map((method) => (
              <div key={method.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/10" data-testid={`card-giving-method-${method.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{method.name}</span>
                    <Badge variant={method.isActive ? "default" : "secondary"} className="text-xs">
                      {method.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">{method.type}</Badge>
                    <span className="text-xs text-muted-foreground">Order: {method.displayOrder}</span>
                  </div>
                  {method.handle && <div className="text-xs text-muted-foreground mt-0.5">{method.handle}</div>}
                  {method.url && <div className="text-xs text-muted-foreground truncate max-w-sm">{method.url}</div>}
                  {method.instructions && <div className="text-xs text-muted-foreground/70 italic">{method.instructions}</div>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      updateMethodMutation.mutate({ id: method.id, data: { isActive: !method.isActive } });
                    }}
                    data-testid={`button-toggle-method-${method.id}`}
                  >
                    {method.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingMethod({ ...method }); setShowMethodForm(true); }}
                    data-testid={`button-edit-method-${method.id}`}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { if (confirm(`Delete "${method.name}"? This cannot be undone.`)) deleteMethodMutation.mutate(method.id); }}
                    data-testid={`button-delete-method-${method.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {showMethodForm && editingMethod !== null && (
            <div className="mt-2 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
              <h4 className="font-semibold text-sm text-primary">{editingMethod.id ? "Edit Giving Method" : "New Giving Method"}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Display Name *</Label>
                  <Input
                    value={editingMethod.name ?? ""}
                    onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                    placeholder="e.g. PayPal"
                    data-testid="input-method-name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type *</Label>
                  <Select value={editingMethod.type ?? "other"} onValueChange={(v) => setEditingMethod({ ...editingMethod, type: v })}>
                    <SelectTrigger data-testid="select-method-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="cashapp">Cash App</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="card">Debit / Credit Card Link</SelectItem>
                      <SelectItem value="website">Ministry Website</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Giving URL</Label>
                <Input
                  value={editingMethod.url ?? ""}
                  onChange={(e) => setEditingMethod({ ...editingMethod, url: e.target.value || null })}
                  placeholder="https://paypal.me/... or https://cash.app/$..."
                  data-testid="input-method-url"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Handle / Username</Label>
                  <Input
                    value={editingMethod.handle ?? ""}
                    onChange={(e) => setEditingMethod({ ...editingMethod, handle: e.target.value || null })}
                    placeholder="$cashtag or @username"
                    data-testid="input-method-handle"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Display Order</Label>
                  <Input
                    type="number"
                    value={editingMethod.displayOrder ?? 0}
                    onChange={(e) => setEditingMethod({ ...editingMethod, displayOrder: Number(e.target.value) })}
                    data-testid="input-method-order"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Short Instructions <span className="text-muted-foreground">(shown below the link)</span></Label>
                <Input
                  value={editingMethod.instructions ?? ""}
                  onChange={(e) => setEditingMethod({ ...editingMethod, instructions: e.target.value || null })}
                  placeholder="e.g. Tap to open in the PayPal app"
                  data-testid="input-method-instructions"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="method-is-active"
                  checked={!!editingMethod.isActive}
                  onChange={(e) => setEditingMethod({ ...editingMethod, isActive: e.target.checked })}
                  data-testid="checkbox-method-active"
                />
                <label htmlFor="method-is-active" className="text-xs cursor-pointer">
                  Active — visible to users on the SpiritTone Music page
                </label>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setShowMethodForm(false); setEditingMethod(null); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveMethod}
                  disabled={!editingMethod.name || createMethodMutation.isPending || updateMethodMutation.isPending}
                  data-testid="button-save-giving-method"
                >
                  {(createMethodMutation.isPending || updateMethodMutation.isPending) && (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  )}
                  Save Method
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingSong(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-primary">
              {editingSong?.id ? "Edit Song" : "Upload New Song"}
            </DialogTitle>
          </DialogHeader>
          {editingSong && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Title *</Label>
                  <Input
                    value={editingSong.title ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, title: e.target.value })}
                    placeholder="Song title"
                    data-testid="input-song-title"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Slug * (URL-safe)</Label>
                  <Input
                    value={editingSong.slug ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })}
                    placeholder="song-url-slug"
                    data-testid="input-song-slug"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Artist / Vocalist</Label>
                  <Input
                    value={editingSong.artist ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, artist: e.target.value || null })}
                    placeholder="Optional vocalist"
                    data-testid="input-song-artist"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Featured Artist</Label>
                  <Input
                    value={editingSong.featuredArtist ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, featuredArtist: e.target.value || null })}
                    placeholder="ft. Artist (optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ministry / Label Name</Label>
                  <Input
                    value={editingSong.labelName ?? "SpiritTone Records"}
                    onChange={(e) => setEditingSong({ ...editingSong, labelName: e.target.value })}
                    data-testid="input-song-label-name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Producer</Label>
                  <Input
                    value={editingSong.producer ?? "Moses Afolabi"}
                    onChange={(e) => setEditingSong({ ...editingSong, producer: e.target.value })}
                    data-testid="input-song-producer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Composer</Label>
                  <Input
                    value={editingSong.composer ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, composer: e.target.value || null })}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lyricist</Label>
                  <Input
                    value={editingSong.lyricist ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, lyricist: e.target.value || null })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Choir / Group</Label>
                  <Input
                    value={editingSong.choir ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, choir: e.target.value || null })}
                    placeholder="Optional choir name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Instrumentalist</Label>
                  <Input
                    value={editingSong.instrumentalist ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, instrumentalist: e.target.value || null })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Genre</Label>
                  <Input
                    value={editingSong.genre ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, genre: e.target.value || null })}
                    placeholder="e.g. Gospel, Worship"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Language</Label>
                  <Input
                    value={editingSong.language ?? "English"}
                    onChange={(e) => setEditingSong({ ...editingSong, language: e.target.value || null })}
                    placeholder="English"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">SpiritTone Records Logo <span className="text-muted-foreground">(PNG/JPG/SVG, max 5MB)</span></Label>
                {editingSong.labelLogoUrl && (
                  <div className="flex items-center gap-2">
                    <img src={editingSong.labelLogoUrl} alt="Label logo preview" className="h-10 object-contain border rounded p-1 bg-muted/30" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <Button size="sm" variant="ghost" className="text-destructive h-7 text-xs" onClick={() => setEditingSong({ ...editingSong, labelLogoUrl: null })}>
                      <X className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  </div>
                )}
                <label className={`inline-flex items-center gap-1.5 text-xs border rounded-md px-3 py-1.5 cursor-pointer hover:bg-muted transition-colors ${logoUpload.isUploading ? "opacity-60 pointer-events-none" : ""}`}>
                  <Upload className="w-3 h-3" />
                  {logoUpload.isUploading ? `Uploading ${Math.round(logoUpload.progress ?? 0)}%…` : editingSong.labelLogoUrl ? "Replace Logo" : "Upload Logo"}
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.svg" disabled={logoUpload.isUploading} onChange={handleLogoUpload} data-testid="input-song-label-logo" />
                </label>
                {logoUpload.isUploading && (
                  <div className="w-48 bg-muted rounded-full h-1.5">
                    <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${logoUpload.progress ?? 0}%` }} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Song Cover Artwork <span className="text-muted-foreground">(JPG/PNG/WebP, max 10MB)</span></Label>
                {editingSong.coverImageUrl && (
                  <div className="flex items-center gap-2">
                    <img src={editingSong.coverImageUrl} alt="Cover preview" className="h-20 w-20 rounded object-cover border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <Button size="sm" variant="ghost" className="text-destructive h-7 text-xs" onClick={() => setEditingSong({ ...editingSong, coverImageUrl: null })}>
                      <X className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  </div>
                )}
                <label className={`inline-flex items-center gap-1.5 text-xs border rounded-md px-3 py-1.5 cursor-pointer hover:bg-muted transition-colors ${coverUpload.isUploading ? "opacity-60 pointer-events-none" : ""}`}>
                  <Upload className="w-3 h-3" />
                  {coverUpload.isUploading ? `Uploading ${Math.round(coverUpload.progress ?? 0)}%…` : editingSong.coverImageUrl ? "Replace Cover" : "Upload Cover"}
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" disabled={coverUpload.isUploading} onChange={handleCoverUpload} data-testid="input-song-cover" />
                </label>
                {coverUpload.isUploading && (
                  <div className="w-48 bg-muted rounded-full h-1.5">
                    <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${coverUpload.progress ?? 0}%` }} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Scripture Reference *</Label>
                  <Input
                    value={editingSong.scriptureReference ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, scriptureReference: e.target.value })}
                    placeholder="Psalm 23:1"
                    data-testid="input-song-scripture-ref"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Release Year</Label>
                  <Input
                    type="number"
                    value={editingSong.releaseYear ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, releaseYear: Number(e.target.value) || null })}
                    placeholder="2026"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Scripture Text (optional)</Label>
                <Input
                  value={editingSong.scriptureText ?? ""}
                  onChange={(e) => setEditingSong({ ...editingSong, scriptureText: e.target.value || null })}
                  placeholder="The LORD is my shepherd; I shall not want."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Song Audio File <span className="text-muted-foreground">(MP3/M4A/WAV, max 80MB)</span></Label>
                {editingSong.audioUrl && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border">
                    <Music className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs text-foreground truncate flex-1">{editingSong.audioUrl.split("/").pop()}</span>
                    <Button size="sm" variant="ghost" className="text-destructive h-6 text-xs flex-shrink-0" onClick={() => setEditingSong({ ...editingSong, audioUrl: null })}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <label className={`inline-flex items-center gap-1.5 text-xs border rounded-md px-3 py-1.5 cursor-pointer hover:bg-muted transition-colors ${audioUpload.isUploading ? "opacity-60 pointer-events-none" : ""}`}>
                  <Upload className="w-3 h-3" />
                  {audioUpload.isUploading ? `Uploading ${Math.round(audioUpload.progress ?? 0)}%…` : editingSong.audioUrl ? "Replace Audio" : "Upload Audio"}
                  <input type="file" className="hidden" accept=".mp3,.m4a,.wav,.aac,.ogg" disabled={audioUpload.isUploading} onChange={handleAudioUpload} data-testid="input-song-audio" />
                </label>
                {audioUpload.isUploading && (
                  <div className="w-48 bg-muted rounded-full h-1.5">
                    <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${audioUpload.progress ?? 0}%` }} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Song Video File <span className="text-muted-foreground">(MP4 only, max 500MB — optional)</span></Label>
                {(editingSong as any).videoUrl && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border">
                    <Video className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs text-foreground truncate flex-1">{(editingSong as any).videoUrl.split("/").pop()}</span>
                    <Button size="sm" variant="ghost" className="text-destructive h-6 text-xs flex-shrink-0" onClick={() => setEditingSong({ ...editingSong, videoUrl: null, videoDownloadStatus: "disabled" } as any)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <label className={`inline-flex items-center gap-1.5 text-xs border rounded-md px-3 py-1.5 cursor-pointer hover:bg-muted transition-colors ${videoUpload.isUploading ? "opacity-60 pointer-events-none" : ""}`}>
                  <Video className="w-3 h-3" />
                  {videoUpload.isUploading ? `Uploading ${Math.round(videoUpload.progress ?? 0)}%…` : (editingSong as any).videoUrl ? "Replace Video" : "Upload MP4"}
                  <input type="file" className="hidden" accept=".mp4,video/mp4" disabled={videoUpload.isUploading} onChange={handleVideoUpload} data-testid="input-song-video" />
                </label>
                {videoUpload.isUploading && (
                  <div className="w-48 bg-muted rounded-full h-1.5">
                    <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${videoUpload.progress ?? 0}%` }} />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Lyrics (use blank lines between sections)</Label>
                <Textarea
                  value={editingSong.lyrics ?? ""}
                  onChange={(e) => setEditingSong({ ...editingSong, lyrics: e.target.value || null })}
                  rows={8}
                  placeholder="[Verse 1]&#10;..."
                  className="font-mono text-xs"
                  data-testid="textarea-song-lyrics"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Short Description <span className="text-muted-foreground">(shown in library listing)</span></Label>
                <Textarea
                  value={editingSong.shortDescription ?? ""}
                  onChange={(e) => setEditingSong({ ...editingSong, shortDescription: e.target.value || null })}
                  rows={2}
                  placeholder="One-line summary shown in the song library..."
                  data-testid="textarea-song-short-description"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Full Description <span className="text-muted-foreground">(shown on song detail page)</span></Label>
                <Textarea
                  value={editingSong.description ?? ""}
                  onChange={(e) => setEditingSong({ ...editingSong, description: e.target.value || null })}
                  rows={3}
                  placeholder="Full description for the song detail page..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Featured Week Start</Label>
                  <Input
                    type="date"
                    value={editingSong.featuredWeekStart ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, featuredWeekStart: e.target.value || null })}
                    data-testid="input-song-week-start"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Featured Week End</Label>
                  <Input
                    type="date"
                    value={editingSong.featuredWeekEnd ?? ""}
                    onChange={(e) => setEditingSong({ ...editingSong, featuredWeekEnd: e.target.value || null })}
                    data-testid="input-song-week-end"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Copyright Notice</Label>
                <Input
                  value={editingSong.copyrightNotice ?? ""}
                  onChange={(e) => setEditingSong({ ...editingSong, copyrightNotice: e.target.value || null })}
                  placeholder="© 2026 SpiritTone Records. All rights reserved."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Audio Download</Label>
                  <Select
                    value={editingSong.downloadStatus === "disabled" ? "disabled" : "free"}
                    onValueChange={(v) => setEditingSong({ ...editingSong, downloadStatus: v })}
                  >
                    <SelectTrigger data-testid="select-song-download-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Audio Download Enabled</SelectItem>
                      <SelectItem value="disabled">Audio Download Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Video Download
                    {!(editingSong as any).videoUrl && <span className="text-muted-foreground ml-1">(upload MP4 first)</span>}
                  </Label>
                  <Select
                    value={(editingSong as any).videoDownloadStatus === "disabled" ? "disabled" : "free"}
                    onValueChange={(v) => setEditingSong({ ...editingSong, videoDownloadStatus: v } as any)}
                    disabled={!(editingSong as any).videoUrl}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Video Download Enabled</SelectItem>
                      <SelectItem value="disabled">Video Download Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Song Status</Label>
                <Select
                  value={editingSong.isActive ? "active" : "inactive"}
                  onValueChange={(v) => setEditingSong({ ...editingSong, isActive: v === "active" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowForm(false); setEditingSong(null); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateSongMutation.isPending || createSongMutation.isPending}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-save-song"
            >
              {(updateSongMutation.isPending || createSongMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Song
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Church Moderation Admin ────────────────────────────────────────────────────

interface ChurchModData {
  id: number;
  name: string;
  slug: string;
  denomination: string | null;
  status: string;
  createdAt: string | null;
}

function ChurchFinanceAdmin() {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [feeValue, setFeeValue] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalDonations: number; totalPlatformFee: number; totalChurchNet: number; count: number;
  }>({ queryKey: ["/api/admin/giving/stats"] });

  const { data: txns, isLoading: txnsLoading } = useQuery<Array<{
    id: number; churchId: number; reference: string; grossAmount: number;
    platformFeeAmount: number; churchNetAmount: number; currency: string;
    categoryName: string; status: string; createdAt: string | null;
  }>>({ queryKey: ["/api/admin/giving/transactions"] });

  const { data: settings, refetch: refetchSettings } = useQuery<{ platform_fee_percent: string }>({
    queryKey: ["/api/admin/giving/platform-settings"],
  });

  const saveFee = async () => {
    const pct = parseFloat(feeValue);
    if (isNaN(pct) || pct < 0 || pct > 30) {
      toast({ title: "Invalid fee percentage", description: "Enter a number between 0 and 30.", variant: "destructive" });
      return;
    }
    const r = await fetch("/api/admin/giving/platform-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform_fee_percent: feeValue }),
    });
    if (r.ok) {
      toast({ title: "Platform fee updated" });
      setEditing(false);
      refetchSettings();
    } else {
      toast({ title: "Error updating fee", variant: "destructive" });
    }
  };

  const fmt = (cents: number, currency = "USD") => {
    const syms: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", NGN: "₦", KES: "KSh" };
    return `${syms[currency] ?? currency + " "}${(cents / 100).toFixed(2)}`;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Church Finance Overview
        </CardTitle>
        <p className="text-sm text-muted-foreground">Platform-wide giving summary and fee controls</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Platform fee */}
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#fffbf0", border: "1px solid #b8962e30" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#92400e" }}>Platform Fee</p>
              <p className="text-xs text-muted-foreground">Deducted from each church transaction before payout</p>
            </div>
            {!editing ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold" style={{ color: "#92400e" }}>
                  {settings?.platform_fee_percent ?? "2.5"}%
                </span>
                <Button size="sm" variant="outline" onClick={() => { setFeeValue(settings?.platform_fee_percent ?? "2.5"); setEditing(true); }}
                  data-testid="button-edit-platform-fee">
                  Edit
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input type="number" step="0.1" min="0" max="30" value={feeValue}
                  onChange={e => setFeeValue(e.target.value)}
                  className="w-24 h-8 text-sm" data-testid="input-platform-fee" />
                <span className="text-sm font-medium">%</span>
                <Button size="sm" onClick={saveFee} style={{ backgroundColor: "#1d3461" }} data-testid="button-save-platform-fee">Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Donations", value: fmt(stats.totalDonations), color: "#1d3461" },
              { label: "Platform Revenue", value: fmt(stats.totalPlatformFee), color: "#92400e" },
              { label: "Churches Received", value: fmt(stats.totalChurchNet), color: "#166534" },
              { label: "Transactions", value: String(stats.count), color: "#4a4540" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: "#f8f4ee" }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Recent transactions */}
        <div className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: "#1d3461" }}>Recent Transactions (All Churches)</p>
          {txnsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !txns?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {txns.slice(0, 50).map(txn => (
                <div key={txn.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "#f8f4ee" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: "#1d3461" }}>{fmt(txn.grossAmount, txn.currency)}</p>
                      <Badge variant={txn.status === "completed" ? "default" : txn.status === "failed" ? "destructive" : "secondary"}
                        className="text-xs">{txn.status}</Badge>
                      <span className="text-xs text-muted-foreground">{txn.categoryName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">Church #{txn.churchId} · Ref: {txn.reference}</p>
                    <p className="text-xs text-muted-foreground">
                      Platform: −{fmt(txn.platformFeeAmount, txn.currency)} · Church: {fmt(txn.churchNetAmount, txn.currency)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground flex-shrink-0">
                    {txn.createdAt ? new Date(txn.createdAt).toLocaleDateString() : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Church Oversight Admin ─────────────────────────────────────────────────────

interface ChurchOversightRow {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string;
  country: string | null;
  createdAt: string;
  ownerId: string;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
  activeMembers: number;
  pendingMembers: number;
  inactiveMembers: number;
  adminCount: number;
  departmentCount: number;
  announcementCount: number;
  sermonCount: number;
  lastActivity: string | null;
}

interface OversightSummary {
  total: number;
  active: number;
  inactive: number;
  newThisWeek: number;
  newThisMonth: number;
  totalActiveMembers: number;
  churchesByCountry: { country: string; count: number }[];
  membersByCountry: { country: string; count: number }[];
  largestChurches: { id: number; name: string; slug: string; logoUrl: string | null; activeMembers: number }[];
}

function ChurchOversightAdmin() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery<{ churches: ChurchOversightRow[]; summary: OversightSummary }>({
    queryKey: ["/api/admin/church-oversight"],
    queryFn: () => fetch("/api/admin/church-oversight", { credentials: "include" }).then(r => r.ok ? r.json() : Promise.reject()),
  });

  const churches = data?.churches ?? [];
  const summary = data?.summary;

  const filtered = churches.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.ownerEmail ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.ownerDisplayName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) return <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" />Loading church data…</div>;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Churches", value: summary.total },
            { label: "Active", value: summary.active },
            { label: "Inactive/Suspended", value: summary.inactive },
            { label: "New This Week", value: summary.newThisWeek },
            { label: "New This Month", value: summary.newThisMonth },
            { label: "Total Members", value: summary.totalActiveMembers },
          ].map(s => (
            <div key={s.label} className="bg-muted/40 rounded-lg p-3 text-center" data-testid={`stat-oversight-${s.label.replace(/\s+/g, "-").toLowerCase()}`}>
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Country breakdowns */}
      {summary && summary.churchesByCountry.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Churches by Country</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {summary.churchesByCountry.slice(0, 15).map((r) => (
                <div key={r.country} className="flex justify-between text-sm">
                  <span className="text-foreground">{r.country}</span>
                  <span className="font-medium text-primary">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Members by Country</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {summary.membersByCountry.slice(0, 15).map((r) => (
                <div key={r.country} className="flex justify-between text-sm">
                  <span className="text-foreground">{r.country}</span>
                  <span className="font-medium text-primary">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, owner, email…"
            className="w-full pl-9 h-9 rounded-md border bg-background text-sm px-3 focus:outline-none focus:ring-1 focus:ring-ring"
            data-testid="input-oversight-search"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border bg-background text-sm px-3 focus:outline-none focus:ring-1 focus:ring-ring"
          data-testid="select-oversight-status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {churches.length} churches.
        Private messages, counseling, and prayer requests are not accessible from this view.
      </p>

      {/* Church rows */}
      <div className="space-y-3">
        {filtered.map(c => (
          <Card key={c.id} className="border-primary/10" data-testid={`card-oversight-church-${c.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {c.logoUrl
                    ? <img src={c.logoUrl} alt={c.name} className="w-10 h-10 rounded-lg object-cover" />
                    : <Building2 className="w-5 h-5 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium border ${c.status === "active" ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300"}`}>
                      {c.status}
                    </span>
                    {c.country && <span className="text-xs text-muted-foreground">{c.country}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Owner: {c.ownerDisplayName ?? "—"} &middot; {c.ownerEmail ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Registered: {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                    {c.lastActivity && ` · Last active: ${new Date(c.lastActivity).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              {/* Stat badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  { label: "Active members", value: c.activeMembers },
                  { label: "Pending", value: c.pendingMembers },
                  { label: "Inactive", value: c.inactiveMembers },
                  { label: "Admins", value: c.adminCount },
                  { label: "Departments", value: c.departmentCount },
                  { label: "Announcements", value: c.announcementCount },
                  { label: "Sermons", value: c.sermonCount },
                ].map(s => (
                  <div key={s.label} className="bg-muted/50 rounded px-2 py-1 text-center min-w-14">
                    <p className="text-sm font-bold text-primary leading-none">{s.value}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No churches match your search.</p>
        )}
      </div>
    </div>
  );
}

// ── App Analytics Admin ────────────────────────────────────────────────────────

interface AnalyticsData {
  dau: number;
  wau: number;
  mau: number;
  totalUsers: number;
  newThisWeek: number;
  newThisMonth: number;
  dailyTrend: { date: string; users: number }[];
  usersByCountry: { country: string; count: number }[];
}

function AppAnalyticsAdmin() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    queryFn: () => fetch("/api/admin/analytics", { credentials: "include" }).then(r => r.ok ? r.json() : Promise.reject()),
  });

  if (isLoading) return <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" />Loading analytics…</div>;

  if (!data) return <p className="text-muted-foreground py-8 text-center">Could not load analytics.</p>;

  const mainStats = [
    { label: "Daily Active Users (today)", value: data.dau, note: "Distinct signed-in users active today" },
    { label: "Weekly Active Users (7d)", value: data.wau, note: "Distinct signed-in users, last 7 days" },
    { label: "Monthly Active Users (30d)", value: data.mau, note: "Distinct signed-in users, last 30 days" },
    { label: "Total Registered Accounts", value: data.totalUsers, note: "All user_profiles rows" },
    { label: "New Accounts This Week", value: data.newThisWeek, note: "Registered in the last 7 days" },
    { label: "New Accounts This Month", value: data.newThisMonth, note: "Registered in the last 30 days" },
  ];

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <strong>Data source:</strong> Database-backed activity log. Only signed-in (verified) users are counted.
        Anonymous page visits are not included. Google Analytics integration would require a service-account key added server-side.
      </p>

      {/* Main stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {mainStats.map(s => (
          <div key={s.label} className="bg-muted/40 rounded-lg p-4 space-y-1" data-testid={`stat-analytics-${s.label.replace(/\s+/g, "-").toLowerCase().slice(0, 20)}`}>
            <p className="text-3xl font-bold text-primary">{s.value.toLocaleString()}</p>
            <p className="text-xs font-medium text-foreground leading-snug">{s.label}</p>
            <p className="text-xs text-muted-foreground leading-snug">{s.note}</p>
          </div>
        ))}
      </div>

      {/* 30-day trend table */}
      {data.dailyTrend.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Daily Active Users — Last 30 Days</p>
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Active Users</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.dailyTrend].reverse().map((row) => (
                    <tr key={row.date} className="border-t">
                      <td className="px-4 py-2 text-foreground">{row.date}</td>
                      <td className="px-4 py-2 text-right font-medium text-primary">{row.users}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users by country */}
      {data.usersByCountry.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Registered Users by Country</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {data.usersByCountry.map((r) => (
              <div key={r.country} className="flex justify-between text-sm py-0.5">
                <span className="text-foreground">{r.country}</span>
                <span className="font-medium text-primary">{r.count}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Only users who have set their country are shown.</p>
        </div>
      )}

      <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">Metrics requiring additional Google Analytics configuration:</p>
        <ul className="list-disc list-inside space-y-0.5 mt-1">
          <li>Anonymous visitor counts (not signed in)</li>
          <li>Users by platform (web vs Android PWA vs iOS browser)</li>
          <li>Most visited app areas (page-view tracking)</li>
          <li>Average engagement time per session</li>
          <li>Church Mode vs Devotional vs Song page breakdown</li>
        </ul>
        <p className="mt-2">These require a Google Analytics 4 property + Data API service-account key added to the server environment.</p>
      </div>
    </div>
  );
}

function ChurchModerationAdmin() {
  const { password } = useAuth();
  const { toast } = useToast();

  const { data: churches, isLoading, refetch } = useQuery<ChurchModData[]>({
    queryKey: ["/api/admin/churches"],
    queryFn: () =>
      fetch("/api/admin/churches", {
        headers: { Authorization: `Bearer ${password}` },
      }).then(r => r.ok ? r.json() : Promise.reject()),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await fetch(`/api/admin/churches/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${password}` },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => { refetch(); toast({ title: "Church status updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800 border-green-300",
    suspended: "bg-red-100 text-red-800 border-red-300",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  };

  return (
    <Card className="border-primary/10 shadow-lg shadow-primary/5">
      <CardHeader className="bg-muted/30 border-b border-border">
        <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Church Mode Moderation
        </CardTitle>
        <p className="text-sm text-muted-foreground">Global oversight of all Church Mode spaces</p>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !churches?.length ? (
          <div className="text-center py-12">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No churches registered yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">{churches.length} church spaces registered</p>
            {churches.map(church => (
              <Card key={church.id} className="border border-border/50">
                <CardContent className="pt-4 pb-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{church.name}</span>
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">/{church.slug}</code>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[church.status] ?? "bg-gray-100 text-gray-700 border-gray-300"}`}>
                        {church.status}
                      </span>
                    </div>
                    {church.denomination && (
                      <p className="text-xs text-muted-foreground mt-0.5">{church.denomination}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Created {church.createdAt ? new Date(church.createdAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {church.status !== "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() => updateStatus.mutate({ id: church.id, status: "active" })}
                        disabled={updateStatus.isPending}
                        data-testid={`button-activate-church-${church.id}`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Activate
                      </Button>
                    )}
                    {church.status !== "suspended" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => { if (confirm("Suspend this church?")) updateStatus.mutate({ id: church.id, status: "suspended" }); }}
                        disabled={updateStatus.isPending}
                        data-testid={`button-suspend-church-${church.id}`}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Suspend
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ChurchDeletionRequest {
  id: number;
  churchId: number;
  ownerUid: string;
  reason: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  churchName?: string;
}

function ChurchDeletionRequestsAdmin() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [adminNote, setAdminNote] = useState<Record<number, string>>({});
  const { data: requests = [], isLoading, refetch } = useQuery<ChurchDeletionRequest[]>({
    queryKey: ["/api/admin/church-deletion-requests"],
    queryFn: () => fetch("/api/admin/church-deletion-requests", { credentials: "include" }).then(r => r.ok ? r.json() : Promise.reject()),
  });

  const action = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await fetch(`/api/admin/church-deletion-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, adminNote: adminNote[id] ?? null }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => { refetch(); toast({ title: t("cm_deletionRequestUpdated") }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    info_requested: "bg-blue-100 text-blue-800 border-blue-200",
  };

  if (isLoading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> {t("cm_loading")}</div>;
  if (!requests.length) return <p className="text-muted-foreground text-sm">{t("cm_noDeletionRequests")}</p>;

  return (
    <div className="space-y-4">
      {requests.map(req => (
        <Card key={req.id} className="border border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{t("cm_churchIdLabel")} {req.churchId}</p>
                <p className="text-xs text-muted-foreground">{format(parseISO(req.createdAt), "PPP")}</p>
              </div>
              <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${statusColor[req.status] ?? "bg-muted text-muted-foreground"}`}>{req.status}</span>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">{t("cm_ownerReason")}</p>
              <p className="text-sm">{req.reason}</p>
            </div>
            {req.adminNote && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{t("cm_adminNote")}</p>
                <p className="text-sm italic">{req.adminNote}</p>
              </div>
            )}
            {req.status === "pending" && (
              <div className="space-y-2 pt-1">
                <Textarea
                  placeholder={t("cm_adminNotePlaceholder")}
                  value={adminNote[req.id] ?? ""}
                  onChange={e => setAdminNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                  className="text-sm min-h-[64px]"
                  data-testid={`textarea-admin-note-${req.id}`}
                />
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="destructive" onClick={() => action.mutate({ id: req.id, status: "approved" })} disabled={action.isPending} data-testid={`button-approve-deletion-${req.id}`}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> {t("cm_approveDeletion")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => action.mutate({ id: req.id, status: "info_requested" })} disabled={action.isPending} data-testid={`button-info-deletion-${req.id}`}>
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> {t("cm_requestMoreInfo")}
                  </Button>
                  <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50" onClick={() => action.mutate({ id: req.id, status: "rejected" })} disabled={action.isPending} data-testid={`button-reject-deletion-${req.id}`}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> {t("cm_rejectDeletion")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Platform Governance: Applications ──────────────────────────────────────────

const PLATFORM_STATUS_COLORS: Record<string, string> = {
  draft: "bg-indigo-100 text-indigo-800 border-indigo-300",
  submitted: "bg-amber-100 text-amber-800 border-amber-300",
  pending_review: "bg-yellow-100 text-yellow-800 border-yellow-400",
  approved: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
  suspended: "bg-orange-100 text-orange-800 border-orange-300",
  archived: "bg-gray-100 text-gray-600 border-gray-300",
};

function GovernanceApplicationsAdmin() {
  const { t } = useI18n();
  const [filterStatus, setFilterStatus] = useState("submitted");
  const [reviewNote, setReviewNote] = useState<Record<number, string>>({});
  const { data: apps, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/governance/applications", filterStatus],
    queryFn: () => fetch(`/api/admin/governance/applications?platformStatus=${filterStatus}`).then(r => r.ok ? r.json() : []),
  });
  const { data: summary } = useQuery<any>({
    queryKey: ["/api/admin/governance/summary"],
    queryFn: () => fetch("/api/admin/governance/summary").then(r => r.ok ? r.json() : {}),
  });
  const review = useMutation({
    mutationFn: async ({ id, action, note }: { id: number; action: string; note?: string }) => {
      const r = await fetch(`/api/admin/governance/applications/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { refetch(); queryClient.invalidateQueries({ queryKey: ["/api/admin/governance/summary"] }); },
  });

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Awaiting Review", val: summary.pendingReview, color: "text-amber-700" },
            { label: "Approved (7d)", val: summary.recentApprovals, color: "text-green-700" },
            { label: "Suspended (7d)", val: summary.recentSuspensions, color: "text-orange-700" },
            { label: "Open Cases", val: summary.openCases, color: "text-red-700" },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-lg border p-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{val ?? 0}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 flex-wrap mb-2">
        {["submitted", "draft", "pending_review", "approved", "rejected", "suspended", "archived"].map(s => (
          <Button key={s} size="sm" variant={filterStatus === s ? "default" : "outline"} onClick={() => setFilterStatus(s)} className="capitalize text-xs">
            {s.replace(/_/g, " ")}
          </Button>
        ))}
      </div>
      {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
      {!isLoading && (!apps || apps.length === 0) && (
        <div className="text-center py-10 text-muted-foreground">{t("cm_noApplicationsYet")}</div>
      )}
      <div className="space-y-3">
        {apps?.map((church: any) => (
          <Card key={church.id} className="border border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {church.logoUrl && <img src={church.logoUrl} alt={church.name} className="w-10 h-10 rounded-lg object-cover border" />}
                  <div>
                    <p className="font-semibold">{church.name}</p>
                    <p className="text-xs text-muted-foreground">{church.slug}</p>
                  </div>
                </div>
                <Badge className={`text-xs border ${PLATFORM_STATUS_COLORS[church.platformStatus] ?? ""}`}>{church.platformStatus?.replace(/_/g, " ")}</Badge>
              </div>
              {/* Detail fields */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {church.denomination && <span><strong>Denomination:</strong> {church.denomination}</span>}
                {church.country && <span><strong>Country:</strong> {church.country}</span>}
                {church.address && <span className="col-span-2"><strong>Address:</strong> {church.address}</span>}
                {church.email && <span><strong>Email:</strong> {church.email}</span>}
                {church.phone && <span><strong>Phone:</strong> {church.phone}</span>}
                {church.websiteUrl && <span className="col-span-2"><strong>Website:</strong> <a href={church.websiteUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{church.websiteUrl}</a></span>}
                <span><strong>Members:</strong> {church.memberCount ?? 0}</span>
                {church.submittedForReviewAt && <span><strong>Submitted:</strong> {new Date(church.submittedForReviewAt).toLocaleDateString()}</span>}
              </div>
              {church.description && <p className="text-xs text-muted-foreground italic border-l-2 pl-2 border-border">{church.description}</p>}
              {church.platformReviewNote && (
                <p className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-amber-800">Note: {church.platformReviewNote}</p>
              )}
              {["pending_review", "submitted", "draft"].includes(church.platformStatus) && (
                <>
                  <Input
                    placeholder={church.platformStatus === "pending_review" ? "Review note (required to reject)…" : "Note…"}
                    className="text-xs h-8"
                    value={reviewNote[church.id] ?? ""}
                    onChange={e => setReviewNote(prev => ({ ...prev, [church.id]: e.target.value }))}
                    data-testid={`input-review-note-${church.id}`}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white text-xs" onClick={() => review.mutate({ id: church.id, action: "approve", note: reviewNote[church.id] })} disabled={review.isPending} data-testid={`button-approve-org-${church.id}`}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />{t("cm_approveOrg")}
                    </Button>
                    <Button size="sm" variant="destructive" className="text-xs" onClick={() => review.mutate({ id: church.id, action: "reject", note: reviewNote[church.id] })} disabled={review.isPending} data-testid={`button-reject-org-${church.id}`}>
                      <XCircle className="w-3.5 h-3.5 mr-1" />{t("cm_rejectOrg")}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => review.mutate({ id: church.id, action: "request_info", note: reviewNote[church.id] })} disabled={review.isPending} data-testid={`button-request-info-org-${church.id}`}>
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />{t("cm_requestMoreInfoShort")}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Platform Governance: Compliance Cases ──────────────────────────────────────

function ComplianceCasesAdmin() {
  const { t } = useI18n();
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [newCaseForm, setNewCaseForm] = useState({ churchId: "", category: "other", severity: "medium", description: "", internalNotes: "", responseDeadline: "" });
  const [showNewCase, setShowNewCase] = useState(false);
  const [replyMsg, setReplyMsg] = useState("");
  const [enforcementForm, setEnforcementForm] = useState<{ status: string; enforcementAction: string; enforcementReason: string; attachmentUrl: string }>({ status: "", enforcementAction: "", enforcementReason: "", attachmentUrl: "" });

  const { data: cases, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/compliance-cases"],
    queryFn: () => fetch("/api/admin/compliance-cases").then(r => r.ok ? r.json() : []),
  });

  const openCase = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/admin/compliance-cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, churchId: Number(data.churchId) }) });
      if (!r.ok) throw new Error((await r.json()).message ?? "Failed");
      return r.json();
    },
    onSuccess: () => { refetch(); setShowNewCase(false); setNewCaseForm({ churchId: "", category: "other", severity: "medium", description: "", internalNotes: "", responseDeadline: "" }); },
  });

  const updateCase = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const r = await fetch(`/api/admin/compliance-cases/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { refetch(); setSelectedCase(null); },
  });

  const adminReply = useMutation({
    mutationFn: async ({ id, message, attachmentUrl }: { id: number; message: string; attachmentUrl?: string | null }) => {
      const r = await fetch(`/api/admin/compliance-cases/${id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, attachmentUrl: attachmentUrl || null }) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { refetch(); setReplyMsg(""); },
  });

  const statusColors: Record<string, string> = { open: "bg-red-100 text-red-700", investigating: "bg-amber-100 text-amber-700", awaiting_response: "bg-blue-100 text-blue-700", resolved: "bg-green-100 text-green-700", closed: "bg-gray-100 text-gray-600" };
  const severityColors: Record<string, string> = { low: "text-gray-500", medium: "text-amber-600", high: "text-orange-600", critical: "text-red-700 font-bold" };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowNewCase(true)} data-testid="button-open-new-case">
          <Plus className="w-4 h-4 mr-1" />{t("cm_openCase")}
        </Button>
      </div>

      {showNewCase && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 space-y-3">
            <p className="font-semibold text-sm">Open New Compliance Case</p>
            <Input placeholder="Church ID (number)" value={newCaseForm.churchId} onChange={e => setNewCaseForm(p => ({ ...p, churchId: e.target.value }))} className="text-sm h-8" data-testid="input-case-church-id" />
            <div className="flex gap-2">
              <select className="flex-1 border rounded px-2 py-1 text-sm" value={newCaseForm.category} onChange={e => setNewCaseForm(p => ({ ...p, category: e.target.value }))}>
                {["content", "conduct", "financial", "technical", "other"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="flex-1 border rounded px-2 py-1 text-sm" value={newCaseForm.severity} onChange={e => setNewCaseForm(p => ({ ...p, severity: e.target.value }))}>
                {["low", "medium", "high", "critical"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Textarea placeholder="Description (min 10 chars) — will be shown to org owner" value={newCaseForm.description} onChange={e => setNewCaseForm(p => ({ ...p, description: e.target.value }))} className="text-sm" rows={3} data-testid="textarea-case-description" />
            <Textarea placeholder="Internal notes (admin only)" value={newCaseForm.internalNotes} onChange={e => setNewCaseForm(p => ({ ...p, internalNotes: e.target.value }))} className="text-sm" rows={2} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Response Deadline (optional)</label>
              <input
                type="datetime-local"
                className="border rounded px-2 py-1 text-sm w-56"
                value={newCaseForm.responseDeadline}
                onChange={e => setNewCaseForm(p => ({ ...p, responseDeadline: e.target.value }))}
                data-testid="input-case-deadline"
              />
              <p className="text-xs text-gray-400">If set, the owner sees this deadline in their compliance dashboard.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => openCase.mutate({
                ...newCaseForm,
                responseDeadline: newCaseForm.responseDeadline ? new Date(newCaseForm.responseDeadline).toISOString() : null,
              })} disabled={openCase.isPending || !newCaseForm.churchId || newCaseForm.description.length < 10} data-testid="button-submit-new-case">
                {openCase.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Open Case"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewCase(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
      {!isLoading && (!cases || cases.length === 0) && (
        <div className="text-center py-10 text-muted-foreground">{t("cm_noCasesYet")}</div>
      )}
      <div className="space-y-3">
        {cases?.map((c: any) => (
          <Card key={c.id} className="border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedCase(c)} data-testid={`card-case-${c.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{c.caseNumber}</p>
                  <p className="font-semibold text-sm">Church #{c.churchId} · <span className="capitalize">{c.category}</span></p>
                  <p className={`text-xs capitalize ${severityColors[c.severity]}`}>Severity: {c.severity}</p>
                </div>
                <Badge className={`text-xs ${statusColors[c.status] ?? ""}`}>{c.status?.replace("_", " ")}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.description}</p>
              {c.responseDeadline && (
                <p className="text-xs mt-1" style={{ color: new Date(c.responseDeadline) < new Date() ? "#dc2626" : "#92400e" }}>
                  Deadline: {new Date(c.responseDeadline).toLocaleDateString()} {new Date(c.responseDeadline) < new Date() ? "— OVERDUE" : ""}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Case detail dialog */}
      {selectedCase && (
        <Dialog open onOpenChange={() => setSelectedCase(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">{selectedCase.caseNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm max-h-80 overflow-y-auto">
              <p><strong>Church:</strong> #{selectedCase.churchId}</p>
              <p><strong>Category:</strong> {selectedCase.category} · <strong>Severity:</strong> <span className={severityColors[selectedCase.severity]}>{selectedCase.severity}</span></p>
              <p><strong>Status:</strong> {selectedCase.status?.replace("_", " ")}</p>
              {selectedCase.responseDeadline && (
                <p className="text-xs px-2 py-1.5 rounded" style={{ backgroundColor: new Date(selectedCase.responseDeadline) < new Date() ? "#fef2f2" : "#fefce8", color: "#78350f" }}>
                  <strong>Response Deadline:</strong>{" "}
                  {new Date(selectedCase.responseDeadline).toLocaleString()}
                  {new Date(selectedCase.responseDeadline) < new Date() && " — OVERDUE"}
                </p>
              )}
              <p className="bg-gray-50 rounded p-2">{selectedCase.description}</p>
              {selectedCase.internalNotes && <p className="text-xs bg-amber-50 rounded p-2 text-amber-800">Internal: {selectedCase.internalNotes}</p>}
              {selectedCase.responses?.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Conversation</p>
                  {selectedCase.responses.map((r: any) => (
                    <div key={r.id} className={`rounded p-2 text-xs ${r.senderType === "admin" ? "bg-primary/10 ml-4" : "bg-gray-50 mr-4"}`}>
                      <p className="font-semibold capitalize mb-0.5">{r.senderType}</p>
                      <p>{r.message}</p>
                      {r.attachmentUrl && (
                        <a href={r.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-blue-600 underline text-xs">
                          📎 Attachment
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2 pt-2 border-t">
              <Textarea placeholder="Reply to org owner…" value={replyMsg} onChange={e => setReplyMsg(e.target.value)} rows={2} className="text-sm" data-testid="textarea-case-reply" />
              <Input placeholder="Evidence/attachment URL (optional)" value={enforcementForm.attachmentUrl ?? ""} onChange={e => setEnforcementForm(p => ({ ...p, attachmentUrl: e.target.value }))} className="text-xs h-7" data-testid="input-case-attachment-url" />
              <Button size="sm" onClick={() => adminReply.mutate({ id: selectedCase.id, message: replyMsg, attachmentUrl: enforcementForm.attachmentUrl ?? null })} disabled={!replyMsg.trim() || adminReply.isPending} data-testid="button-send-case-reply">
                {adminReply.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1" />Send Reply</>}
              </Button>
            </div>
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Enforcement Action</p>
              <div className="flex gap-2">
                <select className="flex-1 border rounded px-2 py-1 text-xs" value={enforcementForm.enforcementAction} onChange={e => setEnforcementForm(p => ({ ...p, enforcementAction: e.target.value }))}>
                  <option value="">Select action…</option>
                  {["no_action", "warning", "request_changes", "restriction", "suspension", "removal"].map(a => <option key={a} value={a}>{a.replace("_", " ")}</option>)}
                </select>
                <select className="flex-1 border rounded px-2 py-1 text-xs" value={enforcementForm.status} onChange={e => setEnforcementForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="">Update status…</option>
                  {["open", "investigating", "awaiting_response", "resolved", "closed"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <Input placeholder="Enforcement reason (shown to owner)" value={enforcementForm.enforcementReason} onChange={e => setEnforcementForm(p => ({ ...p, enforcementReason: e.target.value }))} className="text-xs h-7" data-testid="input-enforcement-reason" />
              <Button size="sm" variant="destructive" onClick={() => { updateCase.mutate({ id: selectedCase.id, ...enforcementForm }); }} disabled={updateCase.isPending} data-testid="button-apply-enforcement">
                {updateCase.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Platform Governance: Appeals ───────────────────────────────────────────────

function ComplianceAppealsAdmin() {
  const { t } = useI18n();
  const [adminNote, setAdminNote] = useState<Record<number, string>>({});

  const { data: appeals, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/compliance-appeals"],
    queryFn: () => fetch("/api/admin/compliance-appeals").then(r => r.ok ? r.json() : []),
  });

  const action = useMutation({
    mutationFn: async ({ id, status, note }: { id: number; status: string; note?: string }) => {
      const r = await fetch(`/api/admin/compliance-appeals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, adminNote: note }) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { refetch(); queryClient.invalidateQueries({ queryKey: ["/api/admin/governance/summary"] }); },
  });

  const statusColors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", accepted: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-3">
      {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
      {!isLoading && (!appeals || appeals.length === 0) && (
        <div className="text-center py-10 text-muted-foreground">{t("cm_noAppealsYet")}</div>
      )}
      {appeals?.map((appeal: any) => (
        <Card key={appeal.id} className="border">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Church #{appeal.churchId}</p>
              <Badge className={`text-xs ${statusColors[appeal.status] ?? ""}`}>{appeal.status}</Badge>
            </div>
            {appeal.caseId && <p className="text-xs text-muted-foreground">Re: Case #{appeal.caseId}</p>}
            <p className="text-sm bg-gray-50 rounded p-2">{appeal.message}</p>
            {appeal.adminNote && <p className="text-xs bg-amber-50 rounded p-2 text-amber-800">Admin note: {appeal.adminNote}</p>}
            {appeal.status === "pending" && (
              <div className="space-y-2 pt-1">
                <Input placeholder="Admin note (optional)…" className="text-xs h-7" value={adminNote[appeal.id] ?? ""} onChange={e => setAdminNote(p => ({ ...p, [appeal.id]: e.target.value }))} data-testid={`input-appeal-note-${appeal.id}`} />
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white text-xs" onClick={() => action.mutate({ id: appeal.id, status: "accepted", note: adminNote[appeal.id] })} disabled={action.isPending} data-testid={`button-accept-appeal-${appeal.id}`}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />{t("cm_appealAccepted")}
                  </Button>
                  <Button size="sm" variant="destructive" className="text-xs" onClick={() => action.mutate({ id: appeal.id, status: "rejected", note: adminNote[appeal.id] })} disabled={action.isPending} data-testid={`button-reject-appeal-${appeal.id}`}>
                    <XCircle className="w-3.5 h-3.5 mr-1" />{t("cm_appealRejected")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Platform Admin Threads ─────────────────────────────────────────────────────

function PlatformThreadsAdmin() {
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [reply, setReply] = useState("");

  const { data: threads, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/platform-threads"],
    queryFn: () => fetch("/api/admin/platform-threads").then(r => r.ok ? r.json() : []),
  });

  const { data: messages } = useQuery<any[]>({
    queryKey: ["/api/admin/platform-threads", selectedThread?.id, "messages"],
    queryFn: () => fetch(`/api/admin/platform-threads/${selectedThread!.id}/messages`).then(r => r.ok ? r.json() : []),
    enabled: !!selectedThread,
  });

  const sendReply = useMutation({
    mutationFn: async ({ id, message }: { id: number; message: string }) => {
      const r = await fetch(`/api/admin/platform-threads/${id}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { setReply(""); queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-threads", selectedThread?.id, "messages"] }); refetch(); },
  });

  return (
    <div className="flex gap-4 min-h-[400px]">
      <div className="w-56 flex-shrink-0 space-y-2 border-r pr-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Conversations</p>
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        {threads?.map((thread: any) => (
          <button key={thread.id} onClick={() => setSelectedThread(thread)} className={`w-full text-left rounded p-2 text-sm hover:bg-muted transition-colors ${selectedThread?.id === thread.id ? "bg-muted" : ""}`} data-testid={`button-thread-${thread.id}`}>
            <p className="font-semibold truncate">Church #{thread.churchId}</p>
            <p className="text-xs text-muted-foreground truncate">{thread.subject}</p>
            {thread.hasUnreadAdmin && <span className="inline-block w-2 h-2 rounded-full bg-primary mt-1" />}
          </button>
        ))}
        {!isLoading && (!threads || threads.length === 0) && <p className="text-xs text-muted-foreground">No messages yet.</p>}
      </div>
      <div className="flex-1 flex flex-col">
        {!selectedThread && <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a conversation</div>}
        {selectedThread && (
          <>
            <p className="font-semibold mb-2">{selectedThread.subject}</p>
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-64">
              {messages?.map((m: any) => (
                <div key={m.id} className={`rounded p-2 text-sm max-w-xs ${m.senderType === "admin" ? "bg-primary/10 ml-auto text-right" : "bg-gray-100"}`}>
                  <p className="text-xs font-semibold capitalize text-muted-foreground mb-0.5">{m.senderType}</p>
                  <p>{m.message}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply to org owner…" rows={2} className="text-sm flex-1" data-testid="textarea-platform-reply" />
              <Button size="sm" onClick={() => sendReply.mutate({ id: selectedThread.id, message: reply })} disabled={!reply.trim() || sendReply.isPending} data-testid="button-send-platform-reply">
                {sendReply.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Platform Announcements Admin ───────────────────────────────────────────────

function PlatformAnnouncementsAdmin() {
  const { t } = useI18n();
  const [form, setForm] = useState<{ title: string; body: string; targetType: string; targetFilter: string; deliveryChannels: string[] }>({
    title: "", body: "", targetType: "everyone", targetFilter: "", deliveryChannels: ["in_app"],
  });
  const [showForm, setShowForm] = useState(false);

  const needsTargetFilter = ["members_specific", "country", "language"].includes(form.targetType);
  const targetFilterPlaceholder = form.targetType === "members_specific"
    ? "Comma-separated church IDs (e.g. 12,45,67)"
    : form.targetType === "country"
      ? "Country code(s), e.g. NG,US"
      : "Language code(s), e.g. en,es";

  const toggleChannel = (ch: string) =>
    setForm(p => ({ ...p, deliveryChannels: p.deliveryChannels.includes(ch) ? p.deliveryChannels.filter(c => c !== ch) : [...p.deliveryChannels, ch] }));

  const { data: announcements, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/platform-announcements"],
    queryFn: () => fetch("/api/admin/platform-announcements").then(r => r.ok ? r.json() : []),
  });

  const create = useMutation({
    mutationFn: async (data: any) => {
      const payload = { title: data.title, body: data.body, targetType: data.targetType, targetFilter: data.targetFilter || null, deliveryChannels: data.deliveryChannels };
      const r = await fetch("/api/admin/platform-announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { refetch(); setShowForm(false); setForm({ title: "", body: "", targetType: "everyone", targetFilter: "", deliveryChannels: ["in_app"] }); },
  });

  const send = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/platform-announcements/${id}/send`, { method: "POST" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(true)} data-testid="button-new-announcement">
          <Plus className="w-4 h-4 mr-1" />{t("cm_composeAnnouncement")}
        </Button>
      </div>
      {showForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <Input placeholder={t("cm_announcementTitle")} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="text-sm" data-testid="input-announcement-title" />
            <Textarea placeholder={t("cm_announcementBody")} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={4} className="text-sm" data-testid="textarea-announcement-body" />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Audience</p>
              <select className="border rounded px-2 py-1 text-sm w-full" value={form.targetType} onChange={e => setForm(p => ({ ...p, targetType: e.target.value, targetFilter: "" }))} data-testid="select-announcement-target">
                {["everyone", "org_owners", "church_owners", "ministry_owners", "org_admins", "dept_leaders", "members_specific", "country", "language"].map(tKey => <option key={tKey} value={tKey}>{tKey.replace(/_/g, " ")}</option>)}
              </select>
              {needsTargetFilter && (
                <Input className="mt-1.5 text-sm h-8" placeholder={targetFilterPlaceholder} value={form.targetFilter} onChange={e => setForm(p => ({ ...p, targetFilter: e.target.value }))} data-testid="input-announcement-target-filter" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Delivery channels</p>
              <div className="flex gap-3 flex-wrap">
                {[["in_app", "In-app banner"], ["inbox", "Platform inbox"], ["email", "Email (consented users)"]].map(([ch, label]) => (
                  <label key={ch} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={form.deliveryChannels.includes(ch)} onChange={() => toggleChannel(ch)} data-testid={`checkbox-channel-${ch}`} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => create.mutate(form)} disabled={create.isPending || !form.title || !form.body || form.deliveryChannels.length === 0} data-testid="button-create-announcement">
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Draft"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
      {!isLoading && (!announcements || announcements.length === 0) && (
        <div className="text-center py-10 text-muted-foreground">No announcements yet.</div>
      )}
      <div className="space-y-3">
        {announcements?.map((ann: any) => (
          <Card key={ann.id} className="border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{ann.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ann.targetType?.replace("_", " ")} · {ann.sentAt ? `Sent ${new Date(ann.sentAt).toLocaleDateString()}` : "Draft"}</p>
                </div>
                {!ann.sentAt && (
                  <Button size="sm" className="bg-primary text-primary-foreground text-xs" onClick={() => send.mutate(ann.id)} disabled={send.isPending} data-testid={`button-send-announcement-${ann.id}`}>
                    <Send className="w-3.5 h-3.5 mr-1" />{t("cm_sendAnnouncement")}
                  </Button>
                )}
              </div>
              <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{ann.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
