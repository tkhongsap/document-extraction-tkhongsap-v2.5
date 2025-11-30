# LlamaExtract Implementation Plan

## Executive Summary

You currently have LlamaParse implemented for "New Extraction" (general/unstructured document parsing). This plan details how to implement LlamaExtract for four structured document types:
1. **Bank Statement** - Extract transactions, balances, and account details
2. **Invoice** - Extract vendor, line items, taxes, and totals
3. **Purchase Order** - Extract vendor, items ordered, quantities, prices
4. **Contract** - Extract key terms, parties, dates, and critical clauses

## Key Differences: LlamaParse vs LlamaExtract

| Aspect | LlamaParse | LlamaExtract |
|--------|-----------|--------------|
| **Purpose** | Unstructured document parsing to markdown/text | Structured data extraction with defined schema |
| **Output** | Full document text/markdown representation | Schema-compliant JSON fields only |
| **Use Case** | "Parse everything" approach | "Extract what I specifically need" approach |
| **API Flow** | Upload → Poll status → Get parsed content | Upload file → Create/use agent with schema → Run job → Poll → Get results |
| **Schema Required** | No | Yes (JSON Schema or Pydantic) |

## API Workflow Overview

LlamaExtract follows a 5-step process:

```
1. Define extraction agent (schema + config)
   └─ Can reuse existing agents by name/ID
   
2. Upload document file
   └─ Returns file_id
   
3. Create extraction job
   └─ Uses agent_id + file_id
   └─ Returns job_id
   
4. Poll job status
   └─ Check every 2-3 seconds
   └─ Wait for SUCCESS/ERROR status
   
5. Retrieve results
   └─ GET /api/v1/extraction/jobs/{job_id}/result
   └─ Returns extracted data matching schema
```

## Proposed Schemas for Each Document Type

### 1. Bank Statement Schema

**Purpose**: Extract transactions, account details, and balances

```json
{
  "type": "object",
  "properties": {
    "accountHolder": {
      "type": "string",
      "description": "Name of the account holder"
    },
    "accountNumber": {
      "type": "string",
      "description": "Bank account number (may be partially masked)"
    },
    "bankName": {
      "type": "string",
      "description": "Name of the financial institution"
    },
    "statementPeriod": {
      "type": "object",
      "properties": {
        "startDate": {
          "type": "string",
          "description": "Statement start date (YYYY-MM-DD format)"
        },
        "endDate": {
          "type": "string",
          "description": "Statement end date (YYYY-MM-DD format)"
        }
      }
    },
    "openingBalance": {
      "type": "number",
      "description": "Opening balance at start of period"
    },
    "closingBalance": {
      "type": "number",
      "description": "Closing balance at end of period"
    },
    "transactions": {
      "type": "array",
      "description": "List of all transactions",
      "items": {
        "type": "object",
        "properties": {
          "date": {
            "type": "string",
            "description": "Transaction date (YYYY-MM-DD)"
          },
          "description": {
            "type": "string",
            "description": "Transaction description/merchant name"
          },
          "debit": {
            "anyOf": [{"type": "number"}, {"type": "null"}],
            "description": "Amount debited (null if credit)"
          },
          "credit": {
            "anyOf": [{"type": "number"}, {"type": "null"}],
            "description": "Amount credited (null if debit)"
          },
          "balance": {
            "type": "number",
            "description": "Running balance after transaction"
          }
        }
      }
    },
    "totalDebits": {
      "type": "number",
      "description": "Sum of all debits"
    },
    "totalCredits": {
      "type": "number",
      "description": "Sum of all credits"
    }
  },
  "required": ["accountHolder", "accountNumber", "bankName", "statementPeriod", "closingBalance", "transactions"]
}
```

### 2. Invoice Schema

**Purpose**: Extract invoice details, line items, taxes, and totals

