import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Loader2, LogIn, Users, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GROUP_TYPE_LABELS: Record<string, string> = {
  family: "Family",
  prayer: "Prayer Group",
  workplace: "Workplace",
  sports: "Sports Team",
  community: "Community Organization",
  other: "Other",
};

type GroupPreview = {
  group: { id: number; name: string; groupType: string; description?: string | null; country?: string | null };
  memberCount: number;
};

export default function GroupJoin() {
  const { user, emailVerified, getIdToken } = useUser();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/groups/join/:code");
  const { toast } = useToast();
  const [code, setCode] = useState((params as any)?.code ?? "");
  const [looking, setLooking] = useState(false);
  const [joining, setJoining] = useState(false);
  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user || !emailVerified) navigate("/signin");
  }, [user, emailVerified]);

  if (!user || !emailVerified) return null;

  async function handleLookup() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLooking(true);
    setPreview(null);
    setNotFound(false);
    try {
      const res = await fetch(`/api/groups/preview/${encodeURIComponent(trimmed)}`);
      if (!res.ok) { setNotFound(true); return; }
      const data = await res.json();
      setPreview(data);
    } catch {
      setNotFound(true);
    } finally {
      setLooking(false);
    }
  }

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setJoining(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inviteCode: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast({ title: "Already a member", description: `You're already in ${data.group?.name ?? "this group"}.` });
          navigate(`/group/${data.group.id}`);
          return;
        }
        throw new Error(data.message || "Failed to join group");
      }
      toast({ title: "Joined!", description: `You have joined ${data.group.name}` });
      navigate(`/group/${data.group.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto py-10 space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/groups")} className="p-2 -ml-2 rounded-lg hover:bg-muted/60 text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-xl font-bold">Join a Group</h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">Enter the invite code shared by the group owner.</p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. ABC-1234"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setPreview(null); setNotFound(false); }}
              onKeyDown={e => e.key === "Enter" && handleLookup()}
              className="text-center text-lg font-mono tracking-widest uppercase flex-1"
              maxLength={12}
              data-testid="input-invite-code"
            />
            <Button onClick={handleLookup} disabled={looking || !code.trim()} variant="outline" size="icon" className="flex-shrink-0" data-testid="button-lookup-code">
              {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {notFound && (
            <p className="text-sm text-destructive text-center" data-testid="text-invalid-code">
              Invalid invite code. Please check and try again.
            </p>
          )}
        </CardContent>
      </Card>

      {preview && (
        <Card className="border-primary/30" data-testid="card-group-preview">
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                {preview.group.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground truncate" data-testid="text-preview-name">{preview.group.name}</h2>
                <p className="text-sm text-muted-foreground" data-testid="text-preview-type">
                  {GROUP_TYPE_LABELS[preview.group.groupType] ?? preview.group.groupType}
                  {preview.group.country ? ` · ${preview.group.country}` : ""}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Users className="w-3 h-3" />
                  <span>{preview.memberCount} member{preview.memberCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
            {preview.group.description && (
              <p className="text-sm text-muted-foreground italic">"{preview.group.description}"</p>
            )}
            <Button onClick={handleJoin} disabled={joining} className="w-full gap-2" data-testid="button-join-submit">
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {joining ? "Joining…" : `Join ${preview.group.name}`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
