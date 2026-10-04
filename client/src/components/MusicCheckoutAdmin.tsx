import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Setup = { secretKeySet: boolean; liveKey: boolean; webhookSecretSet: boolean; storageReady: boolean; archivePath: string | null; webhookUrl: string };
export default function MusicCheckoutAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const { data, error } = useQuery<Setup>({ queryKey: ["/api/admin/music-commerce"], queryFn: async () => {
    const response = await fetch("/api/admin/music-commerce", { credentials: "include" });
    if (!response.ok) throw new Error("Setup status unavailable"); return response.json(); } });
  async function uploadArchive(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip") || file.size > 100 * 1024 * 1024) {
      toast({ title: "Choose a ZIP file under 100 MB", variant: "destructive" }); return;
    }
    setUploading(true);
    try {
      const response = await fetch("/api/uploads/request-url", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: "application/zip" }) });
      if (!response.ok) throw new Error("Upload could not be started");
      const { uploadURL, objectPath } = await response.json();
      const uploaded = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": "application/zip" } });
      if (!uploaded.ok) throw new Error("Archive upload failed");
      const saved = await fetch("/api/admin/music-commerce/archive", { method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objectPath }) });
      if (!saved.ok) throw new Error("Archive could not be saved");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/music-commerce"] });
      queryClient.invalidateQueries({ queryKey: ["/api/music-commerce/catalog"] });
      toast({ title: "Heaven Reigns bundle archive uploaded" });
    } catch (err) { toast({ title: (err as Error).message, variant: "destructive" }); }
    finally { setUploading(false); }
  }
  return <section className="border-t pt-4 space-y-3" data-testid="music-checkout-admin">
    <h3 className="font-semibold">Heaven Reigns Checkout</h3>
    <p className="text-sm">Each MP3 track costs $0.50 USD. The Original, Instrumental, and Remix bundle costs $1.00 USD. These release prices are fixed separately from the default prices above.</p>
    {error ? <p role="alert">Checkout setup status could not be loaded.</p> : data ? <ul className="text-sm space-y-1">
      <li>Stripe live key: {data.liveKey ? "Configured" : data.secretKeySet ? "Test key only" : "Missing"}</li>
      <li>Music webhook secret: {data.webhookSecretSet ? "Configured" : "Missing"}</li>
      <li>Media storage: {data.storageReady ? "Configured" : "Missing"}</li>
      <li>Bundle ZIP: {data.archivePath ? "Uploaded" : "Not uploaded"}</li>
    </ul> : <p>Loading setup status…</p>}
    <p className="text-sm">Set <code>STRIPE_SECRET_KEY</code> and <code>STRIPE_MUSIC_WEBHOOK_SECRET</code> in Railway. Keep both secrets out of this form.</p>
    <p className="text-sm break-all">Stripe webhook endpoint: {data?.webhookUrl ?? "https://365dailydevotional.com/api/music-commerce/webhook"}</p>
    <p className="text-xs text-muted-foreground">Subscribe to checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.expired, charge.refunded, and charge.dispute.created. Paid downloads stay unavailable until live credentials, storage, and the appropriate release files are ready.</p>
    <Label htmlFor="heaven-bundle-archive">Upload three-track ZIP bundle</Label>
    <Input id="heaven-bundle-archive" type="file" accept=".zip,application/zip" disabled={uploading} onChange={e => uploadArchive(e.target.files?.[0])} data-testid="upload-heaven-bundle" />
    {uploading && <p role="status">Uploading bundle…</p>}
    <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/music-commerce"] })}>Refresh Checkout Status</Button>
  </section>;
}
