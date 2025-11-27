# docs-extraction-tkhongsap

A bilingual (EN/TH) document extraction platform enabling users to extract structured data from documents using pre-built templates or a general extraction option, with a freemium pricing model.

## Features

- **Document Extraction**: Extract structured data from documents using AI
- **Pre-built Templates**: Bank Statements, Invoices, Purchase Orders, Contracts
- **General Extraction**: For any document type without a predefined template
- **Bilingual Support**: Full English and Thai language support
- **Freemium Model**: Free tier (100 pages/month) and Pro tier (1,000 pages/month)
- **Export Options**: JSON, CSV, Excel formats

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Radix UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with social login support (LINE, Google, Facebook, Apple)
- **State Management**: Zustand, TanStack Query
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Environment variables configured (see `.env.example`)

### Installation

```bash
npm install
```

### Development

```bash
# Start client dev server
npm run dev:client

# Start server
npm run dev
```

### Build

```bash
npm run build
```

### Database

```bash
# Push schema changes
npm run db:push
```

## Project Structure

```
├── client/          # React frontend application
├── server/          # Express backend API
├── shared/          # Shared types and schemas
├── script/          # Build and utility scripts
└── attached_assets/ # Design documents and assets
```

## License

MIT

