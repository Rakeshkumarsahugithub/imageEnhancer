class ImageDownloader {
    constructor() {
        this.originalImage = null;
        this.canvas = null;
        this.ctx = null;
        this.currentFilters = {
            scale: 1,
            brightness: 1,
            contrast: 1,
            saturation: 1,
            sharpness: 0
        };
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Get DOM elements
        this.elements = {
            imageUrl: document.getElementById('imageUrl'),
            loadImage: document.getElementById('loadImage'),
            enhancementControls: document.getElementById('enhancementControls'),
            imagePreview: document.getElementById('imagePreview'),
            loading: document.getElementById('loading'),
            errorMessage: document.getElementById('errorMessage'),
            originalImage: document.getElementById('originalImage'),
            enhancedCanvas: document.getElementById('enhancedCanvas'),
            originalSize: document.getElementById('originalSize'),
            enhancedSize: document.getElementById('enhancedSize'),
            downloadImage: document.getElementById('downloadImage'),
            resetFilters: document.getElementById('resetFilters'),
            
            // Sliders
            scaleSlider: document.getElementById('scaleSlider'),
            brightnessSlider: document.getElementById('brightnessSlider'),
            contrastSlider: document.getElementById('contrastSlider'),
            saturationSlider: document.getElementById('saturationSlider'),
            sharpnessSlider: document.getElementById('sharpnessSlider'),
            
            // Value displays
            scaleValue: document.getElementById('scaleValue'),
            brightnessValue: document.getElementById('brightnessValue'),
            contrastValue: document.getElementById('contrastValue'),
            saturationValue: document.getElementById('saturationValue'),
            sharpnessValue: document.getElementById('sharpnessValue')
        };

        this.canvas = this.elements.enhancedCanvas;
        // Enable willReadFrequently for better performance with multiple getImageData calls
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }

    bindEvents() {
        // Load image button
        this.elements.loadImage.addEventListener('click', () => this.loadImage());
        
        // Enter key on URL input
        this.elements.imageUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadImage();
        });

        // File upload handling
        this.elements.uploadImage = document.getElementById('uploadImage');
        this.elements.fileInput = document.getElementById('fileInput');
        
        // Trigger file input when upload button is clicked
        this.elements.uploadImage.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        // Handle file selection
        this.elements.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileUpload(file);
            }
        });

        // Slider events
        this.elements.scaleSlider.addEventListener('input', (e) => {
            this.currentFilters.scale = parseFloat(e.target.value);
            this.elements.scaleValue.textContent = `${e.target.value}x`;
            this.applyEnhancements();
        });

        this.elements.brightnessSlider.addEventListener('input', (e) => {
            this.currentFilters.brightness = parseFloat(e.target.value);
            this.elements.brightnessValue.textContent = `${Math.round(e.target.value * 100)}%`;
            this.applyEnhancements();
        });

        this.elements.contrastSlider.addEventListener('input', (e) => {
            this.currentFilters.contrast = parseFloat(e.target.value);
            this.elements.contrastValue.textContent = `${Math.round(e.target.value * 100)}%`;
            this.applyEnhancements();
        });

        this.elements.saturationSlider.addEventListener('input', (e) => {
            this.currentFilters.saturation = parseFloat(e.target.value);
            this.elements.saturationValue.textContent = `${Math.round(e.target.value * 100)}%`;
            this.applyEnhancements();
        });

        this.elements.sharpnessSlider.addEventListener('input', (e) => {
            this.currentFilters.sharpness = parseFloat(e.target.value);
            this.elements.sharpnessValue.textContent = `${Math.round(e.target.value * 100)}%`;
            this.applyEnhancements();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.applyPresetFilter(e.target.dataset.filter);
            });
        });

        // Action buttons
        this.elements.resetFilters.addEventListener('click', () => this.resetFilters());
        this.elements.downloadImage.addEventListener('click', () => this.downloadImage());
    }

    async loadImage() {
        const url = this.elements.imageUrl.value.trim();
        
        if (!url) {
            this.showError('Please enter an image URL');
            return;
        }

        if (!this.isValidImageUrl(url)) {
            this.showError('Please enter a valid image URL (must be .jpg, .jpeg, .png, .gif, .bmp, .webp, or .svg)');
            return;
        }

        // Reset UI
        this.elements.enhancementControls.style.display = 'none';
        this.elements.imagePreview.style.display = 'none';
        this.showLoading(true);
        this.hideError();
        
        try {
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = () => {
                    this.originalImage = img;
                    this.displayOriginalImage();
                    this.setupCanvas();
                    this.applyEnhancements();
                    this.showControls();
                    this.showNotification('Image loaded successfully!');
                    resolve();
                };

                img.onerror = () => this.tryWithCorsProxy(url).then(resolve).catch(reject);
                img.src = url;
            });
        } catch (error) {
            this.handleImageError(error);
        } finally {
            this.showLoading(false);
        }
    }

    async tryWithCorsProxy(originalUrl) {
        return new Promise((resolve, reject) => {
            const proxyUrl = `https://cors-anywhere.herokuapp.com/${originalUrl}`;
            const img = new Image();
            
            img.onload = () => {
                this.originalImage = img;
                this.displayOriginalImage();
                this.setupCanvas();
                this.applyEnhancements();
                this.showControls();
                resolve();
            };

            img.onerror = (e) => {
                const error = new Error('Failed to load image. Server may be blocking access.');
                this.handleImageError(error);
                reject(error);
            };

            img.crossOrigin = 'anonymous';
            img.src = proxyUrl;
        });
    }

    handleImageError(error) {
        console.error('Image loading error:', error);
        let errorMessage = 'Failed to load image. ';
        
        if (error.message.includes('403') || error.status === 403) {
            errorMessage += 'Access to this image is forbidden by the server. ';
        } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
            errorMessage += 'The server is blocking cross-origin requests. ';
        }
        
        errorMessage += 'Please try a different image or website.';
        this.showError(errorMessage);
        this.showLoading(false);
    }

    isValidImageUrl(url) {
        try {
            new URL(url);
            return /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i.test(url);
        } catch (e) {
            return false;
        }
    }

    handleFileUpload(file) {
        if (!file.type.match('image.*')) {
            this.showError('Please select a valid image file (JPEG, PNG, GIF, etc.)');
            return;
        }

        this.showLoading(true);
        this.hideError();

        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.displayOriginalImage();
                this.setupCanvas();
                this.applyEnhancements();
                this.showControls();
                this.showLoading(false);
                // Clear the file input
                this.elements.fileInput.value = '';
            };
            img.onerror = () => {
                this.showError('Error loading the selected image. Please try another file.');
                this.showLoading(false);
            };
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            this.showError('Error reading the selected file. Please try again.');
            this.showLoading(false);
        };
        
        reader.readAsDataURL(file);
    }

    needsProxy(url) {
        // Check if URL is from a different domain and might need CORS proxy
        try {
            const urlObj = new URL(url);
            return urlObj.hostname !== window.location.hostname;
        } catch {
            return false;
        }
    }

    displayOriginalImage() {
        this.elements.originalImage.src = this.originalImage.src;
        this.elements.originalSize.textContent = `${this.originalImage.naturalWidth} × ${this.originalImage.naturalHeight}px`;
    }

    setupCanvas() {
        const scale = this.currentFilters.scale;
        this.canvas.width = this.originalImage.naturalWidth * scale;
        this.canvas.height = this.originalImage.naturalHeight * scale;
        
        // Update enhanced size display
        this.elements.enhancedSize.textContent = `${this.canvas.width} × ${this.canvas.height}px`;
    }

    applyEnhancements() {
        if (!this.originalImage) return;

        this.setupCanvas();
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply filters
        this.ctx.filter = this.buildFilterString();
        
        // Draw scaled image
        this.ctx.drawImage(
            this.originalImage,
            0, 0,
            this.originalImage.naturalWidth,
            this.originalImage.naturalHeight,
            0, 0,
            this.canvas.width,
            this.canvas.height
        );

        // Apply sharpening if needed
        if (this.currentFilters.sharpness > 0) {
            this.applySharpeningFilter();
        }

        // Reset filter for future operations
        this.ctx.filter = 'none';
    }

    buildFilterString() {
        const { brightness, contrast, saturation } = this.currentFilters;
        
        return [
            `brightness(${brightness})`,
            `contrast(${contrast})`,
            `saturate(${saturation})`
        ].join(' ');
    }

    applySharpeningFilter() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const strength = this.currentFilters.sharpness;

        // Sharpening kernel
        const kernel = [
            0, -strength, 0,
            -strength, 1 + 4 * strength, -strength,
            0, -strength, 0
        ];

        const output = new Uint8ClampedArray(data.length);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) { // RGB channels only
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            const kernelIdx = (ky + 1) * 3 + (kx + 1);
                            sum += data[idx] * kernel[kernelIdx];
                        }
                    }
                    const outputIdx = (y * width + x) * 4 + c;
                    output[outputIdx] = Math.max(0, Math.min(255, sum));
                }
                // Copy alpha channel
                const alphaIdx = (y * width + x) * 4 + 3;
                output[alphaIdx] = data[alphaIdx];
            }
        }

        // Copy edges from original
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            
            if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                output[i] = data[i];
                output[i + 1] = data[i + 1];
                output[i + 2] = data[i + 2];
                output[i + 3] = data[i + 3];
            }
        }

        const outputImageData = new ImageData(output, width, height);
        this.ctx.putImageData(outputImageData, 0, 0);
    }

    applyPresetFilter(filterType) {
        switch (filterType) {
            case 'none':
                this.resetFilters();
                break;
            case 'vintage':
                this.setFilters({ brightness: 1.1, contrast: 1.2, saturation: 0.8 });
                break;
            case 'blackwhite':
                this.setFilters({ saturation: 0, contrast: 1.2 });
                break;
            case 'sepia':
                this.setFilters({ brightness: 1.1, contrast: 1.1, saturation: 0.6 });
                this.applySepia();
                break;
            case 'vibrant':
                this.setFilters({ brightness: 1.1, contrast: 1.3, saturation: 1.4 });
                break;
        }
    }

    setFilters(filters) {
        Object.assign(this.currentFilters, filters);
        this.updateSliders();
        this.applyEnhancements();
    }

    updateSliders() {
        const { scale, brightness, contrast, saturation, sharpness } = this.currentFilters;
        
        this.elements.scaleSlider.value = scale;
        this.elements.scaleValue.textContent = `${scale}x`;
        
        this.elements.brightnessSlider.value = brightness;
        this.elements.brightnessValue.textContent = `${Math.round(brightness * 100)}%`;
        
        this.elements.contrastSlider.value = contrast;
        this.elements.contrastValue.textContent = `${Math.round(contrast * 100)}%`;
        
        this.elements.saturationSlider.value = saturation;
        this.elements.saturationValue.textContent = `${Math.round(saturation * 100)}%`;
        
        this.elements.sharpnessSlider.value = sharpness;
        this.elements.sharpnessValue.textContent = `${Math.round(sharpness * 100)}%`;
    }

    applySepia() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    resetFilters() {
        this.currentFilters = {
            scale: 1,
            brightness: 1,
            contrast: 1,
            saturation: 1,
            sharpness: 0
        };
        
        this.updateSliders();
        this.applyEnhancements();
        
        // Reset active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="none"]').classList.add('active');
    }

    downloadImage() {
        if (!this.canvas) {
            this.showError('No enhanced image to download');
            return;
        }

        try {
            // Create download link
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `enhanced-image-${timestamp}.png`;
            
            // Convert canvas to blob and create download URL
            this.canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                link.href = url;
                link.download = filename;
                
                // Trigger download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up
                setTimeout(() => URL.revokeObjectURL(url), 100);
            }, 'image/png', 1.0);

        } catch (error) {
            this.showError('Error downloading image: ' + error.message);
        }
    }

    showControls() {
        this.elements.enhancementControls.style.display = 'block';
        this.elements.imagePreview.style.display = 'block';
    }

    showLoading(show) {
        this.elements.loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorEl = this.elements.errorMessage;
        errorEl.style.display = 'block';
        errorEl.querySelector('p').innerHTML = `
            <strong>Error:</strong> ${message}
            <div class="error-tip">
                <strong>Tips:</strong>
                <ul>
                    <li>Make sure the URL points directly to an image</li>
                    <li>Try images from websites that allow hotlinking</li>
                    <li>Some websites block external access to their images</li>
                    <li>Try one of our sample images using the button below</li>
                </ul>
            </div>
        `;
    }

    hideError() {
        this.elements.errorMessage.style.display = 'none';
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'upload-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Trigger reflow
        notification.offsetHeight;
        
        // Add show class
        notification.classList.add('show');
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ImageDownloader();
});

