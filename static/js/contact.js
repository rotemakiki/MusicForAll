// Contact Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    const titleInput = document.getElementById('title');
    const descriptionTextarea = document.getElementById('description');
    const titleCharCount = document.getElementById('titleCharCount');
    const descriptionCharCount = document.getElementById('descriptionCharCount');
    const screenshotInput = document.getElementById('screenshot');
    const filePreview = document.getElementById('filePreview');
    const previewImage = document.getElementById('previewImage');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const submitBtn = document.getElementById('submitBtn');

    // Character counters
    function updateCharCount(input, counter, maxLength) {
        const length = input.value.length;
        counter.textContent = length;
        
        // Change color if approaching limit
        if (length > maxLength * 0.9) {
            counter.style.color = '#ef4444';
        } else if (length > maxLength * 0.75) {
            counter.style.color = '#f59e0b';
        } else {
            counter.style.color = '#64748b';
        }
    }

    titleInput.addEventListener('input', function() {
        updateCharCount(titleInput, titleCharCount, 200);
    });

    descriptionTextarea.addEventListener('input', function() {
        updateCharCount(descriptionTextarea, descriptionCharCount, 2000);
    });

    // Initialize character counts
    updateCharCount(titleInput, titleCharCount, 200);
    updateCharCount(descriptionTextarea, descriptionCharCount, 2000);

    // File upload handling
    screenshotInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });

    // Drag and drop
    const fileUploadLabel = document.querySelector('.file-upload-label');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadLabel.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadLabel.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadLabel.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        fileUploadLabel.style.borderColor = '#667eea';
        fileUploadLabel.style.background = 'rgba(102, 126, 234, 0.1)';
    }

    function unhighlight(e) {
        fileUploadLabel.style.borderColor = '#cbd5e1';
        fileUploadLabel.style.background = '#f8fafc';
    }

    fileUploadLabel.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            // Check if it's an image
            if (file.type.startsWith('image/')) {
                handleFileSelect(file);
                // Set the file input
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                screenshotInput.files = dataTransfer.files;
            } else {
                alert('אנא העלה קובץ תמונה בלבד (PNG, JPG, JPEG, GIF, WEBP)');
            }
        }
    }

    function handleFileSelect(file) {
        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('סוג קובץ לא נתמך. אנא העלה תמונה (PNG, JPG, JPEG, GIF, WEBP)');
            screenshotInput.value = '';
            return;
        }

        // Validate file size (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            alert('קובץ גדול מדי. מקסימום 5MB');
            screenshotInput.value = '';
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            filePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Remove file
    removeFileBtn.addEventListener('click', function() {
        screenshotInput.value = '';
        filePreview.style.display = 'none';
        previewImage.src = '';
        fileName.textContent = '';
        fileSize.textContent = '';
    });

    // Form submission
    form.addEventListener('submit', function(e) {
        // Validate form
        if (!titleInput.value.trim() || !descriptionTextarea.value.trim()) {
            e.preventDefault();
            alert('אנא מלא את כל השדות הנדרשים');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<span></span>'; // Remove text for loading spinner
    });

    // Radio button visual feedback
    const radioOptions = document.querySelectorAll('.radio-option');
    radioOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all
            radioOptions.forEach(opt => {
                opt.querySelector('.radio-custom').style.transform = 'scale(1)';
            });
            // Add active class to clicked
            const custom = this.querySelector('.radio-custom');
            custom.style.transform = 'scale(1.02)';
            setTimeout(() => {
                custom.style.transform = 'scale(1)';
            }, 200);
        });
    });
});

