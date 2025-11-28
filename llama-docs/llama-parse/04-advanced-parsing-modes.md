# LlamaParse Advanced Parsing Modes

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/presets_and_modes/advance_parsing_modes/

## Overview

LlamaParse offers multiple parsing strategies using Large Language Models (LLM) and Large Vision Models (LVM) to handle different document types. Users control the parsing method by setting the `parse_mode` parameter.

## Core Parsing Modes

### Parse Without AI
- **Best for:** Plain text documents
- **Speed:** Fastest option
- **Description:** Extracts layered text without AI reconstruction. Can optionally disable OCR and image extraction for maximum speed.
- **Mode:** `parse_page_without_llm`
- **Output:** Raw text without markdown formatting

### Parse with LLM
- **Best for:** Mixed documents with tables and images
- **Speed:** Balanced performance
- **Description:** "It's well-suited for documents that mix text with images, tables, and layout—like research papers or reports."
- **Mode:** `parse_page_with_llm` (default)
- **Process:** Extracts layered text, then uses LLM to reconstruct layout and structure into markdown

### Parse with LVM
- **Best for:** Visually complex content
- **Description:** Converts pages to images and sends to Large Vision Models, returning only structured markdown or JSON
- **Mode:** `parse_page_with_lvm`
- **Models:** Supports multiple vendors (OpenAI, Anthropic, Google Gemini, custom Azure)
- **Output:** No plain text; structured markdown only

### Parse with Agent
- **Best for:** Complex documents (financial reports, scanned forms)
- **Description:** "Highest-performing mode, ideal for complex documents like financial reports, scanned forms, and visually dense layouts."
- **Mode:** `parse_page_with_agent`
- **Features:** Supports LaTeX equations and Mermaid diagrams
- **Process:** Combines OCR, image extraction, and agentic reasoning loops

### Parse with Layout Agent
- **Best for:** Precise visual citations and dense layouts
- **Mode:** `parse_page_with_layout_agent`
- **Strength:** Excels at "transcribing tables, lists, headings, and body text with high accuracy—especially in dense, newspaper-like documents."

## Document-Level Modes

### Parse Document with LLM
- **Best for:** Documents with multi-page structure
- **Mode:** `parse_document_with_llm`
- **Advantage:** Processes entire document at once, ensuring consistent heading hierarchy and better section continuity

### Parse Document with Agent
- **Best for:** Complex multi-page documents
- **Mode:** `parse_document_with_agent`
- **Benefit:** Maintains structural coherence across entire files, improving continuity in layouts and images spanning pages

## Implementation

Both Python SDK and REST API support these modes:

**Python:** `parser = LlamaParse(parse_mode="<mode_name>")`

**API:** Include `--form 'parse_mode="<mode_name>"'` in curl requests
