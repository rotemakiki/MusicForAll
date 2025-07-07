// Teacher Profile Page JavaScript - Enhanced Functionality

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupFileUpload();
    setupVideoUpload();
    setupVideoInteractions();
    animateElements();
    setupFormValidation();
});

function initializePage() {
    // Add smooth entrance animations
    animatePageElements();

    // Setup intersection observers
    setupIntersectionObserver();

    // Initialize video lazy loading
    setupVideoLazyLoading();

    // Setup stats counter animation
    animateStats();
}

function animatePageElements() {
    const elements = document.querySelectorAll('.profile-header, .content-section');
    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';

        setTimeout(() => {
            element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 200);
    });
}

function setupFileUpload() {
    const fileInput = document.getElementById('profile-image-input');
    const uploadForm = document.querySelector('.upload-form');
    const profileImage = document.querySelector('.profile-image, .default-avatar');

    if (!fileInput || !uploadForm) return;

    // Drag and drop functionality
    uploadForm.addEventListener('dragover', handleDragOver);
    uploadForm.addEventListener('dragleave', handleDragLeave);
    uploadForm.addEventListener('drop', handleDrop);

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Click to upload
    uploadForm.addEventListener('click', () => {
        if (event.target.type !== 'file' && event.target.type !== 'submit') {
            fileInput.click();
        }
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#764ba2';
    e.currentTarget.style.background = 'linear-gradient(135deg, #e8f4fd, #f0f8ff)';
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#667eea';
    e.currentTarget.style.background = 'linear-gradient(135deg, #f8f9ff, #ffffff)';
}

function handleDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    const fileInput = document.getElementById('profile-image-input');

    if (files.length > 0 && isValidImageFile(files[0])) {
        fileInput.files = files;
        previewImage(files[0]);

        // Show upload notification
        showNotification('תמונה נבחרה בהצלחה! לחץ על "העלה תמונת פרופיל" לשמירה', 'success');
    } else {
        showNotification('נא לבחור קובץ תמונה חוקי (JPG, PNG, GIF)', 'error');
    }

    handleDragLeave(e);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && isValidImageFile(file)) {
        previewImage(file);
        showNotification('תמונה נבחרה בהצלחה!', 'success');
    }
}

function isValidImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
        showNotification('סוג קובץ לא נתמך. נא לבחור JPG, PNG או GIF', 'error');
        return false;
    }

    if (file.size > maxSize) {
        showNotification('הקובץ גדול מדי. מקסימום 5MB', 'error');
        return false;
    }

    return true;
}

function previewImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const existingImage = document.querySelector('.profile-image');
        const defaultAvatar = document.querySelector('.default-avatar');

        if (existingImage) {
            existingImage.src = e.target.result;
            existingImage.style.transform = 'scale(0.9)';
            setTimeout(() => {
                existingImage.style.transform = 'scale(1)';
            }, 100);
        } else if (defaultAvatar) {
            // Replace default avatar with image
            const img = document.createElement('img');
            img.className = 'profile-image';
            img.src = e.target.result;
            img.alt = 'תמונת פרופיל';
            img.style.transform = 'scale(0)';

            defaultAvatar.parentNode.replaceChild(img, defaultAvatar);

            setTimeout(() => {
                img.style.transform = 'scale(1)';
            }, 100);
        }
    };
    reader.readAsDataURL(file);
}

function setupVideoUpload() {
    const videoForm = document.querySelector('#video-upload-form');
    const videoInput = document.querySelector('#video-file-input');

    if (!videoForm || !videoInput) return;

    videoInput.addEventListener('change', handleVideoSelect);
    videoForm.addEventListener('submit', handleVideoUpload);
}

function handleVideoSelect(e) {
    const file = e.target.files[0];
    if (file && isValidVideoFile(file)) {
        showNotification(`וידאו נבחר: ${file.name}`, 'success');

        // Show video preview if possible
        previewVideo(file);
    }
}

function isValidVideoFile(file) {
    const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'];
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (!validTypes.includes(file.type)) {
        showNotification('סוג קובץ לא נתמך. נא לבחור MP4, AVI, MOV או WMV', 'error');
        return false;
    }

    if (file.size > maxSize) {
        showNotification('הקובץ גדול מדי. מקסימום 100MB', 'error');
        return false;
    }

    return true;
}

