# Extract Data from Financial Reports - with Citations and Reasoning

**Source:** https://developers.llamaindex.ai/python/cloud/llamaextract/examples/extract_data_with_citations/

## Overview

LlamaExtract enables structured data extraction from complex documents like financial reports, contracts, and invoices using LLMs. This example demonstrates extracting SEC filing information with citations and reasoning to verify accuracy and understand extraction logic.

## Key Components

### Setup Requirements
- Install llama-cloud-services package
- Configure Llama Cloud API key via environment variable

### Custom Schema Definition
The example uses a Pydantic-based schema defining fields for SEC filings:
- Company name
- Filing description
- Filing type (10-K, 10-Q variants)
- Filing date
- Fiscal year
- Financial unit (thousands/millions)
- Revenue figures

### Citations and Reasoning Configuration
The `ExtractConfig` enables two critical features:

1. **Source Citations**: "cite_sources=True" generates page-specific references for each extracted field
2. **Reasoning Steps**: "use_reasoning=True" provides explanations for extraction decisions
3. **Multimodal Extraction**: Supports diverse document formats

## Practical Example

The demonstration extracts data from NVIDIA's fiscal 2025 10-K filing, producing structured output including:
- Company: NVIDIA Corporation
- Filing type: 10-K
- Filing date: February 26, 2025
- Revenue: $130,497 million

### Citation Output
Each extracted field includes granular citations with specific page numbers and matching text excerpts, enabling verification of extraction accuracy and identification of improvement opportunities.

## Value Proposition

The citations and reasoning metadata allow users to:
- Validate extracted information against source documents
- Understand LLM decision-making processes
- Refine schemas and prompts based on extraction patterns

## Next Steps

Users can customize the `system_prompt` within `ExtractConfig` to improve results further.
