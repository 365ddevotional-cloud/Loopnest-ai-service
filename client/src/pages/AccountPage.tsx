import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CountrySelect } from "@/components/CountrySelect";
import { getCountryName } from "@/lib/countries";
import {
  UserCircle,
  Mail,
  LogOut,
  RefreshCw,
  Building2,
  Crown,
  Users,
  Shield,
  Loader2,
  Camera,
  Pencil,
  X,
  MapPin,
  Calendar,
  KeyRound,
  Bell,
  Globe,
  CheckCircle2,
} from "lucide-react";
import type { Church, ChurchMember, ChurchRole, UserProfile } from "@shared/schema";
import { CHURCH_ROLE_LABELS } from "@shared/schema";
import { useUpload } from "@/hooks/use-upload";

type Membership = ChurchMember & { church: Church };

const ROLE_ICON: Record<string, JSX.Element> = {
  owner:          <Crown  className="w-3.5 h-3.5 text-amber-600" />,
  lead_pastor:    <Shield className="w-3.5 h-3.5 text-primary" />,
  pastor:         <Shield className="w-3.5 h-3.5 text-primary" />,
  administrator:  <Shield className="w-3.5 h-3.5 text-primary" />,
  ministry_leader:<Users  className="w-3.5 h-3.5 text-primary" />,
  member:         <Users  className="w-3.5 h-3.5 text-muted-foreground" />,
};

