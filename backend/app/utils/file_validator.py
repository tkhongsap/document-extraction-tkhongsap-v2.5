"""
Unified File Validator
Comprehensive file validation combining all security checks
"""
from typing import Optional, List
from dataclasses import dataclass
from fastapi import UploadFile

from app.utils.file_security import (
    validate_filename,
    validate_magic_bytes,
    is_allowed_extension,
)
from app.utils.content_scanner import (
    scan_content_for_threats,
    get_threat_summary,
    is_suspicious_filename,
    ThreatPattern,
)
from app.utils.pdf_security import (
    scan_pdf_security,
    get_pdf_threat_summary,
    PDFThreat,
)
from app.core.security_errors import (
    FileSecurityError,
    MaliciousContentError,
    InvalidFileTypeError,
    PathTraversalError,
    PDFSecurityError,
    FileTooLargeError,
)


@dataclass
class ValidationResult:
    """Result of file validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    sanitized_filename: Optional[str] = None
    threats_found: Optional[dict] = None


class FileValidator:
    """Unified file validator with all security checks"""
    
    def __init__(
        self,
        max_file_size: int = 50 * 1024 * 1024,  # 50MB
        allowed_mimes: Optional[List[str]] = None,
        allowed_extensions: Optional[set] = None,
        enable_content_scan: bool = True,
        enable_magic_bytes: bool = True,
        enable_pdf_scan: bool = True,
        strict_mode: bool = False,
        max_scan_size: int = 10 * 1024 * 1024,  # 10MB
    ):
        """
        Initialize file validator
        
        Args:
            max_file_size: Maximum allowed file size in bytes
            allowed_mimes: List of allowed MIME types
            allowed_extensions: Set of allowed file extensions
            enable_content_scan: Enable malicious content scanning
            enable_magic_bytes: Enable magic bytes validation
            enable_pdf_scan: Enable PDF-specific security checks
            strict_mode: Strict validation mode
            max_scan_size: Maximum size to scan for content
        """
        self.max_file_size = max_file_size
        self.allowed_mimes = allowed_mimes or []
        self.allowed_extensions = allowed_extensions or set()
        self.enable_content_scan = enable_content_scan
        self.enable_magic_bytes = enable_magic_bytes
        self.enable_pdf_scan = enable_pdf_scan
        self.strict_mode = strict_mode
        self.max_scan_size = max_scan_size
    
    async def validate_file(
        self,
        file: UploadFile,
        buffer: bytes,
    ) -> ValidationResult:
        """
        Comprehensive file validation
        
        Args:
            file: FastAPI UploadFile object
            buffer: File content as bytes
            
        Returns:
            ValidationResult with validation status and details
        """
        errors: List[str] = []
        warnings: List[str] = []
        sanitized_filename = None
        threats_found = None
        
        # 1. Validate filename
        try:
            is_valid, sanitized_name, error_msg = validate_filename(
                file.filename or "document"
            )
            if not is_valid:
                errors.append(f"Invalid filename: {error_msg}")
            else:
                sanitized_filename = sanitized_name
        except Exception as e:
            errors.append(f"Filename validation error: {str(e)}")
        
        # 2. Check for suspicious filename patterns
        try:
            is_suspicious, reason = is_suspicious_filename(file.filename or "")
            if is_suspicious:
                errors.append(f"Suspicious filename: {reason}")
        except Exception as e:
            warnings.append(f"Filename check warning: {str(e)}")
        
        # 3. Validate file size
        file_size = len(buffer)
        if file_size == 0:
            errors.append("File is empty")
        elif file_size > self.max_file_size:
            errors.append(
                f"File too large: {file_size} bytes "
                f"(max {self.max_file_size} bytes, {self.max_file_size / 1024 / 1024:.0f}MB)"
            )
        
        # 4. Validate MIME type
        if self.allowed_mimes and file.content_type:
            if file.content_type not in self.allowed_mimes:
                errors.append(f"Unsupported file type: {file.content_type}")
        
        # 5. Validate file extension
        if self.allowed_extensions and sanitized_filename:
            if not is_allowed_extension(sanitized_filename, self.allowed_extensions):
                errors.append(f"File extension not allowed")
        
        # 6. Validate magic bytes (file type verification)
        if self.enable_magic_bytes and file.content_type and buffer:
            try:
                is_valid_type, error_msg = validate_magic_bytes(buffer, file.content_type)
                if not is_valid_type:
                    errors.append(f"File type mismatch: {error_msg}")
            except Exception as e:
                warnings.append(f"Magic bytes check warning: {str(e)}")
        
        # 7. Scan for malicious content
        if self.enable_content_scan and buffer:
            try:
                is_safe, threats, total_matches = scan_content_for_threats(
                    buffer,
                    max_scan_size=self.max_scan_size,
                    strict_mode=self.strict_mode
                )
                
                if not is_safe:
                    threat_summary = get_threat_summary(threats)
                    threats_found = threat_summary
                    
                    critical_count = threat_summary['critical']
                    high_count = threat_summary['high']
                    
                    if critical_count > 0:
                        errors.append(
                            f"Critical security threats detected: {critical_count} pattern(s)"
                        )
                    if high_count > 0:
                        errors.append(
                            f"High-risk patterns detected: {high_count} pattern(s)"
                        )
                    
                    # Add specific threat descriptions
                    for desc in threat_summary['descriptions'][:5]:  # Limit to first 5
                        if desc['severity'] in ['critical', 'high']:
                            warnings.append(f"{desc['severity'].upper()}: {desc['description']}")
                
                elif threats:
                    # File is safe but has low/medium threats
                    threat_summary = get_threat_summary(threats)
                    for desc in threat_summary['descriptions']:
                        if desc['severity'] in ['medium', 'low']:
                            warnings.append(f"{desc['severity'].upper()}: {desc['description']}")
                
            except Exception as e:
                warnings.append(f"Content scan warning: {str(e)}")
        
        # 8. PDF-specific security checks
        if self.enable_pdf_scan and file.content_type == "application/pdf" and buffer:
            try:
                is_safe, pdf_threats = scan_pdf_security(
                    buffer,
                    strict_mode=self.strict_mode
                )
                
                if not is_safe:
                    pdf_summary = get_pdf_threat_summary(pdf_threats)
                    
                    critical_count = pdf_summary['critical']
                    high_count = pdf_summary['high']
                    
                    if critical_count > 0:
                        errors.append(
                            f"PDF contains critical security features: {critical_count}"
                        )
                    if high_count > 0:
                        errors.append(
                            f"PDF contains high-risk features: {high_count}"
                        )
                    
                    # Add specific PDF threat descriptions
                    for desc in pdf_summary['descriptions'][:5]:
                        if desc['severity'] in ['critical', 'high']:
                            warnings.append(
                                f"PDF {desc['severity'].upper()}: {desc['description']}"
                            )
                
                elif pdf_threats:
                    # PDF is safe but has informational findings
                    pdf_summary = get_pdf_threat_summary(pdf_threats)
                    for desc in pdf_summary['descriptions']:
                        if desc['severity'] in ['medium', 'low']:
                            warnings.append(f"PDF {desc['severity'].upper()}: {desc['description']}")
                
            except Exception as e:
                warnings.append(f"PDF scan warning: {str(e)}")
        
        # Determine overall validation result
        is_valid = len(errors) == 0
        
        return ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            sanitized_filename=sanitized_filename,
            threats_found=threats_found,
        )
    
    def raise_if_invalid(self, result: ValidationResult) -> None:
        """
        Raise appropriate exception if validation failed
        
        Args:
            result: ValidationResult from validate_file
            
        Raises:
            FileSecurityError: Various security-related exceptions
        """
        if result.is_valid:
            return
        
        # Determine the most appropriate exception type
        error_text = "; ".join(result.errors)
        
        if any("malicious" in e.lower() or "threat" in e.lower() for e in result.errors):
            raise MaliciousContentError(
                message=f"Malicious content detected: {error_text}",
                patterns_found=result.threats_found.get('descriptions', []) if result.threats_found else []
            )
        
        if any("path traversal" in e.lower() for e in result.errors):
            raise PathTraversalError(
                message=error_text,
                filename=result.sanitized_filename or "unknown"
            )
        
        if any("type mismatch" in e.lower() for e in result.errors):
            raise InvalidFileTypeError(
                message=error_text,
                claimed_type="unknown",
                actual_type="unknown"
            )
        
        if any("too large" in e.lower() for e in result.errors):
            raise FileTooLargeError(
                message=error_text,
                file_size=0,
                max_size=self.max_file_size
            )
        
        if any("pdf" in e.lower() for e in result.errors):
            raise PDFSecurityError(
                message=error_text,
                threats=result.errors
            )
        
        # Generic security error
        raise FileSecurityError(message=error_text)


# Convenience function for quick validation
async def validate_uploaded_file(
    file: UploadFile,
    buffer: bytes,
    max_size: int = 50 * 1024 * 1024,
    allowed_mimes: Optional[List[str]] = None,
    allowed_extensions: Optional[set] = None,
    strict_mode: bool = False,
) -> ValidationResult:
    """
    Quick file validation with default settings
    
    Args:
        file: FastAPI UploadFile object
        buffer: File content as bytes
        max_size: Maximum file size
        allowed_mimes: Allowed MIME types
        allowed_extensions: Allowed file extensions
        strict_mode: Strict validation mode
        
    Returns:
        ValidationResult
    """
    validator = FileValidator(
        max_file_size=max_size,
        allowed_mimes=allowed_mimes,
        allowed_extensions=allowed_extensions,
        strict_mode=strict_mode,
    )
    
    return await validator.validate_file(file, buffer)
