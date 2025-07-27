#!/usr/bin/env python3
"""
Test script to verify LaTeX formatting in AI suggestions.
"""

from ai import AIAnalyzer

# Sample LaTeX resume content
sample_resume = r"""
\documentclass{article}
\begin{document}

\section{Skills}
\begin{itemize}
\item Programming Languages: Java, C++
\item Web Development: HTML, CSS, JavaScript
\item Databases: MySQL
\end{itemize}

\section{Experience}
\begin{itemize}
\item Software Engineer at TechCorp (2020-2023)
\item Developed web applications using modern frameworks
\item Worked on database optimization projects
\end{itemize}

\end{document}
"""

# Test keywords
test_keywords = ["Python", "Django", "PostgreSQL", "REST APIs"]

def test_latex_validation():
    """Test the LaTeX validation function with various inputs."""
    analyzer = AIAnalyzer("fake-api-key")  # We won't actually call the API
    
    # Test cases
    test_cases = [
        {
            "id": "valid_test",
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
        }
    ]
    
    print("Testing LaTeX validation...")
    for test_case in test_cases:
        result = analyzer.validate_latex_suggestion(test_case)
        status = "✓" if result == test_case["expected"] else "✗"
        print(f"{status} Test '{test_case['id']}': {result} (expected: {test_case['expected']})")
    
    print("\nTest validation completed!")

if __name__ == "__main__":
    test_latex_validation()
