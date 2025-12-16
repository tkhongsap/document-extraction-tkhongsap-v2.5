# Document AI Extractor v2.5

A bilingual (EN/TH) document extraction platform enabling users to extract structured data from documents using pre-built templates or a general extraction option, with a freemium pricing model.

## Features

- **Document Extraction**: Extract structured data from documents using AI (LlamaParse & LlamaExtract)
- **Pre-built Templates**: Bank Statements, Invoices, Purchase Orders, Contracts
- **General Extraction**: For any document type without a predefined template
- **Bilingual Support**: Full English and Thai language support
- **Freemium Model**: Free tier (100 pages/month) and Pro tier (1,000 pages/month)
- **Export Options**: JSON, CSV, Excel formats

## Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Radix UI
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Animations**: Framer Motion

### Backend
- **Framework**: Python FastAPI
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: SQLAlchemy + aiosqlite
- **Authentication**: Session-based auth with Starlette SessionMiddleware
- **AI Services**: LlamaParse, LlamaExtract API

## Getting Started

### Prerequisites

- **Python 3.10+** with pip or conda
- **Node.js 20+** with npm
- **LlamaCloud API Key** (for document extraction)

### Installation

#### 1. Clone the repository

```bash
git clone <repository-url>
cd document-ai-extractor-v2.5
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (choose one)
python -m venv venv
# OR with conda
conda create -n eureka python=3.10
conda activate eureka

# Activate virtual environment (Windows)
.\venv\Scripts\activate
# OR (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration
```

#### 3. Frontend Setup

```bash
# From project root
npm install
```

### Environment Variables

Create `backend/.env` file:

```env
# Database
DATABASE_URL=sqlite+aiosqlite:///./dev.db

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-key-change-this

# LlamaCloud API
LLAMA_CLOUD_API_KEY=your-llama-cloud-api-key

# Server
PORT=8000
HOST=0.0.0.0

# Optional: Object Storage (GCS)
GCS_BUCKET_NAME=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

### Running the Application

#### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
conda activate eureka  # or activate your venv
python main.py
# Server runs at http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Frontend runs at http://localhost:5173
```

#### Access the Application

Open your browser and navigate to: **http://localhost:5173**

### Demo Accounts

For development and testing, use these mock accounts:

| Username | Password | User ID |
|----------|----------|---------|
| admin | admin123 | 1 |
| demo | demo123 | 2 |
| test | test123 | 36691541 |

### Build for Production

```bash
# Build frontend
npm run build

# The backend serves the built frontend from client/dist
```

## Project Structure

```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and API client
│   └── public/             # Static assets
│
├── backend/                # Python FastAPI backend
│   ├── app/
│   │   ├── core/           # Core modules (config, database, logging)
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic services
│   │   ├── routes/         # API route handlers
│   │   └── utils/          # Utility functions
│   ├── main.py             # Application entry point
│   └── requirements.txt    # Python dependencies
│
├── shared/                 # Shared types and schemas
├── docs/                   # Documentation
├── llama-docs/             # LlamaParse/LlamaExtract documentation
└── ai-specs/               # AI extraction specifications
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/logout` - Logout current session
- `GET /api/auth/user` - Get current user info
- `GET /api/auth/me` - Get current user (alias)
- `GET /api/auth/session` - Get session info

### Extractions
- `GET /api/extractions` - List all extractions
- `POST /api/extractions` - Create new extraction
- `GET /api/extractions/:id` - Get extraction by ID
- `DELETE /api/extractions/:id` - Delete extraction

### Objects (File Storage)
- `POST /api/objects/upload` - Upload file
- `GET /api/objects/:key` - Get file by key
- `DELETE /api/objects/:key` - Delete file

## Extraction Templates

The platform supports four pre-built extraction templates, each designed to extract structured data from specific document types. Each template extracts two types of fields:

### Header Fields vs Line Item Fields

**Header Fields** are document-level metadata fields that appear once per document. They are displayed in a vertical table format (Field | Value | Confidence) and include information like document numbers, dates, parties, and totals.

**Line Item Fields** are repeating array data that appear multiple times per document. They are displayed in a separate horizontal table below the header fields, with each row representing one item (transaction, line item, order item, or party).

### Bank Statement Template

Extracts account details, balances, and transaction history from bank statements.

#### Header Fields
- `bank_name` (string) - Name of the issuing bank or financial institution
- `account_number` (string) - Full bank account number
- `account_holder` (string) - Name of the account holder
- `statement_period.start_date` (string) - Statement period start date (YYYY-MM-DD)
- `statement_period.end_date` (string) - Statement period end date (YYYY-MM-DD)
- `currency` (string) - Currency code (e.g., THB, USD, EUR)
- `opening_balance` (number) - Opening balance at the start of the statement period
- `closing_balance` (number) - Closing balance at the end of the statement period
- `total_credits` (number) - Total amount of deposits/credits during the period
- `total_debits` (number) - Total amount of withdrawals/debits during the period

#### Transactions Table (Line Items)
Each transaction row contains:
- `date` (string) - Transaction date (YYYY-MM-DD)
- `description` (string) - Transaction description or memo
- `reference` (string) - Transaction reference number if available
- `debit` (number) - Debit/withdrawal amount (if applicable)
- `credit` (number) - Credit/deposit amount (if applicable)
- `balance` (number) - Running balance after transaction

