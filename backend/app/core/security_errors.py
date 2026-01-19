"""
Security-related custom exceptions for file validation
"""
from typing import Optional, List


class FileSecurityError(Exception):
    """Base exception for file security issues"""
    def __init__(self, message: str, details: Optional[dict] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class MaliciousContentError(FileSecurityError):
    """Exception raised when malicious content is detected in file"""
    def __init__(self, message: str, patterns_found: Optional[List[str]] = None):
        super().__init__(message, {"patterns_found": patterns_found or []})


class InvalidFileTypeError(FileSecurityError):
    """Exception raised when file type doesn't match expected type"""
    def __init__(self, message: str, claimed_type: str, actual_type: str):
        super().__init__(
            message, 
            {"claimed_type": claimed_type, "actual_type": actual_type}
        )


class PathTraversalError(FileSecurityError):
    """Exception raised when path traversal attempt is detected"""
    def __init__(self, message: str, filename: str):
        super().__init__(message, {"filename": filename})


class PDFSecurityError(FileSecurityError):
    """Exception raised when PDF contains dangerous features"""
    def __init__(self, message: str, threats: Optional[List[str]] = None):
        super().__init__(message, {"threats": threats or []})


class FileTooLargeError(FileSecurityError):
    """Exception raised when file exceeds size limit"""
    def __init__(self, message: str, file_size: int, max_size: int):
        super().__init__(
            message,
            {"file_size": file_size, "max_size": max_size}
        )
