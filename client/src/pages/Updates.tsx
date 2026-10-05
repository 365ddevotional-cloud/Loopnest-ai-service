import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Updates() {
  return <>
    <Helmet>
      <title>A simpler start to 365 Daily Devotional</title>
      <meta name="description" content="Explore today's Scripture-based devotional, prayer points, the Bible, and worship music with clearer guidance in 365 Daily Devotional." />
      <meta property="og:title" content="A simpler start to 365 Daily Devotional" />
      <meta property="og:description" content="Read, pray, and explore worship music with our updated quick tour and guide." />
    </Helmet>
    <article className="max-w-3xl mx-auto py-8 md:py-12 space-y-8" data-testid="community-update-post">
      <header className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Community update · October 4, 2026</p>
        <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground">A simpler start to your daily devotional</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">Take a few moments with God's Word today. Read a Scripture-based message, reflect on prayer points, and carry that encouragement into your day.</p>
      </header>

      <section className="rounded-xl border border-primary/20 bg-card p-5 md:p-8 space-y-4 leading-relaxed">
        <p>365 Daily Devotional brings today's message, Bible reading, past devotionals, prayer requests, and worship music together in one place. You can begin reading without creating an account.</p>
        <p>We recently improved the quick tour and the How to Use guide. The tour now shows you where to read today's message, browse the archive, ask for prayer, and find music. You can skip it or replay it whenever you like.</p>
        <p>Open a devotional for Scripture, reflection, prayer points, and declarations. If you need encouragement, the Prayer &amp; Counseling page explains how to send a request and review its privacy choices. You can also listen to worship songs and watch available videos in Music.</p>
        <p>We welcome your ideas. The feedback button is available in the app, and your suggestions help us decide what to improve next. We have not set release dates for features under consideration.</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/"><Button>Read today's devotional</Button></Link>
        <Link href="/how-to-use"><Button variant="outline">Explore the guide</Button></Link>
        <Link href="/contact/feedback"><Button variant="outline">Send an idea</Button></Link>
      </div>
    </article>
  </>;
}
