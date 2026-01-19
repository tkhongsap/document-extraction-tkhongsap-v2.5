"""
Test File Security Validation
Tests all security features implemented
"""
import asyncio
import sys
from pathlib import Path
from io import BytesIO
from typing import Tuple

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.utils.file_security import validate_filename, validate_magic_bytes
from app.utils.content_scanner import (
    scan_content_for_threats,
    is_suspicious_filename,
    get_threat_summary
)
from app.utils.pdf_security import scan_pdf_security, get_pdf_threat_summary


def print_test_header(test_name: str):
    """Print formatted test header"""
    print(f"\n{'='*70}")
    print(f"  {test_name}")
    print(f"{'='*70}")


def print_result(passed: bool, message: str):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")


async def test_filename_validation():
    """Test filename validation"""
    print_test_header("TEST 1: Filename Validation")
    
    test_cases = [
        # (filename, should_be_valid, description)
        ("document.pdf", True, "Normal filename"),
        ("my-file_123.docx", True, "Filename with dash and underscore"),
        ("../etc/passwd", False, "Path traversal with ../"),
        ("..\\windows\\system32", False, "Path traversal with ..\\"),
        ("file\x00.pdf", False, "Null byte injection"),
        ("/absolute/path.pdf", False, "Absolute path"),
        ("file<script>.pdf", False, "Dangerous character <"),
        ("CON.pdf", False, "Windows reserved name"),
        ("document.pdf.exe", True, "Double extension (caught by other checks)"),
        ("normal file.txt", True, "Filename with space"),
    ]
    
    passed = 0
    failed = 0
    
    for filename, should_be_valid, description in test_cases:
        is_valid, sanitized, error = validate_filename(filename)
        
        if is_valid == should_be_valid:
            print_result(True, f"{description}: '{filename}' - {error or 'OK'}")
            passed += 1
        else:
            print_result(False, f"{description}: '{filename}' - Expected {should_be_valid}, got {is_valid}")
            failed += 1
    
    print(f"\n📊 Results: {passed} passed, {failed} failed")
    return failed == 0


async def test_suspicious_filenames():
    """Test suspicious filename detection"""
    print_test_header("TEST 2: Suspicious Filename Detection")
    
    test_cases = [
        ("document.pdf", False, "Normal PDF"),
        ("image.jpg", False, "Normal image"),
        ("document.pdf.exe", True, "PDF with EXE extension"),
        ("image.jpg.js", True, "Image with JS extension"),
        ("file.exe", True, "Executable file"),
        ("script.bat", True, "Batch file"),
        ("macro.vbs", True, "VBS script"),
    ]
    
    passed = 0
    failed = 0
    
    for filename, should_be_suspicious, description in test_cases:
        is_suspicious, reason = is_suspicious_filename(filename)
        
        if is_suspicious == should_be_suspicious:
            print_result(True, f"{description}: '{filename}' - {reason or 'Safe'}")
            passed += 1
        else:
            print_result(False, f"{description}: Expected {should_be_suspicious}, got {is_suspicious}")
            failed += 1
    
    print(f"\n📊 Results: {passed} passed, {failed} failed")
    return failed == 0


async def test_magic_bytes():
    """Test magic bytes validation"""
    print_test_header("TEST 3: Magic Bytes Validation")
    
    test_cases = [
        # (content, claimed_type, should_be_valid, description)
        (b'%PDF-1.4\n', "application/pdf", True, "Valid PDF"),
        (b'\xff\xd8\xff\xe0', "image/jpeg", True, "Valid JPEG"),
        (b'\x89PNG\r\n\x1a\n', "image/png", True, "Valid PNG"),
        (b'This is text', "application/pdf", False, "Text file claiming to be PDF"),
        (b'%PDF-1.4\n', "image/jpeg", False, "PDF claiming to be JPEG"),
    ]
    
    passed = 0
    failed = 0
    
    for content, claimed_type, should_be_valid, description in test_cases:
        is_valid, error = validate_magic_bytes(content, claimed_type)
        
        if is_valid == should_be_valid:
            print_result(True, f"{description}: {error or 'OK'}")
            passed += 1
        else:
            print_result(False, f"{description}: Expected {should_be_valid}, got {is_valid}")
            failed += 1
    
    print(f"\n📊 Results: {passed} passed, {failed} failed")
    return failed == 0


async def test_malicious_content():
    """Test malicious content detection"""
    print_test_header("TEST 4: Malicious Content Detection")
    
    test_cases = [
        # (content, should_be_safe, threat_count, description)
        (b"Normal text content", True, 0, "Clean text"),
        (b"<script>alert('XSS')</script>", False, 1, "XSS script tag"),
        (b"javascript:void(0)", False, 1, "JavaScript protocol"),
        (b"<?php system($_GET['cmd']); ?>", False, 2, "PHP code execution"),
        (b"eval(atob('base64...'))", False, 1, "JavaScript eval"),
        (b"#!/bin/bash\nrm -rf /", False, 1, "Shell script"),
        (b"SELECT * FROM users; DROP TABLE users;", False, 2, "SQL injection"),
        (b"<img src=x onerror=alert(1)>", False, 1, "XSS event handler"),
        (b"import subprocess; subprocess.call(['ls'])", False, 1, "Python subprocess"),
    ]
    
    passed = 0
    failed = 0
    
    for content, should_be_safe, expected_threats, description in test_cases:
        is_safe, threats, total = scan_content_for_threats(content, strict_mode=False)
        
        critical_high = len([t for t in threats if t.severity in ['critical', 'high']])
        
        if is_safe == should_be_safe:
            threat_info = f"Found {critical_high} critical/high threats" if threats else "Clean"
            print_result(True, f"{description}: {threat_info}")
            passed += 1
        else:
            print_result(False, f"{description}: Expected safe={should_be_safe}, got {is_safe}")
            failed += 1
        
        # Show threats found
        if threats and not is_safe:
            for threat in threats[:3]:  # Show first 3
                print(f"    └─ {threat.severity.upper()}: {threat.description}")
    
    print(f"\n📊 Results: {passed} passed, {failed} failed")
    return failed == 0


