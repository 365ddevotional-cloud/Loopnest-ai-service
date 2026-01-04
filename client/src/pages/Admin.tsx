import { CreateDevotionalForm } from "@/components/CreateDevotionalForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Inbox, MessageSquare, Send, Loader2, CheckCircle, XCircle, RefreshCw, AlertTriangle, User, Paperclip, FileText, Image, Download, Smartphone, Search, Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import type { PrayerRequest, ThreadMessage, PrayerAttachment } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";

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

function PrayerInbox() {
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
      return apiRequest("POST", `/api/prayer-requests/${requestId}/thread`, {
        message,
        senderType: "admin",
      });
    },
    onSuccess: () => {
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-requests", selectedRequest?.id, "thread"] });
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
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground">
                          {msg.senderType === "admin" ? "Admin" : "User"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {msg.createdAt ? format(new Date(msg.createdAt), "MMM d, h:mm a") : ""}
                        </span>
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
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="inbox" data-testid="tab-inbox">
            <Inbox className="w-4 h-4 mr-2" />
            Prayer Inbox
          </TabsTrigger>
          <TabsTrigger value="devotionals" data-testid="tab-devotionals">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Devotionals
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
      </Tabs>
    </div>
  );
}
