import { Link } from "wouter";
export default function Discipleship() {
 return <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
 <p className="text-sm font-semibold uppercase tracking-widest text-orange-600">Grow in Christ</p>
 <h1 className="font-serif text-3xl font-bold">Discipleship & Spiritual Growth</h1>
 <p className="text-muted-foreground">A place for biblical encouragement, spiritual maturity, and growing in the grace and knowledge of Jesus Christ.</p>
 <section className="rounded-2xl border bg-card p-6 space-y-3"><h2 className="font-serif text-xl font-semibold">Start with God's Word</h2>
 <p>Explore daily Scripture, prayer, and the devotional archive as you grow in faith.</p>
 <div className="flex flex-wrap gap-4"><Link href="/" className="font-semibold text-primary underline">Today's devotional</Link><Link href="/archive" className="font-semibold text-primary underline">Devotional archive</Link></div></section>
 <section className="rounded-2xl border bg-card p-6 space-y-4">
  <h2 className="font-serif text-xl font-semibold">Practices for growing in Christ</h2>
  <ul className="space-y-3 text-muted-foreground">
   <li><strong className="text-foreground">Begin with grace.</strong> God saves us by grace through faith and prepares us to do good. Thank him for one way you have seen his grace today (Ephesians 2:8–10).</li>
   <li><strong className="text-foreground">Remember who you are in Christ.</strong> Read 2 Corinthians 5:17 and name one decision you can make today as someone made new in him.</li>
   <li><strong className="text-foreground">Renew your mind through Scripture.</strong> Read Romans 12:2 slowly. Ask God to show you a thought or habit that needs to change, then choose one practical step.</li>
   <li><strong className="text-foreground">Make time to pray.</strong> Bring one real concern to God with thanksgiving. Pray for someone else and follow through with an act of kindness (Philippians 4:6–7).</li>
  </ul>
 </section>
 <section className="rounded-2xl border bg-card p-6 space-y-3"><h2 className="font-serif text-xl font-semibold">Need personal encouragement?</h2><p>You can ask our ministry team to follow up with you personally. In the Prayer & Counseling form, select the optional discipleship follow-up box and provide an email where we can reach you.</p><Link href="/prayer-counseling" className="inline-block rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white">Prayer & Counseling</Link></section>
 </main>;
}