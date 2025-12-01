# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A bilingual (EN/TH) document extraction platform that extracts structured data from documents using AI-powered templates. Users can upload documents and extract data in predefined templates (Bank Statement, Invoice, Purchase Order, Contract) or use general extraction for any document type.

## Key Architecture

### Core Extraction System

The platform uses **LlamaExtract API** (from LlamaCloud) for structured data extraction. The extraction flow is:

1. User uploads document → `ObjectStorageService` stores in Google Cloud Storage
2. Document sent to LlamaExtract API with template schema (`extractionSchemas.ts`)
3. Extraction processed asynchronously (job-based polling)
4. Results separated into header fields (document-level metadata) and line items (repeating arrays)
5. Results displayed in `StructuredResultsViewer.tsx` with confidence scores

**Key Files:**
- `server/llamaExtract.ts` - LlamaExtract service with job polling and result formatting
- `server/extractionSchemas.ts` - JSON schemas for 4 templates (bank, invoice, po, contract)
- `client/src/components/StructuredResultsViewer.tsx` - Displays extracted data in header/line item tables

### Template Structure

Each template has two field types:
- **Header Fields** - Document-level metadata shown in vertical table format
- **Line Items** - Repeating array data shown in horizontal tables below headers

Templates defined in `extractionSchemas.ts`:

| Template | Array Key | Header Fields | Line Item Fields | Notes |
|----------|-----------|---------------|------------------|-------|
| `bank` | `transactions` | 10 | 6 | Debit/credit/balance tracking |
| `invoice` | `line_items` | 14 | 4 | Most minimal line items |
| `po` | `line_items` | 11 | 5 | Includes `item_code` |
| `contract` | `parties` | 10 | 3 | Non-financial array (entities) |

### Data Flow

```
User → Document Upload → Object Storage (GCS)
                        ↓
                   LlamaExtract Job
                        ↓
                   Poll Job Status
                        ↓
                   Fetch Results
                        ↓
         Parse & Separate Header/Line Items
                        ↓
              Database Storage + Frontend Display
```

### Authentication & User Management

- **Replit Auth** with social login (LINE, Google, Facebook, Apple)
- **Freemium Model**: Free tier (100 pages/month), Pro tier (1,000 pages/month)
- User tier and monthly usage tracked in `users` table
- Session storage via `connect-pg-simple` + PostgreSQL

### Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Radix UI, TanStack Query, Zustand
- **Backend:** Express.js, Node.js, Passport.js
- **Database:** PostgreSQL with Drizzle ORM
- **File Storage:** Google Cloud Storage
- **Extraction:** LlamaCloud LlamaExtract API
- **Document Parsing:** LlamaParse (for unstructured extraction)
- **Export Formats:** JSON, CSV, Excel

## Development Commands

**Prerequisites:** Node.js 20+, PostgreSQL database

```bash
# Install dependencies
npm install

# Development (both client and server)
npm run dev:client   # React dev server (port 5000)
npm run dev          # Express backend

# Build
npm run build        # Full build (TypeScript check + bundle)
npm run check        # TypeScript type check only

# Database
npm run db:push      # Push schema changes to PostgreSQL
```

## Project Structure

```
├── client/              # React frontend
│   └── src/components/  # UI components (StructuredResultsViewer, ObjectUploader, etc)
├── server/              # Express backend
│   ├── extractionSchemas.ts    # Template schemas (bank, invoice, po, contract)
│   ├── llamaExtract.ts         # LlamaExtract API integration
│   ├── llamaParse.ts           # LlamaParse API integration (general extraction)
│   ├── objectStorage.ts        # Google Cloud Storage service
│   ├── routes.ts               # API endpoints
│   ├── db.ts                   # Drizzle ORM setup
│   └── replitAuth.ts           # Authentication setup
├── shared/              # Shared types
│   └── schema.ts        # Database schema (Drizzle), user/document tables
├── script/              # Build scripts
│   └── build.ts         # TypeScript build orchestration
└── attached_assets/     # Design documents and reference assets
```

## Key Extraction Endpoints

- `POST /api/extract` - Submit document for template-based extraction
- `GET /api/extraction/:id` - Poll extraction status/results
- `GET /api/extractions` - List user's extractions
- `POST /api/extract/general` - General (unstructured) extraction

## Important Implementation Notes

### Extraction Result Formatting

Results from LlamaExtract contain all data. The backend (`llamaExtract.ts`) separates them:
- **Header fields** - Non-array top-level fields
- **Line items** - Arrays from template schema (transactions, line_items, parties, etc)

Frontend displays these separately via `StructuredResultsViewer.tsx` which renders:
1. Vertical table for header fields (Field | Value | Confidence)
2. Horizontal table for line items below

### Schema Definitions

All extraction schemas in `extractionSchemas.ts` use:
- `extraction_mode: "MULTIMODAL"` - Processes both text and images
- `extraction_target: "PER_DOC"` - One extraction result per document
- Consistent field naming across templates for backend consistency

### Document Upload Flow

- Files stored in memory via multer then uploaded to Google Cloud Storage
- Document metadata tracked in `documents` table
- GCS paths follow pattern: `extractions/{userId}/{extractionId}/{filename}`
- ACL permissions managed via `objectAcl.ts`

## Development Tips

1. **Testing extraction locally** - Use mock LlamaExtract responses or set up test API keys in `.env`
2. **Schema changes** - Update `extractionSchemas.ts` and test both backend formatting and frontend display
3. **Adding new templates** - Define schema in `extractionSchemas.ts`, add display logic in `StructuredResultsViewer.tsx`
4. **Database migrations** - Run `npm run db:push` after schema changes in `shared/schema.ts`
