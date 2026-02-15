import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertDevotional } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getLocalDateString } from "@/lib/date-utils";
import { getAllDevotionals, getDevotionalByDate as getOfflineDevotional } from "@/lib/offlineDb";

function getModuloDevotional(devotionals: any[], today: string): any | null {
  if (!devotionals.length) return null;
  const active = devotionals.filter((d: any) => !d.isDeleted);
  const sorted = [...active].sort((a: any, b: any) => a.date.localeCompare(b.date));
  if (!sorted.length) return null;

  const exact = sorted.find((d: any) => d.date === today);
  if (exact) return exact;

  const earliestDate = sorted[0].date;
  const [eY, eM, eD] = earliestDate.split("-").map(Number);
  const [tY, tM, tD] = today.split("-").map(Number);
  const earliestMs = new Date(eY, eM - 1, eD).getTime();
  const todayMs = new Date(tY, tM - 1, tD).getTime();
  const daysDiff = Math.floor((todayMs - earliestMs) / (1000 * 60 * 60 * 24));
  const index = ((daysDiff % sorted.length) + sorted.length) % sorted.length;
  return sorted[index];
}

function getArchiveWindow(devotionals: any[], today: string, windowDays: number = 15): any[] {
  if (!devotionals.length) return [];
  const active = devotionals.filter((d: any) => !d.isDeleted);
  const sorted = [...active].sort((a: any, b: any) => a.date.localeCompare(b.date));
  if (!sorted.length) return [];

  const [tY, tM, tD] = today.split("-").map(Number);
  const todayMs = new Date(tY, tM - 1, tD).getTime();
  const earliestDate = sorted[0].date;
  const [eY, eM, eD] = earliestDate.split("-").map(Number);
  const earliestMs = new Date(eY, eM - 1, eD).getTime();

  const result: any[] = [];
  const seen = new Set<string>();

  for (let offset = -windowDays; offset <= windowDays; offset++) {
    const targetMs = todayMs + offset * 86400000;
    const targetDate = new Date(targetMs);
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

    const exact = sorted.find((d: any) => d.date === dateStr);
    if (exact) {
      if (!seen.has(exact.date)) {
        seen.add(exact.date);
        result.push(exact);
      }
    } else {
      const daysDiff = Math.floor((targetMs - earliestMs) / (1000 * 60 * 60 * 24));
      const index = ((daysDiff % sorted.length) + sorted.length) % sorted.length;
      const looped = sorted[index];
      if (!seen.has(looped.date + "_" + offset)) {
        seen.add(looped.date + "_" + offset);
        result.push({ ...looped, _displayDate: dateStr });
      }
    }
  }

  return result.sort((a, b) => {
    const da = a._displayDate || a.date;
    const db = b._displayDate || b.date;
    return db.localeCompare(da);
  });
}

export function useTodayDevotional() {
  const localDate = getLocalDateString();
  
  return useQuery({
    queryKey: [api.devotionals.getToday.path, localDate],
    queryFn: async () => {
      if (navigator.onLine) {
        const url = `${api.devotionals.getToday.path}?clientDate=${localDate}&_t=${Date.now()}`;
        const res = await fetch(url, { 
          credentials: "include",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Failed to fetch today's devotional");
        return api.devotionals.getToday.responses[200].parse(await res.json());
      }

      const offlineExact = await getOfflineDevotional(localDate);
      if (offlineExact) return offlineExact;

      const allOffline = await getAllDevotionals();
      if (allOffline.length > 0) {
        const result = getModuloDevotional(allOffline, localDate);
        if (result) return result;
      }

      throw new Error("offline_no_data");
    },
    staleTime: 0,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "offline_no_data") return false;
      return failureCount < 2;
    },
  });
}

export interface RestrictedDevotionalResponse {
  restricted: true;
  message: string;
  scheduledDate: string;
}

export function useDevotionalByDate(date: string) {
  const localDate = getLocalDateString();
  
  return useQuery({
    queryKey: [api.devotionals.getByDate.path, date, localDate],
    queryFn: async (): Promise<{ devotional: Awaited<ReturnType<typeof api.devotionals.getByDate.responses[200]['parse']>> | null; restricted?: RestrictedDevotionalResponse }> => {
      if (navigator.onLine) {
        const baseUrl = buildUrl(api.devotionals.getByDate.path, { date });
        const url = `${baseUrl}?clientDate=${localDate}&_t=${Date.now()}`;
        const res = await fetch(url, { 
          credentials: "include",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
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
      }

      const offline = await getOfflineDevotional(date);
      if (offline) return { devotional: offline };
      return { devotional: null };
    },
    enabled: !!date,
    staleTime: 0,
  });
}

export function useDevotionalsList() {
  const localDate = getLocalDateString();
  
  return useQuery({
    queryKey: [api.devotionals.list.path, localDate],
    queryFn: async () => {
      if (navigator.onLine) {
        const url = `${api.devotionals.list.path}?clientDate=${localDate}&_t=${Date.now()}`;
        const res = await fetch(url, { 
          credentials: "include",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        if (!res.ok) throw new Error("Failed to fetch devotionals list");
        return api.devotionals.list.responses[200].parse(await res.json());
      }

      const allOffline = await getAllDevotionals();
      if (allOffline.length > 0) {
        return getArchiveWindow(allOffline, localDate);
      }

      throw new Error("offline_no_data");
    },
    staleTime: 0,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "offline_no_data") return false;
      return failureCount < 2;
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
