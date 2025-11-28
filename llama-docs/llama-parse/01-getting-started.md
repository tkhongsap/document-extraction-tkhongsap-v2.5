# LlamaParse Getting Started Guide

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/getting_started

## Main Content Summary

This guide provides a comprehensive introduction to LlamaParse, covering API key acquisition and three primary setup pathways.

### Key Sections

**API Key Setup**
Before using LlamaParse, users must obtain an API key from LlamaCloud, accessible via the general API key documentation.

**Web UI Workflow**
The browser-based interface offers the most accessible entry point. Users navigate to LlamaCloud, select from four parsing presets (Cost Effective, Agentic, Agentic Plus, and Use-case Oriented), upload documents, and view results immediately. Advanced Settings enables custom configuration for specialized document types.

**Python Implementation**
Installation via `pip install llama-cloud-services` enables command-line parsing and programmatic access. The CLI command `llama-parse [file_paths]` supports multiple output formats including text, markdown, and raw JSON. The Python client provides synchronous and asynchronous batch processing with typed `JobResult` objects offering granular access to parsed content.

**TypeScript Integration**
LlamaIndex.TS includes built-in LlamaParse support. After installing `llama-cloud-services`, users can create parsing scripts leveraging the `LlamaParseReader` class.

**REST API Access**
Three primary endpoints enable integration without client libraries: document upload and job initiation, status monitoring via job ID, and result retrieval in various formats.
