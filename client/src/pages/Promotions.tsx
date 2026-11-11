import { WhatsNewSection } from "@/components/MinistryDiscovery";
import { Link } from "wouter";
export default function Promotions() {
 return <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
 <p className="text-sm font-semibold uppercase tracking-widest text-orange-600">Ministry Resources</p>
 <h1 className="font-serif text-3xl font-bold">Discover Books, Music & Ministry Resources</h1>
 <p className="text-muted-foreground">Explore resources to encourage your walk with Christ. New in-app promotions will appear here as they are published.</p>
 <WhatsNewSection title="Current promotions" />
 <div className="grid gap-4 sm:grid-cols-2">
 <Link href="/shop" className="rounded-2xl border bg-card p-6 hover:border-orange-400"><h2 className="font-bold text-xl">Visit Our Ministry Shop</h2><p className="mt-2 text-sm text-muted-foreground">Explore currently available products and resources.</p><span className="mt-4 inline-block font-semibold text-orange-600">Explore shop →</span></Link>
 <Link href="/music"><article className="rounded-2xl border bg-card p-6 hover:border-orange-400"><h2 className="font-bold text-xl">SpiritTone Music</h2><p className="mt-2 text-sm text-muted-foreground">Discover worship music and featured songs.</p><span className="mt-4 inline-block font-semibold text-orange-600">Browse music →</span></article></Link>
 </div><Link href="/updates" className="text-primary underline">See what's new in the devotional</Link>
 </main>;
}