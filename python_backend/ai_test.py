#!/usr/bin/env python3
"""
AI Test Script for LaTeX Resume Editor

This script allows you to test the AI analyzer with sample LaTeX content.
Simply paste your LaTeX content into the TEST_LATEX_CONTENT variable below.
"""

import os
import json
from ai import create_ai_analyzer

# =============================================================================
# PASTE YOUR LATEX CONTENT HERE
# =============================================================================

TEST_LATEX_CONTENT = r"""
\documentclass[letterpaper,11pt]{article}
\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}

\begin{document}

\begin{center}
    \textbf{\Huge \scshape John Doe} \\ \vspace{1pt}
    \small 123-456-7890 $|$ \href{mailto:john.doe@email.com}{\underline{john.doe@email.com}} $|$ 
    \href{https://linkedin.com/in/johndoe}{\underline{linkedin.com/in/johndoe}} $|$
    \href{https://github.com/johndoe}{\underline{github.com/johndoe}}
\end{center}

\section{Experience}
\resumeSubHeadingListStart
    \resumeSubheading
      {Software Engineer}{June 2021 -- Present}
      {Tech Company Inc.}{San Francisco, CA}
      \resumeItemListStart
        \resumeItem{Developed web applications using JavaScript and React}
        \resumeItem{Worked with databases and SQL queries}
        \resumeItem{Collaborated with team members on various projects}
      \resumeItemListEnd
      
    \resumeSubheading
      {Junior Developer}{Jan 2020 -- May 2021}
      {Startup Corp}{New York, NY}
      \resumeItemListStart
        \resumeItem{Built mobile applications}
        \resumeItem{Wrote code in various programming languages}
      \resumeItemListEnd
\resumeSubHeadingListEnd

\section{Technical Skills}
\begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
     \textbf{Languages}{: JavaScript, Python, Java, C++} \\
     \textbf{Technologies}{: React, Node.js, HTML/CSS, Git} \\
    }}
\end{itemize}

\section{Education}
\resumeSubHeadingListStart
    \resumeSubheading
      {University of Technology}{San Francisco, CA}
      {Bachelor of Science in Computer Science}{Aug. 2016 -- Dec. 2019}
\resumeSubHeadingListEnd

\end{document}
"""

# =============================================================================
# SAMPLE JOB POSTING - Modify this to test different job requirements
# =============================================================================

SAMPLE_JOB_POSTING = """
Senior Python Developer Position

We are looking for an experienced Python developer to join our team.

Requirements:
- 3+ years of experience with Python
- Experience with Django or Flask frameworks
- Knowledge of REST API development
- Experience with PostgreSQL or MySQL databases
- Familiarity with Docker and AWS
- Experience with machine learning libraries (scikit-learn, pandas)
- Strong problem-solving skills
- Team collaboration experience

Preferred:
- Experience with React.js
- Knowledge of microservices architecture
- CI/CD pipeline experience
- Agile development methodology
"""

# =============================================================================
# TEST FUNCTIONS
# =============================================================================

def add_line_numbers_to_content(content):
    """Add line numbers to content for easier reference"""
    lines = content.split('\n')
    numbered_lines = []
    for i, line in enumerate(lines, 1):
        numbered_lines.append(f"{i:3d}: {line}")
    return '\n'.join(numbered_lines)

def test_keyword_extraction():
    """Test job keyword extraction"""
    print("🔍 TESTING KEYWORD EXTRACTION")
    print("=" * 50)
    
    try:
        # Get API key from environment
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key or api_key == 'your-api-key-here':
            print("❌ ERROR: Please set GEMINI_API_KEY environment variable")
            return None
        
        # Create AI analyzer
        analyzer = create_ai_analyzer(api_key)
        
        # Extract keywords
        print("Extracting keywords from job posting...")
        keywords = analyzer.extract_job_keywords(SAMPLE_JOB_POSTING)
        
        print("\n📝 EXTRACTED KEYWORDS:")
        print(json.dumps(keywords, indent=2))
        
        return keywords
        
    except Exception as e:
        print(f"❌ ERROR in keyword extraction: {e}")
        return None

def test_resume_suggestions(keywords):
    """Test resume suggestion generation"""
    print("\n📄 TESTING RESUME SUGGESTIONS")
    print("=" * 50)
    
    try:
        # Get API key from environment
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key or api_key == 'your-api-key-here':
            print("❌ ERROR: Please set GEMINI_API_KEY environment variable")
            return
        
        # Create AI analyzer
        analyzer = create_ai_analyzer(api_key)
        
        # Add line numbers to the content
        numbered_content = add_line_numbers_to_content(TEST_LATEX_CONTENT)
        
        print("Generating resume suggestions...")
        print(f"Content length: {len(numbered_content)} characters")
        
        # Generate suggestions
        suggestions = analyzer.generate_resume_suggestions(numbered_content, keywords)
        
        print("\n💡 RESUME SUGGESTIONS:")
        print(json.dumps(suggestions, indent=2))
        
    except Exception as e:
        print(f"❌ ERROR in resume suggestions: {e}")

def test_cover_letter_suggestions(keywords):
    """Test cover letter suggestion generation"""
    print("\n💌 TESTING COVER LETTER SUGGESTIONS")
    print("=" * 50)
    
    # Sample cover letter LaTeX content
    cover_letter_content = r"""
\documentclass[letterpaper,11pt]{article}

\begin{document}

Dear Hiring Manager,

I am writing to express my interest in the Software Developer position at your company.

I have experience in software development and have worked on various projects.
My background includes working with programming languages and development tools.

I am excited about the opportunity to contribute to your team.

Sincerely,
John Doe

\end{document}
"""
    
    try:
        # Get API key from environment
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key or api_key == 'your-api-key-here':
            print("❌ ERROR: Please set GEMINI_API_KEY environment variable")
            return
        
        # Create AI analyzer
        analyzer = create_ai_analyzer(api_key)
        
        # Add line numbers to the content
        numbered_content = add_line_numbers_to_content(cover_letter_content)
        
        print("Generating cover letter suggestions...")
        print(f"Content length: {len(numbered_content)} characters")
        
        # Generate suggestions
        suggestions = analyzer.generate_cover_letter_suggestions(numbered_content, keywords, SAMPLE_JOB_POSTING)
        
        print("\n💡 COVER LETTER SUGGESTIONS:")
        print(json.dumps(suggestions, indent=2))
        
    except Exception as e:
        print(f"❌ ERROR in cover letter suggestions: {e}")

def main():
    """Main test function"""
    print("🧪 AI ANALYZER TEST SCRIPT")
    print("=" * 50)
    
    # Check if API key is set
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key or api_key == 'your-api-key-here':
        print("❌ ERROR: GEMINI_API_KEY environment variable not set!")
        print("\nTo fix this:")
        print("1. Get your API key from Google AI Studio")
        print("2. Set it as an environment variable:")
        print("   export GEMINI_API_KEY='your-actual-api-key-here'")
        print("3. Run this script again")
        return
    
    print(f"✅ API Key loaded: {api_key[:10]}...")
    print(f"📝 LaTeX content length: {len(TEST_LATEX_CONTENT)} characters")
    print(f"📋 Job posting length: {len(SAMPLE_JOB_POSTING)} characters")
    
    # Test keyword extraction
    keywords = test_keyword_extraction()
    
    if keywords:
        # Test resume suggestions
        test_resume_suggestions(keywords)
        
        # Test cover letter suggestions
        test_cover_letter_suggestions(keywords)
    
    print("\n✅ TEST COMPLETE!")

if __name__ == "__main__":
    main()
