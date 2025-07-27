// Background script for LaTeX Resume Editor extension
class BackgroundManager {
    constructor() {
        this.uploadFieldsStatus = new Map(); // Track upload fields per tab
        this.initialize();
    }

    initialize() {
        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                this.handleFirstInstall();
            }
            
            // Set up side panel
            chrome.sidePanel.setOptions({
                path: 'frontend/popup.html',
                enabled: true
            });
        });

        // Handle extension icon click to open side panel
        chrome.action.onClicked.addListener((tab) => {
            chrome.sidePanel.open({ windowId: tab.windowId });
        });

        // Handle messages from popup and content scripts
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Clean up upload fields tracking when tabs are closed or updated
        chrome.tabs.onRemoved.addListener((tabId) => {
            this.uploadFieldsStatus.delete(tabId);
        });

        chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
            if (changeInfo.status === 'loading') {
                this.uploadFieldsStatus.delete(tabId);
            }
        });
    }

    handleFirstInstall() {
        console.log('LaTeX Resume Editor: Extension installed');
        
        // Initialize default storage
        chrome.storage.local.set({
            documents: {
                resume: '',
                coverLetter: ''
            },
            settings: {
                autoSave: true,
                exportFormat: 'pdf'
            }
        });
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'validateApiKey':
                    const isValid = await this.validateApiKey(request.apiKey);
                    sendResponse({ isValid });
                    break;

                case 'analyzeJobPosting':
                    const analysis = await this.analyzeJobPosting(request.jobContent);
                    sendResponse({ analysis });
                    break;

                default:
                    console.log('Unknown message action:', request.action);
                    sendResponse({ error: 'Unknown action' });
            }
            
            // Handle file upload related messages
            switch (request.type) {
                case 'FILE_FIELDS_DETECTED':
                    this.handleFileFieldsDetected(sender.tab.id, request.fields);
                    break;
                    
                case 'CHECK_UPLOAD_FIELDS':
                    sendResponse({
                        hasUploadFields: this.uploadFieldsStatus.has(sender.tab.id),
                        fields: this.uploadFieldsStatus.get(sender.tab.id) || []
                    });
                    break;
                    
                case 'UPLOAD_PDF_TO_PAGE':
                    await this.uploadPDFToCurrentTab(request.pdfData, request.filename);
                    sendResponse({ success: true });
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
        }
    }

    async validateApiKey(apiKey) {
        if (!apiKey) return false;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Hello, this is a test message to validate the API key.'
                        }]
                    }]
                })
            });

            return response.ok;
        } catch (error) {
            console.error('API key validation error:', error);
            return false;
        }
    }

    async analyzeJobPosting(jobContent) {
        // This could be expanded to provide more sophisticated job analysis
        // For now, return a basic analysis structure
        return {
            hasContent: jobContent && jobContent.length > 0,
            contentLength: jobContent ? jobContent.length : 0,
            timestamp: new Date().toISOString()
        };
    }

    handleFileFieldsDetected(tabId, fields) {
        this.uploadFieldsStatus.set(tabId, fields);
        
        // Notify popup about upload fields availability
        chrome.runtime.sendMessage({
            type: 'UPLOAD_FIELDS_AVAILABLE',
            tabId: tabId,
            fields: fields
        }).catch(() => {
            // Popup might not be open, that's okay
        });
    }

    async uploadPDFToCurrentTab(pdfData, filename) {
        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Send message to content script to upload the PDF
            const response = await chrome.tabs.sendMessage(tab.id, {
                type: 'UPLOAD_PDF',
                pdfData: pdfData,
                filename: filename
            });

            return response;
        } catch (error) {
            console.error('Error uploading PDF to tab:', error);
            throw error;
        }
    }

    // Clean up upload fields when tab is closed or navigated
}

// Initialize background manager
new BackgroundManager();

console.log('LaTeX Resume Editor: Background script loaded');