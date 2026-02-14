import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { MenuTransitionProvider, useMenuTransition } from "@/contexts/MenuTransitionContext";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { NotificationTrigger } from "@/components/NotificationTrigger";
import { MenuTransitionOverlay } from "@/components/MenuTransitionOverlay";
import { WalkthroughModal } from "@/components/WalkthroughModal";
import { FloatingFeedbackButton } from "@/components/FloatingFeedbackButton";
import Home from "@/pages/Home";
import Archive from "@/pages/Archive";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import About from "@/pages/About";
import Donate from "@/pages/Donate";
import PrayerCounseling from "@/pages/PrayerCounseling";
import MyPrayerRequests from "@/pages/MyPrayerRequests";
import SingleDevotional from "@/pages/SingleDevotional";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfUse from "@/pages/TermsOfUse";
import Disclaimer from "@/pages/Disclaimer";
import Contact from "@/pages/Contact";
import ContactCompose from "@/pages/ContactCompose";
import GeneralInquiries from "@/pages/GeneralInquiries";
import Feedback from "@/pages/Feedback";
import Partnership from "@/pages/Partnership";
import Support from "@/pages/Support";
import HowToUse from "@/pages/HowToUse";
import Bible from "@/pages/Bible";
import PublicDevotionalToday from "@/pages/PublicDevotionalToday";
import PublicArchive from "@/pages/PublicArchive";
import NotFound from "@/pages/not-found";

const PUBLIC_ROUTES = ["/devotional/today", "/public/archive"];

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/archive" component={Archive} />
      <Route path="/admin" component={Admin} />
      <Route path="/about" component={About} />
      <Route path="/donate" component={Donate} />
      <Route path="/prayer-counseling" component={PrayerCounseling} />
      <Route path="/my-requests" component={MyPrayerRequests} />
      <Route path="/devotional/today" component={PublicDevotionalToday} />
      <Route path="/devotional/:date" component={SingleDevotional} />
      <Route path="/public/archive" component={PublicArchive} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-use" component={TermsOfUse} />
      <Route path="/disclaimer" component={Disclaimer} />
      <Route path="/contact" component={Contact} />
      <Route path="/contact/compose" component={ContactCompose} />
      <Route path="/contact/general" component={GeneralInquiries} />
      <Route path="/contact/feedback" component={Feedback} />
      <Route path="/contact/partnership" component={Partnership} />
      <Route path="/prayer" component={PrayerCounseling} />
      <Route path="/support" component={Support} />
      <Route path="/how-to-use" component={HowToUse} />
      <Route path="/bible" component={Bible} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isTransitioning, completeTransition } = useMenuTransition();
  const [location] = useLocation();
  const isPublicRoute =
    location.startsWith("/devotional") || location.startsWith("/public");

  if (isPublicRoute) {
    return <Router />;
  }

  return (
    <>
      <div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
        <Header />
        <main className="flex-grow container mx-auto px-4 pt-6 pb-12 sm:pt-8 sm:pb-16">
          <Router />
        </main>
        <Footer />
        <Toaster />
        <NotificationPrompt />
        <NotificationTrigger />
        <WalkthroughModal />
        <FloatingFeedbackButton />
      </div>
      <MenuTransitionOverlay isVisible={isTransitioning} onComplete={completeTransition} />
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <TranslationProvider>
                <FontSizeProvider>
                  <MenuTransitionProvider>
                    <TooltipProvider>
                      <AppContent />
                    </TooltipProvider>
                  </MenuTransitionProvider>
                </FontSizeProvider>
              </TranslationProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
