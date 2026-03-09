# 365 Daily Devotional

## Overview
The 365 Daily Devotional is a web application providing daily spiritual content like scripture readings, reflections, prayers, and faith declarations. It aims to be a consistent source of spiritual encouragement and guidance, featuring a content management system, archives, and a prayer request system. The project envisions a perpetual, accessible platform for spiritual nourishment, with plans for expanded reach and features.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18, TypeScript, Wouter for routing, and TanStack React Query for state management. Styling is with Tailwind CSS (deep burgundy, sage green, antique gold theme) and shadcn/ui components. Framer Motion handles animations. Vite is the build tool. It functions as a Progressive Web App (PWA) for offline capabilities and potential mobile store publishing.

### Backend
The backend is built with Node.js and Express, written in TypeScript using ES modules. It provides RESTful API endpoints with Zod validation. esbuild is used for server bundling.

### Data Storage
PostgreSQL is the database, managed by Drizzle ORM with `drizzle-zod` for schema validation. The schema includes tables for devotionals, bible passages, prayer requests, prayer replies, sunday school lessons, testimonies, promise delivery states, promise amens, inbox threads, and inbox messages. Drizzle Kit manages migrations.

### Key Design Patterns
The architecture emphasizes shared types and type-safe APIs using a `/shared` directory. A Repository Pattern abstracts database operations. UI components are designed for composition.

### Core Features and Design Decisions
- **Bible Translation**: Supports KJV, WEB, ASV, DRB with user preferences and KJV fallback.
- **Perpetual Content Cycling**: Devotionals and Sunday School lessons cycle perpetually using a modulo-based indexing system from the earliest content date, ensuring continuous availability. This logic is implemented both server-side and client-side for offline consistency.
- **Access Control**: Role-based access for devotional archives, allowing non-admins to view current/past content only, while admins have full access.
- **Seasonal Overrides**: Specific devotionals for holidays (e.g., Easter, Christmas) are supported via a `seasonal_override` field.
- **Data Protection**: Soft-delete system for devotionals with explicit confirmation, restricting operations on past content. Admin backup and monitoring endpoints exist.
- **Prayer & Counseling System**: Supports full conversation threading, user-specific access via email, attachment handling, and read tracking for messages. Includes automated follow-up messages.
- **Locked Features**: Core features like the Bible Reading interface (bookmarking, highlighting, notes, sharing), Daily Bible Verse, Sharing, Devotionals, and Prayer & Counseling systems are stable and protected.
- **Enhanced Bible Share**: Offers three share formats: text, image (with 4 themes), and greeting card (with 4 themes and customizable titles), all generated via Canvas API.
- **Daily Notification System**: Browser-based web notifications for new devotional availability, managed via `NotificationContext` and localStorage.
- **Sunday School System**: Provides free public access to weekly KJV-only lessons, including content, questions, prayer focus, and assignments. Admins can manage lessons.
- **Offline-First Architecture**: Utilizes IndexedDB for offline persistence of devotionals, Sunday School lessons, and KJV Bible chapters. Hooks fall back to IndexedDB when offline or API fails. A service worker provides cache-first for API responses and stale-while-revalidate for static assets.
- **Multilingual Translation**: On-demand AI-powered translation (via OpenAI) for devotionals into English, Spanish, French, Yoruba, Nigerian Pidgin, and Hausa, with caching in `devotional_translations` table. Rate-limited and applied to single devotional views.
- **UI Internationalization (i18n)**: Static JSON-based UI translations with locale files. Provides `getUIText` utility and a React hook `useI18n` synced with localStorage and URL parameters.
- **Universal Audio Reader**: Browser-based TTS using SpeechSynthesis API with enhanced voice selection, intelligent pacing, and a devotional-specific slower rate. Features a voice selector in settings and a floating MiniPlayer.
- **Donation System**: Integrates PayPal, CashApp, and Stripe for card payments via a dedicated donation page and modal.
- **Testimony & Quick Prayer System**: Allows public submission of testimonies (requiring admin approval) and quick prayer requests. Admins can manage testimonies.
- **Inbox Conversation System**: Full messaging system between users and admin. Users access via email (no login required). Supports categories (Prayer, Counseling, Scripture Question, Support, General) with threaded conversations. AI auto-response generates scriptural encouragement via OpenAI when threads are created. Chat-bubble UI with user messages on right, admin/AI on left. Admin manages threads via "Messages" tab in dashboard with category/status filters. Tables: `inbox_threads` (id, userEmail, userName, subject, category, status, hasUnreadAdmin, hasUnreadUser) and `inbox_messages` (id, threadId, senderType, message, deletedByUser, deletedByAdmin). Soft-delete for messages. 90-day retention support. AI module: `server/inbox-ai.ts`. User page: `/inbox`. Admin tab: Messages in `/admin`.
- **Daily Promises of God System**: Rotates through 500 Bible promises. Features premium devotional poster cards using 50 rotating background images (`/public/devotional-backgrounds/`), large typography (36px heading, 28px scripture, 22px reference). Background engine (`client/src/lib/backgroundEngine.ts`) handles image loading, caching, and preloading. Canvas-based share images also use background images. Includes popup notification, dedicated `/daily-promise` page, "Amen" button with `promise_amens` DB persistence and admin analytics (most loved today/week/all-time), and Devotional button navigating to `/devotional/today`.

## External Dependencies

### Database
- PostgreSQL (via `DATABASE_URL` environment variable)
- `connect-pg-simple` (for session storage)

### Frontend Libraries
- `@tanstack/react-query`
- `date-fns`
- `lucide-react`, `react-icons`
- `framer-motion`

### UI Framework
- shadcn/ui components (built on Radix UI)
- Tailwind CSS
- Custom fonts: Playfair Display, DM Sans

### Build & Development Tools
- Vite
- esbuild

### Third-Party Services
- OpenAI (for AI-powered translations)
- PayPal (for donations)
- CashApp (for donations)
- Stripe (for card donations)