import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  User, Loader2, AlertCircle, Save, LogOut, Shield, Calendar,
  Phone, MapPin, BookOpen, Eye, EyeOff, MessageSquare, Users
} from "lucide-react";
import type { Church, ChurchMember, ChurchMemberProfile } from "@shared/schema";
import { CHURCH_ROLE_LABELS, type ChurchRole } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }
interface ProfileData { member: ChurchMember; profile: ChurchMemberProfile | null; }

export default function ChurchMemberProfilePage() {
  const [, params] = useRoute("/church/:slug/profile");
  const slug = params?.slug ?? "";
  const [, setLocation] = useLocation();
  const { getIdToken, user, emailVerified } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSignedIn = !!user && !!emailVerified;

  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    city: "",
    country: "",
    bio: "",
    showInDirectory: true,
    allowMemberMessages: true,
    allowLeaderContact: true,
    showPhoneToLeadersOnly: true,
  });

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

  const { data: profileData, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ["/api/churches", church?.id, "my-profile"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token || !church?.id) throw new Error();
      const r = await fetch(`/api/churches/${church.id}/my-profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error();
      return r.json();
    },
    enabled: !!church?.id && isSignedIn && myRole?.status === "active",
  });

  useEffect(() => {
    if (profileData) {
      const p = profileData.profile;
      const m = profileData.member;
      setForm({
        fullName: p?.fullName ?? m.displayName ?? "",
        phone: p?.phone ?? "",
        city: p?.city ?? "",
        country: p?.country ?? "",
        bio: p?.bio ?? "",
        showInDirectory: p?.showInDirectory ?? true,
        allowMemberMessages: p?.allowMemberMessages ?? true,
        allowLeaderContact: p?.allowLeaderContact ?? true,
        showPhoneToLeadersOnly: p?.showPhoneToLeadersOnly ?? true,
      });
    }
  }, [profileData]);

  const saveProfile = async () => {
    if (!church?.id) return;
    setSaving(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/my-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "my-profile"] });
      toast({ title: "Profile saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const leaveChurch = async () => {
    if (!church?.id || !myRole?.memberId) return;
    setLeaving(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/members/${myRole.memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error((await r.json()).message);
      toast({ title: `You've left ${church.name}` });
      setLocation("/church");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLeaving(false);
    }
  };

  if (!isSignedIn) {
    return (
      <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
        <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #b8962e", backgroundColor: "#fff" }}>
          <CardContent className="pt-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#b8962e" }} />
            <p className="text-sm">Sign in to view your profile.</p>
          </CardContent>
        </Card>
      </ChurchModeShell>
    );
  }

  if (myRole?.status !== "active") {
    return (
      <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
        <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #b8962e", backgroundColor: "#fff" }}>
          <CardContent className="pt-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#b8962e" }} />
            <p className="text-sm">Active membership required to view your profile.</p>
          </CardContent>
        </Card>
      </ChurchModeShell>
    );
  }

  const member = profileData?.member;
  const roleLabel = myRole?.role ? (CHURCH_ROLE_LABELS[myRole.role as ChurchRole] ?? myRole.role) : "Member";
  const joinDate = member?.joinedAt ? new Date(member.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null;

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-6 max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#b8962e18" }}>
            <User className="w-5 h-5" style={{ color: "#b8962e" }} />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>My Profile</h2>
            <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{church?.name}</p>
          </div>
        </div>

        {/* Membership info */}
        <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                style={{ backgroundColor: "#1a274418", color: "#1a2744" }}>
                {(form.fullName || user?.displayName || user?.email || "?")[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold" style={{ color: "#1a2744" }}>{form.fullName || user?.displayName || user?.email}</p>
                <p className="text-sm" style={{ color: "#7a7570" }}>{user?.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {myRole?.role && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Shield className="w-3 h-3" />{roleLabel}
                </Badge>
              )}
              {joinDate && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3" />Joined {joinDate}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {profileLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#b8962e" }} />
          </div>
        ) : (
          <>
            {/* Edit profile */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-base" style={{ color: "#1a2744" }}>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-5">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Display Name</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    placeholder="Your name"
                    data-testid="input-profile-name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio" className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />Bio
                  </Label>
                  <Textarea
                    id="bio"
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="A short bio visible in the member directory…"
                    rows={3}
                    data-testid="input-profile-bio"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />City
                    </Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="Your city"
                      data-testid="input-profile-city"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={form.country}
                      onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                      placeholder="Country"
                      data-testid="input-profile-country"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />Phone
                    <span className="text-xs text-muted-foreground font-normal">(visible to leaders only by default)</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    data-testid="input-profile-phone"
                  />
                </div>

                <Button onClick={saveProfile} disabled={saving} style={{ backgroundColor: "#1a2744" }} data-testid="button-save-profile">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-1.5" />Save Profile</>}
                </Button>
              </CardContent>
            </Card>

            {/* Privacy settings */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-base flex items-center gap-2" style={{ color: "#1a2744" }}>
                  <Eye className="w-4 h-4" />Privacy Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#1a2744" }}>Show me in church directory</p>
                    <p className="text-xs text-muted-foreground">Other members can find your profile</p>
                  </div>
                  <Switch
                    checked={form.showInDirectory}
                    onCheckedChange={v => setForm(f => ({ ...f, showInDirectory: v }))}
                    data-testid="switch-show-in-directory"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#1a2744" }}>Allow members to message me</p>
                    <p className="text-xs text-muted-foreground">Other members can start a conversation</p>
                  </div>
                  <Switch
                    checked={form.allowMemberMessages}
                    onCheckedChange={v => setForm(f => ({ ...f, allowMemberMessages: v }))}
                    data-testid="switch-allow-member-messages"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#1a2744" }}>Allow church leaders to contact me</p>
                    <p className="text-xs text-muted-foreground">Pastors and leaders can reach you directly</p>
                  </div>
                  <Switch
                    checked={form.allowLeaderContact}
                    onCheckedChange={v => setForm(f => ({ ...f, allowLeaderContact: v }))}
                    data-testid="switch-allow-leader-contact"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#1a2744" }}>Show phone number to leaders only</p>
                    <p className="text-xs text-muted-foreground">Phone hidden from ordinary members</p>
                  </div>
                  <Switch
                    checked={form.showPhoneToLeadersOnly}
                    onCheckedChange={v => setForm(f => ({ ...f, showPhoneToLeadersOnly: v }))}
                    data-testid="switch-phone-leaders-only"
                  />
                </div>

                <Button onClick={saveProfile} disabled={saving} variant="outline" size="sm" data-testid="button-save-privacy">
                  {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5 mr-1.5" />Save</>}
                </Button>
              </CardContent>
            </Card>

            {/* Leave church */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff", borderLeft: "3px solid #e53e3e22" }}>
              <CardContent className="pt-5 pb-5 space-y-3">
                <div>
                  <p className="font-semibold text-sm" style={{ color: "#e53e3e" }}>Leave Church</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You will lose access to this church's content and messages.
                  </p>
                </div>
                {!confirmLeave ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => setConfirmLeave(true)}
                    data-testid="button-leave-church-initiate"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />Leave {church?.name}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-700">Are you sure you want to leave?</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={leaveChurch}
                        disabled={leaving}
                        data-testid="button-leave-church-confirm"
                      >
                        {leaving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Leaving…</> : "Yes, Leave"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmLeave(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ChurchModeShell>
  );
}
