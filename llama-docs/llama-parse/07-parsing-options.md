# LlamaParse Parsing Options

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/features/parsing_options/

LlamaParse offers extensive customization options for document processing. Here's a comprehensive overview:

## Core Parsing Controls

**Language Support**: "LlamaParse uses OCR to extract text from images" and supports multiple languages specified via comma-separated values, affecting only image-derived text.

**OCR Management**: Users can disable optical character recognition entirely through the `disable_ocr` parameter when image text extraction isn't needed.

**Text Orientation**: The `skip_diagonal_text` option prevents parsing of angled text that may introduce noise or errors.

**Column Handling**: Setting `do_not_unroll_columns=True` preserves original column formatting rather than converting to reading order.

## Page-Level Configuration

**Selective Processing**: Target specific pages using zero-indexed page numbers in a comma-separated format.

**Separators and Formatting**:
- Custom page separators replace default dividers
- Page prefixes and suffixes (supporting `{pageNumber}` placeholders) frame content
- Header and footer customization with dedicated prefix/suffix options

**Spatial Targeting**: Bounding box parameters exclude document margins using fractional coordinates (0-1 range), useful for removing headers and footers.

## Content Extraction

**Visual Capture**: The `take_screenshot` option generates full-page JPG images embedded in JSON output.

**Image Handling**: `disable_image_extraction` improves performance by skipping image processing.

**Layout Preservation**: Options maintain alignment across pages and preserve small text in technical drawings.

## Specialized Formats

**Spreadsheets**:
- Extract multiple tables per sheet with `spreadsheet_extract_sub_tables=True`
- Force formula recalculation via `spreadsheet_force_formula_computation`

**Tables**: Convert markdown tables to HTML format with `colspan` and `rowspan` support using `output_tables_as_HTML=True`.

**Presentations**: Extract content extending beyond slide boundaries with `presentation_out_of_bounds_content` (PowerPoint 2007+ supported).

## Output Optimization

**Table Merging**: Combine tables across pages in markdown format while removing pagination and headers/footers.

All options support both Python SDK and REST API implementations.
