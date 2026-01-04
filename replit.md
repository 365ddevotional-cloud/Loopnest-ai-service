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
- **prayerRequests**: User-submitted prayer requests with contact information
- **prayerReplies**: Admin replies to prayer requests

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