import { Link } from "wouter";

export default function LoopNestSeparated() {
  return <main className="min-h-screen flex items-center justify-center p-6" data-testid="loopnest-separated">
    <div className="max-w-lg space-y-5 text-center">
      <h1 className="text-3xl font-serif text-primary">LoopNest is becoming its own app</h1>
      <p>The standalone LoopNest website is being prepared. You can still enjoy the faith games in 365 Daily Devotional.</p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/interactive" className="text-primary underline">Play Faith Games</Link>
        <Link href="/" className="text-primary underline">Daily Devotional</Link>
      </div>
    </div>
  </main>;
}
