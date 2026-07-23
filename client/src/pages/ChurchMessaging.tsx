import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Plus, Send, Loader2, ArrowLeft, AlertCircle, Lock, X,
  AlertTriangle, UserPlus, UserCheck, RotateCcw, ChevronDown,
} from "lucide-react";
import type { Church, ChurchMember } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }
interface Conversation {
  id: number; churchId: number; subject: string; category: string;
  status: string; createdBy: string; targetType: string | null;
  targetGroupId: number | null; isUrgent: boolean; assignedTo: string | null;
  createdAt: string; updatedAt: string;
}
interface Message {
  id: number; conversationId: number; churchId: number; senderUid: string;
  senderName: string | null; senderRole: string | null; body: string;
  isSystemMessage: boolean; deletedBySender: boolean; createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General", prayer: "Prayer Request", counseling: "Counseling",
  scripture: "Scripture Question", pastoral: "Pastoral Care", support: "Support",
};

const LEADER_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"];
const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];

type InboxTab = "all" | "unassigned" | "mine" | "counseling" | "prayer" | "closed";

const INBOX_TABS: { id: InboxTab; label: string }[] = [
  { id: "all", label: "All Open" },
  { id: "unassigned", label: "Unassigned" },
  { id: "mine", label: "Assigned to Me" },
  { id: "counseling", label: "Counseling" },
  { id: "prayer", label: "Prayer" },
  { id: "closed", label: "Closed" },
];

