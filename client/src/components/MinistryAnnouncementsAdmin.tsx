import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MinistryAnnouncement } from "./MinistryDiscovery";

type ManagedAnnouncement = MinistryAnnouncement & {
  isPublished: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

const categories = {
  whats_new: "What's New",
  book: "Book or study resource",
  product: "Ministry product",
  music: "Worship music",
  discipleship: "Discipleship",
  feature: "New feature",
};

const defaults = {
  title: "",
  description: "",
  category: "whats_new",
  destinationUrl: "/",
  buttonLabel: "Learn More",
  startsAt: "",
  endsAt: "",
};

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function publicationStatus(item: ManagedAnnouncement) {
  if (!item.isPublished) return "Draft";
  const now = Date.now();
  if (item.endsAt && Date.parse(item.endsAt) <= now) return "Ended";
  if (item.startsAt && Date.parse(item.startsAt) > now) return "Scheduled";
  return "Published";
}

export function MinistryAnnouncementsAdmin() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(defaults);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const announcements = useQuery<ManagedAnnouncement[]>({ queryKey: ["/api/admin/ministry-announcements"] });

  async function refreshAnnouncements() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ministry-announcements"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-announcements"] }),
    ]);
  }

  function resetForm() {
    setEditingId(null);
    setForm(defaults);
    setPreview(false);
    setError("");
  }

  function edit(item: ManagedAnnouncement) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      category: item.category,
      destinationUrl: item.destinationUrl,
      buttonLabel: item.buttonLabel,
      startsAt: localDateTime(item.startsAt),
      endsAt: localDateTime(item.endsAt),
    });
    setPreview(false);
    setError("");
  }

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };
      return editingId === null
        ? apiRequest("POST", "/api/admin/ministry-announcements", body)
        : apiRequest("PATCH", `/api/admin/ministry-announcements/${editingId}`, body);
    },
    onSuccess: async () => {
      resetForm();
      await refreshAnnouncements();
    },
    onError: () => setError("Could not save the announcement. Check the details and try again."),
  });

  const publish = useMutation({
    mutationFn: (item: ManagedAnnouncement) =>
      apiRequest("PATCH", `/api/admin/ministry-announcements/${item.id}`, { isPublished: !item.isPublished }),
    onSuccess: refreshAnnouncements,
    onError: () => setError("Could not update publication status. Try again."),
  });

  function update(field: keyof typeof defaults, value: string) {
    setForm(previous => ({ ...previous, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (form.startsAt && form.endsAt && Date.parse(form.startsAt) >= Date.parse(form.endsAt)) {
      setError("Choose an end time after the start time.");
      return;
    }
    save.mutate();
  }

  const busy = save.isPending || publish.isPending;
  return (
    <section className="space-y-4 rounded-xl border p-4">
      <h3 className="text-lg font-semibold">Ministry Promotions &amp; What's New</h3>
      <p className="text-sm text-muted-foreground">Save a draft, preview it, then publish. Scheduled announcements appear at the chosen start time.</p>
      <form className="space-y-3" onSubmit={submit}>
        <Input aria-label="Announcement title" placeholder="Announcement title" value={form.title} onChange={e => update("title", e.target.value)} required minLength={3} maxLength={120} />
        <Textarea aria-label="Announcement description" placeholder="Short description" value={form.description} onChange={e => update("description", e.target.value)} required minLength={3} maxLength={500} />
        <div className="grid gap-2 sm:grid-cols-2">
          <select aria-label="Announcement type" className="rounded-md border bg-background p-2" value={form.category} onChange={e => update("category", e.target.value)}>
            {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Input aria-label="Destination path" placeholder="/music" value={form.destinationUrl} onChange={e => update("destinationUrl", e.target.value)} required maxLength={500} />
          <Input aria-label="Button label" placeholder="Learn More" value={form.buttonLabel} onChange={e => update("buttonLabel", e.target.value)} required minLength={2} maxLength={40} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-sm">Start time (optional)
            <Input type="datetime-local" value={form.startsAt} onChange={e => update("startsAt", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">End time (optional)
            <Input type="datetime-local" value={form.endsAt} onChange={e => update("endsAt", e.target.value)} />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Times use your device's time zone. Use an internal app path for the destination.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>{editingId === null ? "Save Draft" : "Save Changes"}</Button>
          <Button type="button" variant="outline" onClick={() => setPreview(value => !value)}>{preview ? "Hide Preview" : "Preview"}</Button>
          {editingId !== null && <Button type="button" variant="ghost" disabled={busy} onClick={resetForm}>Cancel Edit</Button>}
        </div>
      </form>
      {preview && (
        <article aria-label="Announcement preview" className="space-y-2 rounded-xl border border-orange-400/40 bg-card p-4">
          <p className="text-xs font-semibold uppercase text-orange-600">{categories[form.category as keyof typeof categories]}</p>
          <h4 className="font-semibold">{form.title || "Announcement title"}</h4>
          <p className="text-sm text-muted-foreground">{form.description || "Announcement description"}</p>
          <span className="text-sm font-semibold text-primary">{form.buttonLabel}</span>
        </article>
      )}
      {(error || announcements.isError) && <p role="alert" className="text-sm text-destructive">{error || "Could not load announcements."}</p>}
      <div className="space-y-2">
        {announcements.data?.map(item => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="text-xs text-muted-foreground">{publicationStatus(item)} · {categories[item.category as keyof typeof categories] ?? item.category}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => edit(item)}>Edit</Button>
              <Button variant="outline" disabled={busy} onClick={() => { setError(""); publish.mutate(item); }}>
                {item.isPublished ? "Unpublish" : item.startsAt && Date.parse(item.startsAt) > Date.now() ? "Schedule" : "Publish"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
