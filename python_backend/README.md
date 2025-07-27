# LaTeX Resume Editor - Python Backend

This is the Python backend for the LaTeX Resume Editor Chrome extension. It provides LaTeX-to-PDF conversion and AI-powered document analysis.

## Features

- **LaTeX to PDF Conversion**: Converts LaTeX content to PDF using pdflatex
- **AI Document Analysis**: Uses Google Gemini AI for intelligent suggestions
- **RESTful API**: Clean HTTP endpoints for frontend integration
- **Error Handling**: Comprehensive error handling and logging

## API Endpoints

### 1. Health Check
```
GET /health
```
Returns backend status and timestamp.

### 2. LaTeX to PDF Conversion
```
POST /convert-latex
Content-Type: application/json

{
    "latex_content": "\\documentclass{article}\\begin{document}Hello World\\end{document}"
}
```
Returns:
```json
{
    "success": true,
    "pdf_base64": "base64_encoded_pdf_bytes",
    "message": "PDF generated successfully"
}
```

### 3. AI Document Analysis
```
POST /ai-parse
Content-Type: application/json

{
    "document_content": "LaTeX content here",
    "job_posting": "Job posting text here",
    "document_type": "resume" or "cover_letter"
}
```
Returns:
```json
{
    "success": true,
    "analysis": {
        "contentSuggestions": ["suggestion1", "suggestion2"],
        "formattingSuggestions": ["suggestion1", "suggestion2"],
        "atsOptimizations": ["suggestion1", "suggestion2"],
        "industryTerms": ["term1", "term2"],
        "improvedSections": {
            "section1": "improved LaTeX content"
        }
    },
    "timestamp": "2024-01-01T00:00:00Z"
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Navigate to the python_backend directory
cd python_backend

# Install Python requirements
pip install -r requirements.txt
```

### 2. Install LaTeX

The backend requires LuaLaTeX to be installed:

**macOS:**
```bash
brew install basictex
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install texlive-full
```

**Windows:**
- Download and install MiKTeX or TeX Live

### 3. Set Up Environment Variables

Create a `.env` file in the `python_backend` directory:

```bash
# LaTeX Resume Editor Backend Configuration
# Replace with your actual Gemini API key
GEMINI_API_KEY=your-actual-api-key-here
```

### 4. Run the Backend

```bash
# Start the Flask server
python app.py
```

The backend will be available at `http://localhost:5000`

## Quick Setup Script

You can also use the automated setup script:

```bash
python setup.py
```

This will:
- Install Python dependencies
- Check LuaLaTeX installation
- Create `.env` file template
- Provide setup instructions

## Configuration

### Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini API key (required for AI features)

### LuaLaTeX Configuration

The backend uses LuaLaTeX which provides:
- **OpenType font support** (modern fonts)
- **Better Unicode handling**
- **More flexible font management**
- **Modern LaTeX features**

## LuaLaTeX vs pdflatex

### LuaLaTeX Advantages:
- ✅ **OpenType fonts** - Modern font support
- ✅ **Better Unicode** - International character support
- ✅ **Flexible fonts** - More font options
- ✅ **Modern features** - Latest LaTeX capabilities
- ✅ **Better graphics** - Enhanced image support

### Supported Font Packages:
```latex
\usepackage{charter}                    # ✅ Supported
\usepackage[sfdefault]{FiraSans}       # ✅ Supported
\usepackage[sfdefault]{roboto}          # ✅ Supported
\usepackage[sfdefault]{noto-sans}      # ✅ Supported
\usepackage[default]{sourcesanspro}     # ✅ Supported
\usepackage{CormorantGaramond}         # ✅ Supported
```

## Error Handling

### Common Issues

1. **LuaLaTeX Not Installed**
   - Error: `lualatex: command not found`
   - Solution: Install LaTeX distribution with LuaLaTeX support

2. **Missing API Key**
   - Error: `AI analysis failed`
   - Solution: Set `GEMINI_API_KEY` in `.env`

3. **Invalid LaTeX Syntax**
   - Error: `LaTeX compilation failed`
   - Solution: Check LaTeX syntax in your content

### Debug Mode

Run with debug mode for detailed error messages:

```bash
export FLASK_ENV=development
python app.py
```

## Development

### Adding New Endpoints

1. Add new route in `app.py`
2. Update this README with endpoint documentation
3. Test with curl or Postman

### Testing Endpoints

```bash
# Health check
curl http://localhost:5000/health

# Convert LaTeX to PDF
curl -X POST http://localhost:5000/convert-latex \
  -H "Content-Type: application/json" \
  -d '{"latex_content": "\\documentclass{article}\\begin{document}Hello\\end{document}"}'

# AI analysis
curl -X POST http://localhost:5000/ai-parse \
  -H "Content-Type: application/json" \
  -d '{"document_content": "LaTeX content", "job_posting": "Job text", "document_type": "resume"}'
```

## Security Notes

- The backend runs on `localhost:5000` by default
- CORS is enabled for local development
- API keys are stored in environment variables
- No persistent storage of user data

## Troubleshooting

### Backend Won't Start
- Check if port 5000 is available
- Verify Python dependencies are installed
- Check for syntax errors in `app.py`

### PDF Generation Fails
- Verify LaTeX is installed: `pdflatex --version`
- Check LaTeX syntax in your content
- Look for error messages in console output

### AI Analysis Fails
- Verify `GEMINI_API_KEY` is set correctly
- Check internet connection
- Verify API key has sufficient quota

## License

This project is open source and available under the MIT License. 