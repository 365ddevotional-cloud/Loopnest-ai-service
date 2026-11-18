import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Product = {
  id: string; title: string; kind: string; sourcePrice: string;
  description?: string; author?: string; lyrics?: string; published?: boolean;
  requiredFileCount?: number; packageFormat?: string; replacedBy?: string[];
};
const empty = { title: "", kind: "Book", description: "", author: "Moses Afolabi", price: "", lyrics: "" };

async function uploadFile(id: string, slot: "download" | "cover", file: File, status: (text: string) => void) {
  if (file.size > (slot === "cover" ? 10 : 250) * 1024 * 1024) throw new Error("The selected file exceeds the upload limit.");
  status(`Checking ${file.name}…`);
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
  const contentType = file.name.toLowerCase().endsWith(".mp3") ? "audio/mpeg"
    : file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : file.type;
  const response = await apiRequest("POST", `/api/admin/ministry-shop/products/${id}/upload`, {
    slot, name: file.name, bytes: file.size, sha256, contentType,
  });
  const ticket = await response.json();
  status(`Uploading ${file.name}…`);
  try {
    const transfer = await fetch(ticket.uploadUrl, { method: "PUT", headers: ticket.headers, body: file });
    if (!transfer.ok && transfer.status !== 412) throw new Error("Direct upload unavailable.");
  } catch {
    const transfer = await fetch(`/api/admin/ministry-shop/products/${id}/uploads/${ticket.uploadId}/transfer`, {
      method: "PUT", credentials: "include", headers: { "Content-Type": contentType }, body: file,
    });
    if (!transfer.ok && transfer.status !== 412) {
      const failure = await transfer.json().catch(() => null);
      throw new Error(failure?.message ?? "Upload failed. Keep this draft and retry.");
    }
  }
  status(`Verifying ${file.name}…`);
  await apiRequest("POST", `/api/admin/ministry-shop/products/${id}/uploads/${ticket.uploadId}/complete`, {});
}

