import { useRef, useState } from "react";
import { Share2, Mail, Smartphone, ChevronDown, Copy, FileText, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SiWhatsapp } from "react-icons/si";
import { sharePayload, shareMessage } from "@/share/shareContent";

interface ShareButtonProps {
  title: string;
  text: string;
  /** Public permalink only. Full text remains available under More sharing options. */
  url?: string;
  className?: string;
  variant?: "ghost" | "default" | "accent";
}

export function ShareButton({ title, text, url, className = "", variant = "ghost" }: ShareButtonProps) {
  const buttonVariant = variant === "accent" ? "default" : variant;
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState("");
  const shareInProgress = useRef(false);
  const nativeAvailable = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const quickData = sharePayload(title, text, url);
  const quickMessage = shareMessage(quickData);

  const handleNativeShare = async (fullText = false) => {
    // A ref also guards two taps before React has committed the disabled state.
    if (shareInProgress.current) return;
    if (!nativeAvailable) { setOptionsOpen(true); return; }
    shareInProgress.current = true;
    setSharing(true);
    setStatus("");
    try {
      // Invoke during the tap: no fetch, image generation, or timer before this.
      await navigator.share(fullText ? { title, text } : quickData);
      setStatus("Opened in your sharing app.");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setStatus("Phone sharing could not open. Choose WhatsApp, email, or copy below.");
        setOptionsOpen(true);
      }
    } finally {
      shareInProgress.current = false;
      setSharing(false);
    }
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Copied. Paste it into your message.");
    } catch {
      setStatus("Copy is unavailable. Choose WhatsApp, SMS, or email instead.");
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Button size="sm" variant={buttonVariant} onClick={() => handleNativeShare()} disabled={sharing} aria-busy={sharing}
        className={className} title={url ? "Share a quick link; full text is under More sharing options" : "Share"} data-testid="button-share">
        <Share2 className="h-4 w-4 mr-1" />{sharing ? "Opening share…" : "Share"}
      </Button>
      <DropdownMenu open={optionsOpen} onOpenChange={setOptionsOpen}>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" aria-label="More sharing options" title="More sharing options" data-testid="button-share-options">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {nativeAvailable && (
            <DropdownMenuItem onClick={() => handleNativeShare(true)} disabled={sharing} data-testid="share-full-text">
              <FileText className="h-4 w-4 mr-2" /> Share full text
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <a href={`https://wa.me/?text=${encodeURIComponent(quickMessage)}`} target="_blank" rel="noopener noreferrer" data-testid="share-whatsapp">
              <SiWhatsapp className="h-4 w-4 mr-2 text-green-600" /> WhatsApp{url ? " (quick link)" : ""}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`sms:?body=${encodeURIComponent(quickMessage)}`} data-testid="share-sms"><Smartphone className="h-4 w-4 mr-2" /> SMS</a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(quickMessage)}`} data-testid="share-email"><Mail className="h-4 w-4 mr-2" /> Email</a>
          </DropdownMenuItem>
          {url && (
            <DropdownMenuItem onClick={() => copyText(url)} data-testid="share-copy-link"><Link className="h-4 w-4 mr-2" /> Copy link</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => copyText(text)} data-testid="share-copy-text"><Copy className="h-4 w-4 mr-2" /> Copy full text</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span role="status" aria-live="polite" className="basis-full text-xs text-muted-foreground">{status}</span>
    </span>
  );
}
