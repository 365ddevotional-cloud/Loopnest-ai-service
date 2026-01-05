# 365 Daily Devotional

## Overview

A faith-based daily devotional web application that provides believers with daily spiritual content including scripture readings, reflections, prayer points, and faith declarations. The platform features a content management system for publishing devotionals, an archive for browsing past entries, and a prayer request submission system.

## Google Play Store Compliance (January 2026)

The app includes all required legal pages for app store compliance:
- **Privacy Policy** (`/privacy-policy`): Data collection, usage, security, no data selling
- **Terms of Use** (`/terms-of-use`): Spiritual encouragement disclaimer, acceptable use
- **Disclaimer** (`/disclaimer`): Faith-based content notice, crisis resources
- **Contact Us** (`/contact`): Ministry email and contact purposes
- **Footer**: Links to all legal pages on every page

## PWA & Google Play Store Publishing

### PWA Features Implemented
- **Web App Manifest** (`client/public/manifest.json`): Full PWA manifest with app name, icons, shortcuts, orientation
- **Service Worker** (`client/public/sw.js`): Network-first caching with offline fallback
- **App Icons**: 192x192 and 512x512 icons for both regular and maskable purposes
- **Meta Tags**: Apple mobile web app support, theme color, manifest link

### Publishing to Google Play Store via TWA

1. **Set Environment Variables** (before building TWA):
   - `ANDROID_PACKAGE_NAME`: Your app's package name (e.g., `com.devotional365.app`)
   - `ANDROID_SHA256_FINGERPRINT`: Your signing key's SHA256 fingerprint

2. **Generate TWA with Bubblewrap**:
   ```bash
   npm install -g @bubblewrap/cli
   bubblewrap init --manifest https://your-app-url.replit.app/manifest.json
   bubblewrap build
   ```

3. **Upload to Google Play Console**:
   - Create a new app in Play Console ($25 one-time fee)
   - Upload the generated `.aab` file
   - Add store listing: description, screenshots, feature graphic
   - Link to Privacy Policy URL
   - Submit for review

### Digital Asset Links
The app serves `/.well-known/assetlinks.json` for TWA verification. Configure the env vars before publishing to ensure proper verification.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with custom theme configuration (deep burgundy/sage green/antique gold palette)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Animations**: Framer Motion for page transitions and card reveals
- **Build Tool**: Vite with custom path aliases (@/, @shared/, @assets/)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints defined in shared/routes.ts with Zod validation
- **Build Process**: esbuild for server bundling, Vite for client

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: shared/schema.ts (shared between frontend and backend)
- **Migrations**: Drizzle Kit with migrations stored in /migrations folder

### Key Design Patterns
- **Shared Types**: Schema definitions and API routes are shared between client and server via the /shared directory
- **Type-Safe API**: Zod schemas validate both request inputs and response shapes
- **Repository Pattern**: Storage interface (IStorage) abstracts database operations in server/storage.ts
- **Component Composition**: UI built with composable shadcn/ui components

### Database Schema
- **devotionals**: Daily devotional entries with date, title, scripture, content, prayer points, and faith declarations
- **biblePassages**: Scripture text stored by reference and translation for multi-translation support
- **prayerRequests**: User-submitted prayer requests with contact information
- **prayerReplies**: Admin replies to prayer requests

### Bible Translation System
The app supports four public domain Bible translations:
- **KJV**: King James Version (default)
- **WEB**: World English Bible
- **ASV**: American Standard Version (1901)
- **DRB**: Douay-Rheims Bible

Key features:
- **Translation Selector**: Dropdown in header (desktop) and list in mobile menu
- **User Preference**: Stored in localStorage (`devotional.preferredTranslation`)
- **Translation Badge**: Displays current translation abbreviation next to scripture reference
- **Fallback Behavior**: If a translation is not available for a passage, falls back to KJV
- **Context Provider**: `TranslationContext` manages global translation state
- **Scripture Hook**: `useScriptureText` fetches scripture by reference and translation
- **API Endpoint**: `/api/scripture?reference=...&translation=...`
- **Seeding**: `server/seed-scripture.ts` seeds sample passages and extracts KJV from existing devotionals

