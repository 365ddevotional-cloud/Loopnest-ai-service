import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Home, HandHeart, MessageSquare, BookOpen, Megaphone, Users, ChevronLeft, Menu, X, Copy, Check, LogOut, Settings, Link2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import type { Group, GroupMember } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

interface GroupModeShellProps {
  group: Group;
  myMember: GroupMember | null;
  children: React.ReactNode;
}

function GroupLogo({ group, size = 44 }: { group: Group; size?: number }) {
  if (group.logoUrl) {
    return (
      <img
        src={group.logoUrl}
        alt={group.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {group.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function GroupModeShell({ group, myMember, children }: GroupModeShellProps) {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const { toast } = useToast();
  const { currentSong } = useMusicPlayer();

  const id = group.id;
  const role = myMember?.role ?? "member";
  const isOwnerOrMod = role === "owner" || role === "moderator";

  const navLinks = [
    { path: `/group/${id}`, label: "Home", icon: Home },
    { path: `/group/${id}/prayers`, label: "Prayer", icon: HandHeart },
    { path: `/group/${id}/messages`, label: "Messages", icon: MessageSquare },
    { path: `/group/${id}/devotionals`, label: "Devotionals", icon: BookOpen },
    { path: `/group/${id}/announcements`, label: "Announce", icon: Megaphone },
    { path: `/group/${id}/members`, label: "Members", icon: Users },
  ];

  function isActive(path: string) {
    if (path === `/group/${id}`) return location === path;
    return location.startsWith(path);
  }

  function copyInviteCode() {
    navigator.clipboard.writeText(group.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Invite code copied!" });
    });
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/groups/join/${group.inviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({ title: "Invitation link copied!", description: "Share this link to invite people." });
    });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border/50 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate("/groups")}
            className="p-2 -ml-2 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground"
            aria-label="Back to groups"
            data-testid="button-group-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <GroupLogo group={group} size={36} />
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground text-sm truncate leading-tight">{group.name}</h1>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-2 rounded-lg hover:bg-muted/60 transition-colors"
            aria-label="Group options"
            data-testid="button-group-menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="border-t border-border/40 bg-card px-4 py-3 max-w-2xl mx-auto space-y-1">
            <button
              onClick={copyInviteCode}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 text-sm text-left"
              data-testid="button-copy-invite-code"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              <div>
                <span className="font-medium">Invite Code: </span>
                <span className="font-mono text-primary">{group.inviteCode}</span>
              </div>
            </button>
            <button
              onClick={copyInviteLink}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 text-sm text-left"
              data-testid="button-copy-invite-link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4 text-muted-foreground" />}
              <span className="font-medium">{copiedLink ? "Link copied!" : "Copy Invitation Link"}</span>
            </button>
            {role === "owner" && (
              <Link
                href={`/group/${id}/settings`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 text-sm"
                data-testid="link-group-settings"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Group Settings</span>
              </Link>
            )}
            <button
              onClick={() => { setMenuOpen(false); navigate(`/group/${id}/leave`); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 text-sm text-left text-destructive"
              data-testid="button-leave-group"
            >
              <LogOut className="w-4 h-4" />
              <span>{role === "owner" ? "Delete Group" : "Leave Group"}</span>
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className={`flex-1 max-w-2xl w-full mx-auto px-4 pt-5 ${currentSong ? "pb-28 sm:pb-32" : "pb-5"}`}>
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 z-20 bg-card border-t border-border/50 safe-area-bottom" aria-label="Group navigation">
        <div className="flex max-w-2xl mx-auto">
          {navLinks.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              href={path}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                isActive(path) ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-${label.toLowerCase()}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
