from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import subprocess
import tempfile
import os
import base64
import json
from datetime import datetime

# Import our AI analyzer
from ai import create_ai_analyzer

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'your-api-key-here')
ai_analyzer = None

def get_ai_analyzer():
    """Get or create AI analyzer instance"""
    global ai_analyzer
    if ai_analyzer is None:
        ai_analyzer = create_ai_analyzer(GEMINI_API_KEY)
    return ai_analyzer

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'LaTeX Resume Editor Backend'
    })

@app.route('/convert-latex', methods=['POST'])
def convert_latex_to_pdf():
    """
    Convert full LaTeX document to PDF using LuaLaTeX
    
    Expected JSON payload:
    {
        "latex_content": "\\documentclass{article}\\begin{document}Hello World\\end{document}"
    }
    
    Returns:
    - PDF file as bytes if successful
    - JSON error message if failed
    """
    print(f"[DEBUG] /convert-latex endpoint called")
    print(f"[DEBUG] Request method: {request.method}")
    print(f"[DEBUG] Request headers: {dict(request.headers)}")
    
    try:
        # Get LaTeX content from request
        data = request.get_json()
        print(f"[DEBUG] Request data received: {data is not None}")
        
        if not data or 'latex_content' not in data:
            print(f"[DEBUG] Missing latex_content in request")
            return jsonify({'error': 'Missing latex_content in request'}), 400
        
        latex_content = data['latex_content']
        print(f"[DEBUG] LaTeX content received, length: {len(latex_content)}")
        
        if not latex_content.strip():
            print(f"[DEBUG] LaTeX content is empty")
            return jsonify({'error': 'LaTeX content cannot be empty'}), 400
        
        print(f"[DEBUG] Calling convert_latex_to_pdf_bytes...")
        # Convert to PDF using LuaLaTeX
        pdf_bytes = convert_latex_to_pdf_bytes(latex_content)
        
        if pdf_bytes:
            print(f"[DEBUG] PDF generation successful, size: {len(pdf_bytes)} bytes")
            # Return PDF as base64 encoded string
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            print(f"[DEBUG] Base64 encoding successful, length: {len(pdf_base64)}")
            return jsonify({
                'success': True,
                'pdf_base64': pdf_base64,
                'message': 'PDF generated successfully'
            })
        else:
            print(f"[DEBUG] PDF generation failed")
            return jsonify({'error': 'Failed to generate PDF'}), 500
            
    except Exception as e:
        print(f"[DEBUG] Exception in /convert-latex: {str(e)}")
        import traceback
        print(f"[DEBUG] Full traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Error processing LaTeX: {str(e)}'}), 500

@app.route('/ai-parse', methods=['POST'])
def ai_parse():
    """
    Parse document content using AI
    
    Expected JSON payload:
    {
        "document_content": "LaTeX content here",
        "job_posting": "Job posting text here",
        "document_type": "resume" or "cover_letter"
    }
    
    Returns:
    - JSON with AI analysis and suggestions
    """
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        document_content = data.get('document_content', '')
        job_posting = data.get('job_posting', '')
        document_type = data.get('document_type', 'resume')
        
        if not document_content.strip():
            return jsonify({'error': 'Document content cannot be empty'}), 400
        
        # Generate AI analysis
        ai_response = ai_analyzer.generate_ai_analysis(document_content, job_posting, document_type)
        
        return jsonify({
            'success': True,
            'analysis': ai_response,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': f'Error in AI parsing: {str(e)}'}), 500

@app.route('/extract-keywords', methods=['POST'])
def extract_keywords():
    """
    Extract keywords from job posting using AI
    
    Expected JSON payload:
    {
        "job_posting": "Job posting text here"
    }
    
    Returns:
    - JSON with extracted keywords list
    """
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        job_posting = data.get('job_posting', '')
        
        if not job_posting.strip():
            return jsonify({'error': 'Job posting content cannot be empty'}), 400
        
        # Get AI analyzer
        analyzer = get_ai_analyzer()
        
        # Extract keywords using AI
        keywords = analyzer.extract_job_keywords(job_posting)
        
        # Convert to list if it's a dictionary (old format)
        if isinstance(keywords, dict):
            keywords_list = list(keywords.keys())
        else:
            keywords_list = keywords if isinstance(keywords, list) else []
        
        return jsonify({
            'success': True,
            'keywords': keywords_list,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': f'Error extracting keywords: {str(e)}'}), 500

@app.route('/suggest-resume-edits', methods=['POST'])
def suggest_resume_edits():
    """
    Generate resume editing suggestions based on selected keywords
    
    Expected JSON payload:
    {
        "document_content": "LaTeX content with line numbers",
        "selected_keywords": ["Python", "SQL", "Machine Learning"],
        "document_type": "resume"
    }
    
    Returns:
    - JSON with editing suggestions
    """
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        document_content = data.get('document_content', '')
        selected_keywords = data.get('selected_keywords', [])
        
        if not document_content.strip():
            return jsonify({'error': 'Document content cannot be empty'}), 400
        
        if not selected_keywords:
            return jsonify({'error': 'No keywords selected'}), 400
        
        # Get AI analyzer
        analyzer = get_ai_analyzer()
        
        # Generate suggestions using AI
        print(f"[DEBUG] Generating suggestions for keywords: {selected_keywords}")
        suggestions = analyzer.generate_resume_suggestions(document_content, selected_keywords)
        
        print(f"[DEBUG] Raw suggestions from AI: {suggestions}")
        suggestion_list = suggestions.get('suggestions', [])
        print(f"[DEBUG] Suggestion list length: {len(suggestion_list)}")
        
        for i, suggestion in enumerate(suggestion_list):
            print(f"[DEBUG] Suggestion {i+1}: {suggestion}")
        
        return jsonify({
            'success': True,
            'suggestions': suggestion_list,
            'selected_keywords': selected_keywords,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': f'Error generating resume suggestions: {str(e)}'}), 500

@app.route('/suggest-cover-letter-edits', methods=['POST'])
def suggest_cover_letter_edits():
    """
    Generate cover letter editing suggestions based on selected keywords
    
    Expected JSON payload:
    {
        "document_content": "LaTeX content with line numbers",
        "selected_keywords": ["Python", "SQL", "Machine Learning"],
        "document_type": "coverLetter"
    }
    
    Returns:
    - JSON with editing suggestions
    """
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        document_content = data.get('document_content', '')
        selected_keywords = data.get('selected_keywords', [])
        
        if not document_content.strip():
            return jsonify({'error': 'Document content cannot be empty'}), 400
        
        if not selected_keywords:
            return jsonify({'error': 'No keywords selected'}), 400
        
        # Get AI analyzer
        analyzer = get_ai_analyzer()
        
        # Generate suggestions using AI
        suggestions = analyzer.generate_cover_letter_suggestions(document_content, selected_keywords)
        
        return jsonify({
            'success': True,
            'suggestions': suggestions.get('suggestions', []),
            'selected_keywords': selected_keywords,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': f'Error generating cover letter suggestions: {str(e)}'}), 500


def convert_latex_to_pdf_bytes(latex_content):
    """Convert LaTeX content to PDF bytes using pdfLaTeX"""
    print(f"[DEBUG] Starting LaTeX to PDF conversion...")
    print(f"[DEBUG] Input LaTeX content length: {len(latex_content)} characters")
    print(f"[DEBUG] LaTeX content preview: {latex_content[:200]}...")
    
    try:
        # Create temporary directory for LaTeX processing
        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"[DEBUG] Created temporary directory: {temp_dir}")
            
            # Create LaTeX file in memory
            tex_file_path = os.path.join(temp_dir, 'document.tex')
            print(f"[DEBUG] Writing LaTeX file to: {tex_file_path}")
            
            # Write the original LaTeX content to file (no modifications needed for pdfLaTeX)
            with open(tex_file_path, 'w', encoding='utf-8') as f:
                f.write(latex_content)

            
            # Copy latexmkrc to temp directory for Overleaf-like behavior
            latexmkrc_source = os.path.join(os.path.dirname(__file__), '.latexmkrc')
            latexmkrc_dest = os.path.join(temp_dir, '.latexmkrc')
            if os.path.exists(latexmkrc_source):
                import shutil
                shutil.copy2(latexmkrc_source, latexmkrc_dest)
                print(f"[DEBUG] Copied .latexmkrc to temp directory")
            
            print(f"[DEBUG] LaTeX file written successfully")
            print(f"[DEBUG] File size: {os.path.getsize(tex_file_path)} bytes")
            
            # Save a copy for debugging (optional)
            # debug_file = f"debug_latex_{datetime.now().strftime('%Y%m%d_%H%M%S')}.tex"
            # with open(debug_file, 'w', encoding='utf-8') as f:
            #     f.write(latex_content)
            # print(f"[DEBUG] Saved debug copy to: {debug_file}")
            
            # Run latexmk to generate PDF (exactly like Overleaf does)
            print(f"[DEBUG] Running latexmk command...")
            latexmk_cmd = [
                'latexmk',
                '-pdf',
                '-pdflatex',  # Use pdfLaTeX for better compatibility
                '-interaction=nonstopmode',
                '-halt-on-error',
                '-file-line-error',
                '-shell-escape',  # Overleaf enables shell-escape
                '-output-directory=' + temp_dir,
                tex_file_path
            ]
            print(f"[DEBUG] Command: {' '.join(latexmk_cmd)}")
            
            # Set environment variables to match Overleaf
            env = os.environ.copy()
            env.update({
                'TEXMFHOME': temp_dir,
                'TEXMFVAR': temp_dir,
                'TEXMFCACHE': temp_dir,
                'max_print_line': '10000',
                'error_line': '254',
                'half_error_line': '238'
            })
            
            result = subprocess.run(
                latexmk_cmd,
                capture_output=True,
                text=True,
                cwd=temp_dir,
                env=env,
                timeout=30  # 30 second timeout like Overleaf
            )
            
            print(f"[DEBUG] pdfLaTeX process completed")
            print(f"[DEBUG] Return code: {result.returncode}")
            print(f"[DEBUG] STDOUT length: {len(result.stdout)} characters")
            print(f"[DEBUG] STDERR length: {len(result.stderr)} characters")
            
            if result.stdout:
                print(f"[DEBUG] STDOUT preview: {result.stdout[:500]}...")
            if result.stderr:
                print(f"[DEBUG] STDERR preview: {result.stderr[:500]}...")
            
            # Read PDF bytes directly from the generated file (in-memory)
            pdf_file_path = os.path.join(temp_dir, 'document.pdf')
            print(f"[DEBUG] Checking for PDF file: {pdf_file_path}")
            
            if os.path.exists(pdf_file_path):
                print(f"[DEBUG] PDF file found! Size: {os.path.getsize(pdf_file_path)} bytes")
                with open(pdf_file_path, 'rb') as pdf_file:
                    pdf_bytes = pdf_file.read()
                print(f"[DEBUG] PDF bytes read successfully: {len(pdf_bytes)} bytes")
                return pdf_bytes
            else:
                print(f"[DEBUG] PDF file not found!")
                print(f"[DEBUG] Files in temp directory: {os.listdir(temp_dir)}")
                
                # Read the log file to see what went wrong
                log_file_path = os.path.join(temp_dir, 'document.log')
                if os.path.exists(log_file_path):
                    print(f"[DEBUG] Reading log file: {log_file_path}")
                    try:
                        with open(log_file_path, 'r', encoding='utf-8') as log_file:
                            log_content = log_file.read()
                            print(f"[DEBUG] Log file size: {len(log_content)} characters")
                            print(f"[DEBUG] Log file content (last 1000 chars):")
                            print(log_content[-1000:])
                    except Exception as log_error:
                        print(f"[DEBUG] Error reading log file: {log_error}")
                
                print(f"[DEBUG] pdfLaTeX compilation failed: {result.stderr}")
                return None

    except subprocess.TimeoutExpired:
        print(f"[DEBUG] LaTeX compilation timed out (30 seconds)")
        return None
    except Exception as e:
        print(f"[DEBUG] Exception in LaTeX conversion: {str(e)}")
        print(f"[DEBUG] Exception type: {type(e).__name__}")
        import traceback
        print(f"[DEBUG] Full traceback: {traceback.format_exc()}")
        return None


if __name__ == '__main__':
    print("Starting LaTeX Resume Editor Backend...")
    print("Available endpoints:")
    print("  - POST /convert-latex - Convert LaTeX to PDF")
    print("  - POST /ai-parse - AI document analysis")
    print("  - GET  /health - Health check")
    print("\nMake sure to set GEMINI_API_KEY environment variable")
    
    app.run(debug=True, host='0.0.0.0', port=5000) 