export default function AccountPage() {
  const [, setLocation] = useLocation();
  const { user, emailVerified, getIdToken, signUserOut, resetPassword } = useUser();
  const { toast } = useToast();
  const isSignedIn = !!user && !!emailVerified;

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [passwordSent, setPasswordSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/user/profile", user?.uid],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return null;
      const r = await fetch("/api/user/profile", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return null;
      return r.json();
    },
    enabled: isSignedIn,
  });

  const { data: memberships } = useQuery<Membership[]>({
    queryKey: ["/api/churches/my", user?.uid],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch("/api/churches/my", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: isSignedIn && !!user?.uid,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName?: string; country?: string; profilePictureUrl?: string }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const r = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed to update profile");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      setEditing(false);
    },
    onError: () => {
      toast({ title: "Update failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const handleStartEdit = () => {
    setEditName(profile?.displayName ?? user?.displayName ?? "");
    setEditCountry(profile?.country ?? "");
    setEditing(true);
  };

  const handleSaveEdit = () => {
    updateProfileMutation.mutate({
      displayName: editName.trim() || undefined,
      country: editCountry || undefined,
    });
  };

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      toast({ title: "Unsupported format", description: "Please use JPG, PNG, or WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please use an image under 5 MB.", variant: "destructive" });
      return;
    }

    const result = await uploadFile(file);
    if (!result) {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
      return;
    }

    updateProfileMutation.mutate({ profilePictureUrl: result.objectPath });
  };

  const handleConsentChange = async (field: "emailConsentMinistry" | "emailConsentNotifications", value: boolean) => {
    const token = await getIdToken();
    if (!token) return;
    await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ [field]: value }),
    });
    queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const result = await resetPassword(user.email);
    if (result.success) {
      setPasswordSent(true);
      toast({ title: "Reset email sent", description: `Check ${user.email} for instructions.` });
    } else {
      toast({ title: "Could not send reset email", description: result.error, variant: "destructive" });
    }
  };

  const handleSignOut = async () => { await signUserOut(); setLocation("/signin"); };
  const handleSwitchAccount = async () => { await signUserOut(); setLocation("/signin"); };

  // ── Not signed in ──
  if (!isSignedIn) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <UserCircle className="w-16 h-16 mx-auto text-muted-foreground/40" />
        <p className="text-muted-foreground">You are not signed in.</p>
        <Button onClick={() => setLocation("/signin")} data-testid="button-account-signin">Sign In</Button>
      </div>
    );
  }

  const displayName   = profile?.displayName ?? user.displayName ?? null;
  const email         = user.email ?? "";
  const country       = profile?.country ?? null;
  const createdAt     = profile?.createdAt ? new Date(profile.createdAt) : null;
  const pictureUrl    = profile?.profilePictureUrl
    ? `/api/user/profile/picture?v=${profile.lastActiveAt}`
    : null;

  const isOwnerAnywhere = memberships?.some(m => m.role === "owner");
  const accountTypeLabel = isOwnerAnywhere ? "Church Owner"
    : memberships && memberships.length > 0 ? "Church Member"
    : "User";

  const isEmailAuth = user.providerData.some(p => p.providerId === "password");

  return (
    <div className="max-w-lg mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">My Account</h1>
          <p className="text-sm text-muted-foreground">Manage your profile and preferences.</p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={handleStartEdit} data-testid="button-edit-profile">
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <Card className="border-primary/15">
        <CardContent className="pt-6 pb-6 space-y-5">
          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                {profileLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : pictureUrl ? (
                  <img
                    src={pictureUrl}
                    alt={displayName ?? "Profile"}
                    className="w-full h-full object-cover"
                    data-testid="img-profile-picture"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <UserCircle className="w-9 h-9 text-primary" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || updateProfileMutation.isPending}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors"
                data-testid="button-upload-picture"
                title="Change profile picture"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handlePictureUpload}
                data-testid="input-profile-picture"
              />
            </div>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-1">
                  <Label htmlFor="edit-name" className="text-xs text-muted-foreground">Full name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Your name"
                    className="h-8 text-sm"
                    data-testid="input-edit-name"
                  />
                </div>
              ) : (
                <>
                  <p className="font-semibold text-foreground truncate" data-testid="text-account-name">
                    {displayName ?? email.split("@")[0]}
                  </p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary" data-testid="text-account-type">
                    {accountTypeLabel}
                  </span>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Email */}
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Email address</p>
              <p className="text-sm font-medium text-foreground break-all" data-testid="text-account-email">{email}</p>
            </div>
          </div>

          {/* Country */}
          <div className="flex items-start gap-3">
            <Globe className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Country</p>
              {editing ? (
                <CountrySelect
                  value={editCountry}
                  onChange={setEditCountry}
                  placeholder="Select your country"
                  data-testid="select-edit-country"
                />
              ) : (
                <p className="text-sm font-medium text-foreground" data-testid="text-account-country">
                  {country ? getCountryName(country) : <span className="text-muted-foreground italic">Not set</span>}
                </p>
              )}
            </div>
          </div>

          {/* Account created */}
          {createdAt && (
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Member since</p>
                <p className="text-sm text-foreground" data-testid="text-account-created">
                  {createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          )}

          {/* Edit actions */}
          {editing && (
            <>
              <Separator />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-cancel-edit"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                  Save
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Church memberships */}
      {memberships && memberships.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">My Churches</p>
          {memberships.map(m => (
            <Card key={m.id} className="border-primary/10" data-testid={`card-account-church-${m.church.slug}`}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/8">
                  {m.church.logoUrl
                    ? <img src={m.church.logoUrl} alt={m.church.name} className="w-9 h-9 rounded-lg object-cover" />
                    : <Building2 className="w-4 h-4 text-primary" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{m.church.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {ROLE_ICON[m.role] ?? <Users className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">
                      {CHURCH_ROLE_LABELS[m.role as ChurchRole] ?? m.role}
                    </span>
                    {m.church.country && (
                      <span className="text-xs text-muted-foreground ml-2 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />{getCountryName(m.church.country)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Password / security */}
      <Card className="border-primary/10">
        <CardContent className="pt-5 pb-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Security</p>
          {isEmailAuth ? (
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <KeyRound className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Password</p>
                  <p className="text-xs text-muted-foreground">Reset via secure email link</p>
                </div>
              </div>
              {passwordSent ? (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Email sent
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handlePasswordReset}
                  data-testid="button-reset-password"
                >
                  Change Password
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <KeyRound className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Sign-in provider</p>
                <p className="text-xs text-muted-foreground">
                  Your account uses a third-party provider. Manage your password there.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email consent preferences */}
      <Card className="border-primary/10">
        <CardContent className="pt-5 pb-5 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Communication Preferences</p>
          <p className="text-xs text-muted-foreground">
            Account-related emails (password reset, security notices) are always sent.
            All other communications are optional.
          </p>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Bell className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Ministry news &amp; announcements</p>
                <p className="text-xs text-muted-foreground">Updates from the 365 Daily Devotional ministry</p>
              </div>
            </div>
            <Switch
              checked={!!profile?.emailConsentMinistry}
              onCheckedChange={v => handleConsentChange("emailConsentMinistry", v)}
              data-testid="switch-consent-ministry"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Bell className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">New devotional &amp; song notifications</p>
                <p className="text-xs text-muted-foreground">Optional email alerts for new daily content</p>
              </div>
            </div>
            <Switch
              checked={!!profile?.emailConsentNotifications}
              onCheckedChange={v => handleConsentChange("emailConsentNotifications", v)}
              data-testid="switch-consent-notifications"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3 pt-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleSwitchAccount}
          data-testid="button-switch-account"
        >
          <RefreshCw className="w-4 h-4" />
          Switch Account
        </Button>
        <Button
          variant="destructive"
          className="w-full justify-start gap-2"
          onClick={handleSignOut}
          data-testid="button-account-signout"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2">
        Signing out clears all local session data. Your account and church data are always preserved on the server.
      </p>
    </div>
  );
}
