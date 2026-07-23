import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import type { Church, ChurchMember, ChurchRole } from "@shared/schema";
import { CHURCH_ROLE_LABELS } from "@shared/schema";

type Membership = ChurchMember & { church: Church };

const ROLE_ICON: Record<string, React.ReactNode> = {
  owner: <Crown className="w-3.5 h-3.5 text-amber-600" />,
  lead_pastor: <Shield className="w-3.5 h-3.5 text-primary" />,
  administrator: <Shield className="w-3.5 h-3.5 text-primary" />,
  ministry_leader: <Users className="w-3.5 h-3.5 text-primary" />,
  member: <Users className="w-3.5 h-3.5 text-primary" />,
};

export default function AccountPage() {
  const [, setLocation] = useLocation();
  const { user, emailVerified, getIdToken, signUserOut } = useUser();
  const isSignedIn = !!user && !!emailVerified;

  const { data: memberships, isLoading: membershipsLoading } = useQuery<Membership[]>({
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

  if (!isSignedIn) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <UserCircle className="w-16 h-16 mx-auto text-muted-foreground/40" />
        <p className="text-muted-foreground">You are not signed in.</p>
        <Button onClick={() => setLocation("/signin")} data-testid="button-account-signin">
          Sign In
        </Button>
      </div>
    );
  }

  const displayName = user.displayName || null;
  const email = user.email ?? "";
  const isOwnerAnywhere = memberships?.some(m => m.role === "owner");

  const accountTypeLabel = isOwnerAnywhere
    ? "Church Owner"
    : memberships && memberships.length > 0
    ? "Church Member"
    : "User";

  const handleSignOut = async () => {
    await signUserOut();
    setLocation("/signin");
  };

  const handleSwitchAccount = async () => {
    await signUserOut();
    setLocation("/signin");
  };

  return (
    <div className="max-w-lg mx-auto py-10 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-2xl font-semibold text-foreground">My Account</h1>
        <p className="text-sm text-muted-foreground">Manage your sign-in and account settings.</p>
      </div>

      {/* Profile info card */}
      <Card className="border-primary/15">
        <CardContent className="pt-6 pb-6 space-y-4">
          {/* Avatar + name row */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="min-w-0">
              <p
                className="font-semibold text-foreground truncate text-base"
                data-testid="text-account-name"
              >
                {displayName ?? email.split("@")[0]}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                  data-testid="text-account-type"
                >
                  {accountTypeLabel}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Email row */}
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Email address</p>
              <p className="text-sm font-medium text-foreground break-all" data-testid="text-account-email">
                {email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Church memberships */}
      {membershipsLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading church memberships…
        </div>
      ) : memberships && memberships.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            My Churches
          </p>
          {memberships.map((m) => (
            <Card key={m.id} className="border-primary/10" data-testid={`card-account-church-${m.church.slug}`}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/8">
                  {m.church.logoUrl ? (
                    <img src={m.church.logoUrl} alt={m.church.name} className="w-9 h-9 rounded-lg object-cover" />
                  ) : (
                    <Building2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{m.church.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {ROLE_ICON[m.role]}
                    <span className="text-xs text-muted-foreground">
                      {CHURCH_ROLE_LABELS[m.role as ChurchRole] ?? m.role}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

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
        Signing out clears all local session data. Your account and church data are preserved.
      </p>
    </div>
  );
}
