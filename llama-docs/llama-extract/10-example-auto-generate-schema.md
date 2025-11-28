# Auto-Generate Schema for Extraction

**Source:** https://developers.llamaindex.ai/python/cloud/llamaextract/examples/auto_generate_schema_for_extraction/

## Overview

LlamaExtract provides functionality to automatically generate extraction schemas using an LLM, eliminating the need to manually define schemas from scratch. This feature accepts either example documents, descriptive prompts, or both to create appropriate extraction configurations.

## Schema Generation Process

### Input Requirements

To leverage the auto-generation capability, you must provide at least one of the following:

- **Example document**: A sample file demonstrating the data structure
- **Descriptive prompt**: Text describing the information you want to extract

The documentation illustrates this with a menu extraction example using the prompt: *"Extract menu items with their allergens and dietary restriction information"* paired with a menu image.

### Generated Output

The system produces an initial schema based on your inputs, which the LLM infers from the example and/or prompt specifications.

## Schema Customization

After generation, users can refine the schema by:

- Modifying field names and descriptions
- Toggling required field status
- Removing unnecessary fields
- Adding new fields as needed

The menu example demonstrates removing `category` and `portion_size` fields deemed irrelevant to the extraction objectives.

## Extraction Execution

Once the schema meets your requirements, you can:

1. Publish the extraction agent configuration
2. Execute extraction jobs against target documents
3. Review structured results matching your defined schema

This workflow streamlines moving from unstructured document analysis to properly formatted, usable data.
