import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
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
import { AudioMiniPlayer } from "@/components/AudioMiniPlayer";
import MiniPlayer from "@/components/MiniPlayer";
import { stopAudioOnNavigate } from "@/hooks/useAudioReader";
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { useLanguageAutoApply } from "@/components/LanguageSwitcher";
import Home from "@/pages/Home";
import Archive from "@/pages/Archive";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import About from "@/pages/About";
import Donate from "@/pages/Donate";
import DonationSuccess from "@/pages/DonationSuccess";
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
import SundaySchool from "@/pages/SundaySchool";
import SundaySchoolLessonPage from "@/pages/SundaySchoolLesson";
import { GamePage, GamesHub, CreateGamePage } from "@/game-engine";
import { LoopNestAuthProvider } from "@/loopnest/AuthContext";
import LoopNestRoot from "@/loopnest/LoopNestRoot";
import LoopNestLogin from "@/loopnest/LoginPage";
import LoopNestDashboard from "@/loopnest/DashboardPage";
import LoopNestBuilder from "@/loopnest/BuilderPage";
import TestimonyWall from "@/pages/TestimonyWall";
import QuickPrayer from "@/pages/QuickPrayer";
import DailyPromise from "@/pages/DailyPromise";
import Inbox from "@/pages/Inbox";
import Music from "@/pages/Music";
import SongDetail from "@/pages/SongDetail";
import SignIn from "@/pages/SignIn";
import MyLibrary from "@/pages/MyLibrary";
import AccountPage from "@/pages/AccountPage";
import PromisePopup from "@/components/PromisePopup";
import NotFound from "@/pages/not-found";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
const ChurchLanding = lazy(() => import("@/pages/ChurchLanding"));
const ChurchCreate = lazy(() => import("@/pages/ChurchCreate"));
const ChurchJoin = lazy(() => import("@/pages/ChurchJoin"));
const ChurchHome = lazy(() => import("@/pages/ChurchHome"));
const ChurchMembers = lazy(() => import("@/pages/ChurchMembers"));
const ChurchAdminPage = lazy(() => import("@/pages/ChurchAdminPage"));
const ChurchSermons = lazy(() => import("@/pages/ChurchSermons"));
const ChurchAnnouncements = lazy(() => import("@/pages/ChurchAnnouncements"));
const ChurchGroups = lazy(() => import("@/pages/ChurchGroups"));
const ChurchPrayer = lazy(() => import("@/pages/ChurchPrayer"));
const ChurchGiving = lazy(() => import("@/pages/ChurchGiving"));
const ChurchMessaging = lazy(() => import("@/pages/ChurchMessaging"));
const ChurchMemberProfilePage = lazy(() => import("@/pages/ChurchMemberProfile"));
const ChurchDepartments = lazy(() => import("@/pages/ChurchDepartments"));
const ChurchDepartmentView = lazy(() => import("@/pages/ChurchDepartmentView"));
const ChurchPublicHome = lazy(() => import("@/pages/ChurchPublicHome"));
const ChurchPublicAbout = lazy(() => import("@/pages/ChurchPublicAbout"));
const ChurchPublicWatch = lazy(() => import("@/pages/ChurchPublicWatch"));
const ChurchPublicEvents = lazy(() => import("@/pages/ChurchPublicEvents"));
const ChurchPublicMinistries = lazy(() => import("@/pages/ChurchPublicMinistries"));
const ChurchPublicGive = lazy(() => import("@/pages/ChurchPublicGive"));
const ChurchPublicContact = lazy(() => import("@/pages/ChurchPublicContact"));
const ChurchPublicJoin = lazy(() => import("@/pages/ChurchPublicJoin"));
const ChurchPublicVisit = lazy(() => import("@/pages/ChurchPublicVisit"));

function ChurchPageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#b8962e" }} />
    </div>
  );
}

function ChurchGateway() {
  const [location] = useLocation();
  const slug = location.split("/")[2] ?? "";
  const { user, emailVerified, getIdToken } = useUser();
  const [membership, setMembership] = useState<"loading" | "member" | "visitor">("loading");

  useEffect(() => {
    if (!user || !emailVerified) { setMembership("visitor"); return; }
    getIdToken().then(token => {
      if (!token) { setMembership("visitor"); return; }
      fetch(`/api/churches/slug/${slug}/my-role`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setMembership(d.status === "active" ? "member" : "visitor"))
        .catch(() => setMembership("visitor"));
    });
  }, [slug, user, emailVerified]);

  if (membership === "loading") return <ChurchPageFallback />;
  if (membership === "member") return <Suspense fallback={<ChurchPageFallback />}><ChurchHome /></Suspense>;
  return <Suspense fallback={<ChurchPageFallback />}><ChurchPublicHome /></Suspense>;
}

