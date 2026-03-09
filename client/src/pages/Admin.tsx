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
import { ShieldCheck, Inbox, MessageSquare, Send, Loader2, CheckCircle, CheckCheck, XCircle, RefreshCw, AlertTriangle, User, Paperclip, FileText, Image, Download, Smartphone, Search, Sparkles, Archive, Calendar, Edit, Eye, Trash2, Clock, X, Copy, Telescope, GraduationCap, Plus, Star, ThumbsUp, Flag, Heart, BarChart3, TrendingUp } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { useLocation } from "wouter";
import type { PrayerRequest, ThreadMessage, PrayerAttachment, Devotional, SundaySchoolLesson, InboxThread, InboxMessage } from "@shared/schema";
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
  replied: { label: "Replied", color: "bg-green-100 text-green-800" },
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
                    <p className="font-medium text-foreground">{testimony.name || "Anonymous"}</p>
                    {testimony.country && <p className="text-xs text-muted-foreground">{testimony.country}</p>}
                    <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{testimony.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {testimony.createdAt ? format(new Date(testimony.createdAt), "MMM d, yyyy h:mm a") : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
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
                  {selectedRequest.status !== "replied" && (
                    <Button
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ requestId: selectedRequest.id, status: "replied" })}
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-mark-replied"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Replied
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

export default function Admin() {
  const { isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      setLocation("/admin-login");
    }
  }, [isAdmin, isLoading, setLocation]);

  if (isLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage devotionals and prayer requests.</p>
        </div>
      </div>

      <Tabs defaultValue="inbox" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 max-w-5xl">
          <TabsTrigger value="inbox" data-testid="tab-inbox">
            <Inbox className="w-4 h-4 mr-2" />
            Prayer Inbox
          </TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="testimonies" data-testid="tab-testimonies">
            <Star className="w-4 h-4 mr-2" />
            Testimonies
          </TabsTrigger>
          <TabsTrigger value="archive" data-testid="tab-archive">
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-preview">
            <Telescope className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="sunday-school" data-testid="tab-sunday-school">
            <GraduationCap className="w-4 h-4 mr-2" />
            Sunday School
          </TabsTrigger>
          <TabsTrigger value="devotionals" data-testid="tab-devotionals">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Create New
          </TabsTrigger>
          <TabsTrigger value="promises" data-testid="tab-promises">
            <Sparkles className="w-4 h-4 mr-2" />
            Promises
          </TabsTrigger>
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
      </Tabs>
    </div>
  );
}
