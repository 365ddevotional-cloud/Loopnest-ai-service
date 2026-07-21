import { useState, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Mic2, BookOpen, Calendar, Play, Headphones, Loader2, AlertCircle,
  FileText, Bookmark, BookmarkCheck, Pencil, Trash2, Plus, X,
  ChevronDown, ChevronUp, Download, ExternalLink, Clock
} from "lucide-react";
import type { Church, ChurchSermon } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor", "ministry_leader"];

const EMPTY_FORM = {
  title: "", description: "", speakerName: "", videoUrl: "", audioUrl: "",
  pdfNotesUrl: "", outlineUrl: "", imageUrl: "", bibleReference: "",
  sermonDate: "", scheduledDate: "", isPublished: true,
};

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };
  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} className="hidden" />
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        style={{ backgroundColor: playing ? "#b8962e" : "#b8962e15", color: playing ? "#fff" : "#b8962e" }}
        data-testid="button-sermon-audio-play"
      >
        <Headphones className="w-3.5 h-3.5" />
        {playing ? "Pause" : "Listen"}
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-xs px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1"
        style={{ backgroundColor: "#f0ece4", color: "#7a7570" }}
        data-testid="button-sermon-audio-external">
        <ExternalLink className="w-3 h-3" />
        Open
      </a>
    </div>
  );
}

