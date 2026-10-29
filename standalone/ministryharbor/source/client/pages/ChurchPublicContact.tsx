import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { ChurchPublicShell } from "@/components/ChurchPublicShell";
import { Loader2, MapPin, Phone, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChurchPublicContact() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<any>({ queryKey: [`/api/public/churches/${slug}`] });

  const church = data?.church ?? null;
  const primary = church?.themeColor ?? "#1d3461";

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: (body: typeof form) => apiRequest("POST", `/api/public/churches/${slug}/contact`, body),
    onSuccess: () => { setSent(true); setForm({ name: "", email: "", subject: "", message: "" }); },
    onError: () => toast({ title: t("cm_error"), description: t("cm_contactDesc"), variant: "destructive" }),
  });

  return (
    <ChurchPublicShell church={church}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_getInTouch")}</p>
          <h1 className="text-3xl font-bold" style={{ color: "#1a1a1a" }}>{t("cm_contactUsHeading")}</h1>
          <p className="mt-2 text-sm" style={{ color: "#9a9080" }}>{t("cm_contactDesc")}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-5">
              {church?.address && (
                <div className="flex items-start gap-4 p-5 rounded-xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: primary }} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a9080" }}>{t("cm_addressLabel")}</p>
                    <p className="text-sm" style={{ color: "#3d3a36" }}>{church.address}</p>
                  </div>
                </div>
              )}
              {church?.phone && (
                <div className="flex items-start gap-4 p-5 rounded-xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                  <Phone className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: primary }} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a9080" }}>{t("cm_phoneLabel")}</p>
                    <a href={`tel:${church.phone}`} className="text-sm font-medium" style={{ color: primary }}>{church.phone}</a>
                  </div>
                </div>
              )}
              {church?.email && (
                <div className="flex items-start gap-4 p-5 rounded-xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                  <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: primary }} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a9080" }}>{t("cm_emailLabel")}</p>
                    <a href={`mailto:${church.email}`} className="text-sm font-medium" style={{ color: primary }}>{church.email}</a>
                  </div>
                </div>
              )}
              {church?.pastorName && (
                <div className="flex items-start gap-4 p-5 rounded-xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                  <span className="text-lg">⛪</span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a9080" }}>{t("cm_leadPastor")}</p>
                    <p className="text-sm" style={{ color: "#3d3a36" }}>{church.pastorName}</p>
                  </div>
                </div>
              )}
              {(church?.mapEmbedUrl || church?.address) && (
                <div className="rounded-2xl overflow-hidden border h-56" style={{ borderColor: "#ece8e0" }}>
                  <iframe
                    src={church.mapEmbedUrl ?? `https://maps.google.com/maps?q=${encodeURIComponent(church.address)}&output=embed`}
                    title="Location" className="w-full h-full" style={{ border: 0 }} loading="lazy" allowFullScreen />
                </div>
              )}
            </div>

            <div>
              {sent ? (
                <div className="text-center py-10 px-6 rounded-2xl border" style={{ borderColor: "#ece8e0", backgroundColor: "#fafaf8" }}>
                  <div className="text-4xl mb-3">✉️</div>
                  <p className="font-semibold" style={{ color: "#1a1a1a" }}>{t("cm_messageSentToast")}</p>
                  <p className="text-sm mt-1 mb-4" style={{ color: "#9a9080" }}>{t("cm_wellGetBack")}</p>
                  <button onClick={() => setSent(false)} className="text-sm font-medium" style={{ color: primary }}>{t("cm_sendAnother")}</button>
                </div>
              ) : (
                <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }}
                  className="space-y-4 p-6 rounded-2xl border bg-white" style={{ borderColor: "#ece8e0" }}
                  data-testid="form-contact">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#6b6460" }}>{t("cm_yourNameField")}</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={t("cm_yourNamePlaceholder")} required
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "#ece8e0" }}
                      data-testid="input-contact-name" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#6b6460" }}>{t("cm_emailRequired")}</label>
                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="your@email.com" type="email" required
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "#ece8e0" }}
                      data-testid="input-contact-email" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#6b6460" }}>{t("cm_subjectLabel")}</label>
                    <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      placeholder={t("cm_howCanWeHelp")}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "#ece8e0" }}
                      data-testid="input-contact-subject" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#6b6460" }}>{t("cm_messageRequired")}</label>
                    <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder={t("cm_howCanWeHelp")} required rows={5}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                      style={{ borderColor: "#ece8e0" }}
                      data-testid="input-contact-message" />
                  </div>
                  <button type="submit" disabled={mutation.isPending}
                    className="w-full py-3 text-sm font-semibold rounded-xl text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: primary }}
                    data-testid="button-send-message">
                    {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {t("cm_sendMessageButton")}
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
