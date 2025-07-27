#!/usr/bin/env python3
"""
Test script to verify LaTeX formatting validation.
"""

import json
import re
from typing import Dict, Any

def validate_latex_suggestion(suggestion: Dict[str, Any]) -> bool:
    """
    Validate that a suggestion contains properly formatted LaTeX.
    
    Args:
        suggestion: The suggestion dictionary to validate
        
    Returns:
        True if the suggestion appears to be valid LaTeX, False otherwise
    """
    target_text = suggestion.get('target_text', '')
    replacement_text = suggestion.get('replacement_text', '')
    
    # Check for balanced braces
    def check_balanced_braces(text):
        count = 0
        for char in text:
            if char == '{':
                count += 1
            elif char == '}':
                count -= 1
            if count < 0:
                return False
        return count == 0
    
    # Basic LaTeX validation checks
    if not check_balanced_braces(target_text) or not check_balanced_braces(replacement_text):
        print(f"[DEBUG] LaTeX validation failed: Unbalanced braces in suggestion {suggestion.get('id')}")
        return False
    
    # Check for unescaped special characters that should be escaped in LaTeX
    special_chars = {'&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#', '_': r'\_', '^': r'\^'}
    for char, escaped in special_chars.items():
        if char in replacement_text and escaped not in replacement_text:
            # Allow some exceptions (like & in URLs or $ in math mode indicators)
            if char == '&' and ('http' in replacement_text or 'www' in replacement_text):
                continue
            print(f"[DEBUG] LaTeX validation warning: Unescaped {char} in suggestion {suggestion.get('id')}")
    
    # Check for proper LaTeX command structure
    latex_commands = re.findall(r'\\([a-zA-Z]+)(\{[^}]*\})?', replacement_text)
    valid_commands = ['textbf', 'textit', 'emph', 'item', 'section', 'subsection', 'begin', 'end', 'newline', 'linebreak']
    
    for cmd, args in latex_commands:
        if cmd not in valid_commands and len(cmd) < 3:  # Allow longer custom commands
            print(f"[DEBUG] LaTeX validation warning: Potentially invalid command \\{cmd} in suggestion {suggestion.get('id')}")
    
    # Check for common LaTeX patterns in resumes
    if '\\item' in replacement_text:
        # Ensure item commands are properly formatted
        if not re.search(r'\\item\s+', replacement_text):
            print(f"[DEBUG] LaTeX validation warning: \\item should be followed by space in suggestion {suggestion.get('id')}")
    
    return True

def test_latex_validation():
    """Test the LaTeX validation function with various inputs."""
    
    # Test cases
    test_cases = [
        {
            "id": "valid_textbf",
            "type": "replace",
            "target_text": "\\item Programming Languages: Java, C++",
            "replacement_text": "\\item Programming Languages: Java, C++, \\textbf{Python}",
            "description": "Add Python with emphasis",
            "keywords_used": ["Python"],
            "expected": True
        },
        {
            "id": "unbalanced_braces",
            "type": "replace", 
            "target_text": "\\item Programming Languages: Java, C++",
            "replacement_text": "\\item Programming Languages: Java, C++, \\textbf{Python",
            "description": "Add Python with unbalanced braces",
            "keywords_used": ["Python"],
            "expected": False
        },
        {
            "id": "unescaped_ampersand",
            "type": "replace",
            "target_text": "\\item Databases: MySQL",
            "replacement_text": "\\item Databases: MySQL & PostgreSQL",
            "description": "Add database with unescaped ampersand",
            "keywords_used": ["PostgreSQL"],
            "expected": True  # Should pass but with warning
        },
        {
            "id": "proper_item_format",
            "type": "insert_after",
            "target_text": "\\item Developed web applications using modern frameworks",
            "replacement_text": "\\item Built \\textbf{REST APIs} using \\textbf{Django} and \\textbf{PostgreSQL}",
            "description": "Add API development experience",
            "keywords_used": ["REST APIs", "Django", "PostgreSQL"],
            "expected": True
        }
    ]
    
    print("Testing LaTeX validation...")
    for test_case in test_cases:
        print(f"\nTesting: {test_case['id']}")
        print(f"Target: {test_case['target_text']}")
        print(f"Replacement: {test_case['replacement_text']}")
        
        result = validate_latex_suggestion(test_case)
        status = "✓" if result == test_case["expected"] else "✗"
        print(f"{status} Result: {result} (expected: {test_case['expected']})")
    
    print("\n✅ LaTeX validation test completed!")

if __name__ == "__main__":
    test_latex_validation()
