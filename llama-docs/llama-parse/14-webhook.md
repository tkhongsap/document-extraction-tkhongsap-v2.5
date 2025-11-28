# LlamaParse Webhook

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/features/webhook/

## Overview

LlamaParse allows you to receive job results directly at a specified endpoint using webhooks. After processing completes, results are delivered via POST request to your configured webhook URL.

## Webhook URL Requirements

The webhook URL must meet these specifications:

- **Protocol**: Must use HTTPS
- **Host**: Requires a domain name (IP addresses not permitted)
- **Length**: Cannot exceed 200 characters

## Data Format

Results are transmitted as a POST request containing JSON with this structure:

```json
{
  "txt": "raw text",
  "md": "markdown text",
  "json": [
    {
      "page": 1,
      "text": "page 1 raw text",
      "md": "page 1 markdown text",
      "images": [
        {
          "name": "img_p0_1.png",
          "height": 100,
          "width": 100,
          "x": 0,
          "y": 0
        }
      ]
    }
  ],
  "images": ["img_p0_1.png"]
}
```

The payload includes extracted text, markdown versions, page-level data with coordinates, and image references.

## Implementation

**Python SDK:**
```python
parser = LlamaParse(webhook_url="https://example.com/webhook")
```

**API:**
```bash
curl -X 'POST' \
  'https://api.cloud.llamaindex.ai/api/v1/parsing/upload' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -H "Authorization: Bearer $LLAMA_CLOUD_API_KEY" \
  --form 'webhook_url="https://example.com/webhook"' \
  -F 'file=@/path/to/your/file.pdf;type=application/pdf'
```
