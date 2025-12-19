# LlamaExtract Performance Tips

**Source:** https://developers.llamaindex.ai/python/cloud/llamaextract/features/performance_tips/

## Overview

LlamaExtract requires thoughtful schema design and workflow planning for optimal results, particularly in specific scenarios involving large documents, tabular data, and complex transformations.

## Entity Enumeration on Long Documents

**Challenge:** Processing lengthy documents (50+ pages) with repetitive information demands careful approach design.

**Recommended strategies:**
- Employ targeted extraction focusing on specific, well-defined fields rather than comprehensive lists
- Segment large documents into logical sections and execute separate extraction operations
- Utilize the `PER_PAGE` extraction target for processing individual pages
- Apply `page_range` filtering to concentrate on relevant document sections

**Patterns to avoid:**
- Requesting exhaustive entity enumeration across very lengthy documents
- Using undefined, overly broad extraction targets
- Processing entire long documents without considering context limitations

The documentation notes that "asking for exhaustive enumeration across very long documents" represents problematic practice.

## Tabular Data Transformation

**Performance guidelines by table size:**
- Small tables (< 50 rows): Direct processing yields excellent results
- Medium tables (50-100 rows): Direct processing with thorough validation
- Large tables (> 100 rows): Implement batch processing strategies

**Optimal approaches:**
- Process large tables in manageable chunks (20-50 rows per batch)
- Extract table structure and column definitions for comprehensive understanding
- Use sample-based processing to validate methodology before scaling
- Combine LlamaExtract with traditional tools like pandas for transformation
- Validate incrementally across small batches

**Anti-patterns:**
The guidance cautions against "processing hundreds or thousands of rows in a single" job and attempting large-scale transformations without batching strategies.

## Complex Field Transformations

**Best practices:**
- Keep extraction simple and focused on clean, structured data
- Separate extraction activities from business logic transformation
- Use clear, single-purpose field descriptions
- Include concrete examples when expected formats might be ambiguous
- Test iteratively, adding complexity gradually

**Schema design principle:**
Rather than embedding conditional logic within field descriptions, extract basic data elements separately then handle calculations and complex rules in application code.

The documentation emphasizes that "design extraction schemas to capture clean, structured data first, then implement business logic" in your application layer.

## Overall Performance Best Practices

**Key recommendations:**
1. Begin with data subsets to validate approaches before scaling
2. Define specific extraction targets rather than attempting to capture everything
3. Leverage document structure through page ranges and chunking
4. Validate schemas across different document types and edge cases
5. Use LlamaExtract for content understanding while employing traditional tools for computational tasks
6. Continuously monitor and adjust based on real-world performance

The core principle centers on leveraging LlamaExtract's "strength while using complementary tools for computational tasks."
