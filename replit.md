# DocExtract - Document Extraction Platform

## Overview

DocExtract is a bilingual (English/Thai) document extraction platform that enables users to extract structured data from documents using AI-powered templates or general extraction. The application follows a freemium pricing model with free tier (100 pages/month) and pro tier (1,000 pages/month) offerings.

The platform provides pre-built templates for common business documents (Bank Statements, Invoices, Purchase Orders, Contracts) and supports export to multiple formats (JSON, CSV, Excel). It features a sophisticated enterprise-grade marketing site with interactive demos and a full-featured dashboard for authenticated users.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 19 with Vite build system
- **UI Library**: Radix UI components with Tailwind CSS v4 (inline theme configuration)
- **Component System**: shadcn/ui pattern with custom luxury enterprise design system
- **State Management**: Zustand for local state, TanStack Query for server state
- **Routing**: Wouter (lightweight React Router alternative)
- **Animations**: Framer Motion for sophisticated page transitions and micro-interactions
- **Typography**: Multi-font luxury system (DM Serif Display for headlines, Plus Jakarta Sans for body, Noto Sans Thai)

**Design Philosophy**: Enterprise luxury aesthetic with dramatic dark sections, gold accents, sophisticated animations, and high-end typography. Avoids generic "AI slop" patterns through intentional design choices.

**Key Frontend Patterns**:
- Two-layout system: Public (unauthenticated) vs. Authenticated layouts
- Bilingual i18n system with language switcher
- Protected route pattern with authentication checks
- Marketing components separated from application components
- Responsive design with mobile-first approach

### Backend Architecture

**Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Architecture Pattern**: Monorepo structure with shared types
- **API Design**: RESTful endpoints under `/api` prefix
- **Session Management**: Express-session with PostgreSQL store
- **File Upload**: Multer for handling document uploads
- **Build Strategy**: esbuild for server bundling, Vite for client bundling

**Directory Structure**:
- `server/`: Express server, routes, middleware
- `client/`: React application
- `shared/`: Shared types and schemas between client/server
- `script/`: Build scripts

**Key Backend Patterns**:
- Storage abstraction layer (`IStorage` interface) for database operations
- Object storage service for file management
- ACL (Access Control List) system for object-level permissions
- Separation of concerns: routes, storage, authentication, static serving

### Authentication & Authorization

**Provider**: Replit Authentication (mandatory integration)
- Uses OpenID Connect (OIDC) protocol
- Passport.js strategy for authentication flow
- Session-based authentication with PostgreSQL session store
- User claims stored in session with access/refresh tokens

**Social Login Support** (designed but may use Replit Auth instead):
- LINE (prioritized for Thai market)
- Google, Facebook, Apple

**Session Management**:
- Sessions table is mandatory for Replit Auth
- 7-day session TTL
- HTTP-only secure cookies
- Session refresh mechanism

**Authorization Pattern**:
- Object-level ACL with owner/visibility model
- Permission-based access (READ/WRITE)
- Group-based access control support (extensible)

### Data Storage

**Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with TypeScript schema
- **Migration Strategy**: drizzle-kit for schema migrations
- **Connection**: WebSocket-based connection pooling

**Database Schema**:
- `sessions`: Session storage (mandatory for Replit Auth)
- `users`: User profiles with tier, usage tracking, monthly limits
- `documents`: Document metadata (filename, size, MIME type, storage path)
- `extractions`: Extraction results with confidence scores, template type

**Object Storage**: Google Cloud Storage via Replit sidecar
- External account authentication through Replit credential service
- File upload/download with ACL enforcement
- Public object search paths for unauthenticated access

**Key Database Patterns**:
- UUID primary keys
- Timestamps (createdAt, updatedAt) on all entities
- Foreign key relationships with cascading
- Usage tracking with monthly reset mechanism

### File Upload & Processing

**Upload Flow**:
1. Client requests signed upload URL from backend
2. Backend generates GCS signed URL
3. Client uploads directly to GCS using Uppy dashboard
4. Backend stores metadata in documents table
5. Processing job extracts data using AI
6. Results stored in extractions table