### Archive Access Control
The devotional archive implements role-based visibility:
- **Users (Non-Admin)**: Can only view present (today) and past devotionals. Future-dated devotionals are hidden from lists, search results, and direct URL access.
- **Admins**: Have full access to all devotionals including future-dated entries for content scheduling.
- **Restricted Access Message**: When a non-admin attempts to access a future devotional via URL, they see a "Coming Soon" message with the scheduled date.
- **Timezone Support**: Date comparisons use configurable timezone via `APP_TIMEZONE` environment variable (defaults to America/New_York). The timezone-aware utility is in `server/date-utils.ts`.

### Automatic Devotional Seeding
Devotionals are automatically generated on server startup:
- **Location**: `server/seed-devotionals.ts` contains all devotional content for the year
- **Startup Integration**: `server/index.ts` calls `seedAllDevotionals()` on every startup
- **Duplicate Prevention**: Only inserts devotionals for dates that don't already exist
- **Coverage**: January through December 2026 (365 days)
- **Manual Run**: Can also run directly with `npx tsx server/seed-devotionals.ts`

### Data Protection & Safety Guards (January 2026)

The app implements comprehensive data protection to prevent accidental data loss:

**Soft-Delete System**
- Devotionals use soft-delete instead of permanent deletion
- `isDeleted` boolean field marks devotionals as hidden without removing data
- `deletedAt` timestamp records when deletion occurred
- Deleted devotionals can be restored via `/api/devotionals/:id/restore` (Admin only)
- Admin can view deleted devotionals via `/api/devotionals/deleted`

**Confirmation Requirements**
- DELETE endpoint requires explicit `?confirm=true` query parameter
- Frontend shows user confirmation dialog before triggering delete
- Past devotionals cannot be deleted or edited (read-only protection)

**Access Control**
- All destructive operations require admin authentication
- Non-admin users cannot access future-dated devotionals
- No bulk delete endpoints exist (single-item operations only)

**Duplicate Prevention**
- Devotional dates are unique (database constraint)
- Seed script skips dates that already have devotionals
- API rejects creation of devotionals for existing dates

**Data Preservation**
- All 361 devotionals for 2026 (Jan 3 - Dec 31) are preserved
- Schema changes are additive only (new optional fields)
- No migrations that drop or alter existing columns

### Daily Notification System
Browser-based notifications to remind users when today's devotional is available:
- **Technology**: Web Notifications API (browser-based, no external push services)
- **Opt-in**: Users see a permission prompt on first visit; can toggle on/off in the header menu
- **Frequency**: One notification per day maximum, tracked via localStorage
- **Trigger**: Notification fires when today's devotional exists and user has notifications enabled
- **State Management**: Centralized in `NotificationContext` (`client/src/contexts/NotificationContext.tsx`)
- **Components**:
  - `NotificationPrompt`: First-visit permission prompt with gentle messaging
  - `NotificationTrigger`: Checks for today's devotional and sends notification
  - Header toggle: Bell icon (desktop) / Switch (mobile) to enable/disable reminders
- **Storage**: User preferences stored in localStorage (`devotional-notifications-enabled`, `devotional-notification-prompt-shown`, `devotional-last-notification-date`)

## External Dependencies

### Database
- PostgreSQL database (connection via DATABASE_URL environment variable)
- connect-pg-simple for session storage

### Frontend Libraries
- @tanstack/react-query for data fetching
- date-fns for date formatting
- lucide-react and react-icons for iconography
- framer-motion for animations

### UI Framework
- Full shadcn/ui component suite (40+ Radix UI-based components)
- Tailwind CSS with custom design tokens
- Custom fonts: Playfair Display (serif) and DM Sans (sans-serif)

### Build & Development
- Vite development server with HMR
- Replit-specific plugins for development (cartographer, dev-banner, error overlay)
- esbuild for production server bundling