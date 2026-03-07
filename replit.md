# 365 Daily Devotional

## Overview
The 365 Daily Devotional is a web application designed to provide believers with daily spiritual content, including scripture readings, reflections, prayer points, and faith declarations. It aims to offer a consistent source of spiritual encouragement and guidance. Key features include a content management system for devotionals, an archive, and a prayer request submission system. The project's vision is to create a perpetual and accessible platform for daily spiritual nourishment, with future ambitions to expand its reach and features.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, utilizing Wouter for routing and TanStack React Query for server state management and caching. Styling is implemented with Tailwind CSS, featuring a custom theme (deep burgundy, sage green, antique gold). UI components are sourced from shadcn/ui, built on Radix UI primitives. Framer Motion handles animations for page transitions and card reveals. Vite is used as the build tool, configured with custom path aliases. The application is designed as a Progressive Web App (PWA) with a manifest and service worker for offline capabilities and Google Play Store publishing via TWA.

### Backend Architecture
The backend runs on Node.js with Express and is written in TypeScript using ES modules. It exposes RESTful API endpoints defined in `shared/routes.ts` with Zod validation for type safety. esbuild is used for server bundling.

### Data Storage
PostgreSQL serves as the database, managed by Drizzle ORM with `drizzle-zod` for schema validation. The database schema is defined in `shared/schema.ts` and includes tables for `devotionals`, `biblePassages`, `prayerRequests`, `prayerReplies`, and `sundaySchoolLessons`. Drizzle Kit handles database migrations.

### Key Design Patterns
The architecture emphasizes shared types and type-safe APIs, with schema definitions and API routes shared between client and server via the `/shared` directory. A Repository Pattern (IStorage interface) abstracts database operations. UI components are designed for composition.

