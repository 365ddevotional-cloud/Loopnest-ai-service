import { useState } from "react";
import { Share2, MessageCircle, Mail, Smartphone, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SiWhatsapp } from "react-icons/si";

interface ShareButtonProps {
  title: string;
  text: string;
  className?: string;
  variant?: "ghost" | "default" | "accent";
}

export function ShareButton({ title, text, className = "", variant = "ghost" }: ShareButtonProps) {
  const buttonVariant = variant === "accent" ? "default" : variant;
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const shareData = { title, text };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setShowError(true);
          setTimeout(() => setShowError(false), 2000);
        }
      }
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSMS = () => {
    const url = `sms:?body=${encodeURIComponent(text)}`;
    window.location.href = url;
  };

  const handleEmail = () => {
    const url = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
    window.location.href = url;
  };

  if (showSuccess) {
    return (
      <Button size="sm" variant={buttonVariant} className={`text-green-600 ${className}`} disabled>
        <Check className="h-4 w-4 mr-1" />
        Shared
      </Button>
    );
  }

  if (showError) {
    return (
      <Button size="sm" variant={buttonVariant} className={`text-destructive ${className}`} disabled>
        <X className="h-4 w-4 mr-1" />
        Failed
      </Button>
    );
  }

  if (typeof navigator.share === "function") {
    return (
      <Button
        size="sm"
        variant={buttonVariant}
        onClick={handleNativeShare}
        className={className}
        data-testid="button-share"
      >
        <Share2 className="h-4 w-4 mr-1" />
        Share
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant={buttonVariant} className={className} data-testid="button-share">
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleWhatsApp} data-testid="share-whatsapp">
          <SiWhatsapp className="h-4 w-4 mr-2 text-green-600" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSMS} data-testid="share-sms">
          <Smartphone className="h-4 w-4 mr-2" />
          SMS
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmail} data-testid="share-email">
          <Mail className="h-4 w-4 mr-2" />
          Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
