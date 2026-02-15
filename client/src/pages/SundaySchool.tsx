import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Calendar, ChevronRight, GraduationCap } from "lucide-react";
import { format, parseISO, isAfter, startOfDay, isBefore, addDays } from "date-fns";
import { Link } from "wouter";
import type { SundaySchoolLesson } from "@shared/schema";
import { Helmet } from "react-helmet-async";

function getNextSunday(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay();
  if (day === 0) return d;
  d.setDate(d.getDate() + (7 - day));
  return d;
}

export default function SundaySchool() {
  const { data: lessons, isLoading } = useQuery<SundaySchoolLesson[]>({
    queryKey: ["/api/sunday-school"],
  });

  const today = startOfDay(new Date());
  const nextSunday = getNextSunday(today);
  const fourWeeksOut = addDays(nextSunday, 28);

  const upcomingLessons = (lessons || [])
    .filter((l) => {
      const d = parseISO(l.date);
      return !isBefore(d, today) && isBefore(d, fourWeeksOut);
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const pastLessons = (lessons || [])
    .filter((l) => isBefore(parseISO(l.date), today))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
              {upcomingLessons.map((lesson) => {
                const lessonDate = parseISO(lesson.date);
                const isThisSunday = !isAfter(today, lessonDate) && !isBefore(lessonDate, today);
                return (
                  <Card key={lesson.id} className="hover-elevate transition-all" data-testid={`card-lesson-upcoming-${lesson.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <CardTitle className="font-serif text-lg leading-tight">
                          {lesson.title}
                        </CardTitle>
                        {isThisSunday && (
                          <Badge variant="default" className="shrink-0">This Sunday</Badge>
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
                        {lesson.lessonContent.substring(0, 150)}...
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