```json
{
  "type": "object",
  "properties": {
    "invoiceNumber": {
      "type": "string",
      "description": "Unique invoice identifier"
    },
    "invoiceDate": {
      "type": "string",
      "description": "Invoice date (YYYY-MM-DD format)"
    },
    "dueDate": {
      "type": "string",
      "description": "Payment due date (YYYY-MM-DD format)"
    },
    "vendor": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Vendor/supplier company name"
        },
        "address": {
          "type": "string",
          "description": "Vendor address"
        },
        "taxId": {
          "anyOf": [{"type": "string"}, {"type": "null"}],
          "description": "Vendor tax ID or registration number"
        }
      }
    },
    "billTo": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Customer/bill-to name"
        },
        "address": {
          "type": "string",
          "description": "Bill-to address"
        }
      }
    },
    "lineItems": {
      "type": "array",
      "description": "List of items/services invoiced",
      "items": {
        "type": "object",
        "properties": {
          "description": {
            "type": "string",
            "description": "Item or service description"
          },
          "quantity": {
            "type": "number",
            "description": "Quantity ordered"
          },
          "unitPrice": {
            "type": "number",
            "description": "Price per unit"
          },
          "amount": {
            "type": "number",
            "description": "Total amount (quantity × unitPrice)"
          }
        }
      }
    },
    "subtotal": {
      "type": "number",
      "description": "Subtotal before taxes"
    },
    "taxAmount": {
      "type": "number",
      "description": "Total tax amount"
    },
    "taxRate": {
      "anyOf": [{"type": "number"}, {"type": "null"}],
      "description": "Tax rate percentage (e.g., 8.5 for 8.5%)"
    },
    "shippingCost": {
      "anyOf": [{"type": "number"}, {"type": "null"}],
      "description": "Shipping or delivery cost"
    },
    "totalAmount": {
      "type": "number",
      "description": "Final invoice total (subtotal + tax + shipping)"
    },
    "currency": {
      "type": "string",
      "description": "Currency code (e.g., USD, EUR, GBP)"
    },
    "paymentTerms": {
      "anyOf": [{"type": "string"}, {"type": "null"}],
      "description": "Payment terms (e.g., Net 30, 2/10 Net 30)"
    }
  },
  "required": ["invoiceNumber", "invoiceDate", "vendor", "lineItems", "subtotal", "totalAmount"]
}
```

### 3. Purchase Order Schema

**Purpose**: Extract PO details, vendor info, ordered items, and totals

```json
{
  "type": "object",
  "properties": {
    "poNumber": {
      "type": "string",
      "description": "Purchase order number"
    },
    "poDate": {
      "type": "string",
      "description": "PO creation date (YYYY-MM-DD)"
    },
    "vendor": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Vendor company name"
        },
        "contactPerson": {
          "anyOf": [{"type": "string"}, {"type": "null"}],
          "description": "Contact person at vendor"
        },
        "address": {
          "type": "string",
          "description": "Vendor address"
        },
        "phone": {
          "anyOf": [{"type": "string"}, {"type": "null"}],
          "description": "Vendor phone number"
        }
      }
    },
    "shipTo": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Shipping recipient name"
        },
        "address": {
          "type": "string",
          "description": "Shipping address"
        }
      }
    },
    "expectedDeliveryDate": {
      "anyOf": [{"type": "string"}, {"type": "null"}],
      "description": "Expected delivery date (YYYY-MM-DD)"
    },
    "items": {
      "type": "array",
      "description": "Ordered items",
      "items": {
        "type": "object",
        "properties": {
          "itemNumber": {
            "anyOf": [{"type": "string"}, {"type": "null"}],
            "description": "SKU or item number"
          },
          "description": {
            "type": "string",
            "description": "Item description"
          },
          "quantity": {
            "type": "number",
            "description": "Quantity ordered"
          },
          "unit": {
            "anyOf": [{"type": "string"}, {"type": "null"}],
            "description": "Unit of measure (e.g., pieces, cases, boxes)"
          },
          "unitPrice": {
            "type": "number",
            "description": "Price per unit"
          },
          "amount": {
            "type": "number",
            "description": "Total line amount (quantity × unitPrice)"
          }
        }
      }
    },
    "subtotal": {
      "type": "number",
      "description": "Subtotal before tax/shipping"
    },
    "shippingCost": {
      "anyOf": [{"type": "number"}, {"type": "null"}],
      "description": "Shipping cost"
    },
    "taxAmount": {
      "anyOf": [{"type": "number"}, {"type": "null"}],
      "description": "Tax amount"
    },
    "totalAmount": {
      "type": "number",
      "description": "Total PO amount"
    },
    "paymentTerms": {
      "anyOf": [{"type": "string"}, {"type": "null"}],
      "description": "Payment terms (e.g., Net 30, COD)"
    },
    "specialInstructions": {
      "anyOf": [{"type": "string"}, {"type": "null"}],
      "description": "Any special delivery or handling instructions"
    }
  },
  "required": ["poNumber", "poDate", "vendor", "items", "totalAmount"]
}
```

