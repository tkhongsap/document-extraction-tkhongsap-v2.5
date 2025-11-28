# LlamaParse Multimodal Parsing

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/features/multimodal/

## Overview

LlamaParse's multimodal parsing leverages vendor multimodal models to extract document content. The process involves taking page screenshots, sending them to a multimodal model with markdown extraction instructions, and consolidating the results.

## Supported Models

"Supported models are models are [here](/python/cloud/llamaparse/presets_and_modes/advance_parsing_modes#under-the-hood-2)" according to the documentation. Available options include anthropic-sonnet-3.5 and openai-gpt4o.

## Basic Implementation

To enable multimodal mode, configure two parameters:

- Set `use_vendor_multimodal_model` to `True`
- Specify your desired model via `vendor_multimodal_model_name`

Example configuration:
```python
parser = LlamaParse(
    use_vendor_multimodal_model=True,
    vendor_multimodal_model_name="anthropic-sonnet-3.5"
)
```

## Cost Optimization: Bring Your Own Key

Users can supply their own vendor API credentials to reduce LlamaParse costs to just 1 credit (approximately $0.003) per page. This approach shifts processing costs to the model provider but requires sufficient usage limits.

Use the parameter `vendor_multimodal_api_key` with your credentials.

## Azure Deployment Support

For custom deployments, configure Azure-specific parameters:

- `azure_openai_deployment_name`
- `azure_openai_endpoint`
- `azure_openai_api_version`
- `azure_openai_key`

Note: EU SaaS deployments using Gemini require a Vertex AI certificate string for europe-west1.

## Legacy Approach (Deprecated)

The `gpt4o_mode` parameter remains functional but the documentation recommends migrating to the modern `use_vendor_multimodal_model` approach for consistency and future compatibility.
