# LlamaExtract Web UI

**Source:** https://developers.llamaindex.ai/python/cloud/llamaextract/getting_started/web_ui/

## Overview

LlamaExtract provides a web-based interface for building and testing data extraction workflows. The platform enables users to define schemas, configure extraction agents, and iteratively refine extraction logic without requiring code.

## Getting Started

### Authentication

Users access the platform at [cloud.llamaindex.ai](https://cloud.llamaindex.ai/login). The system supports multiple authentication methods including "OAuth 2.0 providers (Google, Github, Microsoft) and email-based authentication."

## Creating Extraction Agents

An Extraction Agent serves as a reusable configuration for extracting structured data from specific content types. Users create new agents by:

1. Navigating to "Extraction (beta)" from the homepage or sidebar
2. Assigning a unique name to the agent
3. Clicking "Create" to access the configuration interface

## Schema Definition

The schema forms the foundation of extraction functionality, defining "the structure of the data you want to extract." Two approaches are available:

### Schema Builder Approach

The Schema Builder provides a user-friendly interface supporting most common JSON schema requirements, including nested objects and arrays. Pre-built templates (such as Technical Resume) help users understand schema structure. Documentation recommends "starting with a simple schema and then iteratively improving it."

### Raw Editor Approach

For advanced use cases, users can directly input JSON schemas. This approach supports features beyond the Schema Builder's capabilities, such as Union and Enum types. Importantly, "the Raw Editor and the Schema Builder are kept in sync."

## Configuration Management

### Publishing Configurations

The "Publish Configuration" button standardizes and saves agent settings, making configurations available to the Python SDK. Each publication immediately updates the SDK's behavior for that agent.

### Version History

The system preserves configuration history with each extraction run. Users can restore previous schemas by accessing the "Extraction Result" tab, selecting a prior run, and clicking the edit option to reload those settings.

### Additional Options

Configuration options affecting extraction behavior are documented separately in the platform's Options reference.

## Running Extractions

### Process

Users upload documents and initiate extraction by clicking "Run Extraction." Processing time varies based on document size and schema complexity. Initial runs on new files require additional parsing and caching time.

### Viewing Results

Extraction results display in the interface's central pane, showing structured data matching the defined schema.

### Extraction History

The "Extraction Results" tab provides access to all previous extractions for a given agent, including the specific schema and settings used, enabling schema comparison and iteration.

## Workflow Integration

The web UI serves as an iterative development tool. Once schemas are finalized and tested, users can "scalably run extractions via the Python client" for production deployment.
