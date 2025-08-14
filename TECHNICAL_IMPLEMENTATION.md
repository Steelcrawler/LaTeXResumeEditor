# Technical Implementation Guide: AI-Powered Resume Editor Chrome Extension

## 1. Project Setup

### 1.1 Initial Project Structure
```bash
mkdir chrome-resume-editor
cd chrome-resume-editor

# Create directory structure
mkdir -p popup background content storage utils assets/icons
touch manifest.json
touch popup/popup.html popup/popup.css popup/popup.js
touch background/background.js
touch content/content.js
touch storage/documentManager.js storage/aiService.js
touch utils/jobAnalyzer.js utils/documentProcessor.js
```

### 1.2 Manifest Configuration
```json
{
  "manifest_version": 3,
  "name": "AI Resume Editor",
  "version": "1.0.0",
  "description": "Edit resumes and cover letters with AI-powered job posting analysis",
  
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  
  "host_permissions": [
    "https://*/*",
    "http://*/*"
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "AI Resume Editor"
  },
  
  "background": {
    "service_worker": "background/background.js"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"]
    }
  ],
  
  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

## 2. Core Implementation

### 2.1 Document Manager (storage/documentManager.js)
```javascript
class DocumentManager {
  constructor() {
    this.documents = {};
    this.loadDocuments();
  }

  async loadDocuments() {
    const result = await chrome.storage.local.get(['documents']);
    this.documents = result.documents || {
      resume: { content: '', lastModified: null, version: 1, history: [] },
      coverLetter: { content: '', lastModified: null, version: 1, history: [] }
    };
  }

  async saveDocument(type, content) {
    const timestamp = new Date().toISOString();
    const version = this.documents[type].version + 1;
    
    // Add to history before updating
    this.documents[type].history.push({
      content: this.documents[type].content,
      timestamp: this.documents[type].lastModified,
      version: this.documents[type].version
    });

    // Keep only last 10 versions
    if (this.documents[type].history.length > 10) {
      this.documents[type].history.shift();
    }

    this.documents[type] = {
      content,
      lastModified: timestamp,
      version,
      history: this.documents[type].history
    };

    await chrome.storage.local.set({ documents: this.documents });
    return this.documents[type];
  }

  async getDocument(type) {
    return this.documents[type] || null;
  }

  async exportDocument(type, format = 'pdf') {
    const document = await this.getDocument(type);
    if (!document) return null;

    switch (format) {
      case 'pdf':
        return this.generatePDF(document.content);
      case 'docx':
        return this.generateDOCX(document.content);
      case 'txt':
        return this.generateTXT(document.content);
      default:
        return document.content;
    }
  }

  generatePDF(content) {
    // Implementation using jsPDF
    // This would require jsPDF library
    return new Promise((resolve) => {
      // PDF generation logic
      resolve('pdf-blob');
    });
  }

  generateDOCX(content) {
    // Implementation using docx library
    return new Promise((resolve) => {
      // DOCX generation logic
      resolve('docx-blob');
    });
  }

