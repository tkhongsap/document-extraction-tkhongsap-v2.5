# LlamaParse Metadata

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/features/metadata/

## Overview

LlamaParse's JSON mode returns a structured data representation of parsed documents, enabling further processing and analysis. Users activate this by setting the result type to "json".

## Result Structure

The API returns a top-level object containing two main components:

**Pages Array**: Contains individual page objects representing each page in the document.

**Job Metadata**: Includes `job_pages` (total page count) and `job_is_cache_hit` (whether results came from cache).

## Page Object Components

Each page may include:

- `page`: Page number identifier
- `text`: Extracted textual content
- `md`: Markdown-formatted version of content
- `images`: Visual elements from the page
- `items`: Ordered collection of headings, text blocks, and tables as they appear sequentially

## Image Handling

Extracted images are represented as objects containing:

- `name`: Filename identifier (e.g., "img_p2_5.png")
- `height`: Vertical dimension in pixels
- `width`: Horizontal dimension in pixels

Images can be retrieved individually via API endpoints using their name identifiers.

## Presentation Features

For PowerPoint files (.pptx), the system captures speaker notes as `slideSpeakerNotes` entries. This extraction works across all parsing modes except `parse_page_with_lvm`.
