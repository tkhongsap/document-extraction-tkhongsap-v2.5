# LlamaExtract Configuration Options

**Source:** https://developers.llamaindex.ai/python/cloud/llamaextract/features/options/

## Overview

LlamaExtract provides comprehensive configuration options to control how data is extracted from documents. While the schema is paramount, several settings significantly impact extraction quality and performance.

## Schema Alignment and Extraction Target

The extraction target determines scope and granularity:

- **PER_DOC** (default): Applies schema to entire document, returning single JSON object
- **PER_PAGE**: Applies schema per page, returning array of objects
- **PER_TABLE_ROW**: Applies schema to each entity in ordered lists, returning array of objects

## Critical Settings

### Model Configuration

Three key model settings control extraction behavior:

1. **Extraction Mode**: Options include `FAST`, `BALANCED`, `MULTIMODAL` (default), and `PREMIUM`. The mode determines processing speed versus accuracy tradeoffs.

2. **Parse Model**: Configurable in `MULTIMODAL` and `PREMIUM` modes. Options span from `gemini-2.0-flash` (no additional cost) to `gemini-2.5-pro` (+55 credits per page).

3. **Extract Model**: Only configurable in `PREMIUM` mode. Choices include `openai-gpt-4-1`, `openai-gpt-5-mini`, and `openai-gpt-5`.

### Document Processing

- **System Prompt**: Additional instructions for the extraction agent
- **Page Range**: "Use comma-separated page numbers or ranges (1-based indexing)"
- **Context Window**: Pages passed as context for long documents

## Advanced Features

### Metadata Extensions

Three enhancement options provide deeper insights:

- **Citations**: "Source tracing for extracted fields"
- **Reasoning**: "Explanations for extraction decisions"
- **Confidence Scores**: Quantitative confidence measures

### Additional Options

- **Chunk Mode**: `PAGE` or `SECTION` splitting strategies
- **High Resolution Mode**: Improves OCR quality for small text
- **Cache Invalidation**: Forces reprocessing, bypassing 48-hour cache

## Implementation

Configuration is available through Python SDK (`ExtractConfig` class) or REST API, with full parameter documentation and defaults specified for each option.
