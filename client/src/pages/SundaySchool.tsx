import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Calendar, ChevronRight, GraduationCap, Download, ExternalLink, HardDrive } from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";
import { Link } from "wouter";
import type { SundaySchoolLesson } from "@shared/schema";
import { Helmet } from "react-helmet-async";
import {
  getAllSundayLessons,
  getAllSSDownloads,
  saveSundayLessons,
  saveSSDownload,
  type SSDownload,
} from "@/lib/offlineDb";
import { SundaySchoolDownloadButton } from "@/components/SundaySchoolDownloadButton";
import { useI18n } from "@/hooks/useI18n";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildUpcomingLessons(allLessons: any[], todayStr: string): any[] {
  if (!allLessons.length) return [];
  return [...allLessons]
    .filter((l) => l.date >= todayStr)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .slice(0, 4);
}

async function fetchLessonsWithFallback(): Promise<any[]> {
  if (!navigator.onLine) {
    const offline = await getAllSundayLessons();
    if (offline.length > 0) return offline;
    throw new Error("offline_no_data");
  }
  try {
    const res = await fetch("/api/sunday-school", { credentials: "include" });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
    throw new Error("Empty response");
  } catch (e) {
    const offline = await getAllSundayLessons();
    if (offline.length > 0) return offline;
    if (e instanceof Error && e.message === "offline_no_data") throw e;
    throw new Error("offline_no_data");
  }
}