function SermonCard({
  sermon, isAdmin, isBookmarked, onToggleBookmark, onEdit, onDelete, churchId, getIdToken,
}: {
  sermon: ChurchSermon;
  isAdmin: boolean;
  isBookmarked: boolean;
  onToggleBookmark: (id: number) => void;
  onEdit: (s: ChurchSermon) => void;
  onDelete: (id: number) => void;
  churchId: number;
  getIdToken: () => Promise<string | null>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteSaving, setSaving] = useState(false);
  const { toast } = useToast();

  const { data: noteData } = useQuery<{ body: string }>({
    queryKey: ["/api/churches", churchId, "sermons", sermon.id, "note"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return { body: "" };
      const r = await fetch(`/api/churches/${churchId}/sermons/${sermon.id}/note`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : { body: "" };
    },
    enabled: showNotes,
    staleTime: 30000,
  });

  const saveNote = async () => {
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(`/api/churches/${churchId}/sermons/${sermon.id}/note`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteBody }),
      });
      setNoteSaved(true);
      toast({ title: "Notes saved" });
    } finally { setSaving(false); }
  };

  const initialNoteLoaded = useRef(false);
  if (showNotes && noteData && !initialNoteLoaded.current) {
    setNoteBody(noteData.body);
    initialNoteLoaded.current = true;
  }
  if (!showNotes) initialNoteLoaded.current = false;

  return (
    <Card className="border-0 shadow-sm overflow-hidden" style={{ backgroundColor: "#fff" }} data-testid={`card-sermon-${sermon.id}`}>
      {sermon.imageUrl && (
        <div className="h-36 overflow-hidden">
          <img src={sermon.imageUrl} alt={sermon.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="h-0.5" style={{ backgroundColor: "#1a274418" }} />
      <CardContent className="pt-5 pb-5 px-5">
        <div className="flex items-start gap-4">
          {!sermon.imageUrl && (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ backgroundColor: "#1a274412", border: "1px solid #1a274418" }}>
              <Mic2 className="w-6 h-6" style={{ color: "#1a2744" }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-base leading-snug" style={{ color: "#1a2744" }}>{sermon.title}</h3>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!sermon.isPublished && (
                  <Badge variant="outline" className="text-xs" style={{ borderColor: "#f59e0b50", color: "#d97706" }}>Draft</Badge>
                )}
                <button
                  onClick={() => onToggleBookmark(sermon.id)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: isBookmarked ? "#b8962e15" : "transparent" }}
                  title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                  data-testid={`button-bookmark-sermon-${sermon.id}`}
                >
                  {isBookmarked
                    ? <BookmarkCheck className="w-4 h-4" style={{ color: "#b8962e" }} />
                    : <Bookmark className="w-4 h-4" style={{ color: "#9a9080" }} />
                  }
                </button>
                {isAdmin && (
                  <>
                    <button onClick={() => onEdit(sermon)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" data-testid={`button-edit-sermon-${sermon.id}`}>
                      <Pencil className="w-3.5 h-3.5" style={{ color: "#7a7570" }} />
                    </button>
                    <button onClick={() => onDelete(sermon.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" data-testid={`button-delete-sermon-${sermon.id}`}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {sermon.speakerName && (
                <Badge variant="outline" className="text-xs font-normal" style={{ borderColor: "#b8962e50", color: "#b8962e" }}>
                  {sermon.speakerName}
                </Badge>
              )}
              {sermon.bibleReference && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "#7a7570" }}>
                  <BookOpen className="w-3.5 h-3.5" />
                  {sermon.bibleReference}
                </span>
              )}
              {sermon.sermonDate && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "#9a9080" }}>
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(sermon.sermonDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
              {sermon.scheduledDate && !sermon.sermonDate && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "#6366f1" }}>
                  <Clock className="w-3.5 h-3.5" />
                  Scheduled {new Date(sermon.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>

            {sermon.description && (
              <p className={`text-sm mt-2 leading-relaxed ${expanded ? "" : "line-clamp-2"}`} style={{ color: "#5a5450" }}>
                {sermon.description}
              </p>
            )}
            {sermon.description && sermon.description.length > 120 && (
              <button onClick={() => setExpanded(e => !e)} className="text-xs mt-1 flex items-center gap-0.5" style={{ color: "#b8962e" }}>
                {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Show less</> : <><ChevronDown className="w-3.5 h-3.5" />Read more</>}
              </button>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {sermon.videoUrl && (
                <a href={sermon.videoUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: "#1a274412", color: "#1a2744" }}
                  data-testid={`link-sermon-video-${sermon.id}`}>
                  <Play className="w-3.5 h-3.5" />
                  Watch Video
                </a>
              )}
              {sermon.audioUrl && <AudioPlayer url={sermon.audioUrl} />}
              {sermon.pdfNotesUrl && (
                <a href={sermon.pdfNotesUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: "#ef444415", color: "#dc2626" }}
                  data-testid={`link-sermon-notes-${sermon.id}`}>
                  <FileText className="w-3.5 h-3.5" />
                  Sermon Notes
                </a>
              )}
              {sermon.outlineUrl && (
                <a href={sermon.outlineUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: "#22c55e12", color: "#16a34a" }}
                  data-testid={`link-sermon-outline-${sermon.id}`}>
                  <Download className="w-3.5 h-3.5" />
                  Download Outline
                </a>
              )}
              <button
                onClick={() => setShowNotes(n => !n)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: showNotes ? "#6366f115" : "#f0ece4", color: showNotes ? "#6366f1" : "#7a7570" }}
                data-testid={`button-sermon-notes-${sermon.id}`}>
                <Pencil className="w-3.5 h-3.5" />
                My Notes
              </button>
            </div>

            {showNotes && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={noteBody}
                  onChange={e => { setNoteBody(e.target.value); setNoteSaved(false); }}
                  placeholder="Write your personal notes here — only you can see these..."
                  rows={4}
                  className="text-sm resize-none"
                  style={{ borderColor: "#c9b99044" }}
                  data-testid={`textarea-sermon-note-${sermon.id}`}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={saveNote}
                    disabled={noteSaving}
                    style={{ backgroundColor: "#6366f1", color: "#fff" }}
                    data-testid={`button-save-note-${sermon.id}`}
                  >
                    {noteSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Notes"}
                  </Button>
                  {noteSaved && <span className="text-xs" style={{ color: "#22c55e" }}>Saved</span>}
                  <span className="text-xs" style={{ color: "#9a9080" }}>Private to you</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChurchSermons() {
  const [, params] = useRoute("/church/:slug/sermons");
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const isSignedIn = !!user && !!emailVerified;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingSermon, setEditingSermon] = useState<ChurchSermon | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [filterBookmarked, setFilterBookmarked] = useState(false);

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

  const { data: sermons, isLoading } = useQuery<ChurchSermon[]>({
    queryKey: ["/api/churches", church?.id, "sermons"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/sermons`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && !!myRole?.role,
  });

  const { data: bookmarkData } = useQuery<{ sermonIds: number[] }>({
    queryKey: ["/api/churches", church?.id, "bookmarks"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return { sermonIds: [] };
      const r = await fetch(`/api/churches/${church!.id}/bookmarks`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : { sermonIds: [] };
    },
    enabled: !!church?.id && !!myRole?.role,
  });

  const isMember = !!myRole?.role && myRole.status === "active";
  const isAdmin = ADMIN_ROLES.includes(myRole?.role ?? "");
  const bookmarkedIds = new Set(bookmarkData?.sermonIds ?? []);

  const handleBookmark = async (sermonId: number) => {
    const token = await getIdToken();
    if (!token) return;
    await fetch(`/api/churches/${church!.id}/sermons/${sermonId}/bookmark`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "bookmarks"] });
  };

  const openCreate = () => { setEditingSermon(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const openEdit = (s: ChurchSermon) => {
    setEditingSermon(s);
    setForm({
      title: s.title, description: s.description ?? "", speakerName: s.speakerName ?? "",
      videoUrl: s.videoUrl ?? "", audioUrl: s.audioUrl ?? "", pdfNotesUrl: s.pdfNotesUrl ?? "",
      outlineUrl: s.outlineUrl ?? "", imageUrl: s.imageUrl ?? "", bibleReference: s.bibleReference ?? "",
      sermonDate: s.sermonDate ? new Date(s.sermonDate).toISOString().split("T")[0] : "",
      scheduledDate: s.scheduledDate ? new Date(s.scheduledDate).toISOString().split("T")[0] : "",
      isPublished: s.isPublished,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !church) return;
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const payload = {
        ...form,
        sermonDate: form.sermonDate || null,
        scheduledDate: form.scheduledDate || null,
      };
      const url = editingSermon
        ? `/api/churches/${church.id}/sermons/${editingSermon.id}`
        : `/api/churches/${church.id}/sermons`;
      const r = await fetch(url, {
        method: editingSermon ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const d = await r.json(); toast({ title: "Error", description: d.message, variant: "destructive" }); return; }
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "sermons"] });
      setShowForm(false);
      toast({ title: editingSermon ? "Sermon updated" : "Sermon created" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (sermonId: number) => {
    if (!church || !confirm("Delete this sermon?")) return;
    const token = await getIdToken();
    if (!token) return;
    await fetch(`/api/churches/${church.id}/sermons/${sermonId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "sermons"] });
    toast({ title: "Sermon deleted" });
  };

  const displayedSermons = filterBookmarked
    ? (sermons ?? []).filter(s => bookmarkedIds.has(s.id))
    : (sermons ?? []);

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1a274412" }}>
              <Mic2 className="w-5 h-5" style={{ color: "#1a2744" }} />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>Sermons</h2>
              <p className="text-sm mt-0.5" style={{ color: "#7a7570" }}>
                {sermons?.length ?? 0} sermon{(sermons?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterBookmarked(f => !f)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: filterBookmarked ? "#b8962e" : "#f0ece4", color: filterBookmarked ? "#fff" : "#7a7570" }}
              data-testid="button-filter-bookmarked"
            >
              <Bookmark className="w-3.5 h-3.5" />
              {filterBookmarked ? "All Sermons" : "Bookmarked"}
            </button>
            {isAdmin && (
              <Button size="sm" onClick={openCreate} style={{ backgroundColor: "#1a2744", color: "#fff" }} data-testid="button-add-sermon">
                <Plus className="w-4 h-4 mr-1" />
                Add Sermon
              </Button>
            )}
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && isAdmin && (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span style={{ color: "#1a2744" }}>{editingSermon ? "Edit Sermon" : "New Sermon"}</span>
                <button onClick={() => setShowForm(false)}><X className="w-4 h-4" style={{ color: "#9a9080" }} /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Title *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Sermon title" data-testid="input-sermon-title" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Speaker</Label>
                  <Input value={form.speakerName} onChange={e => setForm(f => ({ ...f, speakerName: e.target.value }))} placeholder="Pastor / Speaker name" data-testid="input-sermon-speaker" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Bible Reference</Label>
                  <Input value={form.bibleReference} onChange={e => setForm(f => ({ ...f, bibleReference: e.target.value }))} placeholder="e.g. John 3:16" data-testid="input-sermon-reference" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Sermon Date</Label>
                  <Input type="date" value={form.sermonDate} onChange={e => setForm(f => ({ ...f, sermonDate: e.target.value }))} data-testid="input-sermon-date" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Video URL</Label>
                  <Input value={form.videoUrl} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="YouTube / Vimeo link" data-testid="input-sermon-video" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Audio URL</Label>
                  <Input value={form.audioUrl} onChange={e => setForm(f => ({ ...f, audioUrl: e.target.value }))} placeholder="MP3 or podcast link" data-testid="input-sermon-audio" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">PDF Notes URL</Label>
                  <Input value={form.pdfNotesUrl} onChange={e => setForm(f => ({ ...f, pdfNotesUrl: e.target.value }))} placeholder="Link to sermon notes PDF" data-testid="input-sermon-pdf" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Outline URL</Label>
                  <Input value={form.outlineUrl} onChange={e => setForm(f => ({ ...f, outlineUrl: e.target.value }))} placeholder="Link to outline document" data-testid="input-sermon-outline" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Cover Image URL</Label>
                  <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="Image URL for this sermon" data-testid="input-sermon-image" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Scheduled Date</Label>
                  <Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} data-testid="input-sermon-scheduled" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Brief summary or description" data-testid="textarea-sermon-description" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} className="rounded" data-testid="checkbox-sermon-published" />
                  <span className="text-sm" style={{ color: "#4a4540" }}>Published (visible to members)</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving || !form.title.trim()} style={{ backgroundColor: "#1a2744", color: "#fff" }} data-testid="button-save-sermon">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {saving ? "Saving…" : editingSermon ? "Save Changes" : "Add Sermon"}
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
              <p className="text-sm" style={{ color: "#1a2744" }}>You must be a member to view sermons.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} />
          </div>
        ) : !displayedSermons.length ? (
          <div className="text-center py-16">
            <Mic2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#c9b99060" }} />
            <p className="font-semibold" style={{ color: "#1a2744" }}>
              {filterBookmarked ? "No bookmarked sermons" : "No sermons yet"}
            </p>
            <p className="text-sm mt-1" style={{ color: "#7a7570" }}>
              {filterBookmarked ? "Bookmark sermons to find them quickly here." : "Sermon recordings and notes will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedSermons.map(sermon => (
              <SermonCard
                key={sermon.id}
                sermon={sermon}
                isAdmin={isAdmin}
                isBookmarked={bookmarkedIds.has(sermon.id)}
                onToggleBookmark={handleBookmark}
                onEdit={openEdit}
                onDelete={handleDelete}
                churchId={church!.id}
                getIdToken={getIdToken}
              />
            ))}
          </div>
        )}
      </div>
    </ChurchModeShell>
  );
}
