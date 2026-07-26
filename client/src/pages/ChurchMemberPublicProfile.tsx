import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Shield, Crown, Star, Calendar, MapPin, BookOpen,
  Heart, MessageCircle, Link2, Loader2, Camera, Trash2, Users,
  CheckCircle2, AlertCircle, Building2,
} from "lucide-react";
import type { Church } from "@shared/schema";
import { CHURCH_ROLE_LABELS, type ChurchRole } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

interface PublicProfileData {
  member: {
    id: number;
    displayName: string | null;
    role: string;
    joinedAt: string | null;
    firebaseUid?: string;
  };
  profile: {
    bio: string | null;
    city: string | null;
    country: string | null;
    photoUrl: string | null;
    allowMemberMessages: boolean;
  } | null;
  allowMessages: boolean;
  isOwnProfile: boolean;
  departments: string[];
}

const roleColors: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800 border-amber-300",
  lead_pastor: "bg-blue-100 text-blue-800 border-blue-300",
  administrator: "bg-purple-100 text-purple-800 border-purple-300",
  associate_pastor: "bg-sky-100 text-sky-800 border-sky-300",
  ministry_leader: "bg-green-100 text-green-800 border-green-300",
  group_leader: "bg-teal-100 text-teal-800 border-teal-300",
  counselor: "bg-pink-100 text-pink-800 border-pink-300",
  prayer_team: "bg-rose-100 text-rose-800 border-rose-300",
  member: "bg-gray-100 text-gray-700 border-gray-300",
};

const roleIcon = (role: string) => {
  if (role === "owner") return <Crown className="w-3.5 h-3.5" style={{ color: "#b8962e" }} />;
  if (["lead_pastor", "administrator", "associate_pastor"].includes(role)) return <Shield className="w-3.5 h-3.5 text-blue-600" />;
  if (["ministry_leader", "group_leader"].includes(role)) return <Star className="w-3.5 h-3.5 text-green-600" />;
  return <Users className="w-3.5 h-3.5 text-gray-500" />;
};