// Add some utility functions for better user experience
document.addEventListener('DOMContentLoaded', () => {
    // Add sample image URLs for testing
    const sampleUrls = [
        'https://image2url.com/images/1757062180458-8d521f5c-c59f-47e9-8a52-380892d534de.png',
        'https://image.aipassportphotos.com/upload/identification/blur/photo-enhance-compare-1.webp',
        'https://image2url.com/images/1757059082173-23735a08-08b8-4eed-a852-130db4521395.png'
    ];

    // Add a sample button with note
    const inputSection = document.querySelector('.input-section');
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'sample-button-container';
    
    const sampleButton = document.createElement('button');
    sampleButton.textContent = '📷 Try Sample Image';
    sampleButton.className = 'btn btn-secondary';
    
    const note = document.createElement('div');
    note.className = 'sample-note';
    note.innerHTML = `
        <div class="instruction">1. <strong>Paste a URL</strong> and click <strong>Load Image</strong></div>
        <div class="instruction">2. <strong>Upload</strong> an image directly</div>
        <div class="instruction">3. <strong>Try Sample Image</strong> and click <strong>Load Image</strong></div>
    `;
    
    buttonContainer.appendChild(sampleButton);
    buttonContainer.appendChild(note);
    inputSection.appendChild(buttonContainer);
    
    sampleButton.addEventListener('click', () => {
        const randomUrl = sampleUrls[Math.floor(Math.random() * sampleUrls.length)];
        document.getElementById('imageUrl').value = randomUrl;
    });
    
    // Show notification when image is uploaded
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const imageDownloader = new ImageDownloader();
            imageDownloader.showNotification('Image uploaded successfully! Scroll down to see it.');
        }
    });
});
