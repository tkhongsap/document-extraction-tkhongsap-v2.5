# docs-extraction-tkhongsap

A bilingual (EN/TH) document extraction platform enabling users to extract structured data from documents using pre-built templates or a general extraction option, with a freemium pricing model.

## Features

- **Document Extraction**: Extract structured data from documents using AI
- **Pre-built Templates**: Bank Statements, Invoices, Purchase Orders, Contracts
- **General Extraction**: For any document type without a predefined template
- **Bilingual Support**: Full English and Thai language support
- **Freemium Model**: Free tier (100 pages/month) and Pro tier (1,000 pages/month)
- **Export Options**: JSON, CSV, Excel formats

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

All extraction schemas are defined in [`server/extractionSchemas.ts`](server/extractionSchemas.ts) and displayed using [`client/src/components/StructuredResultsViewer.tsx`](client/src/components/StructuredResultsViewer.tsx). The backend separates header fields from line items during processing, and the frontend displays them in separate sections.

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

