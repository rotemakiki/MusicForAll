// Student Profile Page JavaScript - Enhanced Functionality

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupFileUpload();
    setupFormValidation();
    loadStudentData();
    animateElements();
});

let userId = null;

function initializePage() {
    // Get user ID from the page context (assuming it's available)
    const userIdElement = document.querySelector('[data-user-id]');
    if (userIdElement) {
        userId = userIdElement.dataset.userId;
    } else {
        // Fallback - extract from URL or other method
        const pathParts = window.location.pathname.split('/');
        userId = pathParts[pathParts.length - 1];
    }

    console.log('Initializing student profile for user:', userId);

    // Add smooth entrance animations
    animatePageElements();

    // Setup stats animation
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

    if (!fileInput || !uploadForm) return;

    // Drag and drop functionality
    uploadForm.addEventListener('dragover', handleDragOver);
    uploadForm.addEventListener('dragleave', handleDragLeave);
    uploadForm.addEventListener('drop', handleDrop);

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Click to upload
    uploadForm.addEventListener('click', (e) => {
        if (e.target.type !== 'file' && e.target.type !== 'submit') {
            fileInput.click();
        }
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#2E8B57';
    e.currentTarget.style.background = 'linear-gradient(135deg, #e8f5e8, #f0f8f0)';
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#4CAF50';
    e.currentTarget.style.background = 'linear-gradient(135deg, #f1f8e9, #ffffff)';
}

function handleDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    const fileInput = document.getElementById('profile-image-input');

    if (files.length > 0 && isValidImageFile(files[0])) {
        fileInput.files = files;
        previewImage(files[0]);
        showMessage('תמונה נבחרה בהצלחה! לחץ על "העלה תמונת פרופיל" לשמירה', 'success');
    } else {
        showMessage('נא לבחור קובץ תמונה חוקי (JPG, PNG, GIF)', 'error');
    }

    handleDragLeave(e);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && isValidImageFile(file)) {
        previewImage(file);
        showMessage('תמונה נבחרה בהצלחה!', 'success');
    } else {
        showMessage('נא לבחור קובץ תמונה חוקי', 'error');
    }
}

function isValidImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
        showMessage('סוג קובץ לא נתמך. אנא בחר JPG, PNG או GIF', 'error');
        return false;
    }

    if (file.size > maxSize) {
        showMessage('קובץ גדול מדי. גודל מקסימלי: 5MB', 'error');
        return false;
    }

    return true;
}

function previewImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const profileImage = document.querySelector('.profile-image');
        const defaultAvatar = document.querySelector('.default-avatar');

        if (profileImage) {
            profileImage.src = e.target.result;
        } else if (defaultAvatar) {
            // Replace default avatar with image
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'profile-image';
            img.alt = 'תמונת פרופיל';
            defaultAvatar.parentNode.replaceChild(img, defaultAvatar);
        }
    };
    reader.readAsDataURL(file);
}

function setupFormValidation() {
    const form = document.getElementById('student-profile-form');
    if (!form) return;

    // Add real-time validation
    const inputs = form.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('input', validateField);
        input.addEventListener('blur', validateField);
    });

    // Handle form submission
    form.addEventListener('submit', handleFormSubmit);
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();

    // Remove existing validation styles
    field.classList.remove('valid', 'invalid');

    // Basic validation rules
    switch(field.name) {
        case 'username':
            if (value.length >= 2) {
                field.classList.add('valid');
            } else if (value.length > 0) {
                field.classList.add('invalid');
            }
            break;

        case 'interests':
        case 'style':
        case 'future_learning':
            if (value.length >= 3) {
                field.classList.add('valid');
            } else if (value.length > 0) {
                field.classList.add('invalid');
            }
            break;
    }
}

