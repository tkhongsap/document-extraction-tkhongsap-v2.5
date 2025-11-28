# LlamaExtract Metadata Extensions

**Source:** https://developers.llamaindex.ai/python/cloud/llamaextract/features/extensions/

## Overview

LlamaExtract provides three advanced metadata features accessible through the UI's Advanced Settings that return schema-level information in the `extraction_metadata` field.

## Citations

Citations identify the source location for each extracted field by returning:
- Page number where information appears
- Direct text used for extraction

**Enabling**: Use the `ExtractConfig.cite_sources` parameter in the SDK.

**Applications**: "Compliance and audit requirements, fact-checking and verification workflows, understanding extraction quality and accuracy"

**Requirements**: Limited to MULTIMODAL and PREMIUM extraction modes only.

## Reasoning

This feature explains the logic behind extraction decisions by providing:
- Explanations for extracted values based on source text
- Error messages when insufficient information exists

**Enabling**: Use the `ExtractConfig.use_reasoning` argument.

**Applications**: Debugging results, understanding model decision-making, and improving schema design based on extraction logic patterns.

**Requirements**: Available only in BALANCED, MULTIMODAL, and PREMIUM extraction modes.

## Confidence Scores (Beta)

Confidence scores quantify system reliability for extracted values using three metrics:

- **parsing_confidence**: Document parsing quality (Multimodal only)
- **extraction_confidence**: Field relevance based on schema
- **confidence**: Combined parsing and extraction score

**Critical Limitation**: "Scores Are Uncalibrated... The confidence scores are not calibrated to real-world accuracy percentages."

Use scores for relative comparison rather than absolute thresholds. Longer text fields naturally score lower without indicating reduced accuracy.

**Requirements**: Maximum 100-page documents; MULTIMODAL and PREMIUM modes only.

## Performance Note

Citations and confidence scores significantly increase processing time and should be enabled only when necessary.
