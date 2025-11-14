// eLearning Automation Tool - Frontend Application
// Handles file upload, processing, and download

class ELearningApp {
    constructor() {
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('file-input');
        this.browseBtn = document.getElementById('browse-btn');
        this.filePreview = document.getElementById('file-preview');
        this.processBtn = document.getElementById('process-btn');
        this.removeFileBtn = document.getElementById('remove-file');

        this.selectedFile = null;
        this.processingInterval = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showSection('upload-section');
    }

    setupEventListeners() {
        // File upload events
        this.browseBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.uploadArea.addEventListener('click', (e) => {
            // Don't trigger if clicking on the browse button
            if (e.target !== this.browseBtn && !this.browseBtn.contains(e.target)) {
                this.fileInput.click();
            }
        });

        // Process button
        this.processBtn.addEventListener('click', () => this.processFile());

        // Remove file
        this.removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeFile();
        });

        // Download and retry buttons
        document.getElementById('download-btn')?.addEventListener('click', () => this.downloadPackage());
        document.getElementById('new-upload-btn')?.addEventListener('click', () => this.resetApp());
        document.getElementById('retry-btn')?.addEventListener('click', () => this.resetApp());
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        this.handleFileSelect(files);
    }

    handleFileSelect(files) {
        if (files.length === 0) return;

        const file = files[0];

        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!validTypes.includes(file.type) && !file.name.match(/\.(pptx|docx)$/i)) {
            this.showError('Invalid file type. Please upload a .pptx or .docx file.');
            return;
        }

        // Validate file size (50MB max)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showError('File size exceeds 50MB limit.');
            return;
        }

        this.selectedFile = file;
        this.displayFilePreview(file);
    }

    displayFilePreview(file) {
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = this.formatFileSize(file.size);

        this.uploadArea.style.display = 'none';
        this.filePreview.style.display = 'block';
    }

    removeFile() {
        this.selectedFile = null;
        this.fileInput.value = '';
        this.uploadArea.style.display = 'block';
        this.filePreview.style.display = 'none';
    }

    async processFile() {
        if (!this.selectedFile) return;

        this.showSection('processing-section');

        try {
            // Generate a job ID on the frontend
            const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('Starting processing with job ID:', jobId);

            // Create form data
            const formData = new FormData();
            formData.append('file', this.selectedFile);

            // Call the processing function directly (fire and forget - don't wait for response)
            fetch('/.netlify/functions/process-document-background', {
                method: 'POST',
                headers: {
                    'X-Job-ID': jobId
                },
                body: formData
            }).catch(err => {
                console.error('Background function invocation error:', err);
                // Don't throw - we'll poll for status to detect errors
            });

            // Immediately start polling for job status
            // Give the function a moment to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.pollJobStatus(jobId);

        } catch (error) {
            console.error('Processing error:', error);
            this.stopProgressSimulation();
            this.showError(error.message || 'An error occurred during processing');
        }
    }

    async pollJobStatus(jobId) {
        const pollInterval = 2000; // Poll every 2 seconds
        const maxAttempts = 450; // 15 minutes max (450 * 2 seconds)
        let attempts = 0;
        let consecutiveErrors = 0;

        const poll = async () => {
            if (attempts >= maxAttempts) {
                throw new Error('Processing timed out after 15 minutes');
            }

            attempts++;

            try {
                const response = await fetch(`/.netlify/functions/job-status?jobId=${jobId}`);

                if (response.status === 404) {
                    // Job not found yet - background function hasn't started
                    console.log('Job not found yet, waiting for background function to start...');
                    consecutiveErrors = 0;
                    setTimeout(poll, pollInterval);
                    return;
                }

                if (!response.ok) {
                    consecutiveErrors++;
                    if (consecutiveErrors > 5) {
                        throw new Error('Failed to get job status after multiple attempts');
                    }
                    console.warn('Failed to get job status, retrying...');
                    setTimeout(poll, pollInterval);
                    return;
                }

                const status = await response.json();
                console.log('Job status:', status);
                consecutiveErrors = 0;

                // Update progress UI
                this.updateProgress(status.progress || 0, status.message);

                if (status.status === 'complete') {
                    // Processing complete - show results
                    this.showComplete({
                        modulesCount: status.result.modulesCount,
                        objectivesCount: status.result.objectivesCount,
                        questionsCount: status.result.questionsCount,
                        estimatedDuration: status.result.estimatedDuration,
                        package: status.result.package,
                        fileName: status.result.fileName,
                        isDemo: false
                    });
                    return;
                } else if (status.status === 'error') {
                    // Processing failed
                    throw new Error(status.message || 'Processing failed');
                } else {
                    // Still processing - poll again
                    setTimeout(poll, pollInterval);
                }

            } catch (error) {
                console.error('Polling error:', error);
                consecutiveErrors++;
                if (consecutiveErrors > 5) {
                    throw error;
                }
                // Retry on error
                setTimeout(poll, pollInterval);
            }
        };

        // Start polling
        await poll();
    }

    updateProgress(progress, message) {
        // Update progress bar
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}% Complete`;
        }

        // Update step status based on progress
        document.querySelectorAll('.step').forEach((el, index) => {
            const stepProgress = [25, 50, 75, 100];
            if (progress >= stepProgress[index]) {
                el.classList.add('completed');
                el.classList.remove('active');
            } else if (progress >= (stepProgress[index] - 25)) {
                el.classList.add('active');
                el.classList.remove('completed');
            } else {
                el.classList.remove('active', 'completed');
            }
        });

        // Log message for debugging
        if (message) {
            console.log('Processing:', message);
        }
    }

    async processDemoMode() {
        // Continue with simulated progress
        console.log('Demo mode: Simulating document processing...');

        // Wait for progress animation to complete
        await new Promise(resolve => setTimeout(resolve, 12000));

        this.stopProgressSimulation();

        // Show demo results
        const fileName = this.selectedFile.name;
        const fileType = fileName.endsWith('.pptx') ? 'PowerPoint' : 'Word';

        this.showComplete({
            modulesCount: Math.floor(Math.random() * 10) + 8,
            objectivesCount: Math.floor(Math.random() * 4) + 3,
            questionsCount: Math.floor(Math.random() * 20) + 15,
            estimatedDuration: Math.floor(Math.random() * 30) + 30,
            packageUrl: null, // No actual package in demo mode
            isDemo: true
        });

        // Show demo notice
        this.showDemoNotice();
    }

    showDemoNotice() {
        const notice = document.createElement('div');
        notice.className = 'demo-notice';
        notice.innerHTML = `
            <h4>⚠️ Demo Mode</h4>
            <p>The processing function timed out due to Netlify's serverless limits (10-26 seconds).</p>
            <p>These are <strong>simulated results</strong> to demonstrate the UI. For actual SCORM package generation:</p>
            <ul>
                <li>Run locally: <code>npm run dev:server</code></li>
                <li>Use the CLI tool: <code>npm start your-file.pptx</code></li>
                <li>Upgrade to background functions (see documentation)</li>
            </ul>
        `;

        const card = document.querySelector('#complete-section .card');
        if (card) {
            card.insertBefore(notice, card.firstChild);
        }
    }

    startProgressSimulation() {
        let progress = 0;
        const steps = [
            { step: 1, progress: 25, delay: 2000 },
            { step: 2, progress: 50, delay: 5000 },
            { step: 3, progress: 75, delay: 3000 },
            { step: 4, progress: 95, delay: 2000 }
        ];

        let currentStepIndex = 0;

        const updateStep = () => {
            if (currentStepIndex >= steps.length) return;

            const { step, progress: targetProgress, delay } = steps[currentStepIndex];

            // Update step status
            document.querySelectorAll('.step').forEach((el, index) => {
                if (index + 1 < step) {
                    el.classList.add('completed');
                    el.classList.remove('active');
                } else if (index + 1 === step) {
                    el.classList.add('active');
                    el.classList.remove('completed');
                } else {
                    el.classList.remove('active', 'completed');
                }
            });

            // Animate progress bar
            this.animateProgress(progress, targetProgress);
            progress = targetProgress;

            currentStepIndex++;

            if (currentStepIndex < steps.length) {
                this.processingInterval = setTimeout(updateStep, delay);
            }
        };

        updateStep();
    }

    animateProgress(from, to) {
        const duration = 1000;
        const start = performance.now();
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const current = from + (to - from) * progress;

            progressFill.style.width = `${current}%`;
            progressText.textContent = `${Math.round(current)}% Complete`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    stopProgressSimulation() {
        if (this.processingInterval) {
            clearTimeout(this.processingInterval);
            this.processingInterval = null;
        }

        // Complete all steps
        document.querySelectorAll('.step').forEach(el => {
            el.classList.add('completed');
            el.classList.remove('active');
        });

        // Set progress to 100%
        document.getElementById('progress-fill').style.width = '100%';
        document.getElementById('progress-text').textContent = '100% Complete';
    }

    showComplete(result) {
        // Update results
        document.getElementById('modules-count').textContent = result.modulesCount || 0;
        document.getElementById('objectives-count').textContent = result.objectivesCount || 0;
        document.getElementById('questions-count').textContent = result.questionsCount || 0;
        document.getElementById('duration').textContent = `${result.estimatedDuration || 0} min`;

        // Store package data for download
        this.packageData = result.package; // Base64 encoded ZIP
        this.packageFileName = result.fileName || 'scorm-package.zip'; // Custom filename
        this.packageUrl = result.packageUrl; // For demo mode
        this.isDemo = result.isDemo || false; // Track if in demo mode

        this.showSection('complete-section');
    }

    async downloadPackage() {
        // Check if in demo mode
        if (this.isDemo) {
            alert('⚠️ Demo Mode: No actual package was generated.\n\nTo generate real SCORM packages:\n• Run locally: npm run dev:server\n• Use CLI: npm start your-file.pptx\n\nSee documentation for details.');
            return;
        }

        if (!this.packageData && !this.packageUrl) {
            this.showError('No package available for download');
            return;
        }

        try {
            let blob;

            if (this.packageData) {
                // Convert base64 to blob
                const binaryString = atob(this.packageData);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                blob = new Blob([bytes], { type: 'application/zip' });
            } else if (this.packageUrl) {
                // Fetch from URL (for demo mode)
                const response = await fetch(this.packageUrl);
                blob = await response.blob();
            }

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.packageFileName || 'scorm-package.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Download error:', error);
            this.showError('Failed to download package');
        }
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;

        const errorDetails = document.getElementById('error-details');
        errorDetails.innerHTML = `
            <p><strong>Troubleshooting tips:</strong></p>
            <ul>
                <li>Ensure your file is a valid .pptx or .docx format</li>
                <li>Check that your file contains speaker notes</li>
                <li>Verify the file size is under 50MB</li>
                <li>Try re-saving your file and uploading again</li>
            </ul>
        `;

        this.showSection('error-section');
    }

    resetApp() {
        this.selectedFile = null;
        this.packageUrl = null;
        this.fileInput.value = '';
        this.uploadArea.style.display = 'block';
        this.filePreview.style.display = 'none';

        // Reset progress
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('progress-text').textContent = '0% Complete';
        document.querySelectorAll('.step').forEach(el => {
            el.classList.remove('active', 'completed');
        });

        this.showSection('upload-section');
    }

    showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId)?.classList.add('active');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ELearningApp();
});

// Demo mode for testing without backend
const DEMO_MODE = false;

if (DEMO_MODE) {
    console.log('Running in DEMO mode - simulating backend');

    // Override process function for demo
    const originalProcessFile = ELearningApp.prototype.processFile;
    ELearningApp.prototype.processFile = async function() {
        if (!this.selectedFile) return;

        this.showSection('processing-section');
        this.startProgressSimulation();

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 12000));

        this.stopProgressSimulation();

        // Simulate success result
        this.showComplete({
            modulesCount: 12,
            objectivesCount: 5,
            questionsCount: 24,
            estimatedDuration: 45,
            packageUrl: '#demo-package'
        });
    };
}