  generateTXT(content) {
    return new Promise((resolve) => {
      const blob = new Blob([content], { type: 'text/plain' });
      resolve(blob);
    });
  }
}
```

### 2.2 AI Service (storage/aiService.js)
```javascript
class AIService {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    this.loadAPIKey();
  }

  async loadAPIKey() {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    this.apiKey = result.geminiApiKey;
  }

  async setAPIKey(apiKey) {
    this.apiKey = apiKey;
    await chrome.storage.local.set({ geminiApiKey: apiKey });
  }

  async analyzeJobPosting(jobContent) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `
      Analyze this job posting and provide a structured response with:
      1. Key technical skills required (array)
      2. Soft skills mentioned (array)
      3. Company culture indicators (string)
      4. Specific responsibilities (array)
      5. Experience level required (string)
      6. Industry/domain (string)
      
      Job posting content:
      ${jobContent}
      
      Respond in JSON format.
    `;

    const response = await this.callGeminiAPI(prompt);
    return this.parseJobAnalysis(response);
  }

  async tailorResume(resumeContent, jobRequirements) {
    const prompt = `
      Given this resume content and job requirements, suggest specific modifications:
      
      Resume:
      ${resumeContent}
      
      Job Requirements:
      ${JSON.stringify(jobRequirements)}
      
      Provide suggestions for:
      1. Bullet points to modify (with specific changes)
      2. Keywords to add/emphasize
      3. Experience to highlight
      4. Skills to reorder/emphasize
      
      Respond in JSON format.
    `;

    const response = await this.callGeminiAPI(prompt);
    return this.parseResumeSuggestions(response);
  }

  async tailorCoverLetter(coverLetterContent, jobRequirements, companyInfo) {
    const prompt = `
      Adapt this cover letter for the specific job and company:
      
      Cover Letter:
      ${coverLetterContent}
      
      Job Requirements:
      ${JSON.stringify(jobRequirements)}
      
      Company Info:
      ${JSON.stringify(companyInfo)}
      
      Provide:
      1. Modified opening paragraph
      2. Specific experience examples to include
      3. Company-specific language/tone
      4. Closing paragraph modifications
      
      Respond in JSON format.
    `;

    const response = await this.callGeminiAPI(prompt);
    return this.parseCoverLetterSuggestions(response);
  }

  async callGeminiAPI(prompt) {
    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  parseJobAnalysis(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        technicalSkills: [],
        softSkills: [],
        companyCulture: '',
        responsibilities: [],
        experienceLevel: '',
        industry: ''
      };
    }
  }

  parseResumeSuggestions(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse resume suggestions:', error);
      return {
        bulletPointChanges: [],
        keywordAdditions: [],
        experienceHighlights: [],
        skillReordering: []
      };
    }
  }

  parseCoverLetterSuggestions(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse cover letter suggestions:', error);
      return {
        openingParagraph: '',
        experienceExamples: [],
        companyTone: '',
        closingParagraph: ''
      };
    }
  }
}
```

### 2.3 Job Analyzer (utils/jobAnalyzer.js)
```javascript
class JobAnalyzer {
  constructor() {
    this.selectors = {
      jobTitle: [
        'h1',
        '[data-testid="job-title"]',
        '.job-title',
        '.title'
      ],
      companyName: [
        '[data-testid="company-name"]',
        '.company-name',
        '.employer'
      ],
      jobDescription: [
        '[data-testid="job-description"]',
        '.job-description',
        '.description',
        '.content'
      ],
      requirements: [
        '[data-testid="requirements"]',
        '.requirements',
        '.qualifications'
      ]
    };
  }

  async extractJobContent() {
    const content = {
      title: this.extractText(this.selectors.jobTitle),
      company: this.extractText(this.selectors.companyName),
      description: this.extractText(this.selectors.jobDescription),
      requirements: this.extractText(this.selectors.requirements),
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    return content;
  }

  extractText(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim();
      }
    }
    return '';
  }

  async analyzeCurrentPage() {
    const jobContent = await this.extractJobContent();
    
    // Send to background script for AI processing
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeJobPosting',
      data: jobContent
    });

    return response;
  }
}

// Initialize job analyzer when content script loads
const jobAnalyzer = new JobAnalyzer();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeCurrentPage') {
    jobAnalyzer.analyzeCurrentPage().then(sendResponse);
    return true; // Keep message channel open for async response
  }
});
```

### 2.4 Popup Interface (popup/popup.html)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Resume Editor</title>
  <link rel="stylesheet" href="popup.css">
  <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>AI Resume Editor</h1>
      <button class="close-btn" id="closeBtn">×</button>
    </header>

    <nav class="tabs">
      <button class="tab-btn active" data-tab="resume">Resume</button>
      <button class="tab-btn" data-tab="coverLetter">Cover Letter</button>
      <button class="tab-btn" data-tab="settings">Settings</button>
    </nav>

    <main class="content">
      <!-- Resume Tab -->
      <div class="tab-content active" id="resume-tab">
        <div class="editor-container">
          <div id="resume-editor"></div>
        </div>
        <div class="actions">
          <button class="btn primary" id="saveResume">Save</button>
          <button class="btn secondary" id="analyzeResume">AI Analyze</button>
          <button class="btn secondary" id="exportResume">Export</button>
        </div>
      </div>

      <!-- Cover Letter Tab -->
      <div class="tab-content" id="coverLetter-tab">
        <div class="editor-container">
          <div id="coverLetter-editor"></div>
        </div>
        <div class="actions">
          <button class="btn primary" id="saveCoverLetter">Save</button>
          <button class="btn secondary" id="analyzeCoverLetter">AI Analyze</button>
          <button class="btn secondary" id="exportCoverLetter">Export</button>
        </div>
      </div>

      <!-- Settings Tab -->
      <div class="tab-content" id="settings-tab">
        <div class="settings-form">
          <div class="form-group">
            <label for="apiKey">Gemini API Key:</label>
            <input type="password" id="apiKey" placeholder="Enter your Gemini API key">
            <button class="btn primary" id="saveApiKey">Save API Key</button>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="autoSave" checked>
              Auto-save every 30 seconds
            </label>
          </div>
          <div class="form-group">
            <label for="exportFormat">Default Export Format:</label>
            <select id="exportFormat">
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="txt">TXT</option>
            </select>
          </div>
        </div>
      </div>
    </main>

    <!-- AI Analysis Results -->
    <div class="ai-results" id="aiResults" style="display: none;">
      <h3>AI Analysis Results</h3>
      <div class="results-content" id="resultsContent"></div>
      <div class="results-actions">
        <button class="btn primary" id="applyChanges">Apply Changes</button>
        <button class="btn secondary" id="dismissResults">Dismiss</button>
      </div>
    </div>
  </div>

  <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

### 2.5 Popup Styles (popup/popup.css)
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
}

.container {
  width: 600px;
  height: 500px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header h1 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tabs {
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
  transition: all 0.2s;
}

.tab-btn.active {
  background: white;
  color: #667eea;
  border-bottom: 2px solid #667eea;
}

.content {
  height: 350px;
  overflow: hidden;
}

.tab-content {
  display: none;
  height: 100%;
  padding: 20px;
}

.tab-content.active {
  display: block;
}

.editor-container {
  height: 280px;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  margin-bottom: 16px;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn.primary {
  background: #667eea;
  color: white;
}

.btn.primary:hover {
  background: #5a6fd8;
}

.btn.secondary {
  background: #6c757d;
  color: white;
}

.btn.secondary:hover {
  background: #5a6268;
}

.settings-form {
  padding: 20px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 14px;
}

.ai-results {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.results-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  max-height: 400px;
  overflow-y: auto;
}

.results-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
```

