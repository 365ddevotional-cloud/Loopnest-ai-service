import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Send, MessageSquare, Search, AlertTriangle, Paperclip, FileText, Image, Download } from "lucide-react";
import type { PrayerRequest, ThreadMessage, PrayerAttachment } from "@shared/schema";

const PRIORITY_LABELS: Record<string, string> = {
  prayer_normal: "Prayer Request",
  prayer_urgent: "Urgent Prayer",
  counseling_normal: "Counseling",
  counseling_urgent: "Urgent Counseling",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Awaiting Reply", color: "bg-blue-100 text-blue-800" },
  replied: { label: "Replied", color: "bg-green-100 text-green-800" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800" },
};

export default function MyPrayerRequests() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<PrayerRequest | null>(null);
  const [followUpMessage, setFollowUpMessage] = useState("");

  const { data: requests = [], isLoading, refetch } = useQuery<PrayerRequest[]>({
    queryKey: ["/api/prayer-requests"],
    enabled: !!searchedEmail,
  });

  const filteredRequests = requests.filter(
    (r) => r.email?.toLowerCase() === searchedEmail.toLowerCase()
  );

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

  const sendMessageMutation = useMutation({
    mutationFn: async ({ requestId, message }: { requestId: number; message: string }) => {
      return apiRequest("POST", `/api/prayer-requests/${requestId}/thread`, {
        message,
        senderType: "user",
      });
    },
    onSuccess: () => {
      setFollowUpMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-requests", selectedRequest?.id, "thread"] });
      toast({ title: "Message sent", description: "Your follow-up message has been sent." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    setSearchedEmail(email);
    setSelectedRequest(null);
    refetch();
  };

  const handleSendFollowUp = () => {
    if (!selectedRequest || !followUpMessage.trim()) return;
    sendMessageMutation.mutate({ requestId: selectedRequest.id, message: followUpMessage });
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">My Prayer Requests</h1>
        <div className="w-24 h-1 bg-primary mx-auto rounded-full opacity-30" />
        <p className="text-muted-foreground max-w-xl mx-auto">
          View your submitted prayer requests and any replies from our team.
        </p>
      </div>

      <Card className="bg-white border-primary/10 shadow-xl shadow-primary/5 mb-6">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="email">Enter your email to view your requests</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                data-testid="input-search-email"
              />
            </div>
            <Button type="submit" disabled={isLoading} data-testid="button-search">
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Find My Requests
            </Button>
          </form>
        </CardContent>
      </Card>

      {searchedEmail && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-semibold text-foreground">Your Requests</h3>
            {filteredRequests.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No prayer requests found for this email.</p>
              </Card>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    onClick={() => setSelectedRequest(request)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedRequest?.id === request.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    data-testid={`my-request-${request.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {request.subject || "Prayer Request"}
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
                      <span>{request.createdAt ? format(new Date(request.createdAt), "MMM d, yyyy") : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            {selectedRequest ? (
              <Card className="border-primary/10">
                <CardHeader className="bg-muted/30 border-b">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <CardTitle className="font-serif text-xl text-foreground">
                      {selectedRequest.subject || "Prayer Request"}
                    </CardTitle>
                    <Badge className={STATUS_LABELS[selectedRequest.status || "new"]?.color}>
                      {STATUS_LABELS[selectedRequest.status || "new"]?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline">{PRIORITY_LABELS[selectedRequest.priority || "prayer_normal"]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {selectedRequest.createdAt ? format(new Date(selectedRequest.createdAt), "MMMM d, yyyy") : ""}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Your original message:</p>
                    <p className="text-foreground whitespace-pre-wrap">{selectedRequest.message}</p>
                  </div>

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        Your Attachments ({attachments.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.objectPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-muted/30 rounded-md text-sm hover:bg-muted/50 transition-colors"
                            data-testid={`my-attachment-${attachment.id}`}
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
                              ? "bg-primary/10 ml-0"
                              : "bg-muted/30 ml-4"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground">
                              {msg.senderType === "admin" ? "365 Daily Devotional Team" : "You"}
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

                  {selectedRequest.status !== "closed" && (
                    <div className="space-y-2 pt-4 border-t">
                      <Label>Send a follow-up message</Label>
                      <Textarea
                        placeholder="Write your message..."
                        value={followUpMessage}
                        onChange={(e) => setFollowUpMessage(e.target.value)}
                        rows={3}
                        className="resize-none"
                        data-testid="textarea-followup"
                      />
                      <Button
                        onClick={handleSendFollowUp}
                        disabled={sendMessageMutation.isPending || !followUpMessage.trim()}
                        data-testid="button-send-followup"
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Send Message
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                <p>Select a request to view details and replies</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