function handleFormSubmit(e) {
    e.preventDefault();

    if (!userId) {
        showMessage('שגיאה: לא נמצא מזהה משתמש', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const payload = {
        username: formData.get('username'),
        interests: formData.get('interests'),
        style: formData.get('style'),
        future_learning: formData.get('future_learning')
    };

    // Show loading state
    const submitBtn = e.target.querySelector('.save-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> שומר...';
    submitBtn.disabled = true;

    // Make API call
    fetch(`/api/students/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message || data.success) {
            showMessage('✅ הפרטים נשמרו בהצלחה!', 'success');
            // Update stats or other UI elements if needed
            updateLastSaved();
        } else {
            showMessage('⚠️ שגיאה בשמירת הפרטים', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving profile:', error);
        showMessage('⚠️ שגיאה בחיבור לשרת', 'error');
    })
    .finally(() => {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function loadStudentData() {
    if (!userId) {
        console.warn('No user ID available for loading data');
        return;
    }

    fetch(`/api/students/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data) {
                populateForm(data);
                updateStats(data);
            }
        })
        .catch(error => {
            console.error('Error loading student data:', error);
            showMessage('שגיאה בטעינת הנתונים', 'error');
        });
}

function populateForm(data) {
    const fields = ['username', 'email', 'interests', 'style', 'future_learning'];

    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element && data[field]) {
            element.value = data[field];
            // Trigger validation
            element.dispatchEvent(new Event('input'));
        }
    });
}

function updateStats(data) {
    // Update stats with real data if available
    if (data.stats) {
        updateStatCard('שעות למידה', data.stats.learning_hours || 0);
        updateStatCard('שיעורים הושלמו', data.stats.lessons_completed || 0);
        updateStatCard('דירוג ממוצע', data.stats.average_rating || 5.0);
        updateStatCard('הישגים', data.stats.achievements || 0);
    }
}

function updateStatCard(label, value) {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        const labelElement = card.querySelector('.stat-label');
        if (labelElement && labelElement.textContent === label) {
            const numberElement = card.querySelector('.stat-number');
            if (numberElement) {
                animateNumber(numberElement, value);
            }
        }
    });
}

function animateNumber(element, targetValue) {
    const startValue = 0;
    const duration = 1000;
    const startTime = performance.now();

    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const currentValue = startValue + (targetValue - startValue) * easeOutCubic(progress);

        if (typeof targetValue === 'number' && targetValue % 1 !== 0) {
            element.textContent = currentValue.toFixed(1);
        } else {
            element.textContent = Math.floor(currentValue);
        }

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }

    requestAnimationFrame(updateNumber);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function animateStats() {
    const statCards = document.querySelectorAll('.stat-card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';

                // Animate the number
                const numberElement = entry.target.querySelector('.stat-number');
                if (numberElement && !numberElement.dataset.animated) {
                    const targetValue = parseFloat(numberElement.textContent);
                    numberElement.textContent = '0';
                    setTimeout(() => {
                        animateNumber(numberElement, targetValue);
                        numberElement.dataset.animated = 'true';
                    }, 300);
                }
            }
        });
    }, { threshold: 0.5 });

    statCards.forEach(card => {
        observer.observe(card);
    });
}

function showMessage(message, type = 'success') {
    const container = document.getElementById('message-container');
    if (!container) return;

    // Remove existing messages
    container.innerHTML = '';

    // Create new message element
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;

    container.appendChild(messageElement);

    // Show message with animation
    setTimeout(() => {
        messageElement.classList.add('show');
    }, 100);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageElement.classList.remove('show');
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 300);
    }, 5000);
}

function updateLastSaved() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('he-IL');
    showMessage(`נשמר בהצלחה בשעה ${timeString}`, 'success');
}

// Add CSS classes for form validation
const style = document.createElement('style');
style.textContent = `
    .form-input.valid {
        border-color: #4CAF50;
        background-color: #f8fff8;
    }

    .form-input.invalid {
        border-color: #f44336;
        background-color: #fff8f8;
    }

    .form-input.valid:focus {
        box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
    }

    .form-input.invalid:focus {
        box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2);
    }
`;
document.head.appendChild(style);

// Initialize user ID from template context if available
document.addEventListener('DOMContentLoaded', function() {
    // Try to get user ID from a script tag or data attribute
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
        if (script.textContent.includes('const userId')) {
            const match = script.textContent.match(/const userId = ["']([^"']+)["']/);
            if (match) {
                userId = match[1];
            }
        }
    });
});
