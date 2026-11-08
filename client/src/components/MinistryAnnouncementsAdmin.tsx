import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MinistryAnnouncement } from "./MinistryDiscovery";

type ManagedAnnouncement = MinistryAnnouncement & { isPublished: boolean };
const defaults = { title: "", description: "", category: "whats_new", destinationUrl: "/", buttonLabel: "Learn More", isPublished: false };
export function MinistryAnnouncementsAdmin() {
 const qc = useQueryClient();
 const [form, setForm] = useState(defaults);
 const [error, setError] = useState("");
 const {data = []} = useQuery<ManagedAnnouncement[]>({queryKey:["/api/admin/ministry-announcements"]});
 const create = useMutation({
  mutationFn: () => apiRequest("POST","/api/admin/ministry-announcements",form),
  onSuccess: () => { setForm(defaults); setError(""); qc.invalidateQueries({queryKey:["/api/admin/ministry-announcements"]}); qc.invalidateQueries({queryKey:["/api/ministry-announcements"]}); },
  onError: () => setError("Could not save announcement. Check that the migration is applied and your admin session is active."),
 });
 const toggle = useMutation({
  mutationFn: ({id,isPublished}:{id:number,isPublished:boolean}) => apiRequest("PATCH",`/api/admin/ministry-announcements/${id}`,{isPublished}),
  onSuccess: () => {qc.invalidateQueries({queryKey:["/api/admin/ministry-announcements"]});qc.invalidateQueries({queryKey:["/api/ministry-announcements"]});},
 });
 return <section className="rounded-xl border p-4 space-y-3">
  <h3 className="font-semibold text-lg">Ministry Promotions & What's New</h3>
  <p className="text-sm text-muted-foreground">Create a ministry announcement as a draft, review it, then publish. Links must point to an internal app page.</p>
  <Input aria-label="Announcement title" placeholder="Announcement title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
  <Textarea aria-label="Announcement description" placeholder="Short description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
  <div className="grid sm:grid-cols-2 gap-2">
   <select aria-label="Announcement type" className="border rounded-md p-2 bg-background" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
    <option value="whats_new">What's New</option><option value="book">Book</option><option value="music">Music</option><option value="discipleship">Discipleship</option><option value="feature">New Feature</option>
   </select>
   <Input aria-label="Destination path" placeholder="/books" value={form.destinationUrl} onChange={e=>setForm({...form,destinationUrl:e.target.value})}/>
   <Input aria-label="Button label" placeholder="Learn More" value={form.buttonLabel} onChange={e=>setForm({...form,buttonLabel:e.target.value})}/>
  </div>
  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  <Button disabled={create.isPending || !form.title.trim() || !form.description.trim()} onClick={()=>create.mutate()}>Save Draft</Button>
  <div className="space-y-2">
   {data.map(item=><div key={item.id} className="border rounded-lg p-3 flex justify-between gap-3 items-center">
    <div><p className="font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{item.isPublished?"Published":"Draft"} · {item.category}</p></div>
    <Button variant="outline" disabled={toggle.isPending} onClick={()=>toggle.mutate({id:item.id,isPublished:!item.isPublished})}>{item.isPublished?"Unpublish":"Publish"}</Button>
   </div>)}
  </div>
 </section>;
}
