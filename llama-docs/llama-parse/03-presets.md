# LlamaParse Modes and Presets

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/presets_and_modes/presets/

## Overview
LlamaParse provides multiple parsing configurations to suit different document types and accuracy requirements. Users can choose between general modes or specialized presets based on their specific needs.

## Primary Parsing Modes

### Cost-Effective Mode
This option targets everyday documents containing mixed content (images, tables, text). According to the documentation, it is "designed for more standard documents, with simple layouts" and handles "huge batch of documents when the output accuracy isn't critical."

**Configuration parameters:**
- `parse_mode="parse_page_with_llm"`
- `high_res_ocr=True`
- `adaptive_long_table=True`
- `outlined_table_extraction=True`
- `output_tables_as_HTML=True`

### Agentic Mode
This mode balances quality and cost for documents with diagrams and images. The system performs optical character recognition, extracts images, identifies structural elements like tables and headings, outputs equations in LaTeX format, and converts diagrams into Mermaid syntax.

**Configuration parameters:**
- `parse_mode="parse_page_with_agent"`
- `model="openai-gpt-4-1-mini"`
- Same additional settings as cost-effective mode

### Agentic Plus Mode
Designed for complex, highly formatted documents such as financial reports and research papers. This represents the most capable option, combining "all the capabilities of Agentic mode with enhanced processing power and a better model."

**Configuration parameters:**
- `parse_mode="parse_page_with_agent"`
- `model="anthropic-sonnet-4.0"`
- Same additional settings as other modes

## Specialized Presets

LlamaParse offers versioned presets for specific document types:

- **Invoices:** `preset="invoice"` (current version: invoice-v-1)
- **Scientific Papers:** `preset="scientific"` (current version: scientific-v-1)
- **Technical Documentation:** `preset="technicalDocumentation"` (outputs schematics in XML format)
- **Forms:** `preset="forms"` (current version: forms-v-1; outputs field data in table format)

Users can access the latest version using the `-latest` flag or omit the flag to receive the default current version.
