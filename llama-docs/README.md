# LlamaParse and LlamaExtract Documentation

This directory contains comprehensive documentation for LlamaParse and LlamaExtract services, extracted from the official LlamaIndex developers documentation.

## Documentation Structure

### LlamaParse (`llama-parse/`)

Document parsing solution for converting complex, unstructured documents into formats optimized for LLMs.

1. **Getting Started** - Introduction and setup guide
2. **Overview** - Key capabilities and workflow process
3. **Presets** - Cost-effective, Agentic, and Agentic Plus modes
4. **Advanced Parsing Modes** - LLM, LVM, and Agent-based parsing strategies
5. **Auto Mode** - Intelligent mode selection for cost optimization
6. **Output Formats** - Text, Markdown, JSON, XLSX, and more
7. **Parsing Options** - Extensive customization parameters
8. **Multimodal Parsing** - Vendor multimodal model integration
9. **Python Usage** - SDK-specific features and examples
10. **Layout Extraction** - Bounding box data for document elements
11. **Metadata** - JSON mode and structured result handling
12. **Cache Options** - Cache management and invalidation
13. **Structured Output** - JSON schema-based extraction (Beta)
14. **Webhook** - Asynchronous result delivery
15. **Supported Document Types** - Complete format compatibility list

### LlamaExtract (`llama-extract/`)

Service for extracting structured data from unstructured documents using LLMs.

1. **Getting Started** - Introduction and ideal use cases
2. **Web UI** - Browser-based schema builder and extraction interface
3. **Python SDK** - Programmatic extraction with Pydantic schemas
4. **REST API** - HTTP endpoints for integration
5. **Core Concepts** - Agents, schemas, targets, jobs, and runs
6. **Schema Design** - Best practices and restrictions
7. **Configuration Options** - Model settings and extraction parameters
8. **Metadata Extensions** - Citations, reasoning, and confidence scores
9. **Performance Tips** - Optimization strategies for large documents
10. **Example: Auto-Generate Schema** - LLM-based schema generation
11. **Example: Extract with Citations** - Financial report extraction demo
12. **Privacy** - Data protection and usage policies

## Key Differences

**LlamaParse** focuses on:
- Converting documents to markdown/text/JSON
- Preserving document structure and layout
- High-quality OCR and table extraction
- Batch document processing

**LlamaExtract** focuses on:
- Extracting specific structured data based on schemas
- Type-safe output for downstream processing
- Schema iteration and validation
- Entity extraction from documents

## Source URLs

- **LlamaParse**: https://developers.llamaindex.ai/python/cloud/llamaparse/
- **LlamaExtract**: https://developers.llamaindex.ai/python/cloud/llamaextract/

## Documentation Date

Extracted: November 16, 2025

---

**Note**: This documentation is for reference purposes. Please consult the official LlamaIndex documentation for the most up-to-date information.
