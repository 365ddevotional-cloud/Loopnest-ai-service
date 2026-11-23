import { verifiedReleaseById } from "@shared/christmas-2026-releases";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Product = {
  id: string; title: string; kind: string; sourcePrice: string;
  description?: string; author?: string; lyrics?: string; published?: boolean;
  previewTitle?: string; previewText?: string; previewEnding?: string;
  requiredFileCount?: number; packageFormat?: string; replacedBy?: string[];
};
const empty = { title: "", kind: "Book", description: "", author: "Moses Afolabi", price: "", lyrics: "", previewTitle: "", previewText: "", previewEnding: "" };

async function uploadFile(id: string, slot: "download" | "cover", file: File, status: (text: string) => void) {
  if (file.size > (slot === "cover" ? 10 : 250) * 1024 * 1024) throw new Error("The selected file exceeds the upload limit.");
  status(`Checking ${file.name}…`);
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
  const contentType = file.name.toLowerCase().endsWith(".mp3") ? "audio/mpeg"
    : file.name.toLowerCase().endsWith(".zip") ? "application/zip"
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
      previewTitle: product.previewTitle ?? "", previewText: product.previewText ?? "", previewEnding: product.previewEnding ?? "",
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
        previewTitle: form.previewTitle, previewText: form.previewText, previewEnding: form.previewEnding,
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
    <section className="overflow-hidden rounded-2xl border bg-background shadow-sm" aria-labelledby="shop-upload-heading">
      <div className="border-b bg-slate-950 p-5 text-white sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-300">365 Daily Devotional Shop Studio</p>
        <h3 id="shop-upload-heading" className="mt-2 text-2xl font-bold">Upload a book or music</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">Prepare your listing, add a sample, and upload the customer file. New products stay private until you publish.</p>
        <ol className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm"><li>1. Product details</li><li>2. Reader preview</li><li>3. Files and release</li></ol>
      </div>
      <div className="space-y-5 p-4 sm:p-6">
      <label className="block text-sm font-medium">Product
        <select className="mt-1 min-h-11 w-full rounded-md border bg-background p-2" value={id} disabled={busy} onChange={event => choose(event.target.value)}>
          <option value="">Create a new product</option>
          {inventory.data?.filter(p => p.kind !== "Membership" && p.id !== "x29Tw" && !p.replacedBy && (p.requiredFileCount ?? 1) === 1 && (p.packageFormat !== "zip" || verifiedReleaseById(p.id)))
            .map(p => <option key={p.id} value={p.id}>{p.title}{p.published === false ? " — Draft" : ""}</option>)}
        </select>
      </label>
      {inventory.isError && <p role="alert">Product inventory could not load. Refresh the page before editing an existing product.</p>}
      <form onSubmit={save} className="space-y-3">
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-3 text-lg font-bold">1. Product details</legend>
          <label className="block text-sm font-medium">Title<Input required minLength={3} maxLength={180} value={form.title} onChange={e => {setForm({...form,title:e.target.value});setSaved(false);}} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Type
              <select className="mt-1 min-h-10 w-full rounded-md border bg-background p-2" value={form.kind} disabled={!!id} onChange={e => {setForm({...form,kind:e.target.value});setSaved(false);}}><option>Book</option><option>Music</option></select>
            </label>
            <label className="block text-sm font-medium">Base price (USD)<Input type="number" min="0.50" max="999.99" step="0.01" required value={form.price} onChange={e => {setForm({...form,price:e.target.value});setSaved(false);}} /><span className="text-xs text-muted-foreground">Checkout uses the shop’s regional pricing.</span></label>
          </div>
          <label className="block text-sm font-medium">{form.kind === "Book" ? "Author" : "Artist / producer"}<Input required value={form.author} maxLength={160} onChange={e => {setForm({...form,author:e.target.value});setSaved(false);}} /></label>
          <label className="block text-sm font-medium">Description<textarea required minLength={20} maxLength={12000} rows={4} className="mt-1 w-full rounded-md border bg-background p-2" value={form.description} onChange={e => {setForm({...form,description:e.target.value});setSaved(false);}} /></label>
          <p className="text-sm text-muted-foreground">Explain who this is for, what readers or listeners will learn, and what the download includes. Use accurate benefits without guaranteed results.</p>
          {form.kind === "Music" && <label className="block text-sm font-medium">Lyrics (optional)<textarea rows={5} maxLength={30000} className="mt-1 w-full rounded-md border bg-background p-2" value={form.lyrics} onChange={e => {setForm({...form,lyrics:e.target.value});setSaved(false);}} /></label>}
          {form.kind === "Book" && <div className="space-y-3 border-t pt-5">
            <h4 className="text-lg font-bold">2. Reader preview</h4>
            <p className="text-sm leading-6 text-muted-foreground">Paste about 40% of one compelling chapter. Keep the original wording, provide useful substance, and stop at a natural transition. This sample becomes public with the listing; keep the full customer PDF in the file section below.</p>
            <label className="block text-sm font-medium">Preview chapter title<Input maxLength={180} value={form.previewTitle} placeholder="For example: Chapter 2 — Learning to listen" onChange={e => {setForm({...form,previewTitle:e.target.value});setSaved(false);}} /></label>
            <label className="block text-sm font-medium">Chapter preview<textarea rows={12} maxLength={30000} className="mt-1 w-full rounded-md border bg-background p-3 text-base leading-7" value={form.previewText} placeholder="Paste the selected chapter excerpt here. Separate paragraphs with a blank line." onChange={e => {setForm({...form,previewText:e.target.value});setSaved(false);}} /></label>
            <p className="text-xs text-muted-foreground">{form.previewText.trim() ? form.previewText.trim().split(/\s+/).length : 0} words · Plain text keeps the preview readable on phones.</p>
            <label className="block text-sm font-medium">Preview closing line<Input maxLength={500} value={form.previewEnding} placeholder="The chapter continues in the complete book." onChange={e => {setForm({...form,previewEnding:e.target.value});setSaved(false);}} /></label>
            {form.previewText.trim() && <details className="rounded-lg border bg-muted/20 p-4"><summary className="cursor-pointer font-semibold">See the reader preview</summary><h5 className="mt-4 text-lg font-bold">{form.previewTitle || "Chapter sample"}</h5><div className="mt-3 max-h-96 space-y-4 overflow-y-auto break-words text-base leading-8">{form.previewText.split(/\n\n+/).map((paragraph,index)=><p className="whitespace-pre-wrap" key={index}>{paragraph}</p>)}<p className="border-t pt-3 font-semibold">{form.previewEnding || "The chapter continues in the complete book."}</p></div></details>}
          </div>}
          <h4 className="border-t pt-5 text-lg font-bold">3. Files and release</h4>
          <div key={resetKey} className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Cover image (JPEG, PNG or WebP, up to 10 MB)<Input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => {setCover(e.target.files?.[0]);setSaved(false);}} /></label>
            <label className="block text-sm font-medium">{form.kind === "Book" ? "Book PDF" : verifiedReleaseById(id) ? "Release ZIP" : "Music MP3"} (up to 250 MB)<Input type="file" accept={form.kind === "Book" ? ".pdf,application/pdf" : verifiedReleaseById(id) ? ".zip,application/zip" : ".mp3,audio/mpeg"} onChange={e => {setDownload(e.target.files?.[0]);setSaved(false);}} /></label>
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
      </div>
    </section>
  );
}