### 4. Contract Schema

**Purpose**: Extract key contract information, parties, dates, and critical terms

```json
{
  "type": "object",
  "properties": {
    "contractTitle": {
      "type": "string",
      "description": "Title or name of the contract"
    },
    "contractType": {
      "anyOf": [{"type": "string"}, {"type": "null"}],
      "description": "Type of contract (e.g., Service Agreement, NDA, License Agreement)"
    },
    "executionDate": {
      "anyOf": [{"type": "string"}, {"type": "null"}],
      "description": "Date contract was signed (YYYY-MM-DD)"
    },
    "effectiveDate": {
      "type": "string",
      "description": "Date contract becomes effective (YYYY-MM-DD)"
    },
    "expirationDate": {
      "anyOf": [{"type": "string"}, {"type": "null"}],
      "description": "Contract expiration or end date (YYYY-MM-DD)"
    },
    "parties": {
      "type": "array",
      "description": "Parties to the contract",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of party (individual or organization)"
          },
          "role": {
            "type": "string",
            "description": "Role in contract (e.g., Service Provider, Client, Licensor)"
          },
          "address": {
            "anyOf": [{"type": "string"}, {"type": "null"}],
            "description": "Address of party"
          }
        }
      }
    },
    "scope": {
      "anyOf": [{"type": "string"}, {"type": "null"}],
      "description": "Summary of what the contract covers or services to be provided"
    },
    "keyTerms": {
      "type": "array",
      "description": "Critical contract terms and conditions",
      "items": {
        "type": "object",
        "properties": {
          "term": {
            "type": "string",
            "description": "Name of the term"
          },
          "value": {
            "type": "string",
            "description": "Value or description of the term"
          }
        }
      }
    },
    "paymentTerms": {
      "anyOf": [{"type": "string"}, {"type": "null"}],
      "description": "Payment terms, fees, or financial obligations"
    },
    "confidentialityClause": {
      "anyOf": [{"type": "boolean"}, {"type": "null"}],
      "description": "Whether contract includes confidentiality/NDA clause"
    },
    "terminationClause": {
      "anyOf": [{"type": "string"}, {"type": "null"}],
      "description": "Terms under which contract can be terminated"
    },
    "liabilityLimitations": {
      "anyOf": [{"type": "string"}, {"type": "null"}],
      "description": "Limitations on liability (e.g., cap on damages)"
    },
    "governingLaw": {
      "anyOf": [{"type": "string"}, {"type": "null"}],
      "description": "Jurisdiction or governing law"
    },
    "signatories": {
      "type": "array",
      "description": "Who signed the contract",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Signatory name"
          },
          "title": {
            "anyOf": [{"type": "string"}, {"type": "null"}],
            "description": "Signatory's title or role"
          },
          "date": {
            "anyOf": [{"type": "string"}, {"type": "null"}],
            "description": "Signature date (YYYY-MM-DD)"
          }
        }
      }
    }
  },
  "required": ["contractTitle", "effectiveDate", "parties"]
}
```

## Implementation Architecture

### Backend Structure

```
server/
├── llamaExtract.ts (NEW)
│   ├── LlamaExtractService class
│   ├── Manage extraction agents
│   ├── Handle file uploads
│   ├── Create and poll extraction jobs
│   └── Retrieve structured results
├── llamaParse.ts (EXISTING)
│   └── Keep for 'general' extraction type
└── routes.ts (MODIFY)
    ├── POST /api/extract/general (existing - LlamaParse)
    ├── POST /api/extract/bank-statement (NEW - LlamaExtract)
    ├── POST /api/extract/invoice (NEW - LlamaExtract)
    ├── POST /api/extract/purchase-order (NEW - LlamaExtract)
    └── POST /api/extract/contract (NEW - LlamaExtract)
```

### Frontend Flow (Reuse Existing Pattern)

The frontend can remain largely the same:
- One `extraction.tsx` page handles all types
- Conditional logic: `if (type === 'general')` → LlamaParse, else → LlamaExtract
- Same file upload UI/UX for all types
- Different result display formats:
  - `general` → MarkdownViewer (full document text)
  - `bank-statement`, `invoice`, `po`, `contract` → Structured table/card view