**File Storage**:
- Google Cloud Storage buckets
- ACL-based access control per object
- Metadata stored separately in PostgreSQL
- Support for private and public objects

### API Structure

**Authentication Endpoints**:
- `GET /api/auth/user` - Get current user
- `GET /api/login` - Initiate login (Replit Auth)
- `GET /api/logout` - Logout

**Document Processing**:
- `POST /api/extractions` - Process document extraction
- `GET /api/extractions` - List user's extractions
- `GET /api/documents` - List user's documents

**Object Storage**:
- `GET /objects/:objectPath` - Serve private objects with ACL check
- Public objects served through configured search paths

**Middleware Chain**:
1. Request logging
2. Body parsing (JSON/URL-encoded)
3. Session management
4. Authentication check
5. Route handlers
6. Error handling

### Internationalization (i18n)

**Implementation**: Custom React context-based i18n system
- Language state managed via Zustand
- Translation dictionary pattern with nested keys
- Language switcher component in layouts
- Date formatting with locale support (Buddhist calendar for Thai)
- Stored preference in localStorage

**Supported Languages**:
- English (en)
- Thai (th)

**Date Handling**:
- Buddhist calendar conversion for Thai (+543 years)
- Relative time formatting with locale
- date-fns with locale support

## External Dependencies

### Third-Party Services

**Replit Platform Services**:
- Replit Authentication (OIDC) - Mandatory authentication provider
- Replit Object Storage (GCS proxy) - File storage via sidecar
- Replit deployment infrastructure

**Database**:
- Neon PostgreSQL - Serverless Postgres with WebSocket connections
- Connection pooling via @neondatabase/serverless

**AI/ML Services** (designed for future implementation):
- Document extraction AI service (not yet implemented)
- OCR and structured data extraction

### NPM Packages

**Core Runtime**:
- express: Web server framework
- passport: Authentication middleware
- openid-client: OIDC authentication

**Database & ORM**:
- drizzle-orm: TypeScript ORM
- @neondatabase/serverless: Neon database client
- connect-pg-simple: PostgreSQL session store

**File Upload**:
- @uppy/core, @uppy/dashboard, @uppy/aws-s3, @uppy/react: File upload UI
- @google-cloud/storage: GCS client
- multer: Multipart form data handling

**Frontend Libraries**:
- react, react-dom: UI framework
- wouter: Lightweight routing
- @tanstack/react-query: Server state management
- framer-motion: Animation library
- @radix-ui/*: Headless UI components (20+ packages)
- tailwindcss: Utility-first CSS
- react-hook-form: Form handling
- zod: Schema validation
- date-fns: Date formatting

**Development Tools**:
- vite: Build tool and dev server
- typescript: Type system
- tsx: TypeScript execution
- esbuild: JavaScript bundler
- drizzle-kit: Database migrations

**Monitoring & Developer Experience**:
- @replit/vite-plugin-runtime-error-modal: Error overlay
- @replit/vite-plugin-cartographer: Development tooling
- @replit/vite-plugin-dev-banner: Development banner

### Environment Configuration

**Required Environment Variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `ISSUER_URL`: OIDC issuer URL (Replit)
- `REPL_ID`: Replit repl identifier
- `PRIVATE_OBJECT_DIR`: Object storage directory for private uploads (e.g., `/docextract-storage/private`)
- `PUBLIC_OBJECT_SEARCH_PATHS`: Comma-separated public object paths (e.g., `/docextract-storage/public`)

**Optional Environment Variables**:
- `NODE_ENV`: Environment (development/production)

## Recent Changes

**November 28, 2024** - Completed Replit Integration
- Integrated Replit Auth with OpenID Connect for user authentication
- Set up PostgreSQL database with users, sessions, documents, and extractions tables
- Integrated Replit App Storage (Object Storage) with ACL framework for protected file uploads
- Migrated frontend from mock authentication to real Replit Auth hooks
- Configured PRIVATE_OBJECT_DIR and PUBLIC_OBJECT_SEARCH_PATHS environment variables
- Removed obsolete mock-auth.tsx file