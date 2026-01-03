import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import Home from "@/pages/Home";
import Archive from "@/pages/Archive";
import Admin from "@/pages/Admin";
import About from "@/pages/About";
import Donate from "@/pages/Donate";
import PrayerCounseling from "@/pages/PrayerCounseling";
import SingleDevotional from "@/pages/SingleDevotional";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/archive" component={Archive} />
      <Route path="/admin" component={Admin} />
      <Route path="/about" component={About} />
      <Route path="/donate" component={Donate} />
      <Route path="/prayer-counseling" component={PrayerCounseling} />
      <Route path="/devotional/:date" component={SingleDevotional} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Router />
          </main>
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
