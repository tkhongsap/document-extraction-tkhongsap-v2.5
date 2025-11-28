# LlamaParse Cache Options

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/features/cache_options/

## Overview

LlamaParse implements automatic caching for parsed documents with specific behavior and control mechanisms.

## Default Cache Behavior

By default, "LlamaParse caches parsed documents for 48 hours before permanently deleting them." The system considers parsing parameters that affect output (such as parsing instructions, language settings, and page separators) when managing the cache.

## Cache Invalidation

To force reprocessing of a cached document, developers can set the `invalidate_cache` parameter to `True`. This clears existing cache entries and triggers a fresh parse, with results then stored in the new cache.

**Python implementation:**
```python
parser = LlamaParse(invalidate_cache=True)
```

**API request:**
```bash
curl -X 'POST' 'https://api.cloud.llamaindex.ai/api/v1/parsing/upload' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -H "Authorization: Bearer $LLAMA_CLOUD_API_KEY" \
  --form 'invalidate_cache="true"' \
  -F 'file=@/path/to/your/file.pdf;type=application/pdf'
```

## Disabling Cache

To prevent caching altogether, set `do_not_cache` to `True`. Documents processed with this option won't be stored in cache, ensuring they're reprocessed on subsequent uploads.

**Python implementation:**
```python
parser = LlamaParse(do_not_cache=True)
```

**API request:**
```bash
curl -X 'POST' 'https://api.cloud.llamaindex.ai/api/v1/parsing/upload' \
  --form 'do_not_cache="true"' \
  -F 'file=@/path/to/your/file.pdf;type=application/pdf'
```