function previewVideo(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        // Create preview element
        let preview = document.querySelector('.video-preview');
        if (!preview) {
            preview = document.createElement('div');
            preview.className = 'video-preview';
            preview.innerHTML = `
                <h4>תצוגה מקדימה:</h4>
                <video controls style="width: 100%; max-width: 400px; border-radius: 10px;">
                    <source src="${e.target.result}" type="${file.type}">
                    הדפדפן שלך לא תומך בניגון וידאו.
                </video>
            `;

            const videoForm = document.querySelector('.upload-video-form');
            videoForm.appendChild(preview);
        }
    };
    reader.readAsDataURL(file);
}

function handleVideoUpload(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const submitBtn = e.target.querySelector('.submit-btn');

    // Validate form
    const title = formData.get('title');
    const description = formData.get('description');
    const videoFile = formData.get('video_file');

    if (!title || !description || !videoFile || videoFile.size === 0) {
        showNotification('נא למלא את כל השדות הנדרשים', 'error');
        return;
    }

    // Show loading state
    submitBtn.innerHTML = '<span>⏳</span><span>מעלה וידאו...</span>';
    submitBtn.disabled = true;

    // Simulate upload progress (in real implementation, use XMLHttpRequest for progress)
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) {
            clearInterval(progressInterval);
            progress = 90;
        }
        submitBtn.innerHTML = `<span>⏳</span><span>מעלה... ${Math.round(progress)}%</span>`;
    }, 500);

    // Submit form (you may want to use fetch for better control)
    fetch(e.target.action, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        clearInterval(progressInterval);
        if (data.success) {
            showNotification('הוידאו הועלה בהצלחה!', 'success');
            e.target.reset();
            removeVideoPreview();
            // Refresh videos section
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            throw new Error(data.error || 'שגיאה בהעלאת הוידאו');
        }
    })
    .catch(error => {
        clearInterval(progressInterval);
        console.error('Upload error:', error);
        showNotification('שגיאה בהעלאת הוידאו: ' + error.message, 'error');
    })
    .finally(() => {
        submitBtn.innerHTML = '<span>⬆️</span><span>העלה סרטון</span>';
        submitBtn.disabled = false;
    });
}

function removeVideoPreview() {
    const preview = document.querySelector('.video-preview');
    if (preview) {
        preview.remove();
    }
}

function setupVideoInteractions() {
    const videoCards = document.querySelectorAll('.video-card');

    videoCards.forEach(card => {
        const video = card.querySelector('video');

        // Enhanced hover effects
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px) scale(1.02)';
            if (video) {
                video.style.filter = 'brightness(1.1) contrast(1.1)';
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
            if (video) {
                video.style.filter = 'brightness(1) contrast(1)';
            }
        });

        // Video preview on hover
        if (video) {
            let hoverTimeout;

            card.addEventListener('mouseenter', () => {
                hoverTimeout = setTimeout(() => {
                    if (video.paused) {
                        video.currentTime = 0;
                        video.muted = true;
                        video.play().catch(() => {
                            // Handle autoplay restrictions
                        });
                    }
                }, 1500);
            });

            card.addEventListener('mouseleave', () => {
                clearTimeout(hoverTimeout);
                if (!video.paused) {
                    video.pause();
                    video.currentTime = 0;
                }
            });
        }
    });
}

function setupIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');

                // Animate stats if this is the stats section
                const stats = entry.target.querySelectorAll('.stat-number');
                stats.forEach(stat => {
                    if (!stat.classList.contains('animated')) {
                        animateStat(stat);
                        stat.classList.add('animated');
                    }
                });
            }
        });
    }, observerOptions);

    // Observe content sections
    document.querySelectorAll('.content-section, .stat-card').forEach(section => {
        observer.observe(section);
    });
}

function setupVideoLazyLoading() {
    const videoElements = document.querySelectorAll('video[data-src]');

    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const video = entry.target;
                video.src = video.dataset.src;
                video.load();
                videoObserver.unobserve(video);
            }
        });
    });

    videoElements.forEach(video => {
        videoObserver.observe(video);
    });
}

function animateStats() {
    // This will be triggered by intersection observer
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        if (!stat.classList.contains('animated')) {
            // Will be animated when visible
        }
    });
}

function animateStat(element) {
    const finalValue = parseInt(element.textContent) || 0;
    let currentValue = 0;
    const increment = finalValue / 50;
    const duration = 1500;
    const stepTime = duration / 50;

    element.textContent = '0';

    const counter = setInterval(() => {
        currentValue += increment;
        if (currentValue >= finalValue) {
            element.textContent = finalValue;
            clearInterval(counter);
        } else {
            element.textContent = Math.floor(currentValue);
        }
    }, stepTime);
}

