import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Copy, BookOpen, MessageCircle, Target, ClipboardList, Calendar, GraduationCap, Volume2 } from "lucide-react";
import { useAudioReader } from "@/hooks/useAudioReader";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { SundaySchoolLesson } from "@shared/schema";
import { Helmet } from "react-helmet-async";
import { getAllSundayLessons, getSundayLessonById } from "@/lib/offlineDb";

const numberEmojis = ["1\uFE0F\u20E3", "2\uFE0F\u20E3", "3\uFE0F\u20E3", "4\uFE0F\u20E3", "5\uFE0F\u20E3", "6\uFE0F\u20E3", "7\uFE0F\u20E3", "8\uFE0F\u20E3", "9\uFE0F\u20E3"];

function formatLessonContent(content: string): string {
  let formatted = content;
  formatted = formatted.replace(/OUTLINE POINT (\d+):\s*/g, (_match, num) => {
    const idx = parseInt(num, 10) - 1;
    const emoji = idx < numberEmojis.length ? numberEmojis[idx] : `${num}.`;
    return `${emoji} `;
  });
  formatted = formatted.replace(/TEACHER EMPHASIS:/g, "\uD83D\uDDE3 Teacher Emphasis:");
  return formatted;
}

function formatLessonForCopy(lesson: SundaySchoolLesson): string {
  const lines: string[] = [];
  lines.push(`*SUNDAY SCHOOL LESSON*`);
  lines.push(``);
  lines.push(`*${lesson.title}*`);
  lines.push(`${format(parseISO(lesson.date), "MMMM d, yyyy")}`);
  lines.push(``);
  lines.push(`*Scripture:* ${lesson.scriptureReferences}`);
  lines.push(`"${lesson.scriptureText}"`);
  lines.push(``);
  lines.push(`*Lesson:*`);
  lines.push(formatLessonContent(lesson.lessonContent));
  lines.push(``);
  lines.push(`*Discussion Questions:*`);
  lesson.discussionQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
  lines.push(``);
  lines.push(`*Prayer Focus:*`);
  lines.push(lesson.prayerFocus);
  lines.push(``);
  lines.push(`*Weekly Assignment:*`);
  lines.push(lesson.weeklyAssignment);
  lines.push(``);
  lines.push(`-- Shared from 365 Daily Devotional App`);
  return lines.join('\n');
}

export default function SundaySchoolLessonPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const audio = useAudioReader();

  const { data: lesson, isLoading, error } = useQuery<SundaySchoolLesson>({
    queryKey: ["/api/sunday-school", params.id],
    queryFn: async () => {
      const lessonId = parseInt(params.id || "0", 10);

      async function getFromIndexedDB(): Promise<SundaySchoolLesson | null> {
        try {
          const byId = await getSundayLessonById(lessonId);
          if (byId) return byId;
          const all = await getAllSundayLessons();
          const found = all.find((l: any) => String(l.id) === params.id);
          if (found) return found;
          if (all.length > 0) {
            const sorted = [...all].sort((a: any, b: any) => a.date.localeCompare(b.date));
            const index = ((lessonId % sorted.length) + sorted.length) % sorted.length;
            return sorted[index];
          }
        } catch {}
        return null;
      }

      if (!navigator.onLine) {
        const offline = await getFromIndexedDB();
        if (offline) return offline;
        throw new Error("offline_no_data");
      }

      try {
        const res = await fetch(`/api/sunday-school/${params.id}`, { credentials: "include" });
        if (!res.ok) {
          const offline = await getFromIndexedDB();
          if (offline) return offline;
          throw new Error("Failed to fetch lesson");
        }
        return res.json();
      } catch (e) {
        if (e instanceof Error && e.message === "offline_no_data") throw e;
        const offline = await getFromIndexedDB();
        if (offline) return offline;
        throw e;
      }
    },
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "offline_no_data") return false;
      return failureCount < 2;
    },
  });

  const handleCopy = async () => {
    if (!lesson) return;
    const text = formatLessonForCopy(lesson);
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Lesson copied successfully." });
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast({ title: "Lesson copied successfully." });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12 space-y-4">
        <p className="text-muted-foreground">Lesson not found.</p>
        <Link href="/sunday-school">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Sunday School
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{lesson.title} - Sunday School - 365 Daily Devotional</title>
        <meta name="description" content={`Sunday School lesson: ${lesson.title}. ${lesson.scriptureReferences}. Discussion questions, prayer focus, and weekly assignment included.`} />
        <meta property="og:title" content={`${lesson.title} - Sunday School`} />
        <meta property="og:description" content={`Sunday School lesson: ${lesson.title}. ${lesson.scriptureReferences}. Discussion questions, prayer focus, and weekly assignment included.`} />
        <meta property="og:type" content="article" />
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link href="/sunday-school">
            <Button variant="ghost" className="gap-2" data-testid="button-back-sunday-school">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => {
                if (!lesson) return;
                const listenText = [
                  `${lesson.title}.`,
                  `Scripture: ${lesson.scriptureReferences}.`,
                  lesson.scriptureText + ".",
                  `Lesson Content:`,
                  lesson.lessonContent,
                  `Discussion Questions:`,
                  ...lesson.discussionQuestions.map((q, i) => `Question ${i + 1}: ${q}.`),
                  `Prayer Focus: ${lesson.prayerFocus}.`,
                  `Weekly Assignment: ${lesson.weeklyAssignment}.`,
                ].join(" ");
                audio.play(listenText, lesson.title);
              }}
              variant="outline"
              className="gap-2"
              data-testid="button-listen-lesson"
            >
              <Volume2 className="w-4 h-4" />
              Listen
            </Button>
            <Button onClick={handleCopy} className="gap-2" data-testid="button-copy-lesson">
              <Copy className="w-4 h-4" />
              Copy Lesson
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <GraduationCap className="w-4 h-4" />
            <span>Sunday School</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground" data-testid="text-lesson-title">
            {lesson.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3 h-3" />
              {format(parseISO(lesson.date), "MMMM d, yyyy")}
            </Badge>
          </div>
        </div>

        <Card data-testid="card-scripture">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              Scripture Reading
            </div>
            <p className="font-medium text-foreground">
              {lesson.scriptureReferences}
            </p>
            <blockquote className="border-l-4 border-primary/30 pl-4 italic text-foreground/85 leading-relaxed">
              {lesson.scriptureText}
            </blockquote>
          </CardContent>
        </Card>

        <Card data-testid="card-lesson-content">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              Lesson Content
            </div>
            <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {formatLessonContent(lesson.lessonContent)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-discussion">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
              <MessageCircle className="w-4 h-4" />
              Discussion Questions
            </div>
            <ol className="space-y-3 list-decimal list-inside">
              {lesson.discussionQuestions.map((q, i) => (
                <li key={i} className="text-foreground/90 leading-relaxed">
                  {q}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card data-testid="card-prayer-focus">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
              <Target className="w-4 h-4" />
              Prayer Focus
            </div>
            <p className="text-foreground/90 leading-relaxed italic">
              {lesson.prayerFocus}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-assignment">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
              <ClipboardList className="w-4 h-4" />
              Weekly Assignment
            </div>
            <p className="text-foreground/90 leading-relaxed">
              {lesson.weeklyAssignment}
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-center pb-8">
          <Button onClick={handleCopy} className="gap-2" data-testid="button-copy-lesson-bottom">
            <Copy className="w-4 h-4" />
            Copy Full Lesson
          </Button>
        </div>
      </div>
    </>
  );
}
