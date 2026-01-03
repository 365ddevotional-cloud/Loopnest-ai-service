import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function About() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">About Us</h1>
        <div className="w-24 h-1 bg-primary mx-auto rounded-full opacity-30" />
      </div>

      <Card className="bg-white border-primary/10 shadow-xl shadow-primary/5 overflow-hidden">
        {/* Hero Section of About Page */}
        <div className="bg-primary/5 p-8 md:p-12 text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
            New Covenant Church
          </h2>
          <p className="text-lg text-primary font-medium italic">
            "Transforming lives through the power of the Word"
          </p>
        </div>

        <div className="p-8 md:p-12 space-y-8 font-serif leading-relaxed text-lg text-muted-foreground">
          <p>
            Welcome to the 365 Daily Devotional, a ministry dedicated to strengthening your daily walk with God. 
            Our mission is to provide consistent, biblically-grounded encouragement that empowers you to live 
            a life of victory, faith, and purpose.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 my-12">
            <div className="bg-muted/30 p-6 rounded-xl border border-primary/10">
              <h3 className="font-sans font-bold text-primary mb-3 uppercase tracking-wide text-sm">Our Vision</h3>
              <p className="text-base">
                To see believers established in the truth of God's Word, walking in their divine identity, 
                and impacting their world with the love of Christ.
              </p>
            </div>
            
            <div className="bg-muted/30 p-6 rounded-xl border border-primary/10">
              <h3 className="font-sans font-bold text-primary mb-3 uppercase tracking-wide text-sm">Our Mission</h3>
              <p className="text-base">
                Raising a people of substance, character, and power who will extend the frontiers 
                of God's kingdom on earth.
              </p>
            </div>
          </div>

          <Separator className="bg-primary/10" />

          <div className="text-center space-y-4">
            <h3 className="font-bold text-foreground">Connect With Us</h3>
            <p>Email: 365ddevotional@gmail.com</p>
          </div>
        </div>
      </Card>
      
      {/* Decorative Footer */}
      <div className="text-center mt-12 text-sm text-muted-foreground opacity-60">
        <p>&copy; {new Date().getFullYear()} 365 Daily Devotional. All rights reserved.</p>
        <p className="mt-2 font-serif italic">"Thy word is a lamp unto my feet, and a light unto my path." — Psalm 119:105</p>
      </div>
    </div>
  );
}