export default function ShopProductEditor() {
  const queryClient = useQueryClient();
  const inventory = useQuery<Product[]>({ queryKey: ["/api/admin/ministry-shop/products"] });
  const [id, setId] = useState("");
  const [form, setForm] = useState(empty);
  const [download, setDownload] = useState<File>();
  const [cover, setCover] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rights, setRights] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [saved, setSaved] = useState(false);
  function choose(value: string) {
    const product = inventory.data?.find(item => item.id === value);
    setId(value);
    setForm(product ? {
      title: product.title, kind: product.kind, author: product.author ?? "Moses Afolabi",
      description: product.description ?? "", price: product.sourcePrice.replace("$", ""), lyrics: product.lyrics ?? "",
    } : empty);
    setDownload(undefined); setCover(undefined); setRights(false); setReviewed(false); setSaved(false);
    setFeedback(""); setResetKey(key => key + 1);
  }
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ministry-shop/products"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ministry-shop"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-shop/catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["ministry-shop-prices"] }),
    ]);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setSaved(false);
    try {
      const priceCents = Math.round(Number(form.price) * 100);
      if (!/^\d+(\.\d{1,2})?$/.test(form.price) || priceCents < 50) throw new Error("Enter a price of at least $0.50.");
      if (!id && (!download || !cover)) throw new Error("Choose the customer download and cover for your new product.");
      const response = await apiRequest("PUT", "/api/admin/ministry-shop/products", {
        ...(id ? { id } : {}), title: form.title, kind: form.kind, description: form.description,
        author: form.author, priceCents, lyrics: form.lyrics,
      });
      const product = await response.json();
      setId(product.id);
      if (cover) await uploadFile(product.id, "cover", cover, setFeedback);
      if (download) await uploadFile(product.id, "download", download, setFeedback);
      setDownload(undefined); setCover(undefined); setResetKey(key => key + 1);
      setSaved(true);
      setFeedback("Product saved. Uploaded files are verified. Review the details, then publish when ready.");
      await refresh();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Save failed. Retry your draft."); await refresh(); }
    finally { setBusy(false); }
  }
  async function publish() {
    setBusy(true);
    try {
      await apiRequest("POST", `/api/admin/ministry-shop/products/${id}/publish`, { rightsConfirmed: rights, contentReviewed: reviewed });
      setFeedback("Published. Open the product page to view the listing.");
      await refresh();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Publishing failed."); }
    finally { setBusy(false); }
  }
  return (
    <section className="space-y-4 rounded-xl border p-4" aria-labelledby="shop-upload-heading">
      <h3 id="shop-upload-heading" className="text-xl font-bold">Upload a book or music</h3>
      <label className="block text-sm font-medium">Product
        <select className="mt-1 min-h-11 w-full rounded-md border bg-background p-2" value={id} disabled={busy} onChange={event => choose(event.target.value)}>
          <option value="">Create a new product</option>
          {inventory.data?.filter(p => p.kind !== "Membership" && !p.replacedBy && (p.requiredFileCount ?? 1) === 1 && p.packageFormat !== "zip")
            .map(p => <option key={p.id} value={p.id}>{p.title}{p.published === false ? " — Draft" : ""}</option>)}
        </select>
      </label>
      {inventory.isError && <p role="alert">Product inventory could not load. Refresh the page before editing an existing product.</p>}
      <form onSubmit={save} className="space-y-3">
        <fieldset disabled={busy} className="space-y-3">
          <label className="block text-sm font-medium">Title<Input required minLength={3} maxLength={180} value={form.title} onChange={e => {setForm({...form,title:e.target.value});setSaved(false);}} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Type
              <select className="mt-1 min-h-10 w-full rounded-md border bg-background p-2" value={form.kind} disabled={!!id} onChange={e => {setForm({...form,kind:e.target.value});setSaved(false);}}><option>Book</option><option>Music</option></select>
            </label>
            <label className="block text-sm font-medium">Base price (USD)<Input type="number" min="0.50" max="999.99" step="0.01" required value={form.price} onChange={e => {setForm({...form,price:e.target.value});setSaved(false);}} /><span className="text-xs text-muted-foreground">Checkout uses the shop’s regional pricing.</span></label>
          </div>
          <label className="block text-sm font-medium">{form.kind === "Book" ? "Author" : "Artist / producer"}<Input required value={form.author} maxLength={160} onChange={e => {setForm({...form,author:e.target.value});setSaved(false);}} /></label>
          <label className="block text-sm font-medium">Description<textarea required minLength={20} maxLength={12000} rows={4} className="mt-1 w-full rounded-md border bg-background p-2" value={form.description} onChange={e => {setForm({...form,description:e.target.value});setSaved(false);}} /></label>
          {form.kind === "Music" && <label className="block text-sm font-medium">Lyrics (optional)<textarea rows={5} maxLength={30000} className="mt-1 w-full rounded-md border bg-background p-2" value={form.lyrics} onChange={e => {setForm({...form,lyrics:e.target.value});setSaved(false);}} /></label>}
          <div key={resetKey} className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Cover image (JPEG, PNG or WebP, up to 10 MB)<Input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => {setCover(e.target.files?.[0]);setSaved(false);}} /></label>
            <label className="block text-sm font-medium">{form.kind === "Book" ? "Book PDF" : "Music MP3"} (up to 250 MB)<Input type="file" accept={form.kind === "Book" ? ".pdf,application/pdf" : ".mp3,audio/mpeg"} onChange={e => {setDownload(e.target.files?.[0]);setSaved(false);}} /></label>
          </div>
          <Button type="submit">{busy ? "Working…" : "Save product and upload files"}</Button>
        </fieldset>
      </form>
      {feedback && <p role="status" className="break-words rounded-lg bg-muted p-3 text-sm">{feedback}</p>}
      {id && <div className="space-y-3 border-t pt-3">
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={rights} disabled={busy} onChange={e => setRights(e.target.checked)} />I have the rights to sell this content and use its artwork.</label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} disabled={busy} onChange={e => setReviewed(e.target.checked)} />I have reviewed the customer file, description and price.</label>
        <Button type="button" onClick={() => void publish()} disabled={busy || !saved || !rights || !reviewed}>Publish product</Button>
        <a className="ml-3 text-sm underline" href={`/shop/${id}`} target="_blank" rel="noreferrer">Open product page</a>
      </div>}
    </section>
  );
}
