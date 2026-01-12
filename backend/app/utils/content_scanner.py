"""
Content Security Scanner
Scans file content for malicious patterns, scripts, and exploits
"""
import re
from typing import List, Tuple, Set, Optional
from dataclasses import dataclass


@dataclass
class ThreatPattern:
    """Represents a threat pattern"""
    name: str
    pattern: re.Pattern
    severity: str  # 'critical', 'high', 'medium', 'low'
    description: str


# Malicious patterns to detect
MALICIOUS_PATTERNS = [
    # JavaScript patterns
    ThreatPattern(
        name="javascript_tag",
        pattern=re.compile(rb'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
        severity="critical",
        description="JavaScript script tag detected"
    ),
    ThreatPattern(
        name="javascript_protocol",
        pattern=re.compile(rb'javascript\s*:', re.IGNORECASE),
        severity="critical",
        description="JavaScript protocol handler detected"
    ),
    ThreatPattern(
        name="javascript_eval",
        pattern=re.compile(rb'\beval\s*\(', re.IGNORECASE),
        severity="high",
        description="JavaScript eval() function detected"
    ),
    
    # PHP patterns
    ThreatPattern(
        name="php_tag",
        pattern=re.compile(rb'<\?php', re.IGNORECASE),
        severity="critical",
        description="PHP tag detected"
    ),
    ThreatPattern(
        name="php_short_tag",
        pattern=re.compile(rb'<\?='),
        severity="critical",
        description="PHP short tag detected"
    ),
    ThreatPattern(
        name="php_system",
        pattern=re.compile(rb'\b(system|exec|shell_exec|passthru|popen)\s*\(', re.IGNORECASE),
        severity="critical",
        description="PHP system execution function detected"
    ),
    
    # Python patterns
    ThreatPattern(
        name="python_exec",
        pattern=re.compile(rb'\b(exec|eval|compile|__import__)\s*\(', re.IGNORECASE),
        severity="high",
        description="Python code execution function detected"
    ),
    ThreatPattern(
        name="python_subprocess",
        pattern=re.compile(rb'import\s+(subprocess|os\.system)', re.IGNORECASE),
        severity="high",
        description="Python subprocess/system import detected"
    ),
    
    # Shell/Bash patterns
    ThreatPattern(
        name="shell_command",
        pattern=re.compile(rb'(#!/bin/(bash|sh)|/bin/(bash|sh)\s)', re.IGNORECASE),
        severity="high",
        description="Shell script shebang detected"
    ),
    ThreatPattern(
        name="shell_pipe",
        pattern=re.compile(rb'\|\s*(bash|sh|curl|wget)', re.IGNORECASE),
        severity="high",
        description="Shell command pipe detected"
    ),
    
    # SQL Injection patterns
    ThreatPattern(
        name="sql_injection_union",
        pattern=re.compile(rb'\bUNION\s+SELECT\b', re.IGNORECASE),
        severity="high",
        description="SQL UNION SELECT detected"
    ),
    ThreatPattern(
        name="sql_injection_drop",
        pattern=re.compile(rb'\bDROP\s+(TABLE|DATABASE)\b', re.IGNORECASE),
        severity="critical",
        description="SQL DROP statement detected"
    ),
    ThreatPattern(
        name="sql_comment",
        pattern=re.compile(rb'--\s|/\*.*?\*/', re.IGNORECASE | re.DOTALL),
        severity="medium",
        description="SQL comment syntax detected"
    ),
    
    # XSS patterns
    ThreatPattern(
        name="xss_onerror",
        pattern=re.compile(rb'\bon(error|load|click|mouseover)\s*=', re.IGNORECASE),
        severity="high",
        description="HTML event handler detected"
    ),
    ThreatPattern(
        name="xss_iframe",
        pattern=re.compile(rb'<iframe[^>]*>', re.IGNORECASE),
        severity="high",
        description="iframe tag detected"
    ),
    ThreatPattern(
        name="xss_object",
        pattern=re.compile(rb'<(object|embed)[^>]*>', re.IGNORECASE),
        severity="high",
        description="Object/Embed tag detected"
    ),
    
    # File inclusion patterns
    ThreatPattern(
        name="file_inclusion",
        pattern=re.compile(rb'\b(include|require|include_once|require_once)\s*\(', re.IGNORECASE),
        severity="medium",
        description="File inclusion function detected"
    ),
    
    # Base64 encoded payloads (common in exploits)
    ThreatPattern(
        name="base64_eval",
        pattern=re.compile(rb'eval\s*\(\s*base64_decode', re.IGNORECASE),
        severity="critical",
        description="Base64 decode with eval detected"
    ),
    
    # Dangerous HTML tags
    ThreatPattern(
        name="html_meta_refresh",
        pattern=re.compile(rb'<meta[^>]*http-equiv=["\']?refresh', re.IGNORECASE),
        severity="medium",
        description="Meta refresh tag detected"
    ),
]


def scan_content_for_threats(
    buffer: bytes, 
    max_scan_size: int = 10 * 1024 * 1024,
    strict_mode: bool = False
) -> Tuple[bool, List[ThreatPattern], int]:
    """
    Scan file content for malicious patterns
    
    Args:
        buffer: File content as bytes
        max_scan_size: Maximum size to scan (default 10MB)
        strict_mode: If True, reject on any pattern; if False, only on critical/high
        
    Returns:
        Tuple of (is_safe, threats_found, total_matches)
    """
    if not buffer:
        return True, [], 0
    
    # Limit scan size for performance
    scan_buffer = buffer[:max_scan_size]
    
    threats_found: List[ThreatPattern] = []
    total_matches = 0
    
    for pattern_def in MALICIOUS_PATTERNS:
        matches = pattern_def.pattern.findall(scan_buffer)
        if matches:
            threats_found.append(pattern_def)
            total_matches += len(matches)
    
    # Determine if file is safe
    if not threats_found:
        return True, [], 0
    
    # In strict mode, any pattern is considered unsafe
    if strict_mode:
        return False, threats_found, total_matches
    
    # In normal mode, only critical and high severity are considered unsafe
    critical_threats = [
        t for t in threats_found 
        if t.severity in ['critical', 'high']
    ]
    
    is_safe = len(critical_threats) == 0
    
    return is_safe, threats_found, total_matches


def scan_text_content(text: str, strict_mode: bool = False) -> Tuple[bool, List[ThreatPattern], int]:
    """
    Scan text content for malicious patterns
    
    Args:
        text: Text content to scan
        strict_mode: If True, reject on any pattern; if False, only on critical/high
        
    Returns:
        Tuple of (is_safe, threats_found, total_matches)
    """
    return scan_content_for_threats(text.encode('utf-8', errors='ignore'), strict_mode=strict_mode)


def get_threat_summary(threats: List[ThreatPattern]) -> dict:
    """
    Generate a summary of detected threats
    
    Args:
        threats: List of detected threat patterns
        
    Returns:
        Dictionary with threat summary
    """
    summary = {
        'total': len(threats),
        'critical': 0,
        'high': 0,
        'medium': 0,
        'low': 0,
        'descriptions': []
    }
    
    for threat in threats:
        summary[threat.severity] += 1
        summary['descriptions'].append({
            'name': threat.name,
            'severity': threat.severity,
            'description': threat.description
        })
    
    return summary


def is_suspicious_filename(filename: str) -> Tuple[bool, Optional[str]]:
    """
    Check if filename itself is suspicious
    
    Args:
        filename: The filename to check
        
    Returns:
        Tuple of (is_suspicious, reason)
    """
    filename_lower = filename.lower()
    
    # Check for double extensions (common in malware)
    suspicious_double_ext = [
        '.pdf.exe', '.jpg.exe', '.png.exe', '.doc.exe',
        '.pdf.js', '.jpg.js', '.pdf.bat', '.pdf.cmd',
        '.pdf.scr', '.pdf.vbs', '.pdf.wsf'
    ]
    
    for ext in suspicious_double_ext:
        if ext in filename_lower:
            return True, f"Suspicious double extension: {ext}"
    
    # Check for executable extensions
    dangerous_extensions = [
        '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
        '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh',
        '.msi', '.jar', '.app', '.deb', '.rpm'
    ]
    
    for ext in dangerous_extensions:
        if filename_lower.endswith(ext):
            return True, f"Dangerous executable extension: {ext}"
    
    return False, None
