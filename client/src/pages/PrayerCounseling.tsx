import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useRef } from "react";
import { Loader2, Send, CheckCircle, AlertTriangle, Paperclip, X, FileText, Image, Star, HandHeart } from "lucide-react";
import type { AutoReplyTemplate, PrayerRequest } from "@shared/schema";

const PRIORITY_OPTIONS = [
  { value: "prayer_normal", label: "Prayer Request (Normal)" },
  { value: "prayer_urgent", label: "Urgent Prayer" },
  { value: "counseling_normal", label: "Counseling Request" },
  { value: "counseling_urgent", label: "Urgent Counseling" },
];

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

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

interface UploadedFile {
  file: File;
  objectPath?: string;
  uploading: boolean;
  error?: string;
}

export default function PrayerCounseling() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<PrayerRequest | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    smsEnabled: false,
    subject: "",
    message: "",
    isAnonymous: false,
    priority: "prayer_normal",
    category: "other",
  });

  const { data: autoReplyTemplate } = useQuery<AutoReplyTemplate>({
    queryKey: ["/api/auto-reply-templates", formData.priority],
    enabled: submitted,
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, index }: { file: File; index: number }) => {
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to get upload URL");
      
      const { uploadURL, objectPath } = await response.json();
      
      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      
      return { index, objectPath };
    },
    onSuccess: ({ index, objectPath }) => {
      setUploadedFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, objectPath, uploading: false } : f
      ));
    },
    onError: (error, { index }) => {
      setUploadedFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, uploading: false, error: "Upload failed" } : f
      ));
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        fullName: data.isAnonymous ? null : data.fullName,
        email: data.email || null,
        phoneNumber: data.phoneNumber || null,
        smsEnabled: data.smsEnabled && !!data.phoneNumber,
        subject: data.subject || null,
        message: data.message,
        isAnonymous: data.isAnonymous,
        priority: data.priority,
        category: data.category,
      };
      const response = await apiRequest("POST", "/api/prayer-requests", payload);
      return response.json();
    },
    onSuccess: async (data) => {
      const successfulUploads = uploadedFiles.filter(f => f.objectPath);
      for (const upload of successfulUploads) {
        try {
          await apiRequest("POST", `/api/prayer-requests/${data.id}/attachments`, {
            fileName: upload.file.name,
            fileSize: upload.file.size,
            contentType: upload.file.type,
            objectPath: upload.objectPath,
          });
        } catch (err) {
          console.error("Failed to save attachment metadata:", err);
        }
      }
      
      setSubmittedRequest(data);
      setSubmitted(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      if (uploadedFiles.length >= MAX_FILES) {
        toast({ title: `Maximum ${MAX_FILES} files allowed`, variant: "destructive" });
        break;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: `${file.name} exceeds 5MB limit`, variant: "destructive" });
        continue;
      }
      
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({ title: `${file.name} is not a valid file type (jpg, png, pdf only)`, variant: "destructive" });
        continue;
      }
      
      const newIndex = uploadedFiles.length;
      setUploadedFiles(prev => [...prev, { file, uploading: true }]);
      uploadFileMutation.mutate({ file, index: newIndex });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.isAnonymous && !formData.fullName.trim()) {
      toast({ title: "Please enter your full name", variant: "destructive" });
      return;
    }
    if (!formData.message.trim()) {
      toast({ title: "Please enter your message or prayer request", variant: "destructive" });
      return;
    }
    
    if (formData.phoneNumber && !isValidE164(formData.phoneNumber)) {
      toast({ title: "Phone number must be in E.164 format (e.g., +1234567890)", variant: "destructive" });
      return;
    }
    
    const stillUploading = uploadedFiles.some(f => f.uploading);
    if (stillUploading) {
      toast({ title: "Please wait for files to finish uploading", variant: "destructive" });
      return;
    }

    mutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setSubmitted(false);
    setSubmittedRequest(null);
    setUploadedFiles([]);
    setFormData({
      fullName: "",
      email: "",
      phoneNumber: "",
      smsEnabled: false,
      subject: "",
      message: "",
      isAnonymous: false,
      priority: "prayer_normal",
      category: "other",
    });
  };

  const isValidE164 = (phone: string): boolean => {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  if (submitted && submittedRequest) {
    const priorityLabel = PRIORITY_OPTIONS.find(p => p.value === submittedRequest.priority)?.label || "Prayer Request";
    const isUrgent = submittedRequest.priority?.includes("urgent");
    
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-12 space-y-4">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Prayer & Counseling Request</h1>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full opacity-30" />
        </div>

        <Card className="bg-white border-primary/10 shadow-xl shadow-primary/5 p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
              Thank You
            </h2>
            <p className="text-lg text-muted-foreground font-serif leading-relaxed">
              Your message has been received. We will respond prayerfully.
            </p>
            {isUrgent && (
              <div className="mt-4 inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                URGENT - {priorityLabel}
              </div>
            )}
          </div>

          {autoReplyTemplate && (
            <div className="bg-primary/5 rounded-lg p-6 mb-8 space-y-4">
              <p className="font-serif text-foreground leading-relaxed">
                {autoReplyTemplate.encouragement}
              </p>
              <div className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
                <p className="font-serif">"{autoReplyTemplate.scriptureText}"</p>
                <p className="text-sm mt-2 not-italic font-medium">— {autoReplyTemplate.scriptureReference}</p>
              </div>
              <p className="font-serif text-muted-foreground">
                {autoReplyTemplate.prayer}
              </p>
            </div>
          )}

          <div className="text-center space-y-4">
            <Button onClick={resetForm} data-testid="button-send-another">
              Send Another Request
            </Button>
            {!submittedRequest?.isAnonymous && submittedRequest?.email && (
              <p className="text-sm text-muted-foreground">
                <a href="/my-requests" className="text-primary underline" data-testid="link-my-requests">
                  View your requests and replies
                </a>
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Prayer & Counseling Request</h1>
        <div className="decorative-divider" />
      </div>

      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden">
        <div className="relative bg-gradient-to-br from-secondary/15 via-primary/10 to-accent/15 p-8 md:p-12 text-center">
          <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h20v20H0z%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M10%2010m-1%200a1%201%200%201%200%202%200a1%201%200%201%200-2%200%22%20fill%3D%22%234F6A57%22%20fill-opacity%3D%220.1%22%2F%3E%3C%2Fsvg%3E')]" />
          <p className="relative text-lg text-foreground/80 font-serif leading-relaxed">
            Share your prayer requests or counseling needs with us. Our team will respond with prayer and encouragement.
          </p>
        </div>

        <form id="request-form" onSubmit={handleSubmit} className="p-8 md:p-12 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Checkbox
              id="isAnonymous"
              checked={formData.isAnonymous}
              onCheckedChange={(checked) => setFormData({ ...formData, isAnonymous: checked === true })}
              data-testid="checkbox-anonymous"
            />
            <Label htmlFor="isAnonymous" className="text-sm text-muted-foreground cursor-pointer">
              Send anonymously (your name will not be shared)
            </Label>
          </div>

          {!formData.isAnonymous && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Your full name"
                data-testid="input-fullname"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">
              Email {formData.isAnonymous ? "(optional - for receiving replies)" : "(optional)"}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">
              Phone Number (optional)
            </Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="+1234567890"
              data-testid="input-phone"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Add your phone number to receive an SMS when we reply. Use international format (e.g., +1234567890).
            </p>
          </div>

          {formData.phoneNumber && (
            <div className="flex items-center gap-3">
              <Checkbox
                id="smsEnabled"
                checked={formData.smsEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, smsEnabled: checked === true })}
                data-testid="checkbox-sms"
              />
              <Label htmlFor="smsEnabled" className="text-sm text-muted-foreground cursor-pointer">
                Send SMS reply notifications
              </Label>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="priority">Request Type *</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger data-testid="select-priority">
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger data-testid="select-category">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject (optional)</Label>
            <Input
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Brief subject for your request"
              data-testid="input-subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Your Prayer Request or Message *</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Share your prayer request, concerns, or need for counseling..."
              rows={6}
              className="resize-none"
              data-testid="textarea-message"
            />
          </div>

          <div className="space-y-3">
            <Label>Attachments (optional)</Label>
            <p className="text-xs text-muted-foreground">
              You can attach up to {MAX_FILES} files (jpg, png, pdf). Max 5MB each.
            </p>
            
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((upload, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-md"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(upload.file.type)}
                      <span className="text-sm truncate">{upload.file.name}</span>
                      {upload.uploading && (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      )}
                      {upload.error && (
                        <span className="text-xs text-destructive">{upload.error}</span>
                      )}
                      {upload.objectPath && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      disabled={upload.uploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {uploadedFiles.length < MAX_FILES && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  data-testid="input-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-attach"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Attach Files
                </Button>
              </div>
            )}
          </div>

          <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <p>Your privacy matters to us:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>All requests are treated with strict confidentiality</li>
              <li>Anonymous requests will not display your name</li>
              <li>Email is only used to send you replies if provided</li>
              <li>Attachments are stored securely and only accessible to our team</li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending || uploadedFiles.some(f => f.uploading)}
            data-testid="button-submit"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Request
              </>
            )}
          </Button>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Link href="/quick-prayer" className="block" data-testid="link-quick-prayer">
          <Card className="p-6 text-center transition-shadow cursor-pointer border-primary/10">
            <HandHeart className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="font-serif text-lg font-semibold text-foreground">Quick Prayer</h3>
            <p className="text-sm text-muted-foreground mt-1">Need a quick word of prayer? Get instant encouragement.</p>
          </Card>
        </Link>
        <Link href="/testimonies" className="block" data-testid="link-testimonies">
          <Card className="p-6 text-center transition-shadow cursor-pointer border-primary/10">
            <Star className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="font-serif text-lg font-semibold text-foreground">Testimony Wall</h3>
            <p className="text-sm text-muted-foreground mt-1">Share how God answered your prayers and encourage others.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
