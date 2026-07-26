import { useUser } from "@/contexts/UserContext";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Users, Plus, LogIn, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Group, GroupMember } from "@shared/schema";

type GroupWithMember = GroupMember & { group: Group };

function GroupCard({ item }: { item: GroupWithMember }) {
  const { group, role } = item;
  return (
    <Link href={`/group/${group.id}`}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`card-group-${group.id}`}>
        <CardContent className="p-4 flex items-center gap-3">
          {group.logoUrl ? (
            <img src={group.logoUrl} alt={group.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
              {group.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
            {group.description && <p className="text-sm text-muted-foreground truncate">{group.description}</p>}
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{role}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function GroupsHome() {
  const { user, emailVerified, getIdToken } = useUser();
  const [, navigate] = useLocation();

  const { data: myGroups = [], isLoading } = useQuery<GroupWithMember[]>({
    queryKey: ["/api/groups/my"],
    enabled: !!user && emailVerified,
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const res = await fetch("/api/groups/my", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (!user || !emailVerified) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <Users className="w-12 h-12 text-muted-foreground mx-auto" />
        <h1 className="font-serif text-2xl font-bold">Groups</h1>
        <p className="text-muted-foreground">Sign in to create or join a private group.</p>
        <Button onClick={() => navigate("/signin")} data-testid="button-signin">Sign In</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">My Groups</h1>
          <p className="text-sm text-muted-foreground">Families, friends &amp; prayer circles</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/groups/create" className="flex-1">
          <Button className="w-full gap-2" data-testid="button-create-group">
            <Plus className="w-4 h-4" /> Create Group
          </Button>
        </Link>
        <Link href="/groups/join" className="flex-1">
          <Button variant="outline" className="w-full gap-2" data-testid="button-join-group">
            <LogIn className="w-4 h-4" /> Join Group
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : myGroups.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <Users className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">No groups yet</p>
          <p className="text-sm text-muted-foreground">Create a group or join one with an invite code.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myGroups.map(item => <GroupCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
