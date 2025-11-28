# LlamaExtract Core Concepts

**Source:** https://developers.llamaindex.ai/python/cloud/llamaextract/features/concepts/

## Overview

LlamaExtract operates around several foundational components that work together to enable structured data extraction:

- **Extraction Agents**: Reusable extractors configured with a schema and settings
- **Data Schema**: Structured JSON/Pydantic definitions for target data
- **Extraction Target**: Determines extraction scope and result granularity
- **Extraction Jobs**: Asynchronous extraction tasks on file sets
- **Extraction Runs**: Results including extracted data and metadata

## Data Schema

The data schema functions as a JSON Schema specification that outlines "the fields, types, and descriptions for the information you need." While fundamentally JSON Schema-based, the Python SDK supports Pydantic models for enhanced type validation and IDE integration.

For detailed guidance on effective schema creation, consult the Schema Design and Restrictions documentation covering best practices and limitations.

## Extraction Target

The extraction target defines how your schema applies to documents and what result granularity you receive. Three modes are available:

**PER_DOC (Default)**
- Applies schema to entire document as single unit
- Returns one JSON object matching schema
- Best for summary extraction from contracts, reports, or papers

**PER_PAGE**
- Applies schema independently to each page
- Returns array of objects, one per page
- Ideal for multi-page forms where each page represents different entities

**PER_TABLE_ROW**
- Applies schema to each identified entity/row
- Returns array of objects, one per entity
- Suitable for invoice line items, employee directories, or repeating structured data
- Requires document formatting distinguishing entities (tables, bullets, headers, etc.)