export default function ChurchMemberPublicProfile() {
  const [, params] = useRoute("/church/:slug/members/:memberId");
  const slug = params?.slug ?? "";
  const memberId = Number(params?.memberId ?? "0");
  const [, setLocation] = useLocation();
  const { getIdToken, user, emailVerified } = useUser();
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSignedIn = !!user && !!emailVerified;

  const [prayerOpen, setPrayerOpen] = useState(false);
  const [prayerNote, setPrayerNote] = useState("");
  const [prayerSending, setPrayerSending] = useState(false);
  const [prayerSent, setPrayerSent] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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

  const { data: profileData, isLoading } = useQuery<PublicProfileData>({
    queryKey: ["/api/churches", church?.id, "members", memberId, "public-profile"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token || !church?.id) throw new Error();
      const r = await fetch(`/api/churches/${church.id}/members/${memberId}/public-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error();
      return r.json();
    },
    enabled: !!church?.id && isSignedIn && myRole?.status === "active" && memberId > 0,
  });

  const displayName = profileData?.member.displayName ?? t("cm_memberRole");
  const role = profileData?.member.role ?? "member";
  const roleLabel = CHURCH_ROLE_LABELS[role as ChurchRole] ?? role;
  const photoUrl = profileData?.profile?.photoUrl ?? null;
  const joinDate = profileData?.member.joinedAt
    ? new Date(profileData.member.joinedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : null;
  const initials = (displayName[0] ?? "?").toUpperCase();

  const handlePrayerSubmit = async () => {
    if (!church || !slug) return;
    setPrayerSending(true);
    try {
      const r = await fetch(`/api/public/churches/${slug}/prayer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user?.displayName ?? user?.email ?? "A church member",
          request: prayerNote.trim()
            ? `Praying for ${displayName}: ${prayerNote.trim()}`
            : `Praying for ${displayName}`,
        }),
      });
      if (!r.ok) throw new Error();
      setPrayerSent(true);
      setPrayerNote("");
      setTimeout(() => { setPrayerOpen(false); setPrayerSent(false); }, 2000);
    } catch {
      toast({ title: t("cm_error"), description: "Could not submit prayer.", variant: "destructive" });
    } finally {
      setPrayerSending(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !church?.id) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t("cm_invalidImage"), variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("cm_fileTooLarge"), variant: "destructive" });
      return;
    }
    setPhotoUploading(true);
    try {
      const token = await getIdToken();
      const urlRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Could not get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();
      const uploadRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const saveRes = await fetch(`/api/churches/${church.id}/my-profile/photo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ objectPath }),
      });
      if (!saveRes.ok) throw new Error((await saveRes.json()).message ?? "Save failed");
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "members", memberId, "public-profile"] });
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "my-profile"] });
      toast({ title: t("cm_photoUpdated") });
    } catch (err: any) {
      toast({ title: t("cm_uploadFailed"), description: err.message, variant: "destructive" });
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!church?.id) return;
    setPhotoUploading(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/my-profile/photo`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error((await r.json()).message ?? "Remove failed");
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "members", memberId, "public-profile"] });
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "my-profile"] });
      toast({ title: t("cm_photoRemoved") });
    } catch (err: any) {
      toast({ title: t("cm_uploadFailed"), description: err.message, variant: "destructive" });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/church/${slug}/members/${memberId}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  if (!isSignedIn) {
    return (
      <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
        <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #b8962e", backgroundColor: "#fff" }}>
          <CardContent className="pt-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#b8962e" }} />
            <p className="text-sm">{t("cm_signInToViewProfile")}</p>
          </CardContent>
        </Card>
      </ChurchModeShell>
    );
  }

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-5 max-w-xl mx-auto">

        {/* Back button */}
        <button
          onClick={() => setLocation(`/church/${slug}/members`)}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: "#7a7570" }}
          data-testid="button-back-to-members"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("cm_membersHeading")}
        </button>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} />
          </div>
        ) : !profileData ? (
          <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #b8962e", backgroundColor: "#fff" }}>
            <CardContent className="pt-5 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#b8962e" }} />
              <p className="text-sm">{t("cm_activeMemberRequired")}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Profile card */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardContent className="pt-6 pb-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={displayName}
                        className="w-20 h-20 rounded-full object-cover"
                        style={{ border: "2px solid #e8e3dc" }}
                        data-testid="img-member-public-avatar"
                      />
                    ) : (
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
                        style={{ backgroundColor: "#1a274418", color: "#1a2744" }}
                        data-testid="div-member-public-avatar-initials"
                      >
                        {initials}
                      </div>
                    )}
                    {photoUploading && (
                      <div className="absolute inset-0 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  {/* Name + role */}
                  <div className="flex-1 min-w-0 pt-1">
                    <h2 className="font-serif text-xl font-bold leading-tight" style={{ color: "#1a2744" }} data-testid="text-member-display-name">
                      {displayName}
                      {profileData.isOwnProfile && (
                        <span className="ml-2 text-xs font-sans font-normal px-1.5 py-0.5 rounded-full border" style={{ color: "#7a7570", borderColor: "#ccc" }}>
                          {t("cm_youLabel")}
                        </span>
                      )}
                    </h2>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className={`text-xs flex items-center gap-1 ${roleColors[role] ?? ""}`} data-testid="badge-member-role">
                        {roleIcon(role)}
                        {roleLabel}
                      </Badge>
                      {joinDate && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1" data-testid="badge-member-join-date">
                          <Calendar className="w-3 h-3" />
                          {t("cm_joinedDate")} {joinDate}
                        </Badge>
                      )}
                    </div>

                    {/* Departments */}
                    {profileData.departments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {profileData.departments.map(dept => (
                          <Badge key={dept} variant="outline" className="text-xs flex items-center gap-1 bg-indigo-50 text-indigo-700 border-indigo-200" data-testid={`badge-department-${dept}`}>
                            <Building2 className="w-3 h-3" />
                            {dept}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Own profile: photo controls */}
                {profileData.isOwnProfile && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: "1px solid #f0ebe4" }}>
                    <label
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ backgroundColor: "#1a2744", color: "#fff", opacity: photoUploading ? 0.6 : 1, pointerEvents: photoUploading ? "none" : "auto" }}
                      data-testid="button-upload-photo"
                    >
                      {photoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      {photoUrl ? t("cm_changePhoto") : t("cm_uploadPhoto")}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                        disabled={photoUploading}
                      />
                    </label>
                    {photoUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-[30px] px-3 text-xs border-red-200 text-red-600 hover:bg-red-50"
                        onClick={handleRemovePhoto}
                        disabled={photoUploading}
                        data-testid="button-remove-photo"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        {t("cm_removePhoto")}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bio / Location */}
            {(profileData.profile?.bio || profileData.profile?.city || profileData.profile?.country) && (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                <CardContent className="pt-5 pb-5 space-y-3">
                  {profileData.profile.bio && (
                    <div className="flex gap-2.5">
                      <BookOpen className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#b8962e" }} />
                      <p className="text-sm leading-relaxed" style={{ color: "#1a2744" }} data-testid="text-member-bio">
                        {profileData.profile.bio}
                      </p>
                    </div>
                  )}
                  {(profileData.profile.city || profileData.profile.country) && (
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "#7a7570" }} />
                      <p className="text-sm" style={{ color: "#7a7570" }} data-testid="text-member-location">
                        {[profileData.profile.city, profileData.profile.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action buttons */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardContent className="pt-5 pb-5 space-y-3">

                {/* Pray For This Member */}
                {!profileData.isOwnProfile && (
                  <div>
                    {!prayerOpen ? (
                      <Button
                        className="w-full justify-start gap-2"
                        style={{ backgroundColor: "#1a2744", color: "#fff" }}
                        onClick={() => setPrayerOpen(true)}
                        data-testid="button-pray-for-member"
                      >
                        <Heart className="w-4 h-4" />
                        Pray For This Member
                      </Button>
                    ) : prayerSent ? (
                      <div className="flex items-center gap-2 py-2 px-3 rounded-lg" style={{ backgroundColor: "#f0fdf4" }}>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <p className="text-sm text-green-700 font-medium">Prayer submitted — may God bless them!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium" style={{ color: "#1a2744" }}>
                          Write a prayer for {displayName} <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                        </p>
                        <Textarea
                          value={prayerNote}
                          onChange={e => setPrayerNote(e.target.value)}
                          placeholder="Lord, I lift up this member..."
                          rows={3}
                          className="text-sm resize-none"
                          data-testid="textarea-prayer-note"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            style={{ backgroundColor: "#1a2744", color: "#fff" }}
                            onClick={handlePrayerSubmit}
                            disabled={prayerSending}
                            data-testid="button-submit-prayer"
                          >
                            {prayerSending
                              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending…</>
                              : <><Heart className="w-3.5 h-3.5 mr-1.5" />Submit Prayer</>}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setPrayerOpen(false); setPrayerNote(""); }}
                            data-testid="button-cancel-prayer">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message button (only if permissions allow) */}
                {!profileData.isOwnProfile && profileData.allowMessages && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setLocation(`/church/${slug}/messages`)}
                    data-testid="button-message-member"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </Button>
                )}

                {/* Copy profile link */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleCopyLink}
                  data-testid="button-copy-profile-link"
                >
                  {linkCopied
                    ? <><CheckCircle2 className="w-4 h-4 text-green-600" />Link Copied!</>
                    : <><Link2 className="w-4 h-4" />Copy Profile Link</>}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ChurchModeShell>
  );
}
