# LlamaParse Structured Output

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/features/structured_output/

## Overview

The Structured Output feature (currently in Beta) enables extraction of JSON data directly during the parsing phase, reducing both processing time and costs.

## Key Capabilities

**Activation**: Set `structured_output=True` in the API to enable this feature. It currently works exclusively with the default parsing mode.

**Schema Requirements**: You must provide either:
- A custom JSON schema via `structured_output_json_schema`
- A pre-defined schema name using `structured_output_json_schema_name`

## Pre-defined Schemas

### 1. imFeelingLucky
A wildcard schema allowing LlamaParse to infer the optimal output format automatically.

### 2. Invoice Schema
A comprehensive invoice template supporting:
- Invoice metadata (number, dates)
- Billing and shipping addresses
- Line items with pricing details
- Tax calculations and totals
- Payment status tracking (Paid, Unpaid, Overdue)

### 3. Resume Schema
Based on the JSON Resume standard, encompassing:
- Personal basics and contact information
- Work history and volunteer experience
- Education credentials
- Awards and certifications
- Publications and professional skills
- Languages, interests, and references
- Project portfolios

## Implementation

**Python Example**:
```python
parser = LlamaParse(
    structured_output=True,
    structured_output_json_schema_name="invoice"
)
```

**API Endpoint**: `https://api.cloud.llamaindex.ai/api/v1/parsing/upload`

## Important Note

⚠️ **Deprecation Alert**: The structured output feature on LlamaParse is being phased out in favor of the LlamaExtract API for future data extraction tasks.
