# LlamaExtract Python SDK

**Source:** https://developers.llamaindex.ai/python/cloud/llamaextract/getting_started/python/

## Overview

The Python SDK provides a programmatic interface for LlamaExtract, enabling developers to experiment with schemas and execute extractions at scale. The source code is available on [GitHub](https://github.com/run-llama/llama_cloud_services/).

## Setup Requirements

Before beginning, obtain an API key from the LlamaCloud platform. Store it in a `.env` file:

```
LLAMA_CLOUD_API_KEY=llx-xxxxxx
```

Install the required packages:

```bash
pip install llama-cloud-services python-dotenv
```

## Quick Start Example

The basic workflow involves:

1. **Initializing the client** with your API credentials
2. **Defining a schema** using Pydantic models
3. **Creating an extraction agent** with that schema
4. **Running extraction** on documents

Here's a minimal implementation:

```python
from llama_cloud_services import LlamaExtract
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

extractor = LlamaExtract()

class Resume(BaseModel):
    name: str = Field(description="Full name of candidate")
    email: str = Field(description="Email address")
    skills: list[str] = Field(description="Technical skills and technologies")

agent = extractor.create_agent(name="resume-parser", data_schema=Resume)
result = agent.extract("resume.pdf")
print(result.data)
```

Execute with: `python extract.py`

## Schema Definition

Schemas support both Pydantic models and JSON Schema formats. See the [schema design documentation](/python/cloud/llamaextract/features/schema_design) for comprehensive guidance.

## Advanced Extraction Methods

### Direct Text/Bytes Processing

Extract from file bytes or text without requiring a file on disk:

```python
with open("resume.pdf", "rb") as f:
    file_bytes = f.read()
result = agent.extract(SourceText(file=file_bytes, filename="resume.pdf"))

result = agent.extract(SourceText(text_content="Candidate Name: Jane Doe"))
```

### Asynchronous Batch Operations

Process multiple documents concurrently:

```python
jobs = await agent.queue_extraction(["resume1.pdf", "resume2.pdf"])

for job in jobs:
    status = agent.get_extraction_job(job.id).status
    print(f"Job {job.id}: {status}")

results = [agent.get_extraction_run_for_job(job.id) for job in jobs]
```

### Schema Management

Modify schemas after creation and persist changes:

```python
agent.data_schema = new_schema
agent.save()
```

### Agent Lifecycle Operations

```python
agents = extractor.list_agents()
agent = extractor.get_agent(name="resume-parser")
extractor.delete_agent(agent.id)
```