function setupFormValidation() {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        const inputs = form.querySelectorAll('input[required], textarea[required]');

        inputs.forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearFieldError);
        });

        form.addEventListener('submit', validateForm);
    });
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();

    // Remove existing error
    clearFieldError(e);

    // Validate based on field type
    let isValid = true;
    let errorMessage = '';

    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'שדה זה הוא חובה';
    } else if (field.type === 'email' && value && !isValidEmail(value)) {
        isValid = false;
        errorMessage = 'כתובת אימייל לא תקינה';
    } else if (field.name === 'title' && value.length < 3) {
        isValid = false;
        errorMessage = 'הכותרת צריכה להכיל לפחות 3 תווים';
    } else if (field.name === 'description' && value.length < 10) {
        isValid = false;
        errorMessage = 'התיאור צריך להכיל לפחות 10 תווים';
    }

    if (!isValid) {
        showFieldError(field, errorMessage);
    }

    return isValid;
}

function clearFieldError(e) {
    const field = e.target;
    const errorElement = field.parentNode.querySelector('.field-error');

    if (errorElement) {
        errorElement.remove();
    }

    field.style.borderColor = '#e1e8ed';
    field.style.boxShadow = 'none';
}

function showFieldError(field, message) {
    // Remove existing error
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }

    // Create error element
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.cssText = `
        color: #dc3545;
        font-size: 0.85rem;
        margin-top: 5px;
        animation: slideIn 0.3s ease;
    `;

    // Add styles for slideIn animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    if (!document.querySelector('style[data-field-errors]')) {
        style.setAttribute('data-field-errors', 'true');
        document.head.appendChild(style);
    }

    field.style.borderColor = '#dc3545';
    field.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
    field.parentNode.appendChild(errorElement);
}

function validateForm(e) {
    const form = e.target;
    const requiredFields = form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!validateField({ target: field })) {
            isValid = false;
        }
    });

    if (!isValid) {
        e.preventDefault();
        showNotification('נא לתקן את השגיאות בטופס', 'error');
    }

    return isValid;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Contact teacher functionality
function contactTeacher(teacherId, teacherName) {
    showNotification('תכונת יצירת קשר תהיה זמינה בקרוב!', 'info');

    // Future implementation could include:
    // - Modal with contact form
    // - Email integration
    // - Messaging system
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Style notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: white;
        border-radius: 12px;
        padding: 15px 25px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 1001;
        font-weight: 600;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        max-width: 90vw;
        text-align: center;
    `;

    // Apply type-specific styles
    switch(type) {
        case 'success':
            notification.style.borderLeft = '4px solid #28a745';
            notification.style.color = '#155724';
            notification.style.background = 'linear-gradient(135deg, #d4edda, #c3e6cb)';
            break;
        case 'error':
            notification.style.borderLeft = '4px solid #dc3545';
            notification.style.color = '#721c24';
            notification.style.background = 'linear-gradient(135deg, #f8d7da, #f5c6cb)';
            break;
        case 'info':
            notification.style.borderLeft = '4px solid #667eea';
            notification.style.color = '#2c3e50';
            notification.style.background = 'linear-gradient(135deg, #e8f4fd, #f0f8ff)';
            break;
    }

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.style.transform = 'translateX(-50%) translateY(0)';
    }, 100);

    // Hide after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(-50%) translateY(-100px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 4000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + U: Focus upload input
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        const fileInput = document.getElementById('profile-image-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    // Escape: Close any open modals/previews
    if (e.key === 'Escape') {
        removeVideoPreview();
    }
});

// Auto-save form data to localStorage for form recovery
function setupFormAutoSave() {
    const videoForm = document.querySelector('#video-upload-form');
    if (!videoForm) return;

    const inputs = videoForm.querySelectorAll('input[type="text"], textarea');

    inputs.forEach(input => {
        // Load saved data
        const savedValue = localStorage.getItem(`teacher-form-${input.name}`);
        if (savedValue) {
            input.value = savedValue;
        }

        // Save on input
        input.addEventListener('input', () => {
            localStorage.setItem(`teacher-form-${input.name}`, input.value);
        });
    });

    // Clear saved data on successful submit
    videoForm.addEventListener('submit', () => {
        inputs.forEach(input => {
            localStorage.removeItem(`teacher-form-${input.name}`);
        });
    });
}

// Initialize auto-save
setupFormAutoSave();