async def test_pdf_security():
    """Test PDF security checks"""
    print_test_header("TEST 5: PDF Security Checks")
    
    test_cases = [
        # (content, should_be_safe, description)
        (b'%PDF-1.4\n1 0 obj\n<</Type/Catalog>>\nendobj', True, "Clean PDF"),
        (b'%PDF-1.4\n/JavaScript (app.alert("test"))', False, "PDF with JavaScript"),
        (b'%PDF-1.4\n/Launch /F (cmd.exe)', False, "PDF with Launch action"),
        (b'%PDF-1.4\n/EmbeddedFile', False, "PDF with embedded file"),
        (b'%PDF-1.4\n/AA <<', False, "PDF with additional actions"),
    ]
    
    passed = 0
    failed = 0
    
    for content, should_be_safe, description in test_cases:
        is_safe, threats = scan_pdf_security(content, strict_mode=False)
        
        if is_safe == should_be_safe:
            threat_info = f"Found {len(threats)} threats" if threats else "Clean"
            print_result(True, f"{description}: {threat_info}")
            passed += 1
        else:
            print_result(False, f"{description}: Expected safe={should_be_safe}, got {is_safe}")
            failed += 1
        
        # Show threats found
        if threats and not is_safe:
            for threat in threats[:3]:
                print(f"    └─ {threat.severity.upper()}: {threat.description}")
    
    print(f"\n📊 Results: {passed} passed, {failed} failed")
    return failed == 0


async def test_integrated_validation():
    """Test integrated file validation"""
    print_test_header("TEST 6: Integrated Validation")
    
    from fastapi import UploadFile
    from app.utils.file_validator import validate_uploaded_file
    
    # Create mock UploadFile
    class MockUploadFile:
        def __init__(self, filename: str, content_type: str):
            self.filename = filename
            self.content_type = content_type
    
    test_cases = [
        # (filename, content_type, buffer, should_be_valid, description)
        ("doc.pdf", "application/pdf", b"%PDF-1.4\nClean content", True, "Valid PDF"),
        ("script.pdf", "application/pdf", b"%PDF-1.4\n/JavaScript", False, "PDF with JavaScript"),
        ("file.txt", "text/plain", b"<script>alert(1)</script>", False, "Text with XSS"),
        ("../etc/passwd", "text/plain", b"Clean", False, "Path traversal filename"),
        ("normal.jpg", "image/jpeg", b"\xff\xd8\xff\xe0\x00\x10JFIF", True, "Valid JPEG"),
    ]
    
    passed = 0
    failed = 0
    
    for filename, content_type, buffer, should_be_valid, description in test_cases:
        mock_file = MockUploadFile(filename, content_type)
        
        try:
            result = await validate_uploaded_file(
                file=mock_file,
                buffer=buffer,
                max_size=50 * 1024 * 1024,
                allowed_mimes=["application/pdf", "text/plain", "image/jpeg"],
                strict_mode=False
            )
            
            if result.is_valid == should_be_valid:
                print_result(True, f"{description}")
                if result.warnings:
                    print(f"    └─ Warnings: {len(result.warnings)}")
                passed += 1
            else:
                print_result(False, f"{description}: Expected valid={should_be_valid}, got {result.is_valid}")
                if result.errors:
                    for error in result.errors[:2]:
                        print(f"    └─ Error: {error}")
                failed += 1
                
        except Exception as e:
            print_result(False, f"{description}: Exception - {str(e)}")
            failed += 1
    
    print(f"\n📊 Results: {passed} passed, {failed} failed")
    return failed == 0


async def main():
    """Run all tests"""
    print("\n" + "="*70)
    print("  🔒 FILE SECURITY VALIDATION TEST SUITE")
    print("="*70)
    
    results = []
    
    # Run all tests
    results.append(("Filename Validation", await test_filename_validation()))
    results.append(("Suspicious Filenames", await test_suspicious_filenames()))
    results.append(("Magic Bytes", await test_magic_bytes()))
    results.append(("Malicious Content", await test_malicious_content()))
    results.append(("PDF Security", await test_pdf_security()))
    results.append(("Integrated Validation", await test_integrated_validation()))
    
    # Print summary
    print("\n" + "="*70)
    print("  📊 FINAL TEST SUMMARY")
    print("="*70)
    
    total_passed = sum(1 for _, passed in results if passed)
    total_tests = len(results)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("\n" + "="*70)
    print(f"  Total: {total_passed}/{total_tests} test suites passed")
    print("="*70)
    
    # Overall result
    if total_passed == total_tests:
        print("\n🎉 ALL TESTS PASSED! Security system is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {total_tests - total_passed} test suite(s) failed. Please review.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
