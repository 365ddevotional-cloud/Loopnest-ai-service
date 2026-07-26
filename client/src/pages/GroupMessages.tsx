import { useUser } from "@/contexts/UserContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GroupModeShell from "@/components/GroupModeShell";
import type { Group, GroupMember, GroupMessage } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function useGroupData(groupId: number) {
  const { getIdToken } = useUser();
  return useQuery<{ group: Group; myMember: GroupMember; memberCount: number }>({
    queryKey: ["/api/groups", groupId],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });
}

export default function GroupMessages() {
  const [, params] = useRoute("/group/:id/messages");
  const [, navigate] = useLocation();
  const groupId = Number((params as any)?.id);
  const { user, emailVerified, getIdToken } = useUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: groupData, isLoading: loadingGroup } = useGroupData(groupId);

  const { data: messages = [], isLoading: loadingMsgs } = useQuery<GroupMessage[]>({
    queryKey: ["/api/groups", groupId, "messages"],
    enabled: !!groupData,
    refetchInterval: 8000,
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "messages"] });
      setText("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function handleSend() {
    if (!text.trim()) return;
    sendMutation.mutate(text.trim());
  }

  if (!user || !emailVerified) { navigate("/signin"); return null; }
  if (loadingGroup) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!groupData) return null;

  const myUid = user?.uid;

  return (
    <GroupModeShell group={groupData.group} myMember={groupData.myMember}>
      <div className="flex flex-col gap-4">
        <h2 className="font-serif text-xl font-bold">Messages</h2>

        {/* Chat area */}
        <div className="space-y-3 min-h-[50vh]" data-testid="messages-container">
          {loadingMsgs ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Say hello!</p>
          ) : (
            messages.map(msg => {
              const isMe = msg.firebaseUid === myUid;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`} data-testid={`msg-${msg.id}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                    {!isMe && <p className="text-xs font-semibold mb-0.5 opacity-70">{msg.displayName ?? "Member"}</p>}
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className={`text-[10px] mt-0.5 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {msg.createdAt ? format(new Date(msg.createdAt), "h:mm a") : ""}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 sticky bottom-0 pb-2">
          <Input
            placeholder="Type a message…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1"
            data-testid="input-message"
          />
          <Button onClick={handleSend} disabled={!text.trim() || sendMutation.isPending} size="icon" data-testid="button-send-message">
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </GroupModeShell>
  );
}