### Invoice Template

Extracts vendor/customer info, line items, and totals from invoices.

#### Header Fields
- `invoice_number` (string) - Unique invoice number or ID
- `invoice_date` (string) - Invoice issue date (YYYY-MM-DD)
- `due_date` (string) - Payment due date (YYYY-MM-DD)
- `vendor.name` (string) - Vendor company or business name
- `vendor.address` (string) - Vendor full address
- `vendor.tax_id` (string) - Vendor tax ID or registration number
- `customer.name` (string) - Customer company or individual name
- `customer.address` (string) - Customer full address
- `customer.tax_id` (string) - Customer tax ID if available
- `subtotal` (number) - Subtotal before tax
- `tax_rate` (number) - Tax rate as a percentage (e.g., 7 for 7%)
- `tax_amount` (number) - Total tax amount
- `total_amount` (number) - Grand total including tax
- `payment_terms` (string) - Payment terms or conditions

#### Line Items Table (Line Items)
Each line item row contains:
- `description` (string) - Item or service description
- `quantity` (number) - Quantity of items
- `unit_price` (number) - Price per unit
- `amount` (number) - Total amount for this line item

### Purchase Order (PO) Template

Extracts buyer/supplier info, order items, and terms from purchase orders.

#### Header Fields
- `po_number` (string) - Purchase order number
- `po_date` (string) - Purchase order date (YYYY-MM-DD)
- `delivery_date` (string) - Expected delivery date (YYYY-MM-DD)
- `buyer.company_name` (string) - Buyer company name
- `buyer.address` (string) - Buyer address
- `buyer.contact_name` (string) - Buyer contact person name
- `supplier.name` (string) - Supplier company name
- `supplier.address` (string) - Supplier address
- `payment_terms` (string) - Payment terms (e.g., Net 30, COD)
- `shipping_method` (string) - Shipping or delivery method
- `total_amount` (number) - Total order amount

#### Order Items Table (Line Items)
Each order item row contains:
- `item_code` (string) - Item SKU or product code
- `description` (string) - Item description
- `quantity` (number) - Quantity ordered
- `unit_price` (number) - Price per unit
- `amount` (number) - Total amount for this line item

**Note**: The PO template is similar to the Invoice template but includes `item_code` for product identification.

### Contract Template

Extracts parties, dates, key clauses, and terms from contracts.

#### Header Fields
- `contract_title` (string) - Title or name of the contract
- `contract_number` (string) - Contract reference number if available
- `effective_date` (string) - Contract effective/start date (YYYY-MM-DD)
- `expiration_date` (string) - Contract expiration/end date (YYYY-MM-DD)
- `scope_of_work` (string) - Summary of the scope of work or services covered
- `payment_terms.total_value` (number) - Total contract value
- `payment_terms.currency` (string) - Currency for payment
- `payment_terms.payment_schedule` (string) - Payment schedule description
- `termination_clause` (string) - Summary of termination conditions
- `governing_law` (string) - Governing law or jurisdiction

#### Parties Table (Line Items)
Each party row contains:
- `name` (string) - Party name (company or individual)
- `role` (string) - Role in the contract (e.g., Buyer, Seller, Licensor)
- `address` (string) - Party address

**Note**: The contract schema also includes a `signatures` array in the backend, but it is excluded from the frontend display.

### Template Comparison Summary

| Template | Array Key | Display Title | Header Fields | Line Item Fields | Unique Characteristics |
|----------|-----------|---------------|---------------|------------------|----------------------|
| **Bank Statement** | `transactions` | Transactions | 10 | 6 | Only template with debit/credit/balance tracking |
| **Invoice** | `line_items` | Line Items | 14 | 4 | Most minimal line items structure |
| **Purchase Order** | `line_items` | Order Items | 11 | 5 | Includes `item_code` for product identification |
| **Contract** | `parties` | Parties | 10 | 3 | Only non-financial array (entities vs items) |

### Schema Implementation

All extraction schemas are defined in the backend services and displayed using [StructuredResultsViewer.tsx](client/src/components/StructuredResultsViewer.tsx). The backend separates header fields from line items during processing, and the frontend displays them in separate sections.

## Troubleshooting

### Common Issues

**1. Login not working**
- Ensure backend is running on port 8000
- Check that SESSION_SECRET is set in .env
- Verify Vite proxy is configured correctly

**2. Database errors**
- Delete `backend/dev.db` and restart backend to recreate tables
- Check DATABASE_URL in .env is correct

**3. Frontend 404 errors**
- Ensure you're accessing via http://localhost:5173 (not 8000)
- Check that the frontend dev server is running

**4. Extraction fails**
- Verify LLAMA_CLOUD_API_KEY is set correctly
- Check API quota on LlamaCloud dashboard

### Logs

Backend logs are stored in `backend/logs/` directory.

## Development Notes

### Adding New Routes

1. Create route file in `backend/app/routes/`
2. Add schemas in `backend/app/schemas/`
3. Register router in `backend/main.py`

### Database Migrations

Currently using auto-create on startup. For production, implement Alembic migrations.

## License

MIT