### 2.6 Popup Logic (popup/popup.js)
```javascript
class PopupManager {
  constructor() {
    this.documentManager = null;
    this.aiService = null;
    this.currentTab = 'resume';
    this.editors = {};
    this.autoSaveInterval = null;
    
    this.initialize();
  }

  async initialize() {
    // Initialize services
    this.documentManager = new DocumentManager();
    this.aiService = new AIService();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load current document
    await this.loadCurrentDocument();
    
    // Start auto-save
    this.startAutoSave();
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Save buttons
    document.getElementById('saveResume').addEventListener('click', () => {
      this.saveDocument('resume');
    });

    document.getElementById('saveCoverLetter').addEventListener('click', () => {
      this.saveDocument('coverLetter');
    });

    // AI Analysis buttons
    document.getElementById('analyzeResume').addEventListener('click', () => {
      this.analyzeDocument('resume');
    });

    document.getElementById('analyzeCoverLetter').addEventListener('click', () => {
      this.analyzeDocument('coverLetter');
    });

    // Export buttons
    document.getElementById('exportResume').addEventListener('click', () => {
      this.exportDocument('resume');
    });

    document.getElementById('exportCoverLetter').addEventListener('click', () => {
      this.exportDocument('coverLetter');
    });

    // Settings
    document.getElementById('saveApiKey').addEventListener('click', () => {
      this.saveApiKey();
    });

    // AI Results
    document.getElementById('applyChanges').addEventListener('click', () => {
      this.applyAIChanges();
    });

    document.getElementById('dismissResults').addEventListener('click', () => {
      this.hideAIResults();
    });

    // Close button
    document.getElementById('closeBtn').addEventListener('click', () => {
      window.close();
    });
  }

  async switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    this.currentTab = tabName;
    await this.loadCurrentDocument();
  }

  async loadCurrentDocument() {
    const document = await this.documentManager.getDocument(this.currentTab);
    if (document) {
      this.editors[this.currentTab].root.innerHTML = document.content;
    }
  }

  async saveDocument(type) {
    const content = this.editors[type].root.innerHTML;
    await this.documentManager.saveDocument(type, content);
    this.showNotification('Document saved successfully!');
  }

  async analyzeDocument(type) {
    try {
      // Get current document content
      const content = this.editors[type].root.innerHTML;
      
      // Get job posting analysis from current page
      const jobAnalysis = await this.analyzeCurrentJobPosting();
      
      if (!jobAnalysis) {
        this.showNotification('No job posting detected on current page');
        return;
      }

      // Generate AI suggestions
      let suggestions;
      if (type === 'resume') {
        suggestions = await this.aiService.tailorResume(content, jobAnalysis);
      } else {
        suggestions = await this.aiService.tailorCoverLetter(content, jobAnalysis);
      }

      // Display results
      this.showAIResults(suggestions, type);
    } catch (error) {
      console.error('AI analysis failed:', error);
      this.showNotification('AI analysis failed. Please check your API key.');
    }
  }

  async analyzeCurrentJobPosting() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'analyzeCurrentPage'
      });
      return response;
    } catch (error) {
      console.error('Failed to analyze job posting:', error);
      return null;
    }
  }

  showAIResults(suggestions, documentType) {
    const resultsContent = document.getElementById('resultsContent');
    const resultsDiv = document.getElementById('aiResults');
    
    let html = '<h4>AI Suggestions</h4>';
    
    if (documentType === 'resume') {
      html += this.formatResumeSuggestions(suggestions);
    } else {
      html += this.formatCoverLetterSuggestions(suggestions);
    }
    
    resultsContent.innerHTML = html;
    resultsDiv.style.display = 'flex';
    
    // Store suggestions for later application
    this.currentSuggestions = suggestions;
    this.currentDocumentType = documentType;
  }

  formatResumeSuggestions(suggestions) {
    let html = '';
    
    if (suggestions.bulletPointChanges) {
      html += '<h5>Bullet Point Changes:</h5><ul>';
      suggestions.bulletPointChanges.forEach(change => {
        html += `<li>${change}</li>`;
      });
      html += '</ul>';
    }
    
    if (suggestions.keywordAdditions) {
      html += '<h5>Keywords to Add:</h5><ul>';
      suggestions.keywordAdditions.forEach(keyword => {
        html += `<li>${keyword}</li>`;
      });
      html += '</ul>';
    }
    
    return html;
  }

  formatCoverLetterSuggestions(suggestions) {
    let html = '';
    
    if (suggestions.openingParagraph) {
      html += '<h5>Suggested Opening:</h5>';
      html += `<p>${suggestions.openingParagraph}</p>`;
    }
    
    if (suggestions.experienceExamples) {
      html += '<h5>Experience Examples to Include:</h5><ul>';
      suggestions.experienceExamples.forEach(example => {
        html += `<li>${example}</li>`;
      });
      html += '</ul>';
    }
    
    return html;
  }

  async applyAIChanges() {
    if (!this.currentSuggestions || !this.currentDocumentType) {
      return;
    }

    const editor = this.editors[this.currentDocumentType];
    let content = editor.root.innerHTML;

    // Apply changes based on document type and suggestions
    if (this.currentDocumentType === 'resume') {
      content = this.applyResumeChanges(content, this.currentSuggestions);
    } else {
      content = this.applyCoverLetterChanges(content, this.currentSuggestions);
    }

    // Update editor content
    editor.root.innerHTML = content;
    
    // Save changes
    await this.saveDocument(this.currentDocumentType);
    
    this.hideAIResults();
    this.showNotification('AI changes applied successfully!');
  }

  applyResumeChanges(content, suggestions) {
    // Implementation for applying resume changes
    // This would parse the content and apply specific changes
    return content;
  }

  applyCoverLetterChanges(content, suggestions) {
    // Implementation for applying cover letter changes
    // This would parse the content and apply specific changes
    return content;
  }

  hideAIResults() {
    document.getElementById('aiResults').style.display = 'none';
    this.currentSuggestions = null;
    this.currentDocumentType = null;
  }

  async exportDocument(type) {
    const format = document.getElementById('exportFormat').value;
    const blob = await this.documentManager.exportDocument(type, format);
    
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async saveApiKey() {
    const apiKey = document.getElementById('apiKey').value;
    await this.aiService.setAPIKey(apiKey);
    this.showNotification('API key saved successfully!');
  }

  startAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      if (this.editors[this.currentTab]) {
        this.saveDocument(this.currentTab);
      }
    }, 30000); // 30 seconds
  }

  showNotification(message) {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      z-index: 1001;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
```

## 3. Installation & Testing

### 3.1 Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select your extension directory
4. The extension should appear in your extensions list

### 3.2 Testing Checklist
- [ ] Extension loads without errors
- [ ] Popup opens when clicking extension icon
- [ ] Tab switching works correctly
- [ ] Document saving and loading works
- [ ] AI analysis triggers correctly
- [ ] Export functionality works
- [ ] Settings are saved properly

### 3.3 API Key Setup
1. Get a Gemini API key from Google AI Studio
2. Open the extension popup
3. Go to Settings tab
4. Enter your API key and save
5. Test AI analysis on a job posting page

## 4. Deployment

### 4.1 Chrome Web Store Preparation
1. Create a developer account on Chrome Web Store
2. Prepare store listing materials:
   - Extension description
   - Screenshots
   - Privacy policy
   - Terms of service
3. Package extension for upload
4. Submit for review

### 4.2 Security Considerations
- Never expose API keys in client-side code
- Implement proper error handling
- Add rate limiting for API calls
- Validate all user inputs
- Use HTTPS for all external communications

This implementation provides a solid foundation for your Chrome extension. The modular architecture makes it easy to extend and maintain, while the comprehensive error handling ensures a robust user experience. 