import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ChurchPublicShell } from "@/components/ChurchPublicShell";
import { Loader2, MapPin, Phone, Mail, Heart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChurchPublicContact() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<any>({ queryKey: [`/api/public/churches/${slug}`] });

  const church = data?.church ?? null;
  const primary = church?.themeColor ?? "#1d3461";

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: (body: typeof form) => apiRequest("POST", `/api/public/churches/${slug}/contact`, body),
    onSuccess: () => { setSent(true); setForm({ name: "", email: "", subject: "", message: "" }); },
    onError: () => toast({ title: "Error", description: "Could not send message. Please email us directly.", variant: "destructive" }),
  });

  return (
    <ChurchPublicShell church={church}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>Get in Touch</p>
          <h1 className="text-3xl font-bold" style={{ color: "#1a1a1a" }}>Contact Us</h1>
          <p className="mt-2 text-sm" style={{ color: "#9a9080" }}>
            We'd love to hear from you. Reach out with any questions or to plan a visit.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Contact info */}
            <div className="space-y-5">
              {church?.address && (
                <div className="flex items-start gap-4 p-5 rounded-xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: primary }} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a9080" }}>Address</p>
                    <p className="text-sm" style={{ color: "#3d3a36" }}>{church.address}</p>
                  </div>
                </div>
              )}
              {church?.phone && (
                <div className="flex items-start gap-4 p-5 rounded-xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                  <Phone className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: primary }} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a9080" }}>Phone</p>
                    <a href={`tel:${church.phone}`} className="text-sm font-medium" style={{ color: primary }}>{church.phone}</a>
                  </div>
                </div>
              )}
              {church?.email && (
                <div className="flex items-start gap-4 p-5 rounded-xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                  <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: primary }} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a9080" }}>Email</p>
                    <a href={`mailto:${church.email}`} className="text-sm font-medium" style={{ color: primary }}>{church.email}</a>
                  </div>
                </div>
              )}
              {church?.pastorName && (
                <div className="flex items-start gap-4 p-5 rounded-xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                  <span className="text-lg">⛪</span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a9080" }}>Lead Pastor</p>
                    <p className="text-sm" style={{ color: "#3d3a36" }}>{church.pastorName}</p>
                  </div>
                </div>
              )}
              {/* Map */}
              {(church?.mapEmbedUrl || church?.address) && (
                <div className="rounded-2xl overflow-hidden border h-56" style={{ borderColor: "#ece8e0" }}>
                  <iframe
                    src={church.mapEmbedUrl ?? `https://maps.google.com/maps?q=${encodeURIComponent(church.address)}&output=embed`}
                    title="Location" className="w-full h-full" style={{ border: 0 }} loading="lazy" allowFullScreen />
                </div>
              )}
            </div>

            {/* Contact form */}
            <div>
              {sent ? (
                <div className="text-center py-10 px-6 rounded-2xl border" style={{ borderColor: "#ece8e0", backgroundColor: "#fafaf8" }}>
                  <div className="text-4xl mb-3">✉️</div>
                  <p className="font-semibold" style={{ color: "#1a1a1a" }}>Message sent!</p>
                  <p className="text-sm mt-1 mb-4" style={{ color: "#9a9080" }}>We'll get back to you soon.</p>
                  <button onClick={() => setSent(false)} className="text-sm font-medium" style={{ color: primary }}>Send another</button>
                </div>
              ) : (
                <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }}
                  className="space-y-4 p-6 rounded-2xl border bg-white" style={{ borderColor: "#ece8e0" }}
                  data-testid="form-contact">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#6b6460" }}>Your Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Full name" required
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "#ece8e0" }}
                      data-testid="input-contact-name" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#6b6460" }}>Email *</label>
                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="your@email.com" type="email" required
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "#ece8e0" }}
                      data-testid="input-contact-email" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#6b6460" }}>Subject</label>
                    <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      placeholder="How can we help?"
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "#ece8e0" }}
                      data-testid="input-contact-subject" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#6b6460" }}>Message *</label>
                    <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Your message..." required rows={5}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                      style={{ borderColor: "#ece8e0" }}
                      data-testid="input-contact-message" />
                  </div>
                  <button type="submit" disabled={mutation.isPending}
                    className="w-full py-3 text-sm font-semibold rounded-xl text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: primary }}
                    data-testid="button-send-message">
                    {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </ChurchPublicShell>
  );
}
