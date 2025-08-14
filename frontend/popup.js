class LaTeXResumeEditor {
    constructor() {
        this.currentDocument = 'resume';
        this.documents = {
            resume: '',
            coverLetter: ''
        };
        this.apiKey = null;
        this.autoSaveInterval = null;
        this.currentPdfUrl = null;
        this.currentPdfData = null; // Store base64 PDF data for uploading
        this.savedPDFs = {}; // Store saved PDF data for each document type
        this.uploadFields = []; // Store detected upload fields
        this.backendUrl = 'http://localhost:5000'; // Python backend URL
        
        // Edit review system
        this.pendingEdits = []; // Array of edit objects with metadata
        this.currentEditIndex = 0; // Current edit being reviewed
        this.originalContent = ''; // Content before any edits were applied
        this.editReviewMode = false; // Whether we're in edit review mode
        this.savedOriginalContent = {}; // Store original content for each document type for revert functionality
        
        this.initialize();
    }

    async initialize() {
        // Load saved documents and API key
        await this.loadDocuments();
        await this.loadApiKey();
        
        // Load saved PDF data
        await this.loadSavedPDFs();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize line numbers
        this.initializeLineNumbers();
        
        // Load current document
        this.loadCurrentDocument();
        
        // Start auto-save
        this.startAutoSave();
        
        // Check backend health
        this.checkBackendHealth();
        
        // Check for upload fields on current page
        this.checkUploadFields();
        
        // Listen for upload field detection messages
        this.setupUploadFieldListener();
    }

    setupEventListeners() {
        // Document switching
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.switchDocument('resume');
        });
        
        document.getElementById('coverLetterBtn').addEventListener('click', () => {
            this.switchDocument('coverLetter');
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.switchDocument('settings');
        });

        // Save button
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveCurrentDocument();
        });

        // Extract keywords button
        document.getElementById('extractKeywordsBtn').addEventListener('click', () => {
            this.extractKeywords();
        });

        // Close keywords button
        document.getElementById('keywordsCloseBtn').addEventListener('click', () => {
            this.closeKeywords();
        });

        // Suggest edits button
        document.getElementById('suggestEditsBtn').addEventListener('click', () => {
            this.suggestEditsWithKeywords();
        });

        // Edit navigation controls
        document.getElementById('prevEditBtn').addEventListener('click', () => {
            this.navigateToEdit(-1);
        });

        document.getElementById('nextEditBtn').addEventListener('click', () => {
            this.navigateToEdit(1);
        });

        document.getElementById('approveEditBtn').addEventListener('click', () => {
            this.approveCurrentEdit();
        });

        document.getElementById('rejectEditBtn').addEventListener('click', () => {
            this.rejectCurrentEdit();
        });

        document.getElementById('finishEditsBtn').addEventListener('click', () => {
            this.finishEditReview();
        });

        // Save original and revert buttons
        document.getElementById('saveOriginalBtn').addEventListener('click', () => {
            this.saveOriginalContent();
        });

        document.getElementById('revertBtn').addEventListener('click', () => {
            this.revertToOriginal();
        });

        // Render PDF button
        document.getElementById('renderBtn').addEventListener('click', () => {
            this.renderPDF();
        });

        // Upload PDF button
        document.getElementById('uploadBtn').addEventListener('click', () => {
            this.uploadPDFToPage();
        });

        // API key save
        document.getElementById('saveApiKey').addEventListener('click', () => {
            this.saveApiKey();
        });

        // Auto-save on editor change
        document.getElementById('latexEditor').addEventListener('input', () => {
            if (this.currentDocument !== 'settings') {
                // Only update document content if not in edit review mode
                if (!this.editReviewMode) {
                    this.documents[this.currentDocument] = this.getEditorText();
                }
            }
            this.updateLineNumbers();
            this.updateRevertButtonState();
        });

        // Handle paste events for contenteditable
        document.getElementById('latexEditor').addEventListener('paste', (e) => {
            // If in edit review mode, prevent paste to maintain highlighting
            if (this.editReviewMode) {
                e.preventDefault();
                this.showNotification('Please finish edit review before making changes', 'warning');
                return;
            }
            
            // For normal paste, let it happen and update line numbers
            setTimeout(() => {
                this.updateLineNumbers();
                if (this.currentDocument !== 'settings') {
                    this.documents[this.currentDocument] = this.getEditorText();
                }
            }, 10);
        });

        // Prevent editing during review mode
        document.getElementById('latexEditor').addEventListener('keydown', (e) => {
            if (this.editReviewMode && e.key.length === 1) { // Only prevent printable characters
                e.preventDefault();
                this.showNotification('Please finish edit review before making changes', 'warning');
            }
        });

        // Keyboard shortcuts for edit review
        document.addEventListener('keydown', (e) => {
            if (this.editReviewMode) {
                if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.navigateToEdit(-1);
                } else if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.navigateToEdit(1);
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.approveCurrentEdit();
                } else if (e.key === 'Backspace' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.rejectCurrentEdit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.finishEditReview();
                }
            }
        });
    }

    async loadDocuments() {
        try {
            const result = await chrome.storage.local.get(['documents', 'savedOriginalContent']);
            if (result.documents) {
                this.documents = result.documents;
            }
            if (result.savedOriginalContent) {
                this.savedOriginalContent = result.savedOriginalContent;
            }
        } catch (error) {
            console.error('Error loading documents:', error);
        }
    }

    async loadApiKey() {
        try {
            const result = await chrome.storage.local.get(['geminiApiKey']);
            this.apiKey = result.geminiApiKey || null;
            if (this.apiKey) {
                document.getElementById('apiKey').value = this.apiKey;
            }
        } catch (error) {
            console.error('Error loading API key:', error);
        }
    }

    async loadSavedPDFs() {
        try {
            const result = await chrome.storage.local.get(['savedPDFs']);
            if (result.savedPDFs) {
                this.savedPDFs = result.savedPDFs;
                
                // If we have a saved PDF for the current document, restore it
                if (this.savedPDFs[this.currentDocument]) {
                    this.currentPdfData = this.savedPDFs[this.currentDocument].pdfData;
                    const pdfBytes = this.base64ToBlob(this.currentPdfData, 'application/pdf');
                    const pdfUrl = URL.createObjectURL(pdfBytes);
                    this.currentPdfUrl = pdfUrl;
                    this.displayPDF(pdfUrl);
                    this.updateUploadButtonState();
                }
            }
        } catch (error) {
            console.error('Error loading saved PDFs:', error);
        }
    }

    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.backendUrl}/health`);
            if (response.ok) {
                console.log('✅ Python backend is running');
            } else {
                console.warn('⚠️ Python backend health check failed');
            }
        } catch (error) {
            console.warn('⚠️ Python backend not available:', error.message);
            this.showNotification('Python backend not available. Some features may not work.', 'warning');
        }
    }

    // Helper methods for contenteditable div
    getEditorText() {
        const editor = document.getElementById('latexEditor');
        return editor.textContent || editor.innerText || '';
    }

    setEditorText(text) {
        const editor = document.getElementById('latexEditor');
        editor.textContent = text;
    }

    setEditorHTML(html) {
        const editor = document.getElementById('latexEditor');
        editor.innerHTML = html;
    }

    getEditorHTML() {
        const editor = document.getElementById('latexEditor');
        return editor.innerHTML;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    switchDocument(documentType) {
        // Save current document if switching from a document type
        if (this.currentDocument !== 'settings') {
            this.documents[this.currentDocument] = this.getEditorText();
        }
        
        // Update UI
        document.getElementById('resumeBtn').classList.toggle('active', documentType === 'resume');
        document.getElementById('coverLetterBtn').classList.toggle('active', documentType === 'coverLetter');
        document.getElementById('settingsBtn').classList.toggle('active', documentType === 'settings');
        
        // Show/hide appropriate content
        const editorContent = document.getElementById('editorContent');
        const settingsContent = document.getElementById('settingsContent');
        
        if (documentType === 'settings') {
            editorContent.style.display = 'none';
            settingsContent.style.display = 'flex';
        } else {
            editorContent.style.display = 'flex';
            settingsContent.style.display = 'none';
        }
        
        // Update current document
        this.currentDocument = documentType;
        
        // Load new document if not settings
        if (documentType !== 'settings') {
            this.loadCurrentDocument();
            // Clear PDF viewer first, then load saved PDF (clearPDFViewer will call loadSavedPDFForDocument)
            this.clearPDFViewer();
            
            // Recheck upload fields for the new document type
            this.checkUploadFields();
        }
        
        // Update upload button state when switching documents
        this.updateUploadButtonState();
        
        // Update revert button state
        this.updateRevertButtonState();
        
        const displayName = documentType === 'settings' ? 'Settings' : documentType;
        this.showNotification(`Switched to ${displayName}`);
    }

    loadCurrentDocument() {
        if (this.currentDocument !== 'settings') {
            this.setEditorText(this.documents[this.currentDocument] || '');
            this.updateLineNumbers();
            this.updateRevertButtonState();
        }
    }

    loadSavedPDFForDocument(documentType) {
        if (this.savedPDFs[documentType]) {
            this.currentPdfData = this.savedPDFs[documentType].pdfData;
            const pdfBytes = this.base64ToBlob(this.currentPdfData, 'application/pdf');
            const pdfUrl = URL.createObjectURL(pdfBytes);
            this.currentPdfUrl = pdfUrl;
            this.displayPDF(pdfUrl);
            this.updateUploadButtonState();
        }
    }

    async saveCurrentDocument() {
        try {
            if (this.currentDocument !== 'settings') {
                this.documents[this.currentDocument] = this.getEditorText();
                await chrome.storage.local.set({ documents: this.documents });
                this.showNotification('Document saved successfully!');
            } else {
                this.showNotification('Use the Save API Key button in settings');
            }
        } catch (error) {
            console.error('Error saving document:', error);
            this.showNotification('Error saving document', 'error');
        }
    }

    async saveApiKey() {
        const apiKey = document.getElementById('apiKey').value.trim();
        if (!apiKey) {
            this.showNotification('Please enter a valid API key', 'error');
            return;
        }

        try {
            this.apiKey = apiKey;
            await chrome.storage.local.set({ geminiApiKey: apiKey });
            this.showNotification('API key saved successfully!');
        } catch (error) {
            console.error('Error saving API key:', error);
            this.showNotification('Error saving API key', 'error');
        }
    }

    async savePDFToStorage(pdfData, latexContent) {
        try {
            // Update the savedPDFs object
            this.savedPDFs[this.currentDocument] = {
                pdfData: pdfData,
                latexContent: latexContent,
                timestamp: new Date().toISOString(),
                filename: `${this.currentDocument}_${new Date().toISOString().split('T')[0]}.pdf`
            };
            
            // Save to Chrome storage
            await chrome.storage.local.set({ savedPDFs: this.savedPDFs });
            
            console.log(`PDF saved for ${this.currentDocument}`);
        } catch (error) {
            console.error('Error saving PDF to storage:', error);
            this.showNotification('Error saving PDF to storage', 'warning');
        }
    }

    async renderPDF() {
        const content = this.getEditorText();
        if (!content.trim()) {
            this.showNotification('Please add some LaTeX content before rendering', 'error');
            return;
        }

        // Show loading state
        document.getElementById('renderBtn').classList.add('loading');
        document.getElementById('renderBtn').textContent = 'Rendering...';

        try {
            // Call Python backend for PDF conversion
            const response = await fetch(`${this.backendUrl}/convert-latex`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    latex_content: content
                })
            });

            const result = await response.json();

            if (result.success && result.pdf_base64) {
                // Convert base64 to blob URL
                const pdfBytes = this.base64ToBlob(result.pdf_base64, 'application/pdf');
                const pdfUrl = URL.createObjectURL(pdfBytes);
                
                this.displayPDF(pdfUrl);
                this.currentPdfUrl = pdfUrl;
                this.currentPdfData = result.pdf_base64; // Store for uploading
                
                // Save PDF data to Chrome storage
                await this.savePDFToStorage(result.pdf_base64, content);
                
                this.updateUploadButtonState();
                this.showNotification('PDF generated and saved successfully!');
            } else {
                throw new Error(result.error || 'Failed to generate PDF');
            }
            
        } catch (error) {
            console.error('Error rendering PDF:', error);
            this.showNotification(`Error rendering PDF: ${error.message}`, 'error');
        } finally {
            // Remove loading state
            document.getElementById('renderBtn').classList.remove('loading');
            document.getElementById('renderBtn').textContent = 'Render PDF';
        }
    }

    base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    displayPDF(pdfUrl) {
        const pdfViewer = document.getElementById('pdfViewer');
        
        // Clear existing content
        pdfViewer.innerHTML = '';
        
        // Create iframe for PDF display with Chrome's native renderer
        const iframe = document.createElement('iframe');
        iframe.src = pdfUrl;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.title = 'PDF Preview';
        
        // Add right-click context menu functionality
        iframe.addEventListener('contextmenu', (e) => {
            // Let Chrome handle the native PDF context menu (includes download, print, etc.)
            e.stopPropagation();
        });
        
        pdfViewer.appendChild(iframe);
    }

    clearPDFViewer() {
        const pdfViewer = document.getElementById('pdfViewer');
        pdfViewer.innerHTML = `
            <div class="pdf-placeholder">
                <div class="placeholder-icon">📄</div>
                <p>Click "Render PDF" to generate a preview</p>
            </div>
        `;
        this.currentPdfUrl = null;
        this.currentPdfData = null; // Clear PDF data
        this.updateUploadButtonState();
        
        // Load saved PDF for the current document if available
        this.loadSavedPDFForDocument(this.currentDocument);
    }

    async extractKeywords() {
        // Show loading state
        document.getElementById('extractKeywordsBtn').classList.add('loading');
        document.getElementById('extractKeywordsBtn').textContent = 'Extracting...';

        try {
            // Get job posting content from current page
            const jobContent = await this.getJobPostingContent();
            
            if (!jobContent || jobContent === 'No job posting detected on current page') {
                throw new Error('No job posting found on current page. Please navigate to a job posting first.');
            }

            // Show keywords section and loading state
            document.getElementById('keywordsSection').style.display = 'block';
            document.getElementById('keywordsContainer').innerHTML = '<div class="keywords-loading">Extracting keywords...</div>';

            // Call Python backend for keyword extraction
            const response = await fetch(`${this.backendUrl}/extract-keywords`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    job_posting: jobContent,
                    api_key: this.apiKey // Send API key from settings
                })
            });

            const result = await response.json();

            if (result.success && result.keywords) {
                // Display keywords as pills
                this.displayKeywords(result.keywords);
                this.showNotification('Keywords extracted successfully!', 'success');
            } else {
                throw new Error(result.error || 'Keyword extraction failed');
            }
            
        } catch (error) {
            console.error('Error extracting keywords:', error);
            document.getElementById('keywordsContainer').innerHTML = 
                `<div class="keywords-error">Error: ${error.message}</div>`;
            this.showNotification(`Error extracting keywords: ${error.message}`, 'error');
        } finally {
            // Remove loading state
            document.getElementById('extractKeywordsBtn').classList.remove('loading');
            document.getElementById('extractKeywordsBtn').textContent = 'Extract Keywords';
        }
    }

    displayKeywords(keywords) {
        const container = document.getElementById('keywordsContainer');
        
        if (!keywords || keywords.length === 0) {
            container.innerHTML = '<div class="keywords-error">No keywords found</div>';
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Create pills for each keyword
        keywords.forEach((keyword, index) => {
            const pill = document.createElement('button');
            pill.className = 'keyword-pill';
            pill.textContent = keyword;
            pill.title = `Click to select "${keyword}" for AI suggestions`;
            pill.dataset.keyword = keyword;
            
            // Add click handler to select/deselect keywords
            pill.addEventListener('click', () => {
                pill.classList.toggle('selected');
                this.updateSuggestionsButtonVisibility();
            });

            container.appendChild(pill);
        });
    }

    updateSuggestionsButtonVisibility() {
        const selectedKeywords = document.querySelectorAll('.keyword-pill.selected');
        const actionsDiv = document.getElementById('keywordsActions');
        const suggestBtn = document.getElementById('suggestEditsBtn');
        
        if (selectedKeywords.length > 0) {
            actionsDiv.style.display = 'block';
            suggestBtn.textContent = `Suggest Edits with ${selectedKeywords.length} Selected Keyword${selectedKeywords.length > 1 ? 's' : ''}`;
        } else {
            actionsDiv.style.display = 'none';
        }
    }

    getSelectedKeywords() {
        const selectedPills = document.querySelectorAll('.keyword-pill.selected');
        return Array.from(selectedPills).map(pill => pill.dataset.keyword);
    }

    closeKeywords() {
        document.getElementById('keywordsSection').style.display = 'none';
        document.getElementById('keywordsContainer').innerHTML = '';
        document.getElementById('keywordsActions').style.display = 'none';
    }

    async suggestEditsWithKeywords() {
        const selectedKeywords = this.getSelectedKeywords();
        if (selectedKeywords.length === 0) {
            this.showNotification('Please select at least one keyword first', 'error');
            return;
        }

        const currentContent = this.getEditorText();
        if (!currentContent.trim()) {
            this.showNotification('Please add some content before getting suggestions', 'error');
            return;
        }

        // Show loading state
        const suggestBtn = document.getElementById('suggestEditsBtn');
        suggestBtn.classList.add('loading');
        suggestBtn.textContent = 'Generating suggestions...';

        try {
            // Send content without line numbers since we now use text-based targeting
            const endpoint = this.currentDocument === 'coverLetter' ? 'suggest-cover-letter-edits' : 'suggest-resume-edits';
            
            // Call Python backend for suggestions
            const response = await fetch(`${this.backendUrl}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    document_content: currentContent,
                    selected_keywords: selectedKeywords,
                    document_type: this.currentDocument,
                    api_key: this.apiKey // Send API key from settings
                })
            });

            const result = await response.json();

            console.log('[DEBUG] Received suggestions from backend:', result);
            console.log('[DEBUG] Number of suggestions:', result.suggestions?.length || 0);
            
            if (result.suggestions) {
                result.suggestions.forEach((suggestion, index) => {
                    console.log(`[DEBUG] Frontend Suggestion ${index + 1}:`, suggestion);
                });
            }

            if (result.success && result.suggestions && result.suggestions.length > 0) {
                // Start edit review mode
                this.startEditReview(result.suggestions, currentContent);
                this.showNotification(`Found ${result.suggestions.length} suggestion${result.suggestions.length > 1 ? 's' : ''} to review!`, 'success');
            } else {
                throw new Error(result.error || 'No suggestions generated');
            }
            
        } catch (error) {
            console.error('Error getting suggestions:', error);
            this.showNotification(`Error getting suggestions: ${error.message}`, 'error');
        } finally {
            // Remove loading state
            suggestBtn.classList.remove('loading');
            this.updateSuggestionsButtonVisibility(); // Reset button text
        }
    }

    startEditReview(suggestions, originalContent) {
        console.log('[DEBUG] Starting edit review with suggestions:', suggestions);
        console.log('[DEBUG] Original content length:', originalContent.length);
        
        // Store the original content and suggestions
        this.originalContent = originalContent;
        this.pendingEdits = suggestions.map((suggestion, index) => ({
            ...suggestion,
            id: suggestion.id || index, // Use suggestion ID or fallback to index
            status: 'pending', // 'pending', 'approved', 'rejected'
            originalText: suggestion.target_text || ''
        }));
        
        console.log('[DEBUG] Processed pending edits:', this.pendingEdits);
        
        this.currentEditIndex = 0;
        this.editReviewMode = true;
        
        // Apply all edits with visual highlighting
        this.renderEditsWithHighlighting();
        
        // Show navigation controls
        document.getElementById('editNavigation').style.display = 'flex';
        
        // Navigate to first edit
        this.updateEditNavigation();
        this.focusOnCurrentEdit();
    }

    findFlexibleMatch(content, target) {
        // First try exact match
        let index = content.indexOf(target);
        if (index !== -1) return index;
        
        // Try with normalized line endings
        const normalizedTarget = target.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        index = normalizedContent.indexOf(normalizedTarget);
        if (index !== -1) return index;
        
        // Try with trimmed whitespace on each line
        const trimmedTarget = target.split('\n').map(line => line.trim()).join('\n');
        const contentLines = content.split('\n');
        for (let i = 0; i <= contentLines.length - trimmedTarget.split('\n').length; i++) {
            const candidateLines = contentLines.slice(i, i + trimmedTarget.split('\n').length);
            const candidateTrimmed = candidateLines.map(line => line.trim()).join('\n');
            if (candidateTrimmed === trimmedTarget) {
                // Calculate the original position
                return contentLines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
            }
        }
        
        return -1;
    }
    
    convertNormalizedIndex(originalContent, normalizedIndex, targetLength) {
        // This is a simplified conversion - in practice you'd need more sophisticated logic
        // For now, try to find the approximate position
        let normalizedPos = 0;
        let originalPos = 0;
        
        while (normalizedPos < normalizedIndex && originalPos < originalContent.length) {
            if (originalContent[originalPos].match(/\s/)) {
                // Skip consecutive whitespace in original, count as single space in normalized
                while (originalPos < originalContent.length && originalContent[originalPos].match(/\s/)) {
                    originalPos++;
                }
                normalizedPos++;
            } else {
                originalPos++;
                normalizedPos++;
            }
        }
        
        return originalPos;
    }

    renderEditsWithHighlighting() {
        const editor = document.getElementById('latexEditor');
        let content = this.originalContent;
        
        // Create a working copy to apply all edits
        let workingContent = content;
        const appliedEdits = [];
        
        // Process each edit and find its position in the content
        this.pendingEdits.forEach((edit, index) => {
            const targetText = edit.target_text;
            const replacementText = edit.replacement_text;
            
            console.log(`[DEBUG] Processing edit ${index + 1}:`, edit.id);
            console.log(`[DEBUG] Target text (${targetText.length} chars):`, JSON.stringify(targetText));
            
            if (edit.type === 'replace') {
                // Find the target text in the working content with flexible matching
                let targetIndex = this.findFlexibleMatch(workingContent, targetText);
                
                if (targetIndex !== -1) {
                    console.log(`[DEBUG] Found target at index ${targetIndex}`);
                } else {
                    console.log(`[DEBUG] Target not found, attempting fuzzy search...`);
                    // Try a more lenient search by normalizing whitespace
                    const normalizedTarget = targetText.replace(/\s+/g, ' ').trim();
                    const normalizedContent = workingContent.replace(/\s+/g, ' ');
                    const normalizedIndex = normalizedContent.indexOf(normalizedTarget);
                    
                    if (normalizedIndex !== -1) {
                        // Convert back to original position
                        targetIndex = this.convertNormalizedIndex(workingContent, normalizedIndex, normalizedTarget.length);
                        console.log(`[DEBUG] Found via fuzzy search at index ${targetIndex}`);
                    }
                }
                
                if (targetIndex !== -1) {
                    appliedEdits.push({
                        ...edit,
                        startIndex: targetIndex,
                        endIndex: targetIndex + targetText.length,
                        editIndex: index
                    });
                    // Replace in working content to get final preview
                    workingContent = workingContent.replace(targetText, replacementText);
                } else {
                    console.log(`[DEBUG] Could not find target text for edit: ${edit.id}`);
                    console.log(`[DEBUG] First 100 chars of content:`, workingContent.substring(0, 100));
                }
            } else if (edit.type === 'insert_after') {
                // Find the target text and insert after it
                let targetIndex = this.findFlexibleMatch(workingContent, targetText);
                
                if (targetIndex !== -1) {
                    console.log(`[DEBUG] Found insert target at index ${targetIndex}`);
                    const insertPosition = targetIndex + targetText.length;
                    appliedEdits.push({
                        ...edit,
                        startIndex: insertPosition,
                        endIndex: insertPosition,
                        editIndex: index
                    });
                    // Insert the new text
                    workingContent = workingContent.slice(0, insertPosition) + 
                                  '\n' + replacementText + 
                                  workingContent.slice(insertPosition);
                } else {
                    console.log(`[DEBUG] Could not find insert target for edit: ${edit.id}`);
                }
            }
        });
        
        // Now create HTML with highlighting based on original positions
        let htmlContent = '';
        let currentIndex = 0;
        
        // Sort edits by position
        appliedEdits.sort((a, b) => a.startIndex - b.startIndex);
        
        appliedEdits.forEach(edit => {
            // Add content before this edit
            htmlContent += this.escapeHtml(content.slice(currentIndex, edit.startIndex));
            
            // Add the highlighted edit
            const isCurrentEdit = edit.editIndex === this.currentEditIndex;
            const highlightClass = isCurrentEdit ? 'edit-highlight-current' : 'edit-highlight';
            
            if (edit.type === 'replace') {
                htmlContent += `<span class="${highlightClass}" data-edit-id="${edit.id}" title="${edit.description}">${this.escapeHtml(edit.replacement_text)}</span>`;
                currentIndex = edit.endIndex;
            } else if (edit.type === 'insert_after') {
                htmlContent += this.escapeHtml(content.slice(currentIndex, edit.endIndex));
                htmlContent += `<span class="${highlightClass}" data-edit-id="${edit.id}" title="${edit.description}">${this.escapeHtml(edit.replacement_text)}</span>`;
                currentIndex = edit.endIndex;
            }
        });
        
        // Add remaining content
        htmlContent += this.escapeHtml(content.slice(currentIndex));
        
        // Update editor with highlighted content
        this.setEditorHTML(htmlContent);
        this.updateLineNumbers();
    }

    updateEditNavigation() {
        const currentEdit = this.pendingEdits[this.currentEditIndex];
        const editCounter = document.getElementById('editCounter');
        
        // Show edit description and progress
        editCounter.innerHTML = `
            <div>Edit ${this.currentEditIndex + 1} of ${this.pendingEdits.length}</div>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">${currentEdit.description || 'No description'}</div>
            <div style="font-size: 10px; color: #888; margin-top: 1px;">Keywords: ${(currentEdit.keywords_used || []).join(', ')}</div>
        `;
        
        // Update button states
        document.getElementById('prevEditBtn').disabled = this.currentEditIndex === 0;
        document.getElementById('nextEditBtn').disabled = this.currentEditIndex === this.pendingEdits.length - 1;
        
        const approveBtn = document.getElementById('approveEditBtn');
        const rejectBtn = document.getElementById('rejectEditBtn');
        
        // Update button appearance based on edit status
        if (currentEdit.status === 'approved') {
            approveBtn.style.background = '#218838';
            approveBtn.textContent = '✓ Approved';
            rejectBtn.style.background = '#6c757d';
            rejectBtn.textContent = '✗';
        } else if (currentEdit.status === 'rejected') {
            approveBtn.style.background = '#6c757d';
            approveBtn.textContent = '✓';
            rejectBtn.style.background = '#c82333';
            rejectBtn.textContent = '✗ Rejected';
        } else {
            approveBtn.style.background = '#28a745';
            approveBtn.textContent = '✓ Approve';
            rejectBtn.style.background = '#dc3545';
            rejectBtn.textContent = '✗ Reject';
        }
    }

    focusOnCurrentEdit() {
        const editor = document.getElementById('latexEditor');
        const currentEdit = this.pendingEdits[this.currentEditIndex];
        
        // Re-render with updated highlighting
        this.renderEditsWithHighlighting();
        
        // Find the highlighted span for the current edit
        const highlightedSpan = editor.querySelector(`[data-edit-id="${currentEdit.id}"]`);
        
        if (highlightedSpan) {
            // Focus the editor
            editor.focus();
            
            // Scroll to the highlighted element
            highlightedSpan.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            
            // Highlight the specific span temporarily
            highlightedSpan.style.boxShadow = '0 0 10px rgba(255, 193, 7, 0.8)';
            setTimeout(() => {
                if (highlightedSpan.style) {
                    highlightedSpan.style.boxShadow = '';
                }
            }, 2000);
            
            // Update line numbers scroll
            setTimeout(() => {
                document.getElementById('lineNumbers').scrollTop = editor.scrollTop;
            }, 100);
        }
    }

    navigateToEdit(direction) {
        if (!this.editReviewMode) return;
        
        const newIndex = this.currentEditIndex + direction;
        if (newIndex >= 0 && newIndex < this.pendingEdits.length) {
            this.currentEditIndex = newIndex;
            this.updateEditNavigation();
            this.focusOnCurrentEdit();
        }
    }

    approveCurrentEdit() {
        if (!this.editReviewMode) return;
        
        this.pendingEdits[this.currentEditIndex].status = 'approved';
        this.updateEditNavigation();
        
        // Auto-advance to next edit if not at the end
        if (this.currentEditIndex < this.pendingEdits.length - 1) {
            setTimeout(() => this.navigateToEdit(1), 500);
        }
    }

    rejectCurrentEdit() {
        if (!this.editReviewMode) return;
        
        this.pendingEdits[this.currentEditIndex].status = 'rejected';
        this.updateEditNavigation();
        
        // Auto-advance to next edit if not at the end
        if (this.currentEditIndex < this.pendingEdits.length - 1) {
            setTimeout(() => this.navigateToEdit(1), 500);
        }
    }

    finishEditReview() {
        if (!this.editReviewMode) return;
        
        // Apply only approved edits
        const approvedEdits = this.pendingEdits.filter(edit => edit.status === 'approved');
        const rejectedCount = this.pendingEdits.filter(edit => edit.status === 'rejected').length;
        
        // Start with original content and apply approved edits
        let finalContent = this.originalContent;
        
        // Sort approved edits by position (reverse order to avoid position shifts)
        const sortedApprovedEdits = approvedEdits.sort((a, b) => {
            const aPos = finalContent.indexOf(a.target_text);
            const bPos = finalContent.indexOf(b.target_text);
            return bPos - aPos; // Reverse order
        });
        
        sortedApprovedEdits.forEach(edit => {
            const targetText = edit.target_text;
            const replacementText = edit.replacement_text;
            
            if (edit.type === 'replace') {
                // Replace the target text with replacement text
                finalContent = finalContent.replace(targetText, replacementText);
            } else if (edit.type === 'insert_after') {
                // Insert the replacement text after the target text
                const targetIndex = finalContent.indexOf(targetText);
                if (targetIndex !== -1) {
                    const insertPosition = targetIndex + targetText.length;
                    finalContent = finalContent.slice(0, insertPosition) + 
                                 '\n' + replacementText + 
                                 finalContent.slice(insertPosition);
                }
            }
        });
        
        // Update editor with final content (plain text)
        this.setEditorText(finalContent);
        this.documents[this.currentDocument] = finalContent;
        this.updateLineNumbers();
        
        // Clean up edit review mode
        this.editReviewMode = false;
        this.pendingEdits = [];
        this.currentEditIndex = 0;
        this.originalContent = '';
        
        // Hide navigation controls
        document.getElementById('editNavigation').style.display = 'none';
        
        // Show summary
        this.showNotification(
            `Applied ${approvedEdits.length} edit${approvedEdits.length !== 1 ? 's' : ''}${rejectedCount > 0 ? `, rejected ${rejectedCount}` : ''}!`, 
            'success'
        );
    }

    async saveOriginalContent() {
        try {
            const currentContent = this.getEditorText();
            if (!currentContent.trim()) {
                this.showNotification('No content to save as original', 'error');
                return;
            }

            // Store original content for the current document
            this.savedOriginalContent[this.currentDocument] = {
                content: currentContent,
                timestamp: new Date().toISOString(),
                filename: `${this.currentDocument}_original_${new Date().toISOString().split('T')[0]}`
            };

            // Save to Chrome storage
            await chrome.storage.local.set({ savedOriginalContent: this.savedOriginalContent });
            
            this.showNotification(`Original ${this.currentDocument} saved successfully!`, 'success');
            this.updateRevertButtonState();
            
        } catch (error) {
            console.error('Error saving original content:', error);
            this.showNotification('Error saving original content', 'error');
        }
    }

    async revertToOriginal() {
        try {
            const originalData = this.savedOriginalContent[this.currentDocument];
            if (!originalData || !originalData.content) {
                this.showNotification('No original content saved for this document', 'error');
                return;
            }

            // Show confirmation dialog
            const confirmRevert = confirm(
                `Are you sure you want to revert to the original ${this.currentDocument}?\n\n` + 
                `This will replace all current content with the version saved on ${new Date(originalData.timestamp).toLocaleDateString()}.\n\n` +
                `This action cannot be undone.`
            );

            if (!confirmRevert) {
                return;
            }

            // Exit edit review mode if active
            if (this.editReviewMode) {
                this.editReviewMode = false;
                this.pendingEdits = [];
                this.currentEditIndex = 0;
                this.originalContent = '';
                document.getElementById('editNavigation').style.display = 'none';
            }

            // Restore original content
            this.setEditorText(originalData.content);
            this.documents[this.currentDocument] = originalData.content;
            this.updateLineNumbers();

            // Save the reverted content
            await chrome.storage.local.set({ documents: this.documents });
            
            this.showNotification(`Reverted to original ${this.currentDocument} from ${new Date(originalData.timestamp).toLocaleDateString()}!`, 'success');
            
        } catch (error) {
            console.error('Error reverting to original:', error);
            this.showNotification('Error reverting to original', 'error');
        }
    }

    updateRevertButtonState() {
        const revertBtn = document.getElementById('revertBtn');
        const saveOriginalBtn = document.getElementById('saveOriginalBtn');
        
        if (!revertBtn || !saveOriginalBtn) return;

        const hasOriginal = this.savedOriginalContent[this.currentDocument] && 
                           this.savedOriginalContent[this.currentDocument].content;
        
        // Update revert button
        revertBtn.disabled = !hasOriginal;
        if (hasOriginal) {
            const saveDate = new Date(this.savedOriginalContent[this.currentDocument].timestamp).toLocaleDateString();
            revertBtn.title = `Revert to original saved on ${saveDate}`;
            revertBtn.style.opacity = '1';
        } else {
            revertBtn.title = 'No original content saved';
            revertBtn.style.opacity = '0.6';
        }

        // Update save original button
        const currentContent = this.getEditorText();
        saveOriginalBtn.disabled = !currentContent.trim();
        saveOriginalBtn.style.opacity = currentContent.trim() ? '1' : '0.6';
    }

    showChangesPreview(suggestions, lines) {
        // This method is no longer needed with the new review system
        console.log(`Starting review of ${suggestions.length} suggestions...`);
    }

    cleanupAIComments() {
        // This method is no longer needed with the new review system
        console.log('Edit review system handles cleanup automatically');
    }

    applyInlineSuggestions(suggestions, originalContent) {
        // This method is replaced by the new review system
        this.startEditReview(suggestions, originalContent);
    }

    async getJobPostingContent() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Try to get job posting content from the current page
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'extractJobContent'
            });
            
            return response || 'No job posting detected on current page';
        } catch (error) {
            console.error('Error extracting job content:', error);
            return 'No job posting detected on current page';
        }
    }

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.saveCurrentDocument();
        }, 30000); // Auto-save every 30 seconds
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Set background color based on type
        switch (type) {
            case 'error':
                notification.style.background = '#dc3545';
                break;
            case 'warning':
                notification.style.background = '#ffc107';
                notification.style.color = '#000';
                break;
            default:
                notification.style.background = '#28a745';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async checkUploadFields() {
        try {
            // Get current active tab
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab) return;

            // Send message to content script to check for upload fields
            const response = await chrome.tabs.sendMessage(tab.id, {
                type: 'GET_UPLOAD_FIELDS'
            });

            if (response && response.success && response.fields.length > 0) {
                this.uploadFields = response.fields;
                this.updateUploadButtonState();
            }
        } catch (error) {
            console.log('No content script available or no upload fields found');
        }
    }

    setupUploadFieldListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'UPLOAD_FIELDS_AVAILABLE') {
                this.uploadFields = message.fields;
                this.updateUploadButtonState();
            }
        });
    }

    updateUploadButtonState() {
        const uploadBtn = document.getElementById('uploadBtn');
        const hasPDF = !!this.currentPdfData;
        const hasUploadFields = this.uploadFields.length > 0;
        
        // Find appropriate field for current document type
        const appropriateField = this.findAppropriateUploadField();
        
        // Enable button only if we have both PDF data and appropriate upload fields
        uploadBtn.disabled = !(hasPDF && appropriateField);
        
        if (hasPDF && appropriateField) {
            const fieldType = appropriateField.type;
            let buttonText = 'Upload to Page';
            
            // Always prioritize the current document type in button text
            if (this.currentDocument === 'resume') {
                if (fieldType === 'resume') {
                    buttonText = 'Upload Resume';
                } else if (fieldType === 'general') {
                    buttonText = 'Upload Resume';
                } else {
                    buttonText = 'Upload Resume (General Field)';
                }
            } else if (this.currentDocument === 'coverLetter') {
                if (fieldType === 'cover-letter') {
                    buttonText = 'Upload Cover Letter';
                } else if (fieldType === 'general') {
                    buttonText = 'Upload Cover Letter';
                } else {
                    buttonText = 'Upload Cover Letter (General Field)';
                }
            }
            
            uploadBtn.textContent = buttonText;
            uploadBtn.style.opacity = '1';
        } else if (!hasPDF) {
            uploadBtn.textContent = 'Render PDF First';
            uploadBtn.style.opacity = '0.6';
        } else if (!hasUploadFields) {
            uploadBtn.textContent = 'No Upload Fields';
            uploadBtn.style.opacity = '0.6';
        } else {
            const docType = this.currentDocument === 'coverLetter' ? 'Cover Letter' : 'Resume';
            uploadBtn.textContent = `No ${docType} Field`;
            uploadBtn.style.opacity = '0.6';
        }
    }

    findAppropriateUploadField() {
        if (this.uploadFields.length === 0) return null;
        
        const targetType = this.currentDocument === 'coverLetter' ? 'cover-letter' : 'resume';
        
        // First, try to find exact match
        let appropriateField = this.uploadFields.find(field => field.type === targetType);
        
        if (appropriateField) {
            return appropriateField;
        }
        
        // If no exact match, try general upload fields
        appropriateField = this.uploadFields.find(field => field.type === 'general');
        
        if (appropriateField) {
            return appropriateField;
        }
        
        // As last resort, use any available field
        return this.uploadFields[0] || null;
    }

    async uploadPDFToPage() {
        if (!this.currentPdfData) {
            this.showNotification('Please render a PDF first', 'error');
            return;
        }

        try {
            // Generate filename based on current document type
            const filename = `${this.currentDocument}_${new Date().toISOString().split('T')[0]}.pdf`;

            // Get current active tab
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Send PDF data to content script for upload
            const response = await chrome.tabs.sendMessage(tab.id, {
                type: 'UPLOAD_PDF',
                pdfData: this.currentPdfData,
                filename: filename,
                documentType: this.currentDocument
            });

            if (response && response.success) {
                const fieldTypeText = response.fieldType === 'cover-letter' ? 'Cover Letter' : 
                                    response.fieldType === 'resume' ? 'Resume' : 
                                    'File';
                this.showNotification(`${fieldTypeText} uploaded to: ${response.fieldLabel}`);
            } else {
                throw new Error(response.error || 'Upload failed');
            }

        } catch (error) {
            console.error('Error uploading PDF:', error);
            this.showNotification(`Upload failed: ${error.message}`, 'error');
        }
    }

    initializeLineNumbers() {
        const editor = document.getElementById('latexEditor');
        const lineNumbers = document.getElementById('lineNumbers');
        
        // Update line numbers when content changes
        this.updateLineNumbers();
        
        // Synchronize scrolling - only editor can control the scroll
        editor.addEventListener('scroll', () => {
            lineNumbers.scrollTop = editor.scrollTop;
        });
        
        // Update line numbers on input, paste, and other events
        editor.addEventListener('input', () => {
            this.updateLineNumbers();
        });
        
        editor.addEventListener('paste', () => {
            // Use setTimeout to ensure content is updated after paste
            setTimeout(() => this.updateLineNumbers(), 10);
        });
        
        editor.addEventListener('keydown', (e) => {
            // Update on Enter key for immediate line number update
            if (e.key === 'Enter') {
                setTimeout(() => this.updateLineNumbers(), 10);
            }
        });
    }
    
    updateLineNumbers() {
        const editor = document.getElementById('latexEditor');
        const lineNumbers = document.getElementById('lineNumbers');
        
        const lines = this.getEditorText().split('\n');
        const lineCount = lines.length;
        
        let lineNumbersContent = '';
        for (let i = 1; i <= lineCount; i++) {
            lineNumbersContent += i + '\n';
        }
        
        lineNumbers.textContent = lineNumbersContent;
        
        // Ensure line numbers container scrolls with the editor
        lineNumbers.scrollTop = editor.scrollTop;
    }
    
    addLineNumbersToText(text) {
        /**
         * Helper method to add line numbers to text for backend processing
         * This returns a format like: "1: \\documentclass{article}\n2: \\begin{document}\n..."
         */
        const lines = text.split('\n');
        return lines.map((line, index) => `${index + 1}: ${line}`).join('\n');
    }
    
    removeLineNumbersFromText(numberedText) {
        /**
         * Helper method to remove line numbers from text when receiving from backend
         * Handles format like "1: \\documentclass{article}\n2: \\begin{document}\n..."
         */
        return numberedText.split('\n')
            .map(line => line.replace(/^\d+:\s*/, ''))
            .join('\n');
    }

    // Size controls removed for side panel - method removed
}

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LaTeXResumeEditor();
}); 