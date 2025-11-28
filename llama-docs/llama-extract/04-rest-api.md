# LlamaExtract REST API

**Source:** https://developers.llamaindex.ai/python/cloud/llamaextract/getting_started/api/

## Overview

LlamaExtract provides REST API endpoints for programmatic data extraction from documents. The API enables you to create extraction agents, upload files, run jobs, and retrieve results asynchronously.

## Key Endpoints

### Agent Management

**Create an Extraction Agent**
- `POST /api/v1/extraction/extraction-agents`
- Define a `data_schema` in JSON format specifying the structure of data to extract
- Configure extraction settings like `extraction_target` and `extraction_mode`

**List Agents**
- `GET /api/v1/extraction/extraction-agents?project_id={project_id}`
- Retrieve all agents within a specific project

**Fetch Agent by Name**
- `GET /api/v1/extraction/extraction-agents/by-name/{agent_name}`

### Document and Job Operations

**Upload Documents**
- `POST /api/v1/files`
- Supports multipart/form-data uploads
- Returns a `file_id` for use in extraction jobs

**Create Extraction Job**
- `POST /api/v1/extraction/jobs`
- Requires `extraction_agent_id` and `file_id`
- Jobs process asynchronously

**Check Job Status**
- `GET /api/v1/extraction/jobs/{job_id}`
- Returns current processing status

**Retrieve Results**
- `GET /api/v1/extraction/jobs/{job_id}/result`
- Available when job status is `SUCCESS`

## Authentication

All requests require the `Authorization: Bearer $LLAMA_CLOUD_API_KEY` header.

## Workflow Summary

The typical extraction workflow involves: creating an agent with your schema, uploading a document, initiating a job, polling for completion, and fetching results once processing finishes.