function Router() {
  return (
    <Switch>
      <Route path="/church/create" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchCreate /></Suspense>} />
      <Route path="/church/join/:code" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchJoin /></Suspense>} />
      <Route path="/church/join" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchJoin /></Suspense>} />
      <Route path="/church/:slug/sermons" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchSermons /></Suspense>} />
      <Route path="/church/:slug/announcements" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchAnnouncements /></Suspense>} />
      <Route path="/church/:slug/groups" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchGroups /></Suspense>} />
      <Route path="/church/:slug/prayer" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchPrayer /></Suspense>} />
      <Route path="/church/:slug/giving/success" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchGiving /></Suspense>} />
      <Route path="/church/:slug/giving" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchGiving /></Suspense>} />
      <Route path="/church/:slug/messages" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchMessaging /></Suspense>} />
      <Route path="/church/:slug/members" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchMembers /></Suspense>} />
      <Route path="/church/:slug/profile" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchMemberProfilePage /></Suspense>} />
      <Route path="/church/:slug/departments/:deptSlug" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchDepartmentView /></Suspense>} />
      <Route path="/church/:slug/departments" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchDepartments /></Suspense>} />
      <Route path="/church/:slug/admin" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchAdminPage /></Suspense>} />
      {/* Public website sub-routes — no auth required */}
      <Route path="/church/:slug/about" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchPublicAbout /></Suspense>} />
      <Route path="/church/:slug/watch" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchPublicWatch /></Suspense>} />
      <Route path="/church/:slug/events" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchPublicEvents /></Suspense>} />
      <Route path="/church/:slug/ministries" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchPublicMinistries /></Suspense>} />
      <Route path="/church/:slug/give-online" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchPublicGive /></Suspense>} />
      <Route path="/church/:slug/contact" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchPublicContact /></Suspense>} />
      <Route path="/church/:slug/join-us" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchPublicJoin /></Suspense>} />
      <Route path="/church/:slug/visit" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchPublicVisit /></Suspense>} />
      {/* Smart gateway: members see ChurchHome, visitors see ChurchPublicHome */}
      <Route path="/church/:slug" component={ChurchGateway} />
      <Route path="/church" component={() => <Suspense fallback={<ChurchPageFallback />}><ChurchLanding /></Suspense>} />
      <Route path="/" component={Home} />
      <Route path="/archive" component={Archive} />
      <Route path="/admin" component={Admin} />
      <Route path="/about" component={About} />
      <Route path="/donate" component={Donate} />
      <Route path="/donation-success" component={DonationSuccess} />
      <Route path="/prayer-counseling" component={PrayerCounseling} />
      <Route path="/my-requests" component={MyPrayerRequests} />
      <Route path="/testimonies" component={TestimonyWall} />
      <Route path="/quick-prayer" component={QuickPrayer} />
      <Route path="/daily-promise" component={DailyPromise} />
      <Route path="/music/:slug" component={SongDetail} />
      <Route path="/music" component={Music} />
      <Route path="/signin" component={SignIn} />
      <Route path="/my-library" component={MyLibrary} />
      <Route path="/account" component={AccountPage} />
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
      <Route path="/sunday-school/:id" component={SundaySchoolLessonPage} />
      <Route path="/sunday-school" component={SundaySchool} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/interactive" component={GamesHub} />
      <Route path="/interactive/create" component={CreateGamePage} />
      <Route path="/interactive/:gameSlug" component={GamePage} />
      <Route path="/loopnest" component={LoopNestRoot} />
      <Route path="/loopnest/login" component={LoopNestLogin} />
      <Route path="/loopnest/dashboard" component={LoopNestDashboard} />
      <Route path="/loopnest/builder" component={LoopNestBuilder} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  useOfflineSync();
  useLanguageAutoApply();
  const { isTransitioning, completeTransition } = useMenuTransition();
  const [location] = useLocation();
  const { currentSong } = useMusicPlayer();

  useEffect(() => {
    stopAudioOnNavigate();
  }, [location]);

  const isPublicRoute =
    location.startsWith("/devotional") || location.startsWith("/public") || location.startsWith("/interactive") || location.startsWith("/loopnest");

  if (location.startsWith("/loopnest")) {
    return (
      <LoopNestAuthProvider>
        <Router />
      </LoopNestAuthProvider>
    );
  }

  // Church mode shell routes (have their own header/layout)
  const churchSlugPath = location.startsWith("/church/") && !["create", "join"].includes(location.split("/")[2] ?? "");
  if (churchSlugPath) {
    return <Router />;
  }

  if (isPublicRoute) {
    return (
      <>
        <Router />
        <PromisePopup />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
        <Header />
        <main className={`flex-grow container mx-auto px-4 pt-6 sm:pt-8 ${currentSong ? "pb-28 sm:pb-32" : "pb-12 sm:pb-16"}`}>
          <Router />
        </main>
        <Footer />
        <Toaster />
        <NotificationPrompt />
        <NotificationTrigger />
        <PromisePopup />
        <WalkthroughModal />
        <FloatingFeedbackButton />
        <AudioMiniPlayer />
        <MiniPlayer />
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
            <UserProvider>
            <MusicPlayerProvider>
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
            </MusicPlayerProvider>
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
