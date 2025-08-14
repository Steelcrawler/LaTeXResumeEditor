# LaTeX Resume Editor Chrome Extension

A Chrome extension that allows you to edit LaTeX resumes and cover letters with AI-powered suggestions based on job postings.

## Features

- **Large LaTeX Text Editor**: Full-featured text editor for LaTeX content
- **Document Switching**: Switch between resume and cover letter editing
- **PDF Preview**: Real-time PDF rendering and download
- **AI-Powered Suggestions**: Get intelligent suggestions based on job postings using Gemini AI
- **Auto-Save**: Automatic saving every 30 seconds
- **Job Posting Analysis**: Automatically extracts job requirements from web pages

## Architecture

This project uses a **hybrid architecture** with both JavaScript and Python components:

### Frontend (Chrome Extension)
- **JavaScript**: Chrome extension with UI and document management
- **HTML/CSS**: User interface and styling
- **Chrome APIs**: Storage, messaging, and content scripts

### Backend (Python Flask Server)
- **Python Flask**: RESTful API for LaTeX processing and AI analysis
- **LaTeX Engine**: Real PDF generation using pdflatex
- **Gemini AI**: Advanced document analysis and suggestions

## Project Structure

```
LateXResumeEditor/
├── manifest.json              # Extension configuration
├── frontend/                  # Chrome extension UI
│   ├── popup.html            # Main popup interface
│   ├── popup.css             # Styles for the popup
│   └── popup.js              # Frontend JavaScript logic
├── backend/                   # Chrome extension backend
│   ├── background.js         # Background script for extension management
│   └── content.js            # Content script for job posting extraction
├── python_backend/           # Python Flask server
│   ├── app.py               # Main Flask application
│   ├── requirements.txt     # Python dependencies
│   ├── setup.py            # Setup script
│   └── README.md           # Python backend documentation
├── assets/                   # Static assets
│   └── icons/               # Extension icons
│       ├── icon16.png       # 16x16 icon
│       ├── icon48.png       # 48x48 icon
│       └── icon128.png      # 128x128 icon
└── README.md                # This file
```

## Setup Instructions

### 1. Set Up Python Backend

```bash
# Navigate to the python_backend directory
cd python_backend

# Run the setup script
python setup.py

# Or manually install dependencies
pip install -r requirements.txt

# Set your Gemini API key in .env file
echo "GEMINI_API_KEY=your-actual-api-key-here" > .env

# Start the Flask server
python app.py
```

The Python backend will be available at `http://localhost:5000`

### 2. Install LaTeX (Required for PDF Generation)

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

### 3. Load the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select this directory
4. The extension should appear in your extensions list

### 4. Configure the Extension

1. Click the extension icon in your browser toolbar
2. Enter your Gemini API key in the settings section
3. Click "Save API Key"

## Usage

### Basic Editing

1. Click the extension icon to open the editor
2. Switch between "Resume" and "Cover Letter" tabs
3. Edit your LaTeX content in the large text area
4. Click "Save" to manually save your changes (auto-save also enabled)

### PDF Rendering

1. Add LaTeX content to the editor
2. Click "Render PDF" to generate a preview
3. View the rendered PDF in the right panel
4. Click "Download PDF" to save the file

### AI Suggestions

1. Navigate to a job posting page
2. Open the extension and click "AI Suggestions"
3. The extension will analyze the job posting and your current content
4. Review the suggestions and click "Apply Suggestion" to use them

### Supported LaTeX Features

- All standard LaTeX commands and packages
- Section and subsection organization
- Bullet points and formatting
- Mathematical expressions
- Custom commands and environments

## API Integration

### Python Backend Endpoints

The Flask server provides these endpoints:

- **`POST /convert-latex`**: Converts LaTeX content to PDF
- **`POST /ai-parse`**: Analyzes documents using AI
- **`GET /health`**: Health check endpoint

### Frontend-Backend Communication

The Chrome extension communicates with the Python backend via HTTP requests:

```javascript
// Example: Convert LaTeX to PDF
const response = await fetch('http://localhost:5000/convert-latex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latex_content: content })
});
```

## Privacy & Security

- All document content is stored locally in Chrome storage
- API keys are stored securely in Chrome's encrypted storage
- Python backend runs locally on your machine
- No data is transmitted to external servers except for AI analysis
- Job posting content is only sent to Gemini API for analysis

## Troubleshooting

### Common Issues

1. **Python Backend Not Running**
   - Error: "Python backend not available"
   - Solution: Start the Flask server with `python app.py`

2. **LaTeX Not Installed**
   - Error: "Failed to generate PDF"
   - Solution: Install LaTeX distribution (see setup instructions)

3. **API Key Not Working**
   - Error: "AI analysis failed"
   - Solution: Verify your Gemini API key in the `.env` file

4. **Extension Not Loading**
   - Error: Extension won't load in Chrome
   - Solution: Check manifest.json and file structure

### Error Messages

- "Python backend not available" - Start the Flask server
- "LaTeX compilation failed" - Check LaTeX syntax and installation
- "AI analysis failed" - Check API key and internet connection
- "Failed to generate PDF" - Verify LaTeX is installed

## Development

### Frontend Development
- Edit files in `frontend/` directory
- Test changes by refreshing the extension in Chrome

### Backend Development
- Edit files in `python_backend/` directory
- Restart Flask server to apply changes

### Adding New Features

1. **New API Endpoints**: Add to `python_backend/app.py`
2. **New UI Features**: Add to `frontend/popup.js`
3. **New LaTeX Features**: Update LaTeX template in backend

### Testing

```bash
# Test Python backend
curl http://localhost:5000/health

# Test LaTeX conversion
curl -X POST http://localhost:5000/convert-latex \
  -H "Content-Type: application/json" \
  -d '{"latex_content": "\\documentclass{article}\\begin{document}Hello\\end{document}"}'
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.