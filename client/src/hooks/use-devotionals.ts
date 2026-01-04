import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertDevotional } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useTodayDevotional() {
  return useQuery({
    queryKey: [api.devotionals.getToday.path],
    queryFn: async () => {
      const res = await fetch(api.devotionals.getToday.path, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch today's devotional");
      return api.devotionals.getToday.responses[200].parse(await res.json());
    },
  });
}

export interface RestrictedDevotionalResponse {
  restricted: true;
  message: string;
  scheduledDate: string;
}

export function useDevotionalByDate(date: string) {
  return useQuery({
    queryKey: [api.devotionals.getByDate.path, date],
    queryFn: async (): Promise<{ devotional: Awaited<ReturnType<typeof api.devotionals.getByDate.responses[200]['parse']>> | null; restricted?: RestrictedDevotionalResponse }> => {
      const url = buildUrl(api.devotionals.getByDate.path, { date });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return { devotional: null };
      if (res.status === 403) {
        const data = await res.json();
        if (data.restricted) {
          return { devotional: null, restricted: data as RestrictedDevotionalResponse };
        }
      }
      if (!res.ok) throw new Error("Failed to fetch devotional");
      const devotional = api.devotionals.getByDate.responses[200].parse(await res.json());
      return { devotional };
    },
    enabled: !!date,
  });
}

export function useDevotionalsList() {
  return useQuery({
    queryKey: [api.devotionals.list.path],
    queryFn: async () => {
      const res = await fetch(api.devotionals.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch devotionals list");
      return api.devotionals.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateDevotional() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertDevotional) => {
      const validated = api.devotionals.create.input.parse(data);
      const res = await fetch(api.devotionals.create.path, {
        method: api.devotionals.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.devotionals.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create devotional");
      }
      return api.devotionals.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.devotionals.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.devotionals.getToday.path] });
      toast({
        title: "Success",
        description: "Devotional created successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteDevotional() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.devotionals.delete.path, { id });
      const res = await fetch(url, { 
        method: api.devotionals.delete.method,
        credentials: "include" 
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to delete devotional");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.devotionals.list.path] });
      toast({
        title: "Deleted",
        description: "Devotional removed from archive",
      });
    },
  });
}
