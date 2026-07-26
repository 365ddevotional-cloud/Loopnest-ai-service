import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Loader2, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GroupJoin() {
  const { user, emailVerified, getIdToken } = useUser();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/groups/join/:code");
  const { toast } = useToast();
  const [code, setCode] = useState((params as any)?.code ?? "");
  const [loading, setLoading] = useState(false);

  if (!user || !emailVerified) {
    navigate("/signin");
    return null;
  }

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inviteCode: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to join group");
      toast({ title: "Joined!", description: `You have joined ${data.group.name}` });
      navigate(`/group/${data.group.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
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
          <Input
            placeholder="e.g. ABC-1234"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleJoin()}
            className="text-center text-lg font-mono tracking-widest uppercase"
            maxLength={12}
            data-testid="input-invite-code"
          />
          <Button onClick={handleJoin} disabled={loading || !code.trim()} className="w-full gap-2" data-testid="button-join-submit">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? "Joining…" : "Join Group"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
