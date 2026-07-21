import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Send, Loader2, ArrowLeft, AlertCircle, Lock, X } from "lucide-react";
import type { Church } from "@shared/schema";

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

export default function ChurchMessaging() {
  const [, params] = useRoute("/church/:slug/messages");
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSignedIn = !!user && !!emailVerified;

  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newMessage, setNewMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
      const r = await fetch(`/api/churches/${church.id}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: newSubject.trim(), category: newCategory, initialMessage: newMessage.trim(), targetType: "direct" }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      const data = await r.json();
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "conversations"] });
      setSelectedConvId(data.conversation.id);
      setShowNewForm(false);
      setNewSubject(""); setNewCategory("general"); setNewMessage("");
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

  const closeConversation = useMutation({
    mutationFn: async (convId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "closed" }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "conversations", selectedConvId] });
      toast({ title: "Conversation closed" });
    },
  });

  if (!isSignedIn || myRole?.status !== "active") {
    return (
      <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
        <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #b8962e", backgroundColor: "#fff" }}>
          <CardContent className="pt-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#b8962e" }} />
            <div>
              <p className="font-semibold text-sm">Active Membership Required</p>
              <p className="text-xs text-muted-foreground">Sign in and be an active member to access messages.</p>
            </div>
          </CardContent>
        </Card>
      </ChurchModeShell>
    );
  }

  const conversations = convsData?.conversations ?? [];
  const selectedConv = threadData?.conversation ?? null;
  const messages = threadData?.messages ?? [];
  const myUid = user?.uid;

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#b8962e18" }}>
              <MessageSquare className="w-5 h-5" style={{ color: "#b8962e" }} />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>
                {isLeader ? "Pastoral Inbox" : "Messages"}
              </h2>
              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#7a7570" }}>
                <Lock className="w-3 h-3" /> Private Church Messaging
              </p>
            </div>
          </div>
          {!showNewForm && !selectedConvId && (
            <Button onClick={() => setShowNewForm(true)} style={{ backgroundColor: "#1a2744" }} data-testid="button-new-message">
              <Plus className="w-4 h-4 mr-1.5" />New Message
            </Button>
          )}
        </div>

        {/* New conversation form */}
        {showNewForm && (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between" style={{ color: "#1a2744" }}>
                New Message to Church Leadership
                <button onClick={() => setShowNewForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
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
                <Label>Subject *</Label>
                <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="What's this about?" data-testid="input-message-subject" />
              </div>
              <div className="space-y-1.5">
                <Label>Message *</Label>
                <Textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Write your message here…" rows={4} data-testid="input-message-body" />
              </div>
              <div className="flex gap-2">
                <Button onClick={createConversation} disabled={submitting || !newSubject.trim() || !newMessage.trim()} style={{ backgroundColor: "#1a2744" }} data-testid="button-send-message">
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : <><Send className="w-4 h-4 mr-1.5" />Send</>}
                </Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Thread view */}
        {selectedConvId && selectedConv && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { setSelectedConvId(null); refetchConvs(); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />Back
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: "#1a2744" }}>{selectedConv.subject}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[selectedConv.category] ?? selectedConv.category}</Badge>
                  {selectedConv.status === "closed" && <Badge variant="secondary" className="text-xs">Closed</Badge>}
                  {isLeader && selectedConv.isUrgent && <Badge className="text-xs bg-red-100 text-red-700 border-red-300">Urgent</Badge>}
                </div>
              </div>
              {isLeader && selectedConv.status !== "closed" && (
                <Button size="sm" variant="outline" onClick={() => closeConversation.mutate(selectedConvId)}>
                  Close
                </Button>
              )}
            </div>

            {/* Messages */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardContent className="pt-4">
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {messages.length === 0 && (
                    <p className="text-center text-sm py-6" style={{ color: "#7a7570" }}>No messages yet.</p>
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
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 space-y-0.5 ${
                          isMe ? "rounded-tr-sm" : "rounded-tl-sm"
                        }`}
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
                  <p className="text-center text-sm pt-4 mt-4 border-t" style={{ borderColor: "#e0dcd8", color: "#7a7570" }}>
                    This conversation has been closed.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conversation list */}
        {!selectedConvId && !showNewForm && (
          <div className="space-y-3">
            {conversations.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <MessageSquare className="w-10 h-10 mx-auto opacity-25" style={{ color: "#1a2744" }} />
                <p className="text-sm" style={{ color: "#7a7570" }}>
                  {isLeader ? "No conversations yet. Members can message you from here." : "No messages yet. Start a conversation with church leadership."}
                </p>
                {!isLeader && (
                  <Button onClick={() => setShowNewForm(true)} variant="outline" data-testid="button-start-conversation">
                    <Plus className="w-4 h-4 mr-1.5" />Start a Conversation
                  </Button>
                )}
              </div>
            ) : conversations.map(conv => (
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
                        {conv.isUrgent && <Badge className="text-xs bg-red-100 text-red-700 border-red-300">Urgent</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[conv.category] ?? conv.category}</Badge>
                        {conv.status === "closed" && <Badge variant="secondary" className="text-xs">Closed</Badge>}
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
