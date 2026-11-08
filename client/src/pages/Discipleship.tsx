import { Link } from "wouter";
export default function Discipleship() {
 return <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
 <p className="text-sm font-semibold uppercase tracking-widest text-orange-600">Grow in Christ</p>
 <h1 className="font-serif text-3xl font-bold">Discipleship & Spiritual Growth</h1>
 <p className="text-muted-foreground">A place for biblical encouragement, spiritual maturity, and growing in the grace and knowledge of Jesus Christ.</p>
 <section className="rounded-2xl border bg-card p-6 space-y-3"><h2 className="font-serif text-xl font-semibold">Start with God's Word</h2>
 <p>Explore daily Scripture, prayer, and the devotional archive as you grow in faith.</p>
 <div className="flex flex-wrap gap-4"><Link href="/" className="font-semibold text-primary underline">Today's devotional</Link><Link href="/archive" className="font-semibold text-primary underline">Devotional archive</Link></div></section>
 <section className="rounded-2xl border bg-card p-6 space-y-3"><h2 className="font-serif text-xl font-semibold">Need personal encouragement?</h2><p>Reach out privately through our existing prayer and counseling form. The expanded opt-in discipleship enrollment workflow is still being verified before release.</p><Link href="/prayer-counseling" className="inline-block rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white">Prayer & Counseling</Link></section>
 </main>;
}