# LlamaParse Auto Mode

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/presets_and_modes/auto_mode/

## Overview

LlamaParse's Auto Mode intelligently analyzes individual pages and dynamically selects between Balanced and Premium parsing presets to optimize accuracy while controlling costs.

## How It Works

The system operates by first attempting to parse each page using Balanced Mode. When specific content conditions are detected, the page automatically reparses using Premium Mode for enhanced quality. This adaptive approach provides flexibility but may result in variable costs depending on file content.

## Implementation

To activate this feature, set the parameter `auto_mode=True` in your parser configuration.

### Code Example (Python)
```python
parser = LlamaParse(auto_mode=True)
```

### API Usage
```bash
curl -X 'POST' 'https://api.cloud.llamaindex.ai/api/v1/parsing/upload' \
  -H "Authorization: Bearer $LLAMA_CLOUD_API_KEY" \
  --form 'auto_mode="true"' \
  -F 'file=@/path/to/file.pdf;type=application/pdf'
```

## Upgrade Triggers

Auto Mode supports multiple conditions to trigger Premium parsing:

**Table Detection**: Set `auto_mode_trigger_on_table_in_page=True` to upgrade when tables appear on a page.

**Image Detection**: Enable `auto_mode_trigger_on_image_in_page=True` to upgrade when images are present.

**Pattern Matching**: Use `auto_mode_trigger_on_regexp_in_page` with ECMA262 regex patterns to trigger upgrades on matching text patterns.

**Text Matching**: Configure `auto_mode_trigger_on_text_in_page` with specific strings to trigger Premium parsing when that text appears.
