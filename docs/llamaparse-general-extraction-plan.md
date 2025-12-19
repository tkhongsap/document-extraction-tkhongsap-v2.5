# LlamaParse Integration for General Extraction

## Scope

**This plan covers**: "New Extraction" feature only (route: `/extraction/general`)

**NOT in scope**: Template-based extractions (Bank Statement, Invoice, Purchase Order, Contract) - these will use a different methodology (e.g., LlamaExtract with structured schemas) in a future implementation

---

## Implementation Approach

**Conditional Logic in Existing Component**: We will add conditional logic to the existing `client/src/pages/extraction.tsx` rather than creating separate pages. When `type === 'general'`, we use LlamaParse; otherwise, the existing mock behavior continues (to be replaced with LlamaExtract later).

```typescript
// Pseudocode for the conditional approach
if (type === 'general') {
  response = await processWithLlamaParse(file);  // Real parsing
} else {
  response = await processExtraction({ fileName, documentType: type });  // Existing mock
}
```

---

## Phase 1: Backend - LlamaParse Integration

### 1.1 Create LlamaParse Service
- Create `server/llamaParse.ts` with LlamaParse API client
- Use `LLAMA_CLOUD_API_KEY` from environment
- Implement `parseDocument(fileBuffer, fileName)` function
- Return parsed markdown/text content

### 1.2 Create General Extraction Endpoint
- Add new route `POST /api/extract/general` in `server/routes.ts`
- Accept multipart file upload (actual file, not just metadata)
- Call LlamaParse service to parse document
- Return parsed content with page count

---

## Phase 2: Frontend - Upload and Processing Flow

### 2.1 Update API Client
- Add `processGeneralExtraction(file: File)` function in `client/src/lib/api.ts`
- Handle multipart/form-data file upload
- Return parsed results

### 2.2 Update Extraction Page with Conditional Logic
- Modify `client/src/pages/extraction.tsx`
- Add conditional check: if `type === 'general'`, upload actual file to LlamaParse endpoint
- For other types (bank, invoice, etc.), keep existing mock behavior
- Show appropriate loading states and progress indicators

---

## Phase 3: Results Display

### 3.1 Display Parsed Content
- For general extraction: Display raw parsed markdown/text
- Add markdown renderer for formatted output
- Keep existing editable table for key-value pairs if applicable

### 3.2 Export Options
- JSON export of parsed content
- Copy to clipboard functionality

---

## Key Files to Modify

| File | Changes |
|------|---------|
| `server/llamaParse.ts` | New - LlamaParse API service |
| `server/routes.ts` | Add `/api/extract/general` endpoint |
| `client/src/lib/api.ts` | Add `processGeneralExtraction()` function |
| `client/src/pages/extraction.tsx` | Add conditional logic for general vs template types |

---

## Environment Variables Required

- `LLAMA_CLOUD_API_KEY` - API key for LlamaParse (already may exist)

---

## Implementation Checklist

- [ ] Create `server/llamaParse.ts` with LlamaParse API client
- [ ] Add `POST /api/extract/general` endpoint in `server/routes.ts`
- [ ] Add `processGeneralExtraction()` function in `client/src/lib/api.ts`
- [ ] Update `extraction.tsx` with conditional logic for `type='general'`
- [ ] Display parsed markdown content with export options

