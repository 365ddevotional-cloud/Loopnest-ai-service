import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Megaphone, Pin, Calendar, Loader2, AlertCircle, Plus, X,
  Pencil, Trash2, FileText, ExternalLink, ImageIcon
} from "lucide-react";
import type { Church, ChurchAnnouncement } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];
const EMPTY_FORM = { title: "", body: "", isPinned: false, expiresAt: "", imageUrl: "", pdfUrl: "", externalLink: "" };

export default function ChurchAnnouncements() {
  const [, params] = useRoute("/church/:slug/announcements");
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const isSignedIn = !!user && !!emailVerified;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingAnn, setEditingAnn] = useState<ChurchAnnouncement | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const { data: church } = useQuery<Church>({
    queryKey: ["/api/churches/slug", slug],
    queryFn: () => fetch(`/api/churches/slug/${slug}`).then(r => r.ok ? r.json() : Promise.reject()),
    enabled: !!slug,
  });

  const { data: myRole } = useQuery<MyRole>({
    queryKey: ["/api/churches/slug", slug, "my-role"],
    queryFn: async () => {
      const token = await getIdToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await fetch(`/api/churches/slug/${slug}/my-role`, { headers });
      return r.ok ? r.json() : { role: null, memberId: null, status: null };
    },
    enabled: !!slug && isSignedIn,
  });

  const { data: announcements, isLoading } = useQuery<ChurchAnnouncement[]>({
    queryKey: ["/api/churches", church?.id, "announcements"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/announcements`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && !!myRole?.role,
  });

  const isMember = !!myRole?.role && myRole.status === "active";
  const isAdmin = ADMIN_ROLES.includes(myRole?.role ?? "");

  const pinned = announcements?.filter(a => a.isPinned) ?? [];
  const regular = announcements?.filter(a => !a.isPinned) ?? [];

  const formatDate = (d: string | Date | null) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const openCreate = () => { setEditingAnn(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const openEdit = (ann: ChurchAnnouncement) => {
    setEditingAnn(ann);
    setForm({
      title: ann.title, body: ann.body, isPinned: ann.isPinned,
      expiresAt: ann.expiresAt ? new Date(ann.expiresAt).toISOString().split("T")[0] : "",
      imageUrl: ann.imageUrl ?? "", pdfUrl: ann.pdfUrl ?? "", externalLink: ann.externalLink ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim() || !church) return;
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const payload = {
        ...form,
        expiresAt: form.expiresAt || null,
        imageUrl: form.imageUrl || null,
        pdfUrl: form.pdfUrl || null,
        externalLink: form.externalLink || null,
      };
      const url = editingAnn
        ? `/api/churches/${church.id}/announcements/${editingAnn.id}`
        : `/api/churches/${church.id}/announcements`;
      const r = await fetch(url, {
        method: editingAnn ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const d = await r.json(); toast({ title: "Error", description: d.message, variant: "destructive" }); return; }
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "announcements"] });
      setShowForm(false);
      toast({ title: editingAnn ? "Announcement updated" : "Announcement posted" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (annId: number) => {
    if (!church || !confirm("Delete this announcement?")) return;
    const token = await getIdToken();
    if (!token) return;
    await fetch(`/api/churches/${church.id}/announcements/${annId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "announcements"] });
    toast({ title: "Announcement deleted" });
  };

  const AnnCard = ({ ann }: { ann: ChurchAnnouncement }) => (
    <Card key={ann.id} className="border-0 shadow-sm overflow-hidden" style={{ backgroundColor: "#fff" }} data-testid={`card-announcement-${ann.id}`}>
      {ann.isPinned && <div className="h-0.5" style={{ backgroundColor: "#b8962e" }} />}
      {ann.imageUrl && (
        <div className="h-40 overflow-hidden">
          <img src={ann.imageUrl} alt={ann.title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className="pt-5 pb-5 px-5">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {ann.isPinned && <Pin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#b8962e" }} />}
            <h3 className="font-semibold text-base" style={{ color: "#1a2744" }}>{ann.title}</h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {ann.isPinned && (
              <Badge className="text-xs flex-shrink-0" style={{ backgroundColor: "#b8962e20", color: "#b8962e", border: "1px solid #b8962e30" }}>
                Pinned
              </Badge>
            )}
            {isAdmin && (
              <>
                <button onClick={() => openEdit(ann)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" data-testid={`button-edit-ann-${ann.id}`}>
                  <Pencil className="w-3.5 h-3.5" style={{ color: "#7a7570" }} />
                </button>
                <button onClick={() => handleDelete(ann.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" data-testid={`button-delete-ann-${ann.id}`}>
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "#5a5450" }}>{ann.body}</p>

        {/* Attachments */}
        <div className="flex flex-wrap gap-2 mt-3">
          {ann.pdfUrl && (
            <a href={ann.pdfUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: "#ef444415", color: "#dc2626" }}
              data-testid={`link-ann-pdf-${ann.id}`}>
              <FileText className="w-3.5 h-3.5" />
              Download PDF
            </a>
          )}
          {ann.externalLink && (
            <a href={ann.externalLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: "#3b82f615", color: "#2563eb" }}
              data-testid={`link-ann-external-${ann.id}`}>
              <ExternalLink className="w-3.5 h-3.5" />
              Learn More
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs" style={{ color: "#9a9080" }}>
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(ann.createdAt)}</span>
          {ann.expiresAt && <span style={{ color: "#d97706" }}>Expires {formatDate(ann.expiresAt)}</span>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#b8962e18" }}>
              <Megaphone className="w-5 h-5" style={{ color: "#b8962e" }} />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>Announcements</h2>
              <p className="text-sm mt-0.5" style={{ color: "#7a7570" }}>Church bulletins and updates</p>
            </div>
          </div>
          {isAdmin && isMember && (
            <Button size="sm" onClick={openCreate} style={{ backgroundColor: "#1a2744", color: "#fff" }} data-testid="button-add-announcement">
              <Plus className="w-4 h-4 mr-1" />
              Post Announcement
            </Button>
          )}
        </div>

        {/* Create / Edit Form */}
        {showForm && isAdmin && (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span style={{ color: "#1a2744" }}>{editingAnn ? "Edit Announcement" : "New Announcement"}</span>
                <button onClick={() => setShowForm(false)}><X className="w-4 h-4" style={{ color: "#9a9080" }} /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title" data-testid="input-ann-title" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Message *</Label>
                <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={4} placeholder="Announcement content..." data-testid="textarea-ann-body" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Image URL <span className="text-xs text-gray-400">(optional)</span></Label>
                  <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." data-testid="input-ann-image" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">PDF Attachment URL <span className="text-xs text-gray-400">(optional)</span></Label>
                  <Input value={form.pdfUrl} onChange={e => setForm(f => ({ ...f, pdfUrl: e.target.value }))} placeholder="Link to PDF" data-testid="input-ann-pdf" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">External Link <span className="text-xs text-gray-400">(optional)</span></Label>
                  <Input value={form.externalLink} onChange={e => setForm(f => ({ ...f, externalLink: e.target.value }))} placeholder="https://..." data-testid="input-ann-link" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Expiry Date <span className="text-xs text-gray-400">(optional)</span></Label>
                  <Input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} data-testid="input-ann-expiry" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} className="rounded" data-testid="checkbox-ann-pinned" />
                <span className="text-sm" style={{ color: "#4a4540" }}>Pin to top</span>
              </label>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.body.trim()} style={{ backgroundColor: "#1a2744", color: "#fff" }} data-testid="button-save-announcement">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {saving ? "Saving…" : editingAnn ? "Save Changes" : "Post Announcement"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isMember ? (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff", borderLeft: "4px solid #b8962e" }}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#b8962e" }} />
              <p className="text-sm" style={{ color: "#1a2744" }}>You must be a member to view announcements.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} />
          </div>
        ) : !announcements?.length ? (
          <div className="text-center py-16">
            <Megaphone className="w-12 h-12 mx-auto mb-3" style={{ color: "#c9b99060" }} />
            <p className="font-semibold" style={{ color: "#1a2744" }}>No announcements yet</p>
            <p className="text-sm mt-1" style={{ color: "#7a7570" }}>Church announcements and bulletins will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pinned.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4" style={{ color: "#b8962e" }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#b8962e" }}>Pinned</span>
                </div>
                {pinned.map(ann => <AnnCard key={ann.id} ann={ann} />)}
              </div>
            )}
            {regular.length > 0 && (
              <div className="space-y-3">
                {pinned.length > 0 && <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7a7570" }}>Recent</span>}
                {regular.map(ann => <AnnCard key={ann.id} ann={ann} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </ChurchModeShell>
  );
}
