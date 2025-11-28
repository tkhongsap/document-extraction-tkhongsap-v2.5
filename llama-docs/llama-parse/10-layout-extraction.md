# LlamaParse Layout Extraction

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/features/layout_extraction/

## Overview

LlamaParse provides layout extraction capabilities that help reconstruct the original document appearance by preserving spatial positioning information. When enabled with `extract_layout=True` and JSON output format, the API returns bounding box data for key document elements.

## Supported Elements

The layout extraction identifies and tracks these element types:
- Tables
- Figures
- Titles
- Text blocks
- Lists

## Layout Data Structure

Each layout entry in the JSON response includes:

- **bbox**: Positional coordinates expressed as fractions of page dimensions (0-1 range)
- **image**: Reference name for retrieving the element's visual representation
- **confidence**: Reliability score from 0 to 1, where 1 indicates high confidence
- **label**: Element classification type
- **isLikelyNoise**: Boolean flag indicating whether non-maximum suppression detected potential noise

## Configuration Option

Developers can disable automatic alignment with underlying document elements by setting `ignore_document_elements_for_layout_detection=true`. This proves useful when default alignment causes issues.

## Sample Output

```json
{
  "bbox": {"x": 0.176, "y": 0.497, "w": 0.651, "h": 0.112},
  "image": "page_1_text_1.jpg",
  "confidence": 0.996,
  "label": "text",
  "isLikelyNoise": false
}
```

## Usage Cost

Layout extraction requires one additional credit per processed page beyond standard parsing costs.
