# LlamaParse Output Formats

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/presets_and_modes/output_modes/

## Supported Output Types

LlamaParse provides multiple output formats for parsed documents:

- **Text**: Basic text representation
- **Markdown**: "A Markdown representation of the parsed document"
- **JSON**: Structured data format of document content
- **XLSX**: Spreadsheet containing extracted tables
- **PDF**: PDF version of parsed content (distinct from original)
- **Images**: Document images (requires `save_images=True`)
- **Page Screenshots**: Visual captures of document pages
- **Structured**: JSON objects with custom data requirements

## Mode-Specific Format Support

Different parsing modes support varying output formats:

| Mode | Text | Markdown | JSON | XLSX | PDF | Structured | Images |
|------|------|----------|------|------|-----|-----------|--------|
| Default/Accurate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fast Mode | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Vendor Multimodal | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Premium Mode | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Spreadsheet | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

## API Endpoints

**Result Endpoint**: Returns JSON containing parsed content plus metadata (page count, cache status)

**Raw Endpoint**: Returns unformatted extraction without JSON wrapper

**Image Endpoint**: Downloads individual images via `/image/image_name.png`

**Details Endpoint**: Displays job parameters, errors, and warnings

**Status Endpoint**: Checks current job processing status
