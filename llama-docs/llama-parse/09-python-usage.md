# LlamaParse Python Usage Guide

**Source:** https://developers.llamaindex.ai/python/cloud/llamaparse/features/python_usage/

## Overview

LlamaParse provides several Python-specific parameters and usage modes for document parsing within the LlamaIndex framework.

## Key Configuration Options

### Worker Concurrency

The `num_workers` parameter controls how many concurrent API requests are sent for parsing. By default, this is set to 4, but you can increase it:

```python
parser = LlamaParse(num_workers=10)
```

### Status Polling

When using synchronous mode, Python polls the job status at regular intervals. The default check interval is 1 second, though this can be customized:

```python
parser = LlamaParse(check_interval=10)
```

### Output Control

"By default, LlamaParse will print the status of the job as it is uploaded and checked." You can suppress this output by disabling verbose mode:

```python
parser = LlamaParse(verbose=False)
```

## Integration Methods

### With SimpleDirectoryReader

LlamaParse integrates directly with LlamaIndex's file reading utilities:

```python
parser = LlamaParse()
file_extractor = {".pdf": parser}
documents = SimpleDirectoryReader("./data", file_extractor=file_extractor).load_data()
```

### Direct Usage

Four parsing modes are available:

- **Synchronous**: `parser.load_data("./my_file.pdf")`
- **Batch synchronous**: `parser.load_data(["./file1.pdf", "./file2.pdf"])`
- **Asynchronous**: `await parser.aload_data("./my_file.pdf")`
- **Batch asynchronous**: `await parser.aload_data(["./file1.pdf", "./file2.pdf"])`

## Large Document Handling

The `partition_pages` option splits large documents into smaller parsing jobs:

```python
parser = LlamaParse(partition_pages=100)
```

This feature enables parallel processing of documents exceeding typical size limits while maintaining concurrent job execution up to the worker limit.
