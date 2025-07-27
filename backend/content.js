// Content script for extracting job posting information and handling file uploads
class JobContentExtractor {
    constructor() {
        this.fileUploadFields = [];
        this.setupFileUploadDetection();
        this.setupMessageListener();
        
        this.selectors = {
            jobTitle: [
                'h1',
                '[data-testid="job-title"]',
                '.job-title',
                '.title',
                '[class*="title"]',
                '[class*="job"]'
            ],
            companyName: [
                '[data-testid="company-name"]',
                '.company-name',
                '.employer',
                '[class*="company"]',
                '[class*="employer"]'
            ],
            jobDescription: [
                '[data-testid="job-description"]',
                '.job-description',
                '.description',
                '.content',
                '[class*="description"]',
                '[class*="content"]',
                'main',
                'article'
            ],
            requirements: [
                '[data-testid="requirements"]',
                '.requirements',
                '.qualifications',
                '[class*="requirement"]',
                '[class*="qualification"]'
            ]
        };
    }

    extractJobContent() {
        const content = {
            title: this.extractText(this.selectors.jobTitle),
            company: this.extractText(this.selectors.companyName),
            description: this.extractText(this.selectors.jobDescription),
            requirements: this.extractText(this.selectors.requirements),
            url: window.location.href,
            timestamp: new Date().toISOString()
        };

        // If we couldn't find specific sections, try to extract from the entire page
        if (!content.description) {
            content.description = this.extractPageContent();
        }

        return content;
    }

