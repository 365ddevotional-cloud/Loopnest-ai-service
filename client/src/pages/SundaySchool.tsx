import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Calendar, ChevronRight, GraduationCap } from "lucide-react";
import { format, parseISO, startOfDay, isBefore } from "date-fns";
import { Link } from "wouter";
import type { SundaySchoolLesson } from "@shared/schema";
import { Helmet } from "react-helmet-async";
import { getAllSundayLessons } from "@/lib/offlineDb";
import { useMemo } from "react";

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
            <div className="space-y-3">
              {pastLessons.map((lesson) => (
                <Link key={lesson.id} href={`/sunday-school/${lesson.id}`}>
                  <Card className="hover-elevate cursor-pointer" data-testid={`card-lesson-archive-${lesson.id}`}>
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="font-serif font-semibold text-foreground truncate">
                          {lesson.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(lesson.date), "MMMM d, yyyy")} &middot; {lesson.scriptureReferences}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