### Data Flow Comparison

**Current (LlamaParse - General):**
```
File Upload 
  → POST /api/extract/general 
  → LlamaParseService.parseDocument() 
  → Returns markdown + text 
  → Display in MarkdownViewer
```

**Proposed (LlamaExtract - Structured):**
```
File Upload 
  → POST /api/extract/{type} 
  → LlamaExtractService.extractData() 
    ├─ Check if agent exists (or create)
    ├─ Upload file to LlamaCloud
    ├─ Create extraction job with schema
    ├─ Poll job status
    └─ Retrieve structured JSON
  → Return structured data 
  → Display in structured format (table/cards)
```

## Implementation Approach

### Phase 1: Backend - LlamaExtract Service
1. Create `server/llamaExtract.ts` with:
   - Agent creation/caching (create once, reuse by ID)
   - File upload handling
   - Job creation and polling
   - Result retrieval with proper error handling
   - Support for all 4 extraction types

2. Define extraction agent configurations with schemas for:
   - `bank-statement`
   - `invoice`
   - `purchase-order`
   - `contract`

### Phase 2: Backend - Routes
1. Add 4 new endpoints in `server/routes.ts`:
   - `POST /api/extract/bank-statement`
   - `POST /api/extract/invoice`
   - `POST /api/extract/purchase-order`
   - `POST /api/extract/contract`

2. Each endpoint:
   - Validates file upload
   - Calls LlamaExtractService
   - Returns structured JSON matching schema
   - Saves extraction to database

### Phase 3: Frontend - API Client
1. Update `client/src/lib/api.ts`:
   - Add `processStructuredExtraction(file, type)` function
   - Define response types for each extraction type
   - Reuse existing save patterns

### Phase 4: Frontend - UI Updates
1. Modify `client/src/pages/extraction.tsx`:
   - Route `type='general'` → LlamaParse
   - Route `type='bank-statement'|'invoice'|'po'|'contract'` → LlamaExtract
   - Display structured results appropriately

## Key Considerations

### Agent Caching Strategy
- Create extraction agents once per document type
- Store agent IDs in environment variables or constants
- Reuse agents for multiple extraction jobs (more efficient)
- Alternatively, create agents on-demand and cache responses

### Error Handling
- Handle job timeouts (default poll: 30+ seconds)
- Retry logic for transient failures
- Graceful degradation if extraction fails
- Clear error messages to frontend

### Schema Iterations
- Schemas above are **starting points** - iterate based on test results
- If extraction quality is low, add more description detail
- If model hallucinates, make fields optional
- Use LlamaCloud UI to test schemas before backend integration

### Monthly Usage Tracking
- Current system tracks by page count (LlamaParse)
- LlamaExtract doesn't have "pages" - may need adjustment
- Consider: 1 extraction job = 1 page (simplest) or actual page count
- Update `User.monthlyUsage` logic accordingly

### Response Format Strategy

**For General (LlamaParse):**
```typescript
{
  markdown: string,
  text: string,
  pageCount: number,
  pages: Array<{...}>
}
```

**For Structured (LlamaExtract):**
```typescript
{
  extractedData: {
    [field1]: value1,
    [field2]: value2,
    ...
  },
  confidence?: number,
  extractionTime: number
}
```

## Testing & Validation Steps

1. **Schema Validation**: Test each schema on sample documents
2. **Accuracy Check**: Verify extracted values match expected results
3. **Edge Cases**: Try documents with missing fields, different formats
4. **Performance**: Measure extraction time per document type
5. **Error Handling**: Test with corrupted/invalid files
6. **Frontend**: Ensure results display properly for each type

## Next Steps to Code

When ready to implement:
1. Start with `server/llamaExtract.ts` (most complex)
2. Add routes in `server/routes.ts` for each document type
3. Update API client in `client/src/lib/api.ts`
4. Modify frontend component `client/src/pages/extraction.tsx`
5. Test with real documents for each type

---

## Resource Links for Reference

- **LlamaExtract Docs**: https://developers.llamaindex.ai/python/cloud/llamaextract/getting_started/
- **Schema Design Guide**: https://developers.llamaindex.ai/python/cloud/llamaextract/features/schema_design/
- **REST API Reference**: https://developers.llamaindex.ai/python/cloud/llamaextract/getting_started/api/