    extractText(selectors) {
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                // Get the most relevant element (usually the first one)
                const element = elements[0];
                const text = element.textContent.trim();
                if (text.length > 10) { // Only return if we have meaningful content
                    return text;
                }
            }
        }
        return '';
    }

    extractPageContent() {
        // Extract content from common job posting page structures
        const selectors = [
            'main',
            'article',
            '.content',
            '.main-content',
            '#content',
            '#main',
            '.job-posting',
            '.job-details'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent.trim();
                if (text.length > 100) { // Only return if we have substantial content
                    return text.substring(0, 2000); // Limit to first 2000 characters
                }
            }
        }

        // Fallback: extract from body
        const bodyText = document.body.textContent.trim();
        return bodyText.length > 100 ? bodyText.substring(0, 2000) : '';
    }

    formatJobContent(content) {
        let formatted = '';
        
        if (content.title) {
            formatted += `Job Title: ${content.title}\n\n`;
        }
        
        if (content.company) {
            formatted += `Company: ${content.company}\n\n`;
        }
        
        if (content.description) {
            formatted += `Job Description:\n${content.description}\n\n`;
        }
        
        if (content.requirements) {
            formatted += `Requirements:\n${content.requirements}\n\n`;
        }
        
        if (!formatted.trim()) {
            formatted = 'No job posting content detected on this page.';
        }
        
        return formatted;
    }

    setupFileUploadDetection() {
        // Detect file upload fields when page loads
        this.detectFileUploadFields();
        
        // Monitor for dynamically added file upload fields
        const observer = new MutationObserver(() => {
            this.detectFileUploadFields();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    detectFileUploadFields() {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        this.fileUploadFields = [];
        
        fileInputs.forEach((input, index) => {
            // Check if this looks like a resume/CV upload field
            const fieldType = this.getFileUploadFieldType(input);
            if (fieldType) {
                this.fileUploadFields.push({
                    element: input,
                    id: input.id || `file-input-${index}`,
                    label: this.getFieldLabel(input),
                    accept: input.accept || '',
                    type: fieldType // 'resume', 'cover-letter', or 'general'
                });
            }
        });
        
        // Notify extension about detected upload fields
        this.notifyUploadFieldsDetected();
    }

    getFileUploadFieldType(input) {
        const resumeKeywords = ['resume', 'cv', 'curriculum'];
        const coverLetterKeywords = ['cover letter', 'coverletter', 'cover_letter', 'motivation letter', 'letter'];
        const generalKeywords = ['upload', 'attach', 'document', 'file'];
        
        // Check input attributes
        const inputText = (input.id + ' ' + input.name + ' ' + input.className + ' ' + input.accept).toLowerCase();
        
        // Check surrounding labels and text
        const label = this.getFieldLabel(input).toLowerCase();
        
        // Check parent elements for context
        let parent = input.parentElement;
        let parentText = '';
        for (let i = 0; i < 3 && parent; i++) {
            parentText += ' ' + (parent.textContent || '').toLowerCase();
            parent = parent.parentElement;
        }
        
        const allText = inputText + ' ' + label + ' ' + parentText;
        
        // Check for cover letter keywords first (more specific)
        if (coverLetterKeywords.some(keyword => allText.includes(keyword))) {
            return 'cover-letter';
        }
        
        // Check for resume keywords
        if (resumeKeywords.some(keyword => allText.includes(keyword))) {
            return 'resume';
        }
        
        // Check for general upload keywords
        if (generalKeywords.some(keyword => allText.includes(keyword))) {
            return 'general';
        }
        
        return null; // Not a relevant upload field
    }

    getFieldLabel(input) {
        // Try to find associated label
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return label.textContent.trim();
        }
        
        // Look for nearby label elements
        const nearbyLabel = input.closest('label') || input.parentElement?.querySelector('label');
        if (nearbyLabel) return nearbyLabel.textContent.trim();
        
        // Look for nearby text that might describe the field
        const parent = input.parentElement;
        if (parent) {
            const text = parent.textContent.replace(input.textContent || '', '').trim();
            if (text.length > 0 && text.length < 100) return text;
        }
        
        return 'File Upload';
    }

    notifyUploadFieldsDetected() {
        // Send message to background script about detected upload fields
        chrome.runtime.sendMessage({
            type: 'FILE_FIELDS_DETECTED',
            fields: this.fileUploadFields.map(field => ({
                id: field.id,
                label: field.label,
                accept: field.accept,
                type: field.type
            }))
        });
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'UPLOAD_PDF') {
                this.uploadPDFToField(message.pdfData, message.filename, message.documentType)
                    .then(result => sendResponse(result))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                return true; // Keep message channel open for async response
            }
            
            if (message.type === 'GET_UPLOAD_FIELDS') {
                sendResponse({
                    success: true,
                    fields: this.fileUploadFields.map(field => ({
                        id: field.id,
                        label: field.label,
                        accept: field.accept,
                        type: field.type
                    }))
                });
            }
        });
    }

    async uploadPDFToField(pdfData, filename, documentType = 'resume') {
        try {
            if (this.fileUploadFields.length === 0) {
                throw new Error('No suitable file upload fields found on this page');
            }

            // Convert base64 PDF data to File object
            const response = await fetch(`data:application/pdf;base64,${pdfData}`);
            const blob = await response.blob();
            const file = new File([blob], filename, { type: 'application/pdf' });

            // Find the most appropriate field based on document type
            let targetField = this.findBestUploadField(documentType);
            
            if (!targetField) {
                throw new Error(`No suitable ${documentType} upload field found`);
            }

            const input = targetField.element;

            // Create a new FileList with our file
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;

            // Trigger events to notify the page
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));

            // Some sites might need a custom event
            input.dispatchEvent(new CustomEvent('fileselected', { 
                detail: { files: [file] }, 
                bubbles: true 
            }));

            return {
                success: true,
                fieldLabel: targetField.label,
                fieldType: targetField.type,
                filename: filename
            };

        } catch (error) {
            console.error('Error uploading PDF:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    findBestUploadField(documentType) {
        // Priority order for field matching
        const targetType = documentType === 'coverLetter' ? 'cover-letter' : 'resume';
        
        // First, try to find exact match
        let targetField = this.fileUploadFields.find(field => field.type === targetType);
        
        if (targetField) {
            return targetField;
        }
        
        // If no exact match, try general upload fields
        targetField = this.fileUploadFields.find(field => field.type === 'general');
        
        if (targetField) {
            return targetField;
        }
        
        // As last resort, use any available field
        return this.fileUploadFields[0] || null;
    }
}

// Initialize the extractor
const jobExtractor = new JobContentExtractor();

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractJobContent') {
        try {
            const jobContent = jobExtractor.extractJobContent();
            const formattedContent = jobExtractor.formatJobContent(jobContent);
            sendResponse(formattedContent);
        } catch (error) {
            console.error('Error extracting job content:', error);
            sendResponse('Error extracting job content from this page.');
        }
        return true; // Keep the message channel open for async response
    }
});

// Log that content script is loaded
console.log('LaTeX Resume Editor: Content script loaded'); 