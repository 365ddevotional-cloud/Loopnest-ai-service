import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Access = { lifetimeFreeDownloads: boolean; verificationRequired: boolean };
export function DownloadAccessCard() {
  const { user, resendVerification, checkEmailVerified } = useUser();
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery<Access>({
    queryKey: ["/api/user/download-access", user?.uid],
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken(true);
      const response = await fetch("/api/user/download-access", { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Could not confirm download access");
      return response.json();
    },
  });
  const eligibleEmail = user?.email?.trim().toLowerCase() === "365ddevotional@gmail.com";
  if (!eligibleEmail) return null;
  async function sendConfirmation() {
    setBusy(true);
    try {
      const result = await resendVerification();
      toast({ title: result.sent ? "Check your email" : "Email could not be sent", description: result.sent ? "Open the verification link, then select Check Confirmation." : "Please try again shortly." });
    } finally { setBusy(false); }
  }
  async function checkConfirmation() {
    setBusy(true);
    try { await checkEmailVerified(); await refetch(); }
    finally { setBusy(false); }
  }
  return <Card data-testid="download-access-card"><CardContent className="pt-6 space-y-3">
    <h2 className="font-semibold">Lifetime Download Access</h2>
    <p className="text-sm text-muted-foreground">{isLoading ? "Confirming your account…" : isError ? "Could not confirm access. Please try again." : data?.lifetimeFreeDownloads ? "Your verified account has lifetime free access to all downloadable content. No download payment is required." : "Confirm ownership of your email address to activate lifetime free downloads."}</p>
    {data?.verificationRequired && <Button disabled={busy} onClick={sendConfirmation}>Send Confirmation Email</Button>}
    {!data?.lifetimeFreeDownloads && <Button variant="outline" disabled={busy || isLoading} onClick={checkConfirmation}>Check Confirmation</Button>}
  </CardContent></Card>;
}