export default function SundaySchool() {
  const { t } = useI18n();
  const { isOnline } = useConnectionStatus();
  const { user } = useUser();
  const { toast } = useToast();

  const { data: lessons, isLoading } = useQuery<SundaySchoolLesson[]>({
    queryKey: ["/api/sunday-school"],
    queryFn: fetchLessonsWithFallback,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "offline_no_data") return false;
      return failureCount < 2;
    },
  });

  const today = startOfDay(new Date());
  const todayStr = formatLocalDate(today);

  const { upcomingLessons, pastLessons } = useMemo(() => {
    const allLessons = lessons || [];
    const upcoming = buildUpcomingLessons(allLessons, todayStr);
    const past = allLessons
      .filter((l) => l.date < todayStr)
      .sort((a, b) => b.date.localeCompare(a.date));
    return { upcomingLessons: upcoming, pastLessons: past };
  }, [lessons, todayStr]);

  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    pastLessons.forEach((l) => years.add(parseInt(l.date.slice(0, 4), 10)));
    return Array.from(years).sort((a, b) => b - a);
  }, [pastLessons]);

  const [downloadedIds, setDownloadedIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const bulkCancelRef = useRef(false);

  useEffect(() => {
    getAllSSDownloads()
      .then((records) => setDownloadedIds(new Set(records.map((r) => r.id))))
      .catch(() => {});
  }, []);

  const handleBulkDownload = useCallback(
    async (lessonsToDownload: any[]) => {
      const currentDownloads = await getAllSSDownloads();
      const alreadyIds = new Set(currentDownloads.map((d) => d.id));
      const queue = lessonsToDownload.filter((l) => !alreadyIds.has(l.id));

      if (!queue.length) {
        toast({ title: t("ssOfflineBulkDone").replace("{count}", "0"), duration: 2000 });
        return;
      }

      const msg = t("ssOfflineBulkConfirm").replace("{count}", String(queue.length));
      if (!window.confirm(msg)) return;

      setBulkBusy(true);
      bulkCancelRef.current = false;
      setBulkProgress({ done: 0, total: queue.length });

      let done = 0;
      let failed = 0;
      const uid = user?.uid ?? null;

      for (const lesson of queue) {
        if (bulkCancelRef.current) break;
        try {
          await saveSundayLessons([lesson]);
          const year = parseInt(lesson.date.slice(0, 4), 10);
          const record: SSDownload = {
            id: lesson.id,
            date: lesson.date,
            year,
            title: lesson.title,
            scriptureReferences: lesson.scriptureReferences,
            downloadedAt: Date.now(),
            serverUpdatedAt: lesson.updatedAt ?? null,
            firebaseUid: uid,
          };
          await saveSSDownload(record);
          done++;
          setDownloadedIds((prev) => new Set(Array.from(prev).concat([lesson.id])));
        } catch (e: unknown) {
          const msg2 = e instanceof Error ? e.message : String(e);
          if (msg2.includes("QuotaExceeded") || msg2.includes("quota")) {
            toast({ title: t("ssOfflineStorageFull"), variant: "destructive", duration: 3000 });
            break;
          }
          failed++;
        }
        setBulkProgress({ done: done + failed, total: queue.length });
      }

      setBulkBusy(false);
      setBulkProgress(null);

      if (failed === 0 && !bulkCancelRef.current) {
        toast({ title: t("ssOfflineBulkDone").replace("{count}", String(done)), duration: 2500 });
      } else if (done > 0) {
        toast({
          title: t("ssOfflineBulkPartial")
            .replace("{done}", String(done))
            .replace("{total}", String(queue.length))
            .replace("{failed}", String(failed)),
          duration: 3000,
        });
      }
    },
    [user, t, toast]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lessons?.length && !navigator.onLine) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-center p-8">
        <p className="text-muted-foreground text-lg" data-testid="text-offline-empty">
          Content will be available after first online visit.
        </p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Sunday School - 365 Daily Devotional</title>
        <meta name="description" content="Free Sunday School lessons with KJV scripture, discussion questions, prayer focus, and weekly assignments for spiritual growth." />
        <meta property="og:title" content="Sunday School - 365 Daily Devotional" />
        <meta property="og:description" content="Free Sunday School lessons with KJV scripture, discussion questions, prayer focus, and weekly assignments for spiritual growth." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <GraduationCap className="w-8 h-8 text-primary" />
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary" data-testid="text-sunday-school-title">
              Sunday School
            </h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Weekly lessons designed to deepen your understanding of Scripture and strengthen your walk with God.
          </p>
        </div>

        {upcomingLessons.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-semibold text-foreground flex items-center gap-2" data-testid="text-upcoming-heading">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming Lessons
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingLessons.map((lesson: any, index: number) => {
                const lessonDate = startOfDay(parseISO(lesson.date));
                const isThisSunday = index === 0;
                return (
                  <Card key={lesson.id} className="hover-elevate transition-all" data-testid={`card-lesson-upcoming-${lesson.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <CardTitle className="font-serif text-lg leading-tight">
                          {lesson.title}
                        </CardTitle>
                        {isThisSunday ? (
                          <Badge variant="default" className="shrink-0" data-testid={`badge-this-sunday-${lesson.id}`}>This Sunday</Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0" data-testid={`badge-upcoming-${lesson.id}`}>Upcoming</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(lessonDate, "MMMM d, yyyy")}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground italic">
                        {lesson.scriptureReferences}
                      </p>
                      <p className="text-sm text-foreground/80 line-clamp-2">
                        {lesson.lessonContent
                          .replace(/OUTLINE POINT \d+:\s*/g, "")
                          .replace(/TEACHER EMPHASIS:\s*/g, "")
                          .substring(0, 150)}...
                      </p>
                      <Link href={`/sunday-school/${lesson.id}`}>
                        <Button variant="outline" className="w-full gap-2" data-testid={`button-open-lesson-${lesson.id}`}>
                          <BookOpen className="w-4 h-4" />
                          Open Lesson
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {upcomingLessons.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No upcoming lessons scheduled. Check back soon.
          </div>
        )}

        {pastLessons.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-semibold text-foreground flex items-center gap-2" data-testid="text-archive-heading">
              <BookOpen className="w-5 h-5 text-primary" />
              Lesson Archive
            </h2>
            <div className="space-y-2">
              {pastLessons.map((lesson) => (
                <Card
                  key={lesson.id}
                  className="border-border/40 bg-card hover:border-primary/20 transition-colors"
                  data-testid={`card-lesson-archive-${lesson.id}`}
                >
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <Link href={`/sunday-school/${lesson.id}`} className="flex-1 min-w-0 block">
                      <p className="font-serif font-semibold text-foreground truncate hover:text-primary transition-colors text-sm">
                        {lesson.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {format(parseISO(lesson.date), "MMMM d, yyyy")} &middot; {lesson.scriptureReferences}
                      </p>
                      {downloadedIds.has(lesson.id) && (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium"
                          data-testid={`badge-ss-downloaded-${lesson.id}`}
                        >
                          ✓ {t("ssOfflineAvailable")}
                        </span>
                      )}
                    </Link>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!downloadedIds.has(lesson.id) && (
                        <SundaySchoolDownloadButton lesson={lesson} compact />
                      )}
                      <Link href={`/sunday-school/${lesson.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          data-testid={`button-open-lesson-archive-${lesson.id}`}
                          aria-label={`Open lesson: ${lesson.title}`}
                        >
                          <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {pastLessons.length > 0 && (
          <section className="space-y-4 border border-border/40 rounded-xl p-5 bg-muted/20" data-testid="section-ss-offline-archive">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
              <h2 className="font-serif text-lg font-semibold text-foreground">
                {t("ssOfflineHeading")}
              </h2>
            </div>

            <p className="text-sm text-muted-foreground">
              {downloadedIds.size} / {pastLessons.length} {t("ssOfflineLessonsCount")}
            </p>

            <div className="flex flex-wrap gap-3 items-center">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleBulkDownload(pastLessons)}
                disabled={bulkBusy || !isOnline}
                data-testid="button-ss-download-all"
                aria-label={t("ssOfflineDownloadAll")}
              >
                {bulkBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="w-4 h-4" aria-hidden="true" />
                )}
                {t("ssOfflineDownloadAll")} ({pastLessons.length - downloadedIds.size} remaining)
              </Button>

              {bulkProgress && (
                <span className="text-sm text-muted-foreground" data-testid="text-ss-bulk-progress">
                  {t("ssOfflineBulkProgress")
                    .replace("{done}", String(bulkProgress.done))
                    .replace("{total}", String(bulkProgress.total))}
                </span>
              )}

              {bulkBusy && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive gap-1"
                  onClick={() => { bulkCancelRef.current = true; }}
                  data-testid="button-ss-bulk-cancel"
                >
                  {t("ssOfflineBulkCancel")}
                </Button>
              )}
            </div>

            {uniqueYears.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t("ssOfflineDownloadYear")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {uniqueYears.map((year) => {
                    const yearLessons = pastLessons.filter(
                      (l) => parseInt(l.date.slice(0, 4), 10) === year
                    );
                    const yearDownloaded = yearLessons.filter((l) => downloadedIds.has(l.id)).length;
                    const remaining = yearLessons.length - yearDownloaded;
                    return (
                      <Button
                        key={year}
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-sm"
                        onClick={() => handleBulkDownload(yearLessons)}
                        disabled={bulkBusy || !isOnline || remaining === 0}
                        data-testid={`button-ss-download-year-${year}`}
                        aria-label={`Download ${year} lessons`}
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        {year}
                        {remaining > 0 ? ` (${remaining})` : " ✓"}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <Link href="/offline-content">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground text-sm mt-1"
                data-testid="link-ss-manage-downloads"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                {t("ssOfflineManageLink")}
              </Button>
            </Link>
          </section>
        )}
      </div>
    </>
  );
}
