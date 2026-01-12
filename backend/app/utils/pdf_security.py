"""
PDF Security Scanner
Checks PDF files for dangerous features like JavaScript, actions, and embedded files
"""
import re
from typing import List, Tuple, Optional
from dataclasses import dataclass

try:
    from PyPDF2 import PdfReader
    import io
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False


@dataclass
class PDFThreat:
    """Represents a PDF security threat"""
    threat_type: str
    severity: str  # 'critical', 'high', 'medium', 'low'
    description: str
    location: Optional[str] = None


def scan_pdf_for_javascript(buffer: bytes) -> List[PDFThreat]:
    """
    Scan PDF for JavaScript code
    
    Args:
        buffer: PDF file content as bytes
        
    Returns:
        List of threats found
    """
    threats = []
    
    # Pattern for PDF JavaScript
    js_patterns = [
        (rb'/JavaScript', 'JavaScript object'),
        (rb'/JS\s*\(', 'JS action'),
        (rb'/AA\s*<<', 'Additional Actions (AA)'),
        (rb'/OpenAction', 'Open Action'),
    ]
    
    for pattern, description in js_patterns:
        if re.search(pattern, buffer, re.IGNORECASE):
            threats.append(PDFThreat(
                threat_type="javascript",
                severity="critical",
                description=f"PDF contains {description}",
                location="PDF structure"
            ))
    
    return threats


def scan_pdf_for_actions(buffer: bytes) -> List[PDFThreat]:
    """
    Scan PDF for dangerous actions (Launch, SubmitForm, etc.)
    
    Args:
        buffer: PDF file content as bytes
        
    Returns:
        List of threats found
    """
    threats = []
    
    # Dangerous PDF actions
    action_patterns = [
        (rb'/Launch', 'Launch action (can execute files)', 'critical'),
        (rb'/SubmitForm', 'Submit form action', 'medium'),
        (rb'/ImportData', 'Import data action', 'medium'),
        (rb'/GoToR', 'GoToR action (remote file)', 'high'),
        (rb'/GoToE', 'GoToE action (embedded file)', 'high'),
        (rb'/Thread', 'Thread action', 'low'),
    ]
    
    for pattern, description, severity in action_patterns:
        if re.search(pattern, buffer, re.IGNORECASE):
            threats.append(PDFThreat(
                threat_type="action",
                severity=severity,
                description=f"PDF contains {description}",
                location="PDF actions"
            ))
    
    return threats


def scan_pdf_for_embedded_files(buffer: bytes) -> List[PDFThreat]:
    """
    Scan PDF for embedded files
    
    Args:
        buffer: PDF file content as bytes
        
    Returns:
        List of threats found
    """
    threats = []
    
    # Check for embedded files
    if re.search(rb'/EmbeddedFile', buffer, re.IGNORECASE):
        threats.append(PDFThreat(
            threat_type="embedded_file",
            severity="high",
            description="PDF contains embedded files",
            location="PDF attachments"
        ))
    
    # Check for file attachments
    if re.search(rb'/Filespec', buffer, re.IGNORECASE):
        threats.append(PDFThreat(
            threat_type="file_attachment",
            severity="medium",
            description="PDF contains file attachments",
            location="PDF attachments"
        ))
    
    return threats


def scan_pdf_structure(buffer: bytes) -> List[PDFThreat]:
    """
    Scan PDF structure for anomalies using PyPDF2 if available
    
    Args:
        buffer: PDF file content as bytes
        
    Returns:
        List of threats found
    """
    threats = []
    
    if not PYPDF2_AVAILABLE:
        return threats
    
    try:
        pdf_file = io.BytesIO(buffer)
        reader = PdfReader(pdf_file)
        
        # Check for encrypted PDF
        if reader.is_encrypted:
            threats.append(PDFThreat(
                threat_type="encryption",
                severity="low",
                description="PDF is encrypted or password protected",
                location="PDF metadata"
            ))
        
        # Check each page for annotations and forms
        for page_num, page in enumerate(reader.pages, start=1):
            # Check for annotations (can contain JavaScript)
            if '/Annots' in page:
                threats.append(PDFThreat(
                    threat_type="annotations",
                    severity="medium",
                    description=f"Page {page_num} contains annotations",
                    location=f"Page {page_num}"
                ))
            
            # Check for form fields
            if '/AcroForm' in page:
                threats.append(PDFThreat(
                    threat_type="form",
                    severity="low",
                    description=f"Page {page_num} contains form fields",
                    location=f"Page {page_num}"
                ))
        
    except Exception as e:
        # If parsing fails, it might be a malformed PDF
        threats.append(PDFThreat(
            threat_type="parsing_error",
            severity="medium",
            description=f"Failed to parse PDF structure: {str(e)}",
            location="PDF structure"
        ))
    
    return threats


def scan_pdf_security(
    buffer: bytes,
    check_javascript: bool = True,
    check_actions: bool = True,
    check_embedded: bool = True,
    check_structure: bool = True,
    strict_mode: bool = False
) -> Tuple[bool, List[PDFThreat]]:
    """
    Comprehensive PDF security scan
    
    Args:
        buffer: PDF file content as bytes
        check_javascript: Check for JavaScript
        check_actions: Check for dangerous actions
        check_embedded: Check for embedded files
        check_structure: Check PDF structure with PyPDF2
        strict_mode: If True, reject on any threat; if False, only critical/high
        
    Returns:
        Tuple of (is_safe, threats_found)
    """
    all_threats: List[PDFThreat] = []
    
    # Run all enabled checks
    if check_javascript:
        all_threats.extend(scan_pdf_for_javascript(buffer))
    
    if check_actions:
        all_threats.extend(scan_pdf_for_actions(buffer))
    
    if check_embedded:
        all_threats.extend(scan_pdf_for_embedded_files(buffer))
    
    if check_structure:
        all_threats.extend(scan_pdf_structure(buffer))
    
    # Determine if PDF is safe
    if not all_threats:
        return True, []
    
    # In strict mode, any threat is considered unsafe
    if strict_mode:
        return False, all_threats
    
    # In normal mode, only critical and high severity are unsafe
    critical_threats = [
        t for t in all_threats 
        if t.severity in ['critical', 'high']
    ]
    
    is_safe = len(critical_threats) == 0
    
    return is_safe, all_threats


def get_pdf_threat_summary(threats: List[PDFThreat]) -> dict:
    """
    Generate a summary of PDF threats
    
    Args:
        threats: List of detected PDF threats
        
    Returns:
        Dictionary with threat summary
    """
    summary = {
        'total': len(threats),
        'critical': 0,
        'high': 0,
        'medium': 0,
        'low': 0,
        'by_type': {},
        'descriptions': []
    }
    
    for threat in threats:
        summary[threat.severity] += 1
        
        if threat.threat_type not in summary['by_type']:
            summary['by_type'][threat.threat_type] = 0
        summary['by_type'][threat.threat_type] += 1
        
        summary['descriptions'].append({
            'type': threat.threat_type,
            'severity': threat.severity,
            'description': threat.description,
            'location': threat.location
        })
    
    return summary