### Feature Specifications
- **Bible Translation System**: Supports KJV, WEB, ASV, DRB, with user preference storage, a translation selector, and a fallback mechanism to KJV.
- **Perpetual Devotional Cycle**: Uses days-difference-from-earliest-date modulo logic to cycle through existing devotionals forever, ensuring continuous content availability without redeployment. Both server-side and client-side (offline) implementations share identical modulo formula.
- **Archive Access Control**: Implements role-based access where non-admin users can only view present and past devotionals, while admins have full access.
- **Seasonal Override Devotionals**: Incorporates specific devotionals for holidays like Easter, Mother's/Children's/Father's Emphasis Weeks, Thanksgiving, and Christmas, managed via a `seasonal_override` field.
- **Data Protection**: Includes a soft-delete system for devotionals with `isDeleted` and `deletedAt` fields, requiring explicit confirmation for deletion, and restricting operations on past devotionals. Admin backup and monitoring endpoints are available.
- **Prayer & Counseling Conversation System**: Full conversation threading between users and admin. Users access requests by email via `GET /api/my-prayer-requests?email=xxx`. Thread messages accessible to users via `GET /api/prayer-requests/:id/thread?email=xxx`. Attachments via `GET /api/prayer-requests/:id/attachments?email=xxx`. Read tracking: `isRead`/`readAt` fields on `thread_messages`, auto-marked when user opens conversation via `POST /api/prayer-requests/:id/mark-read`. Admin panel shows "Delivered" (clock icon) or "Read at [timestamp]" (green checkmark) for each admin message. User follow-ups via `POST /api/prayer-requests/:id/thread` with `senderType: "user"`. Key files: `client/src/pages/MyPrayerRequests.tsx`, `client/src/pages/Admin.tsx` (PrayerInbox), `server/routes.ts`, `server/storage.ts`.
- **Locked Features**: Stable features like the Bible Reading interface (with verse bookmarking, highlighting, notes, and sharing), Daily Bible Verse, Sharing features, Devotionals System, and Prayer & Counseling system are protected from regression.
- **Enhanced Bible Share**: 3 share formats: Text (native share/clipboard), Image (4 themes: parchment, royal blue, sunrise, charcoal with 1080x1080 canvas), Greeting Card (4 themes + optional titles "Be Encouraged"/"God's Word for You"/"Daily Promise" + recipient name). All use Canvas API, no external dependencies. Key files: `client/src/share/shareText.ts`, `client/src/share/shareImage.ts`, `client/src/share/shareCard.ts`, `client/src/components/BibleVerseActions.tsx`.
- **Daily Notification System**: Browser-based web notifications allow users to opt-in for daily reminders when new devotionals are available, managed via `NotificationContext` and localStorage.
- **Sunday School System**: Free public feature at `/sunday-school` with weekly KJV-only lessons. Shows 4 upcoming Sunday lessons and an archive of past lessons. Each lesson includes scripture, full lesson content, discussion questions, prayer focus, and weekly assignment. Admin can create, edit, and delete lessons via the admin dashboard "Sunday School" tab. Seed data auto-populates 4 initial lessons. Copy button formats lessons for sharing. Schema: `sundaySchoolLessons` table. API: `/api/sunday-school` endpoints. Seed: `server/seed-sunday-school.ts`.
- **Cyclical Fallback Loop**: Both Daily Devotionals and Sunday School implement perpetual cycling to ensure content availability beyond initial date range using modulo-based indexing from earliest content date.
- **Offline-First Architecture**: IndexedDB-based offline persistence using native API (no external library). DB name: `devotionalOfflineDB` (v2) with stores for `devotionals`, `sundayLessons` (indexed by id), `bibleKJV`, and `metadata`. On app load when online, `useOfflineSync` hook prefetches all devotionals, Sunday School lessons, and KJV Bible chapters into IndexedDB. When offline, all hooks (`useTodayDevotional`, `useDevotionalsList`, Sunday School queries, Bible `fetchChapter`) fall back to IndexedDB with identical modulo loop logic. When online but API fails, all hooks also fall back to IndexedDB. Bible reader uses IndexedDB-first for KJV (serves cached, revalidates in background). Service worker (v4) uses cache-first for API responses (with empty/failed response guard), stale-while-revalidate for static assets. Key files: `client/src/lib/offlineDb.ts`, `client/src/hooks/use-offline-sync.ts`.
- **Multilingual Translation System**: On-demand AI-powered translation via OpenAI (Replit AI Integrations). Supported languages: English (en), Spanish (es), French (fr), Yoruba (yo), Nigerian Pidgin (pcm), Hausa (ha). Uses `devotional_translations` DB table for caching. Rate limited to 3/min. Single devotional views trigger on-demand translation; list/archive views use cached-only. Frontend `LanguageSwitcher` component (globe icon in header) saves preference to localStorage (`devotionalLang`) and appends `?lang=xx` URL param. Auto-applies saved language on page load. Key files: `server/translationService.ts`, `client/src/components/LanguageSwitcher.tsx`.
- **UI Internationalization (i18n)**: Static JSON-based UI translation system (no backend calls). Locale files at `client/src/locales/{en,es,fr,yo,pcm,ha}.json` contain all UI strings. Utility `client/src/utils/i18n.ts` provides `getUIText(key, lang)` with English fallback. React hook `client/src/hooks/useI18n.ts` provides `{ t, lang }` synced with localStorage `devotionalLang` key and URL `?lang=` param. Integrated into Header (nav items, titles, buttons), DevotionalCard (section headers, buttons, share text), and Footer (legal links, copyright). Uses same language detection as devotional translation system.
- **Universal Audio Reader (Enhanced)**: Browser-based TTS using SpeechSynthesis API with enhanced voice selection (priority: Enhanced > Premium > Google > Natural > Samantha > Daniel > Karen), intelligent pacing (pauses after periods, commas, semicolons), and devotional-specific slower rate (0.88x vs default 0.92x). Voice selector in Settings modal allows choosing from available English voices with localStorage persistence. Sentence-based segmentation for reliable speed-change mid-playback. Floating AudioMiniPlayer with play/pause/stop/speed controls. Key files: `client/src/hooks/useAudioReader.ts`, `client/src/components/AudioMiniPlayer.tsx`, `client/src/components/SettingsModal.tsx`.

## External Dependencies

### Database
- PostgreSQL (via `DATABASE_URL` environment variable)
- `connect-pg-simple` for session storage

### Frontend Libraries
- `@tanstack/react-query`
- `date-fns`
- `lucide-react`, `react-icons`
- `framer-motion`

### UI Framework
- shadcn/ui components (built on Radix UI)
- Tailwind CSS
- Custom fonts: Playfair Display, DM Sans

### Build & Development
- Vite
- Replit-specific plugins (cartographer, dev-banner, error overlay)
- esbuild

## Donation System
- **Donate page** (`client/src/pages/Donate.tsx`): Inspirational landing with "Donate Now" button and direct PayPal/CashApp links.
- **Donation modal**: Amount selector (suggested $5/$10/$25/$50 + custom), donor name, note, purpose dropdown, payment method (PayPal, CashApp, Card).
- **PayPal**: Opens external link `https://www.paypal.com/donate/?hosted_button_id=Y9PAZK36FKT8L`.
- **CashApp**: Opens external link `https://cash.app/$MuzAfo`.
- **Card (Stripe)**: Backend endpoint `POST /api/create-donation-session` creates Stripe Checkout session. Requires `STRIPE_SECRET_KEY` env var; gracefully returns 503 if not configured.
- **Success page** (`client/src/pages/DonationSuccess.tsx`): Route `/donation-success`, shown after Stripe checkout completion.
- **Env vars**: `PAYPAL_DONATION_LINK`, `CASHTAG` (informational), `STRIPE_SECRET_KEY` (optional, for card payments).