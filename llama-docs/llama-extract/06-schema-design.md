# LlamaExtract Schema Design and Restrictions

**Source:** https://developers.llamaindex.ai/python/cloud/llamaextract/features/schema_design/

## Overview
LlamaExtract relies on schemas to define the structure of data extraction from documents. The system supports a limited subset of JSON Schema specification, which is still adequate for diverse extraction scenarios.

## Schema Restrictions

LlamaExtract imposes several constraints on schema definitions:

**Field Optionality:**
- "Optional fields can be marked by excluding them from the `required` array or using `anyOf` with a `null` type"
- When using Python's Pydantic, employ the `Optional` annotation

**Structural Limitations:**
- Root nodes must be object types
- Maximum nesting depth is 7 levels
- Only key names, types, and descriptions are truly supported; formatting and default values are excluded

**Complexity Constraints:**
- Restrictions exist on the number of keys and overall schema size
- Complex extraction may require restructuring workflows to fit within constraints

## Best Practices

**Schema Design:**
- Limit nesting to 3-4 levels for optimal performance
- Use optional fields when data presence is uncertain
- Employ array types for variable-quantity entity extraction (but not for root nodes)

**Documentation & Clarity:**
- Apply descriptive field names and detailed descriptions
- Include formatting instructions or examples within descriptions

**Scalability Approach:**
- "Start simple and iteratively build your schema to incorporate requirements"

## Handling Token Limit Errors

When encountering "The response was too long to be processed" errors, consider:
- Distributing extraction logic across multiple fields
- Using separate schemas for different field subsets
- Breaking documents into smaller sections for individual extraction

## Python SDK Implementation

Two approaches are supported:

**Pydantic (Recommended):**
Uses Python type hints with `BaseModel` and `Field` annotations for clean schema definition

**JSON Schema:**
Direct JSON object definition with explicit type and property specifications