export default function ChurchMessaging() {
  const [, params] = useRoute("/church/:slug/messages");
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSignedIn = !!user && !!emailVerified;

  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newMessage, setNewMessage] = useState("");
  const [newTargetType, setNewTargetType] = useState("direct");
  const [newTargetGroupId, setNewTargetGroupId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<InboxTab>("all");

  // Leader action panel states
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [showAddParticipantPanel, setShowAddParticipantPanel] = useState(false);
  const [assignToUid, setAssignToUid] = useState("");
  const [addParticipantUid, setAddParticipantUid] = useState("");
  const [updatingConv, setUpdatingConv] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: church } = useQuery<Church>({
    queryKey: ["/api/churches/slug", slug],
    queryFn: () => fetch(`/api/churches/slug/${slug}`).then(r => r.ok ? r.json() : Promise.reject()),
    enabled: !!slug,
  });

  const { data: myRole } = useQuery<MyRole>({
    queryKey: ["/api/churches/slug", slug, "my-role"],
    queryFn: async () => {
      const token = await getIdToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await fetch(`/api/churches/slug/${slug}/my-role`, { headers });
      return r.ok ? r.json() : { role: null, memberId: null, status: null };
    },
    enabled: !!slug && isSignedIn,
  });

  const isLeader = LEADER_ROLES.includes(myRole?.role ?? "");
  const isAdmin = ADMIN_ROLES.includes(myRole?.role ?? "");

  const { data: convsData, refetch: refetchConvs } = useQuery<{ conversations: Conversation[]; unreadCount: number }>({
    queryKey: ["/api/churches", church?.id, "conversations"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id) return { conversations: [], unreadCount: 0 };
      const r = await fetch(`/api/churches/${church.id}/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : { conversations: [], unreadCount: 0 };
    },
    enabled: !!church?.id && isSignedIn && myRole?.status === "active",
    refetchInterval: 15000,
  });

  const { data: churchMembers } = useQuery<ChurchMember[]>({
    queryKey: ["/api/churches", church?.id, "members"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id) return [];
      const r = await fetch(`/api/churches/${church.id}/members`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && isLeader,
  });

  const { data: groups } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/churches", church?.id, "groups"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id) return [];
      const r = await fetch(`/api/churches/${church.id}/groups`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && isLeader,
  });

  const { data: threadData, refetch: refetchThread } = useQuery<{ conversation: Conversation; messages: Message[]; participants: any[] }>({
    queryKey: ["/api/churches", church?.id, "conversations", selectedConvId],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id || !selectedConvId) return null;
      const r = await fetch(`/api/churches/${church.id}/conversations/${selectedConvId}`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : null;
    },
    enabled: !!church?.id && !!selectedConvId && isSignedIn,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (selectedConvId) {
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "conversations"] });
    }
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadData?.messages?.length]);

  const createConversation = async () => {
    if (!church?.id || !newSubject.trim() || !newMessage.trim()) return;
    setSubmitting(true);
    try {
      const token = await getIdToken();
      const body: Record<string, any> = {
        subject: newSubject.trim(),
        category: newCategory,
        initialMessage: newMessage.trim(),
        targetType: isLeader ? newTargetType : "direct",
      };
      if (newTargetType === "group" && newTargetGroupId) body.targetGroupId = Number(newTargetGroupId);
      const r = await fetch(`/api/churches/${church.id}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      const data = await r.json();
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "conversations"] });
      setSelectedConvId(data.conversation.id);
      setShowNewForm(false);
      setNewSubject(""); setNewCategory("general"); setNewMessage("");
      setNewTargetType("direct"); setNewTargetGroupId("");
      toast({ title: "Message sent" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const sendReply = async () => {
    if (!church?.id || !selectedConvId || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/conversations/${selectedConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: replyText.trim() }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      setReplyText("");
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "conversations", selectedConvId] });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const updateConversation = async (patch: { status?: string; isUrgent?: boolean; assignedTo?: string | null }) => {
    if (!church?.id || !selectedConvId) return;
    setUpdatingConv(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/conversations/${selectedConvId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "conversations", selectedConvId] });
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "conversations"] });
      toast({ title: "Updated" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setUpdatingConv(false); }
  };

  const addParticipant = async () => {
    if (!church?.id || !selectedConvId || !addParticipantUid) return;
    setUpdatingConv(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/conversations/${selectedConvId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firebaseUid: addParticipantUid, role: "assistant" }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "conversations", selectedConvId] });
      setShowAddParticipantPanel(false);
      setAddParticipantUid("");
      toast({ title: "Pastoral assistant added" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setUpdatingConv(false); }
  };

  const assignConversation = async () => {
    if (!assignToUid) return;
    await updateConversation({ assignedTo: assignToUid });
    setShowAssignPanel(false);
    setAssignToUid("");
  };

  if (!isSignedIn || myRole?.status !== "active") {
    return (
      <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
        <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #b8962e", backgroundColor: "#fff" }}>
          <CardContent className="pt-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#b8962e" }} />
            <div>
              <p className="font-semibold text-sm">{t("cm_activeMembershipRequired")}</p>
              <p className="text-xs text-muted-foreground">{t("cm_signInForMessages")}</p>
            </div>
          </CardContent>
        </Card>
      </ChurchModeShell>
    );
  }

  const allConversations = convsData?.conversations ?? [];

  // Filter conversations for leader inbox tabs
  const filteredConversations = isLeader ? allConversations.filter(conv => {
    if (activeTab === "all") return conv.status !== "closed";
    if (activeTab === "unassigned") return conv.status !== "closed" && !conv.assignedTo;
    if (activeTab === "mine") return conv.status !== "closed" && conv.assignedTo === user?.uid;
    if (activeTab === "counseling") return conv.status !== "closed" && conv.category === "counseling";
    if (activeTab === "prayer") return conv.status !== "closed" && conv.category === "prayer";
    if (activeTab === "closed") return conv.status === "closed";
    return true;
  }) : allConversations;

  const selectedConv = threadData?.conversation ?? null;
  const messages = threadData?.messages ?? [];
  const participants = threadData?.participants ?? [];
  const myUid = user?.uid;

  const leaderMembers = (churchMembers ?? []).filter(m =>
    m.status === "active" && LEADER_ROLES.includes(m.role)
  );

  const assignedMember = selectedConv?.assignedTo
    ? (churchMembers ?? []).find(m => m.firebaseUid === selectedConv.assignedTo)
    : null;

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#b8962e18" }}>
              <MessageSquare className="w-5 h-5" style={{ color: "#b8962e" }} />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>
                {isLeader ? t("cm_pastoralInbox") : t("cm_messages")}
              </h2>
              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#7a7570" }}>
                <Lock className="w-3 h-3" /> {t("cm_privateChurchMessaging")}
              </p>
            </div>
          </div>
          {!showNewForm && !selectedConvId && (
            <Button onClick={() => setShowNewForm(true)} style={{ backgroundColor: "#1a2744" }} data-testid="button-new-message">
              <Plus className="w-4 h-4 mr-1.5" />{t("cm_newMessage")}
            </Button>
          )}
        </div>

        {/* Leader inbox tabs */}
        {isLeader && !selectedConvId && !showNewForm && (
          <div className="flex overflow-x-auto gap-1 pb-1 scrollbar-hide">
            {INBOX_TABS.map(tab => {
              const count = allConversations.filter(conv => {
                if (tab.id === "all") return conv.status !== "closed";
                if (tab.id === "unassigned") return conv.status !== "closed" && !conv.assignedTo;
                if (tab.id === "mine") return conv.status !== "closed" && conv.assignedTo === user?.uid;
                if (tab.id === "counseling") return conv.status !== "closed" && conv.category === "counseling";
                if (tab.id === "prayer") return conv.status !== "closed" && conv.category === "prayer";
                if (tab.id === "closed") return conv.status === "closed";
                return false;
              }).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: activeTab === tab.id ? "#1a2744" : "#f0ebe3",
                    color: activeTab === tab.id ? "#fff" : "#5a4e3d",
                  }}
                  data-testid={`button-inbox-tab-${tab.id}`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                      style={{
                        backgroundColor: activeTab === tab.id ? "#ffffff33" : "#1a274422",
                        color: activeTab === tab.id ? "#fff" : "#1a2744",
                      }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* New conversation form */}
        {showNewForm && (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between" style={{ color: "#1a2744" }}>
                {isLeader ? t("cm_newMessage") : t("cm_newMessageToLeadership")}
                <button onClick={() => setShowNewForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Leader: target type selector */}
              {isLeader && (
                <div className="space-y-1.5">
                  <Label>{t("cm_sendTo")}</Label>
                  <Select value={newTargetType} onValueChange={setNewTargetType}>
                    <SelectTrigger data-testid="select-target-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">{t("cm_directMessage")}</SelectItem>
                      <SelectItem value="all">{t("cm_allChurchMembers")}</SelectItem>
                      <SelectItem value="leaders">{t("cm_leadersOnly")}</SelectItem>
                      <SelectItem value="group">{t("cm_specificGroup")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Group selector when target = group */}
              {isLeader && newTargetType === "group" && (
                <div className="space-y-1.5">
                  <Label>{t("cm_group")}</Label>
                  <Select value={newTargetGroupId} onValueChange={setNewTargetGroupId}>
                    <SelectTrigger data-testid="select-target-group">
                      <SelectValue placeholder="Select a group…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(groups ?? []).map(g => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>{t("cm_messageCategory")}</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger data-testid="select-message-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("cm_subjectRequired")}</Label>
                <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder={t("cm_whatsThisAbout")} data-testid="input-message-subject" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("cm_messageBody")}</Label>
                <Textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={t("cm_writeYourMessage")} rows={4} data-testid="input-message-body" />
              </div>
              <div className="flex gap-2">
                <Button onClick={createConversation} disabled={submitting || !newSubject.trim() || !newMessage.trim()} style={{ backgroundColor: "#1a2744" }} data-testid="button-send-message">
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_sending")}</> : <><Send className="w-4 h-4 mr-1.5" />{t("cm_send")}</>}
                </Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>{t("cm_cancel")}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Thread view */}
        {selectedConvId && selectedConv && (
          <div className="space-y-4">
            {/* Thread header */}
            <div className="flex items-start gap-3">
              <button onClick={() => { setSelectedConvId(null); setShowAssignPanel(false); setShowAddParticipantPanel(false); refetchConvs(); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                <ArrowLeft className="w-4 h-4" />{t("cm_back")}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: "#1a2744" }}>{selectedConv.subject}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[selectedConv.category] ?? selectedConv.category}</Badge>
                  {selectedConv.status === "closed" && <Badge variant="secondary" className="text-xs">{t("cm_closedLabel")}</Badge>}
                  {selectedConv.isUrgent && <Badge className="text-xs bg-red-100 text-red-700 border-red-300">{t("cm_urgentLabel")}</Badge>}
                  {assignedMember && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {assignedMember.displayName ?? assignedMember.email}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Leader action buttons */}
              {isLeader && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {selectedConv.status !== "closed" ? (
                    <Button size="sm" variant="outline" onClick={() => updateConversation({ status: "closed" })} disabled={updatingConv} data-testid="button-close-conversation">
                      {t("cm_closeConversation")}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => updateConversation({ status: "open" })} disabled={updatingConv} data-testid="button-reopen-conversation">
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />{t("cm_reopenConversation")}
                    </Button>
                  )}

                  <Button
                    size="sm" variant="outline"
                    onClick={() => updateConversation({ isUrgent: !selectedConv.isUrgent })}
                    disabled={updatingConv}
                    className={selectedConv.isUrgent ? "border-red-300 text-red-700 bg-red-50" : ""}
                    data-testid="button-toggle-urgent"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </Button>

                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => { setShowAssignPanel(p => !p); setShowAddParticipantPanel(false); }} data-testid="button-assign-toggle">
                      <UserCheck className="w-3.5 h-3.5" />
                    </Button>
                  )}

                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => { setShowAddParticipantPanel(p => !p); setShowAssignPanel(false); }} data-testid="button-add-participant-toggle">
                      <UserPlus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Assign panel */}
            {showAssignPanel && isAdmin && (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#f0ebe3" }}>
                <CardContent className="pt-3 pb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 flex-shrink-0" style={{ color: "#1a2744" }} />
                  <span className="text-xs font-medium" style={{ color: "#1a2744" }}>{t("cm_assignTo")}</span>
                  <Select value={assignToUid} onValueChange={setAssignToUid}>
                    <SelectTrigger className="h-7 text-xs flex-1" data-testid="select-assign-to">
                      <SelectValue placeholder={t("cm_selectLeader")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("cm_unassigned")}</SelectItem>
                      {leaderMembers.map(m => (
                        <SelectItem key={m.firebaseUid} value={m.firebaseUid}>
                          {m.displayName ?? m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={assignConversation} disabled={!assignToUid || updatingConv} style={{ backgroundColor: "#1a2744" }} data-testid="button-assign-confirm">
                    {updatingConv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("cm_assign")}
                  </Button>
                  <button onClick={() => setShowAssignPanel(false)} className="ml-1"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </CardContent>
              </Card>
            )}

            {/* Add participant panel */}
            {showAddParticipantPanel && isAdmin && (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#f0ebe3" }}>
                <CardContent className="pt-3 pb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 flex-shrink-0" style={{ color: "#1a2744" }} />
                  <span className="text-xs font-medium whitespace-nowrap" style={{ color: "#1a2744" }}>{t("cm_addPastoralAssistant")}</span>
                  <Select value={addParticipantUid} onValueChange={setAddParticipantUid}>
                    <SelectTrigger className="h-7 text-xs flex-1" data-testid="select-add-participant">
                      <SelectValue placeholder={t("cm_selectMember")} />
                    </SelectTrigger>
                    <SelectContent>
                      {leaderMembers.map(m => (
                        <SelectItem key={m.firebaseUid} value={m.firebaseUid}>
                          {m.displayName ?? m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={addParticipant} disabled={!addParticipantUid || updatingConv} style={{ backgroundColor: "#1a2744" }} data-testid="button-add-participant-confirm">
                    {updatingConv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("cm_add")}
                  </Button>
                  <button onClick={() => setShowAddParticipantPanel(false)} className="ml-1"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </CardContent>
              </Card>
            )}

            {/* Participants summary (visible to leaders) */}
            {isLeader && participants.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">{t("cm_participants")}</span>
                {participants.map((p: any) => (
                  <Badge key={p.id} variant="outline" className="text-xs">{p.displayName ?? p.firebaseUid}</Badge>
                ))}
              </div>
            )}

            {/* Messages */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardContent className="pt-4">
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {messages.length === 0 && (
                    <p className="text-center text-sm py-6" style={{ color: "#7a7570" }}>{t("cm_noMessagesThread")}</p>
                  )}
                  {messages.map(msg => {
                    const isMe = msg.senderUid === myUid;
                    const isPastor = msg.senderRole === "pastor" || msg.senderRole === "admin";
                    const isSystem = msg.isSystemMessage;
                    if (isSystem) return (
                      <div key={msg.id} className="text-center text-xs py-1" style={{ color: "#9a9080" }}>
                        {msg.body}
                      </div>
                    );
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 space-y-0.5 ${isMe ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                          style={{
                            backgroundColor: isMe ? "#1a2744" : isPastor ? "#f0ebe3" : "#f5f5f5",
                            color: isMe ? "#fff" : "#1a2744",
                          }}>
                          {!isMe && (
                            <p className="text-[10px] font-semibold opacity-60">
                              {msg.senderName ?? "Member"}{isPastor ? " · Leadership" : ""}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                          <p className="text-[10px] opacity-50 text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply box */}
                {selectedConv.status !== "closed" && (
                  <div className="border-t pt-4 mt-4 flex gap-2" style={{ borderColor: "#e0dcd8" }}>
                    <Input
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Write a reply…"
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      data-testid="input-reply-text"
                      className="flex-1"
                    />
                    <Button onClick={sendReply} disabled={submitting || !replyText.trim()} style={{ backgroundColor: "#1a2744" }} data-testid="button-send-reply">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
                {selectedConv.status === "closed" && (
                  <div className="pt-4 mt-4 border-t flex items-center justify-between gap-3" style={{ borderColor: "#e0dcd8" }}>
                    <p className="text-sm" style={{ color: "#7a7570" }}>{t("cm_closedLabel")}.</p>
                    {isLeader && (
                      <Button size="sm" variant="outline" onClick={() => updateConversation({ status: "open" })} disabled={updatingConv} data-testid="button-reopen-inline">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />{t("cm_reopenConversation")}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conversation list */}
        {!selectedConvId && !showNewForm && (
          <div className="space-y-3">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <MessageSquare className="w-10 h-10 mx-auto opacity-25" style={{ color: "#1a2744" }} />
                <p className="text-sm" style={{ color: "#7a7570" }}>
                  {isLeader
                    ? activeTab === "mine" ? "No conversations assigned to you."
                    : activeTab === "unassigned" ? "No unassigned conversations."
                    : activeTab === "closed" ? "No closed conversations."
                    : "No conversations yet. Members can message you from here."
                    : "No messages yet. Start a conversation with church leadership."}
                </p>
                {!isLeader && (
                  <Button onClick={() => setShowNewForm(true)} variant="outline" data-testid="button-start-conversation">
                    <Plus className="w-4 h-4 mr-1.5" />Start a Conversation
                  </Button>
                )}
              </div>
            ) : filteredConversations.map(conv => (
              <Card
                key={conv.id}
                className="border-0 shadow-sm cursor-pointer transition-all hover:shadow-md"
                style={{ backgroundColor: "#fff" }}
                onClick={() => setSelectedConvId(conv.id)}
                data-testid={`card-conversation-${conv.id}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate" style={{ color: "#1a2744" }}>{conv.subject}</p>
                        {conv.isUrgent && <Badge className="text-xs bg-red-100 text-red-700 border-red-300">{t("cm_urgentLabel")}</Badge>}
                        {!conv.assignedTo && conv.status !== "closed" && isLeader && (
                          <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">{t("cm_unassigned")}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[conv.category] ?? conv.category}</Badge>
                        {conv.status === "closed" && <Badge variant="secondary" className="text-xs">{t("cm_closedLabel")}</Badge>}
                        <span className="text-xs" style={{ color: "#7a7570" }}>
                          {new Date(conv.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 rotate-180 flex-shrink-0 mt-0.5 opacity-40" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ChurchModeShell>
  );
}
