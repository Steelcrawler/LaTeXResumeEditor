"""
This file contains the logic for how the AI backend will do the following:

1. Parse the webpage, and identify keywords from the job description to put into the resume.
2. Give inline editing suggestions for the resume or cover letter, given a specific keyword to include
"""

import json
import re
from typing import Dict, List, Optional, Any
from google import genai
from google.genai import types


class AIAnalyzer:
    def __init__(self, api_key: str):
        """Initialize the AI analyzer with Gemini API key."""
        self.client = genai.Client(api_key=api_key)
        self.keyword_model = 'gemini-2.5-flash-lite'
        self.suggestions_model = 'gemini-2.5-flash'

    def validate_latex_suggestion(self, suggestion: Dict[str, Any]) -> bool:
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

    def extract_job_keywords(self, job_posting: str) -> Dict[str, List[str]]:
        """
        Parse job posting and extract relevant keywords categorized by type.
        
        Args:
            job_posting (str): The job posting content
            
        Returns:
            Dict containing categorized keywords
        """
        prompt = f"""
        Your task is to analyze a job posting and extract relevant SKILL RELATED KEYWORDS that should be included in a resume or cover letter.

        Job Posting:
        {job_posting}
        """ + """
        Return the keywords as a JSON array with the following format:
        [
            "keyword1",
            "keyword2",
            "keyword3"
        ]

        For example, if the job posting mentions Python frequently, SQL less frequently, and Agile methodology occasionally, the response should be:
        [
            "Python",
            "SQL",
            "Agile methodology"
        ]

        Extract at most 10 keywords that are most relevant to the job posting. Focus on technical skills, programming languages, frameworks, methodologies, and tools that are explicitly mentioned or implied in the job description.
        Do not include any non-technical keywords or general terms that do not directly relate to the job requirements.
        """

    
        try:
            response = self.client.models.generate_content(
                model=self.keyword_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction='You are an expert in resume optimization and job analysis.',
                    temperature=0.1,
                    response_mime_type='application/json',
                    response_schema={
                        'type': 'ARRAY',
                        'items': {
                            'type': 'STRING'
                        }
                    },
                    seed=42,
                ),
            )
            
            # Parse JSON response directly
            return json.loads(response.text)
            
        except Exception as e:
            print(f"Error extracting keywords: {e}")
            print(f"Response text: '{response.text if 'response' in locals() else 'No response'}'")
            return {}

    
    def generate_resume_suggestions(self, 
                                  resume_content: str, 
                                  job_keywords: Dict[str, List[str]]) -> Dict[str, Any]:
        """
        Generate suggestions for improving a resume based on job keywords.
        
        Args:
            resume_content (str): Current resume content in LaTeX format
            job_keywords (Dict): Keywords extracted from job posting
            job_posting (str): Original job posting for context
            
        Returns:
            Dict containing various types of suggestions
        """

        prompt = f"""
        Analyze this LaTeX resume and provide specific suggestions to better align it with the job requirements.

        CURRENT RESUME (LaTeX format):
        {resume_content}

        KEYWORDS YOU NEED TO INCLUDE:
        {job_keywords}

        CRITICAL LATEX FORMATTING REQUIREMENTS:
        1. All suggestions MUST be valid LaTeX code
        2. Use proper LaTeX commands: \\textbf{{}}, \\item, \\section{{}}, etc.
        3. Escape special characters: use \\& instead of &, \\$ instead of $, \\% instead of %
        4. For bullet points, use \\item format
        5. For section headers, use \\section{{}} or \\subsection{{}}
        6. For emphasis, use \\textbf{{}} or \\textit{{}}
        7. Maintain consistent indentation and spacing
        8. Ensure curly braces are properly balanced

        IMPORTANT TARGETING RULES:
        1. When replacing content within a line, provide the COMPLETE line as target_text
        2. For \\item entries, include the entire \\item line from start to end
        3. For multi-line entries, include complete logical blocks
        4. Avoid partial line targeting - always target complete semantic units
        5. When in doubt, target the smallest complete line that contains your change

        Instructions:
        1. Identify specific LaTeX sections where each keyword can be naturally incorporated
        2. For each suggestion, provide the exact LaTeX text to find and replace
        3. Make suggestions that are contextually relevant and professional
        4. Focus on enhancing technical skills, experience descriptions, and achievements
        5. Avoid duplicate suggestions for the same content area
        6. Each suggestion should target a unique piece of LaTeX content
        7. Ensure all replacement text follows proper LaTeX syntax

        """ + """
        Please provide suggestions in the following JSON format:
        {
            "id": <string>,  # Unique identifier for this suggestion
            "type": <string>, # "replace" or "insert_after" 
            "target_text": <string>, # Exact LaTeX text to find (for replace) or LaTeX text after which to insert
            "replacement_text": <string>, # New LaTeX text to insert or replace with (MUST be valid LaTeX)
            "description": <string>, # Brief description of what this change does
            "keywords_used": [<string>] # List of keywords this suggestion incorporates
        }
        
        For example:
        {
            "id": "skill_python",
            "type": "replace",
            "target_text": "     \\textbf{Programming Languages}: Java, C++, JavaScript \\\\",
            "replacement_text": "     \\textbf{Programming Languages}: Java, C++, JavaScript, \\textbf{Python} \\\\",
            "description": "Add Python to programming languages with emphasis",
            "keywords_used": ["Python"]
        }

        Or for insertions:
        {
            "id": "exp_django",
            "type": "insert_after", 
            "target_text": "\\item Developed web applications using modern frameworks",
            "replacement_text": "\\item Built scalable web applications using \\textbf{Django} and \\textbf{Flask} frameworks with \\textbf{Python}, implementing RESTful APIs and database integration",
            "description": "Add specific Python web framework experience",
            "keywords_used": ["Python", "Django", "Flask"]
        }

        Example for complete line replacement with proper formatting:
        {
            "id": "fullstack_update",
            "type": "replace",
            "target_text": "     \\textbf{Full-stack Development}: React, NextJS, Flask, Django, Java (Spring Boot), Tailwind CSS, REST APIs \\\\",
            "replacement_text": "     \\textbf{Full-stack Development}: React, NextJS, Flask, Django, \\textbf{Java} (Spring Boot), \\textbf{Python}, Tailwind CSS, REST APIs \\\\",
            "description": "Emphasize Java and add Python to full-stack skills",
            "keywords_used": ["Java", "Python"]
        }

        IMPORTANT: All target_text and replacement_text must be valid LaTeX code. Use proper escaping and formatting.
        Generate 1-2 suggestions per keyword maximum. Focus on quality over quantity.
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.suggestions_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction='You are an expert resume writer and ATS optimization specialist.',
                    temperature=0.1,
                    response_mime_type='application/json',
                    response_schema={
                        'type': 'ARRAY',
                        'items': {
                            'type': 'OBJECT',
                            'required': ['id', 'type', 'target_text', 'replacement_text', 'description', 'keywords_used'],
                            'properties': {
                                'id': {
                                    'type': 'STRING',
                                },
                                'type': {
                                    'type': 'STRING',
                                    'enum': ['replace', 'insert_after']
                                },
                                'target_text': {
                                    'type': 'STRING',
                                },
                                'replacement_text': {
                                    'type': 'STRING',
                                },
                                'description': {
                                    'type': 'STRING',
                                },
                                'keywords_used': {
                                    'type': 'ARRAY',
                                    'items': {
                                        'type': 'STRING'
                                    }
                                }
                            },
                        }
                    },
                    seed=42,
                ),
            )
            
            # Parse JSON response directly
            suggestions = json.loads(response.text)
            print(f"[DEBUG AI] Generated {len(suggestions)} suggestions for resume")
            
            # Validate and filter suggestions
            valid_suggestions = []
            for i, suggestion in enumerate(suggestions):
                print(f"[DEBUG AI] Resume Suggestion {i+1}: ID={suggestion.get('id')}, Type={suggestion.get('type')}, Keywords={suggestion.get('keywords_used')}")
                print(f"[DEBUG AI]   Target: {suggestion.get('target_text')[:50]}...")
                print(f"[DEBUG AI]   Replace: {suggestion.get('replacement_text')[:50]}...")
                print(f"[DEBUG AI]   Description: {suggestion.get('description')}")
                
                # Validate LaTeX formatting
                if self.validate_latex_suggestion(suggestion):
                    valid_suggestions.append(suggestion)
                    print(f"[DEBUG AI]   ✓ LaTeX validation passed")
                else:
                    print(f"[DEBUG AI]   ✗ LaTeX validation failed - suggestion skipped")
            
            print(f"[DEBUG AI] {len(valid_suggestions)} valid suggestions after LaTeX validation")
            return {"suggestions": valid_suggestions}

        except Exception as e:
            print(f"Error generating resume suggestions: {e}")
            return {"suggestions": []}

    def generate_cover_letter_suggestions(self, 
                                        cover_letter_content: str, 
                                        job_keywords: Dict[str, List[str]], 
                                        job_posting: str = "") -> Dict[str, Any]:
        """
        Generate suggestions for improving a cover letter based on job requirements.
        
        Args:
            cover_letter_content (str): Current cover letter content in LaTeX format
            job_keywords (Dict): Keywords extracted from job posting
            job_posting (str): Original job posting for context
            
        Returns:
            Dict containing cover letter improvement suggestions
        """
    
        prompt = f"""
        Analyze this LaTeX cover letter and provide specific suggestions to better align it with the job requirements.

        CURRENT COVER LETTER (LaTeX format):
        {cover_letter_content}

        JOB REQUIREMENTS KEYWORDS:
        {job_keywords}

        CRITICAL LATEX FORMATTING REQUIREMENTS:
        1. All suggestions MUST be valid LaTeX code
        2. Use proper LaTeX commands: \\textbf{{}}, \\textit{{}}, \\emph{{}}, etc.
        3. Escape special characters: use \\& instead of &, \\$ instead of $, \\% instead of %
        4. For paragraphs, maintain proper spacing and structure
        5. Maintain consistent indentation and spacing
        6. Ensure curly braces are properly balanced
        7. Use proper LaTeX paragraph breaks and formatting

        Instructions:
        1. Identify specific LaTeX sections where each keyword can be naturally incorporated
        2. For each suggestion, provide the exact LaTeX text to find and replace
        3. Make suggestions that enhance the narrative and demonstrate relevant experience
        4. Focus on connecting past experience to the job requirements using proper LaTeX formatting
        5. Avoid duplicate suggestions for the same content area
        6. Each suggestion should target a unique piece of LaTeX content
        7. Ensure all replacement text follows proper LaTeX syntax

        """ + """
        Please provide suggestions in the following JSON format:
        {
            "id": <string>,  # Unique identifier for this suggestion
            "type": <string>, # "replace" or "insert_after" 
            "target_text": <string>, # Exact LaTeX text to find (for replace) or LaTeX text after which to insert
            "replacement_text": <string>, # New LaTeX text to insert or replace with (MUST be valid LaTeX)
            "description": <string>, # Brief description of what this change does
            "keywords_used": [<string>] # List of keywords this suggestion incorporates
        }
        
        For example:
        {
            "id": "exp_python",
            "type": "replace",
            "target_text": "I have experience in software development",
            "replacement_text": "I have extensive experience in \\textbf{Python} software development, working with frameworks like \\textbf{Django} and \\textbf{Flask}",
            "description": "Specify Python experience and frameworks with LaTeX emphasis",
            "keywords_used": ["Python", "Django", "Flask"]
        }

        IMPORTANT: All target_text and replacement_text must be valid LaTeX code. Use proper escaping and formatting.
        Generate 1-2 suggestions per keyword maximum. Focus on quality over quantity.
        """
    
        try:
            response = self.client.models.generate_content(
                model=self.suggestions_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction='You are an expert cover letter writer and ATS optimization specialist.',
                    temperature=0.1,
                    response_mime_type='application/json',
                    response_schema={
                        'type': 'ARRAY',
                        'items': {
                            'type': 'OBJECT',
                            'required': ['id', 'type', 'target_text', 'replacement_text', 'description', 'keywords_used'],
                            'properties': {
                                'id': {
                                    'type': 'STRING',
                                },
                                'type': {
                                    'type': 'STRING',
                                    'enum': ['replace', 'insert_after']
                                },
                                'target_text': {
                                    'type': 'STRING',
                                },
                                'replacement_text': {
                                    'type': 'STRING',
                                },
                                'description': {
                                    'type': 'STRING',
                                },
                                'keywords_used': {
                                    'type': 'ARRAY',
                                    'items': {
                                        'type': 'STRING'
                                    }
                                }
                            },
                        }
                    },
                    seed=42,
                ),
            )
            
            # Parse JSON response directly
            suggestions = json.loads(response.text)
            print(f"[DEBUG AI] Generated {len(suggestions)} suggestions for cover letter")
            
            # Validate and filter suggestions
            valid_suggestions = []
            for i, suggestion in enumerate(suggestions):
                print(f"[DEBUG AI] Cover Letter Suggestion {i+1}: ID={suggestion.get('id')}, Type={suggestion.get('type')}, Keywords={suggestion.get('keywords_used')}")
                print(f"[DEBUG AI]   Target: {suggestion.get('target_text')[:50]}...")
                print(f"[DEBUG AI]   Replace: {suggestion.get('replacement_text')[:50]}...")
                print(f"[DEBUG AI]   Description: {suggestion.get('description')}")
                
                # Validate LaTeX formatting
                if self.validate_latex_suggestion(suggestion):
                    valid_suggestions.append(suggestion)
                    print(f"[DEBUG AI]   ✓ LaTeX validation passed")
                else:
                    print(f"[DEBUG AI]   ✗ LaTeX validation failed - suggestion skipped")
            
            print(f"[DEBUG AI] {len(valid_suggestions)} valid suggestions after LaTeX validation")
            return {"suggestions": valid_suggestions}

        except Exception as e:
            print(f"Error generating cover letter suggestions: {e}")
            return {"suggestions": []}

def create_ai_analyzer(api_key: str) -> AIAnalyzer:
    """Factory function to create an AI analyzer instance."""
    return AIAnalyzer(api_key)

