import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import PromiseCard3D, { getRandomThemeIndex } from "@/components/PromiseCard3D";
import { sharePromiseAsImage } from "@/share/sharePromise";
import { queryClient } from "@/lib/queryClient";

interface PromiseResponse {
  promise: { id: number; heading: string; text: string; reference: string };
  index: number;
  isEnabled: boolean;
}

export default function DailyPromise() {
  const { data, isLoading } = useQuery<PromiseResponse>({
    queryKey: ["/api/promise/current"],
  });

  const { data: nextData } = useQuery<{ promise: { id: number; heading: string; text: string; reference: string }; index: number }>({
    queryKey: ["/api/promise/next"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="promise-loading">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!data) return null;

  const { promise, index } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100/80 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Daily Promise
          </div>
          <h1
            data-testid="text-daily-promise-title"
            className="text-3xl font-bold text-gray-900 dark:text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            God's Promise For You Today
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
            Promise #{index + 1} of 500
          </p>
        </div>

        <PromiseCard3D
          heading={promise.heading}
          scripture={promise.text}
          reference={promise.reference}
          promiseId={promise.id}
          themeIndex={getRandomThemeIndex(promise.id)}
          onShare={() => sharePromiseAsImage(promise.heading, promise.text, promise.reference, getRandomThemeIndex(promise.id))}
        />

        {nextData && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4 text-gray-500 dark:text-gray-400 text-sm">
              <RefreshCw className="w-4 h-4" />
              Coming Up Next
            </div>
            <PromiseCard3D
              heading={nextData.promise.heading}
              scripture={nextData.promise.text}
              reference={nextData.promise.reference}
              themeIndex={getRandomThemeIndex(nextData.promise.id)}
              showActions={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
