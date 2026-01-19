"""
Recursive Character Text Splitter
Splits text into chunks while preserving semantic meaning
"""
from typing import List, Optional
import re


class RecursiveCharacterTextSplitter:
    """
    Splits text recursively by trying different separators in order.
    Tries to keep semantically related content together.
    
    Separator priority:
    1. Double newlines (paragraphs)
    2. Single newlines
    3. Sentences (. ! ?)
    4. Commas and semicolons
    5. Spaces (words)
    6. Characters (last resort)
    """
    
    DEFAULT_SEPARATORS = [
        "\n\n",      # Paragraphs
        "\n",        # Lines
        ". ",        # Sentences
        "! ",        # Exclamations
        "? ",        # Questions
        "; ",        # Semicolons
        ", ",        # Commas
        " ",         # Words
        "",          # Characters (fallback)
    ]
    
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        separators: Optional[List[str]] = None,
        keep_separator: bool = True,
    ):
        """
        Initialize text splitter
        
        Args:
            chunk_size: Maximum size of each chunk (in characters)
            chunk_overlap: Overlap between chunks for context preservation
            separators: List of separators to try (in priority order)
            keep_separator: Whether to keep separators in the chunks
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = min(chunk_overlap, chunk_size // 2)
        self.separators = separators or self.DEFAULT_SEPARATORS
        self.keep_separator = keep_separator
    
    def split_text(self, text: str) -> List[str]:
        """
        Split text into chunks
        
        Args:
            text: Text to split
            
        Returns:
            List of text chunks
        """
        if not text or not text.strip():
            return []
        
        # If text is already small enough, return as-is
        if len(text) <= self.chunk_size:
            return [text.strip()]
        
        return self._split_recursive(text, self.separators)
    
    def _split_recursive(self, text: str, separators: List[str]) -> List[str]:
        """Recursively split text using separators"""
        final_chunks = []
        
        # Get the appropriate separator
        separator = separators[-1] if separators else ""
        new_separators = []
        
        for i, sep in enumerate(separators):
            if sep == "":
                separator = sep
                break
            if sep in text:
                separator = sep
                new_separators = separators[i + 1:]
                break
        
        # Split by separator
        if separator:
            splits = text.split(separator)
        else:
            # Character-level split (last resort)
            splits = list(text)
        
        # Merge splits into chunks
        good_splits = []
        for split in splits:
            if self.keep_separator and separator:
                # Add separator back (except for the first split)
                if good_splits:
                    split = separator + split
            
            if len(split) < self.chunk_size:
                good_splits.append(split)
            elif new_separators:
                # Recursively split with smaller separators
                final_chunks.extend(self._split_recursive(split, new_separators))
            else:
                # Can't split further, add as-is
                good_splits.append(split)
        
        # Merge good splits into chunks
        final_chunks.extend(self._merge_splits(good_splits))
        
        return final_chunks
    
    def _merge_splits(self, splits: List[str]) -> List[str]:
        """Merge small splits into larger chunks"""
        chunks = []
        current_chunk = []
        current_length = 0
        
        for split in splits:
            split_len = len(split)
            
            if current_length + split_len > self.chunk_size:
                if current_chunk:
                    # Save current chunk
                    chunk_text = "".join(current_chunk).strip()
                    if chunk_text:
                        chunks.append(chunk_text)
                    
                    # Start new chunk with overlap
                    if self.chunk_overlap > 0 and len(current_chunk) > 1:
                        # Keep last few items for overlap
                        overlap_text = ""
                        overlap_items = []
                        for item in reversed(current_chunk):
                            if len(overlap_text) + len(item) <= self.chunk_overlap:
                                overlap_items.insert(0, item)
                                overlap_text = "".join(overlap_items)
                            else:
                                break
                        current_chunk = overlap_items
                        current_length = len(overlap_text)
                    else:
                        current_chunk = []
                        current_length = 0
            
            current_chunk.append(split)
            current_length += split_len
        
        # Don't forget the last chunk
        if current_chunk:
            chunk_text = "".join(current_chunk).strip()
            if chunk_text:
                chunks.append(chunk_text)
        
        return chunks
    
    def split_text_with_metadata(
        self, 
        text: str,
        source: Optional[str] = None
    ) -> List[dict]:
        """
        Split text and return with metadata
        
        Args:
            text: Text to split
            source: Optional source identifier
            
        Returns:
            List of dicts with 'text', 'chunk_index', 'total_chunks', 'source'
        """
        chunks = self.split_text(text)
        total = len(chunks)
        
        return [
            {
                "text": chunk,
                "chunk_index": i,
                "total_chunks": total,
                "source": source,
                "char_count": len(chunk),
            }
            for i, chunk in enumerate(chunks)
        ]


# Pre-configured splitters for common use cases
def get_resume_splitter() -> RecursiveCharacterTextSplitter:
    """Splitter optimized for resume text (smaller chunks)"""
    return RecursiveCharacterTextSplitter(
        chunk_size=1500,
        chunk_overlap=200,
    )


def get_document_splitter() -> RecursiveCharacterTextSplitter:
    """Splitter for general documents (larger chunks)"""
    return RecursiveCharacterTextSplitter(
        chunk_size=2000,
        chunk_overlap=300,
    )


def get_large_document_splitter() -> RecursiveCharacterTextSplitter:
    """Splitter for very large documents"""
    return RecursiveCharacterTextSplitter(
        chunk_size=4000,
        chunk_overlap=500,
    )


# Utility function for simple use
def split_text(
    text: str,
    chunk_size: int = 1500,
    chunk_overlap: int = 200,
) -> List[str]:
    """
    Simple function to split text
    
    Args:
        text: Text to split
        chunk_size: Maximum chunk size
        chunk_overlap: Overlap between chunks
        
    Returns:
        List of text chunks
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    return splitter.split_text(text)
