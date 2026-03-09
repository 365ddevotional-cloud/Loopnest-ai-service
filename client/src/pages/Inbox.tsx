import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { format } from "date-fns";
import {
  Loader2, Send, MessageSquare, Search, ArrowLeft, Plus, Mail, Inbox as InboxIcon, Bot,
} from "lucide-react";
import type { InboxThread, InboxMessage } from "@shared/schema";
import { INBOX_CATEGORIES } from "@shared/schema";

type ThreadWithPreview = InboxThread & {
  lastMessage?: string;
  lastMessageDate?: string;
  lastMessageSender?: string;
};

type ThreadDetail = {
  thread: InboxThread;
  messages: InboxMessage[];
};

const CATEGORY_COLORS: Record<string, string> = {
  Prayer: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Counseling: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Scripture Question": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  Support: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  General: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  replied: { label: "Replied", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" },
};

const ALL_FILTERS = ["All", ...INBOX_CATEGORIES] as const;

export default function Inbox() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showCompose, setShowCompose] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [composeName, setComposeName] = useState("");
  const [composeCategory, setComposeCategory] = useState<string>("General");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");

  const { data: threads = [], isLoading } = useQuery<ThreadWithPreview[]>({
    queryKey: ["/api/inbox/threads", searchedEmail],
    queryFn: async () => {
      if (!searchedEmail) return [];
      const res = await fetch(`/api/inbox/threads?email=${encodeURIComponent(searchedEmail)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!searchedEmail,
  });

  const { data: threadDetail, isLoading: isLoadingDetail } = useQuery<ThreadDetail>({
    queryKey: ["/api/inbox/threads", selectedThreadId, searchedEmail],
    queryFn: async () => {
      if (!selectedThreadId || !searchedEmail) return null;
      const res = await fetch(`/api/inbox/threads/${selectedThreadId}?email=${encodeURIComponent(searchedEmail)}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedThreadId && !!searchedEmail,
  });

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/inbox/threads", {
        userEmail: searchedEmail,
        userName: composeName,
        subject: composeSubject,
        category: composeCategory,
        message: composeMessage,
      });
    },
    onSuccess: () => {
      setShowCompose(false);
      setComposeName("");
      setComposeCategory("General");
      setComposeSubject("");
      setComposeMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/threads", searchedEmail] });
      toast({ title: "Message sent", description: "Your new thread has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create thread.", variant: "destructive" });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/inbox/threads/${selectedThreadId}/messages?email=${encodeURIComponent(searchedEmail)}`, {
        message: replyMessage,
      });
    },
    onSuccess: () => {
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/threads", selectedThreadId, searchedEmail] });
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/threads", searchedEmail] });
      toast({ title: "Reply sent" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send reply.", variant: "destructive" });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    setSearchedEmail(email);
    setSelectedThreadId(null);
    setShowCompose(false);
  };

  const handleCreateThread = () => {
    if (!composeName.trim() || !composeSubject.trim() || !composeMessage.trim()) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    createThreadMutation.mutate();
  };

  const handleSendReply = () => {
    if (!replyMessage.trim()) return;
    sendReplyMutation.mutate();
  };

  const filteredThreads = activeFilter === "All"
    ? threads
    : threads.filter((t) => t.category === activeFilter);

  const truncate = (text: string, len: number) =>
    text.length > len ? text.slice(0, len) + "..." : text;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary" data-testid="text-inbox-title">
          My Inbox
        </h1>
        <div className="w-24 h-1 bg-primary mx-auto rounded-full opacity-30" />
        <p className="text-muted-foreground max-w-xl mx-auto">
          View and manage your conversations with our ministry team.
        </p>
      </div>

      <Card className="bg-white dark:bg-card border-primary/10 shadow-xl shadow-primary/5 mb-6">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="inbox-email">Enter your email to access your inbox</Label>
              <Input
                id="inbox-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                data-testid="input-inbox-email"
              />
            </div>
            <Button type="submit" disabled={isLoading} data-testid="button-inbox-search">
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Open Inbox
            </Button>
          </form>
        </CardContent>
      </Card>

      {searchedEmail && !selectedThreadId && !showCompose && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="font-serif text-lg font-semibold text-foreground">Your Threads</h3>
            <Button onClick={() => setShowCompose(true)} data-testid="button-new-message">
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {ALL_FILTERS.map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter)}
                data-testid={`filter-${filter.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {filter}
              </Button>
            ))}
          </div>

          {filteredThreads.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <InboxIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p data-testid="text-empty-inbox">No threads found. Start a new conversation!</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className="p-4 border rounded-md cursor-pointer transition-colors border-border hover-elevate"
                  data-testid={`thread-item-${thread.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{thread.subject}</span>
                      <Badge className={`text-xs ${CATEGORY_COLORS[thread.category] || ""}`}>
                        {thread.category}
                      </Badge>
                      {thread.hasUnreadUser && (
                        <Badge className="text-xs bg-primary text-primary-foreground" data-testid={`unread-indicator-${thread.id}`}>
                          <Mail className="w-3 h-3 mr-1" />
                          New
                        </Badge>
                      )}
                    </div>
                    <Badge className={`text-xs ${STATUS_CONFIG[thread.status]?.color || ""}`} data-testid={`status-badge-${thread.id}`}>
                      {STATUS_CONFIG[thread.status]?.label || thread.status}
                    </Badge>
                  </div>
                  {thread.lastMessage && (
                    <p className="text-sm text-muted-foreground line-clamp-1" data-testid={`thread-preview-${thread.id}`}>
                      {thread.lastMessageSender === "admin" ? "Team: " : thread.lastMessageSender === "ai" ? "AI: " : "You: "}
                      {truncate(thread.lastMessage, 80)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span>
                      {thread.lastMessageDate
                        ? format(new Date(thread.lastMessageDate), "MMM d, yyyy")
                        : thread.createdAt
                          ? format(new Date(thread.createdAt), "MMM d, yyyy")
                          : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {searchedEmail && showCompose && !selectedThreadId && (
        <Card className="border-primary/10">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCompose(false)}
                data-testid="button-compose-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="font-serif text-xl text-foreground">New Message</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="compose-name">Your Name</Label>
              <Input
                id="compose-name"
                value={composeName}
                onChange={(e) => setComposeName(e.target.value)}
                placeholder="Enter your name"
                data-testid="input-compose-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compose-category">Category</Label>
              <Select value={composeCategory} onValueChange={setComposeCategory}>
                <SelectTrigger data-testid="select-compose-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {INBOX_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} data-testid={`option-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="compose-subject">Subject</Label>
              <Input
                id="compose-subject"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="What is this about?"
                data-testid="input-compose-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compose-message">Message</Label>
              <Textarea
                id="compose-message"
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                placeholder="Write your message..."
                rows={5}
                className="resize-none"
                data-testid="textarea-compose-message"
              />
            </div>
            <Button
              onClick={handleCreateThread}
              disabled={createThreadMutation.isPending}
              data-testid="button-compose-send"
            >
              {createThreadMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Message
            </Button>
          </CardContent>
        </Card>
      )}

      {searchedEmail && selectedThreadId && (
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedThreadId(null);
              setReplyMessage("");
              queryClient.invalidateQueries({ queryKey: ["/api/inbox/threads", searchedEmail] });
            }}
            data-testid="button-back-to-threads"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inbox
          </Button>

          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : threadDetail ? (
            <Card className="border-primary/10">
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <CardTitle className="font-serif text-xl text-foreground" data-testid="text-thread-subject">
                    {threadDetail.thread.subject}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs ${CATEGORY_COLORS[threadDetail.thread.category] || ""}`}>
                      {threadDetail.thread.category}
                    </Badge>
                    <Badge className={`text-xs ${STATUS_CONFIG[threadDetail.thread.status]?.color || ""}`}>
                      {STATUS_CONFIG[threadDetail.thread.status]?.label || threadDetail.thread.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {threadDetail.messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No messages yet.</p>
                  ) : (
                    threadDetail.messages.map((msg) => {
                      const isUser = msg.senderType === "user";
                      const isAi = msg.senderType === "ai";
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-md ${
                              isUser
                                ? "bg-blue-600 text-white dark:bg-blue-700"
                                : isAi
                                  ? "bg-muted/50 border border-dashed border-muted-foreground/30"
                                  : "bg-muted/60"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                              <span className={`text-xs font-medium ${isUser ? "text-blue-100" : "text-muted-foreground"}`}>
                                {isUser ? "You" : isAi ? "AI Assistant" : "Ministry Team"}
                                {isAi && <Bot className="w-3 h-3 inline ml-1" />}
                              </span>
                              <span className={`text-xs ${isUser ? "text-blue-200" : "text-muted-foreground"}`}>
                                {msg.createdAt ? format(new Date(msg.createdAt), "MMM d, h:mm a") : ""}
                              </span>
                            </div>
                            <p className={`text-sm whitespace-pre-wrap ${isUser ? "text-white" : "text-foreground"}`}>
                              {msg.message}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {threadDetail.thread.status !== "closed" && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label>Reply</Label>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        rows={2}
                        className="resize-none flex-1"
                        data-testid="textarea-reply"
                      />
                      <Button
                        onClick={handleSendReply}
                        disabled={sendReplyMutation.isPending || !replyMessage.trim()}
                        size="icon"
                        className="self-end"
                        data-testid="button-send-reply"
                      >
                        {sendReplyMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {threadDetail.thread.status === "closed" && (
                  <div className="text-center py-4 text-muted-foreground border-t">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">This conversation has been closed.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              <p>Thread not found.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
