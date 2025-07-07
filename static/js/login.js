// Login Page - Enhanced User Experience and Functionality

document.addEventListener('DOMContentLoaded', function() {
    initFormValidation();
    initAnimations();
    initKeyboardShortcuts();
    initAutoFocus();
    initPasswordToggle();
    initFormSubmission();

    console.log('🔐 Login page loaded with enhanced features');
});

// Real-time form validation
function initFormValidation() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.querySelector('.submit-btn');

    if (!emailInput || !passwordInput || !submitBtn) return;

    // Email validation
    emailInput.addEventListener('input', function() {
        validateEmail(this);
        updateSubmitButton();
    });

    emailInput.addEventListener('blur', function() {
        validateEmail(this);
    });

    // Password validation
    passwordInput.addEventListener('input', function() {
        validatePassword(this);
        updateSubmitButton();
    });

    passwordInput.addEventListener('blur', function() {
        validatePassword(this);
    });

    function validateEmail(input) {
        const email = input.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        removeValidationClasses(input);

        if (email === '') {
            return false;
        } else if (!emailRegex.test(email)) {
            addErrorClass(input, 'כתובת אימייל לא תקינה');
            return false;
        } else {
            addSuccessClass(input);
            return true;
        }
    }

    function validatePassword(input) {
        const password = input.value;

        removeValidationClasses(input);

        if (password === '') {
            return false;
        } else if (password.length < 6) {
            addErrorClass(input, 'סיסמה חייבת להכיל לפחות 6 תווים');
            return false;
        } else {
            addSuccessClass(input);
            return true;
        }
    }

    function updateSubmitButton() {
        const emailValid = validateEmail(emailInput);
        const passwordValid = validatePassword(passwordInput);

        if (emailValid && passwordValid) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        } else {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
        }
    }

    function addErrorClass(input, message) {
        input.classList.add('error');
        showValidationMessage(input, message, 'error');
    }

    function addSuccessClass(input) {
        input.classList.add('success');
        removeValidationMessage(input);
    }

    function removeValidationClasses(input) {
        input.classList.remove('error', 'success');
        removeValidationMessage(input);
    }

    function showValidationMessage(input, message, type) {
        removeValidationMessage(input);

        const messageDiv = document.createElement('div');
        messageDiv.className = `validation-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            font-size: 0.85rem;
            margin-top: 5px;
            padding: 5px 10px;
            border-radius: 6px;
            animation: fadeIn 0.3s ease-out;
            ${type === 'error' ?
                'color: #dc3545; background: rgba(220, 53, 69, 0.1);' :
                'color: #28a745; background: rgba(40, 167, 69, 0.1);'
            }
        `;

        input.parentNode.appendChild(messageDiv);
    }

    function removeValidationMessage(input) {
        const existingMessage = input.parentNode.querySelector('.validation-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    // Add validation styles to CSS if not already present
    if (!document.getElementById('validation-styles')) {
        const validationStyles = document.createElement('style');
        validationStyles.id = 'validation-styles';
        validationStyles.textContent = `
            .form-input.error {
                border-color: #dc3545 !important;
                box-shadow: 0 0 0 4px rgba(220, 53, 69, 0.1) !important;
            }

            .form-input.success {
                border-color: #28a745 !important;
                box-shadow: 0 0 0 4px rgba(40, 167, 69, 0.1) !important;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(validationStyles);
    }
}

// Enhanced animations
function initAnimations() {
    // Stagger animation for form elements
    const formElements = document.querySelectorAll('.form-group, .submit-btn, .register-link');
    formElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.animation = `slideInUp 0.6s ease-out ${index * 0.1}s forwards`;
    });

    // Add slideInUp animation if not present
    if (!document.getElementById('animation-styles')) {
        const animationStyles = document.createElement('style');
        animationStyles.id = 'animation-styles';
        animationStyles.textContent = `
            @keyframes slideInUp {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(animationStyles);
    }

    // Flash message animations
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach((message, index) => {
        message.style.animationDelay = `${index * 0.2}s`;
    });

    // Auto-hide flash messages after 5 seconds
    setTimeout(() => {
        flashMessages.forEach(message => {
            message.style.animation = 'slideOutRight 0.5s ease-out forwards';
            setTimeout(() => message.remove(), 500);
        });
    }, 5000);

    if (!document.getElementById('flash-animation-styles')) {
        const flashAnimationStyles = document.createElement('style');
        flashAnimationStyles.id = 'flash-animation-styles';
        flashAnimationStyles.textContent = `
            @keyframes slideOutRight {
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
        `;
        document.head.appendChild(flashAnimationStyles);
    }
}

// Keyboard shortcuts and accessibility
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Alt + L to focus email
        if (e.altKey && e.key === 'l') {
            e.preventDefault();
            const emailInput = document.getElementById('email');
            if (emailInput) emailInput.focus();
        }

        // Alt + P to focus password
        if (e.altKey && e.key === 'p') {
            e.preventDefault();
            const passwordInput = document.getElementById('password');
            if (passwordInput) passwordInput.focus();
        }

        // Enter to submit form (if valid)
        if (e.key === 'Enter') {
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
            }
        }

        // Escape to clear form
        if (e.key === 'Escape') {
            clearForm();
        }
    });

    console.log('Keyboard shortcuts: Alt+L (email), Alt+P (password), Enter (submit), Esc (clear)');
}

// Auto-focus first empty field
function initAutoFocus() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    setTimeout(() => {
        if (emailInput && !emailInput.value) {
            emailInput.focus();
        } else if (passwordInput && !passwordInput.value) {
            passwordInput.focus();
        }
    }, 500); // Delay to allow animations to complete
}

// Password visibility toggle
function initPasswordToggle() {
    const passwordInput = document.getElementById('password');
    if (!passwordInput) return;

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'password-toggle';
    toggleButton.innerHTML = '👁️';
    toggleButton.title = 'הצג/הסתר סיסמה';

    // Style the toggle button
    toggleButton.style.cssText = `
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        color: #64748b;
        transition: color 0.3s ease;
        z-index: 10;
    `;

    // Add hover effect
    toggleButton.addEventListener('mouseenter', () => {
        toggleButton.style.color = '#667eea';
    });

    toggleButton.addEventListener('mouseleave', () => {
        toggleButton.style.color = '#64748b';
    });

    // Toggle functionality
    toggleButton.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggleButton.innerHTML = type === 'password' ? '👁️' : '🙈';
    });

    // Add to password input container
    passwordInput.parentNode.style.position = 'relative';
    passwordInput.style.paddingLeft = '50px';
    passwordInput.parentNode.appendChild(toggleButton);
}

// Enhanced form submission
function initFormSubmission() {
    const form = document.querySelector('.login-form, #login-form, #force-login-form');
    const submitBtn = document.querySelector('.submit-btn');

    if (!form || !submitBtn) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Add loading state
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'מתחבר...';

        // Validate form
        const emailInput = document.getElementById('email') || document.getElementById('force-password');
        const passwordInput = document.getElementById('password') || document.getElementById('force-password');

        if (!emailInput || !passwordInput) {
            removeLoadingState();
            return;
        }

        // Simulate network delay for better UX
        setTimeout(() => {
            // Submit the form
            form.submit();
        }, 800);
    });

    function removeLoadingState() {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'התחבר';
    }
}

// Form utilities
function clearForm() {
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.value = '';
        input.classList.remove('error', 'success');
    });

    // Remove validation messages
    const validationMessages = document.querySelectorAll('.validation-message');
    validationMessages.forEach(message => message.remove());

    // Focus first input
    if (inputs.length > 0) {
        inputs[0].focus();
    }
}

// Force login modal enhancements
function initForceLoginModal() {
    const modal = document.querySelector('.force-login-modal');
    if (!modal) return;

    // Close modal on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Close modal on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    function closeModal() {
        modal.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            window.location.href = '/login';
        }, 300);
    }

    // Add fadeOut animation
    if (!document.getElementById('modal-animation-styles')) {
        const modalAnimationStyles = document.createElement('style');
        modalAnimationStyles.id = 'modal-animation-styles';
        modalAnimationStyles.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(modalAnimationStyles);
    }
}

// Remember user preferences
function initUserPreferences() {
    const emailInput = document.getElementById('email');
    if (!emailInput) return;

    // Load remembered email
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        emailInput.value = rememberedEmail;
        // Focus password field if email is pre-filled
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            setTimeout(() => passwordInput.focus(), 500);
        }
    }

    // Save email on successful login attempt
    const form = document.querySelector('.login-form');
    if (form) {
        form.addEventListener('submit', function() {
            const email = emailInput.value.trim();
            if (email && email.includes('@')) {
                localStorage.setItem('rememberedEmail', email);
            }
        });
    }
}

// Enhanced error handling
function showError(message, duration = 5000) {
    // Remove existing error messages
    const existingErrors = document.querySelectorAll('.dynamic-error');
    existingErrors.forEach(error => error.remove());

    const errorDiv = document.createElement('div');
    errorDiv.className = 'flash-message error dynamic-error';
    errorDiv.innerHTML = `
        <span>⚠️</span>
        <span>${message}</span>
    `;

    const formPanel = document.querySelector('.login-form-panel');
    if (formPanel) {
        formPanel.insertBefore(errorDiv, formPanel.firstChild);

        // Auto-remove after duration
        setTimeout(() => {
            errorDiv.style.animation = 'slideOutRight 0.5s ease-out forwards';
            setTimeout(() => errorDiv.remove(), 500);
        }, duration);
    }
}

function showSuccess(message, duration = 3000) {
    const successDiv = document.createElement('div');
    successDiv.className = 'flash-message success dynamic-success';
    successDiv.innerHTML = `
        <span>✅</span>
        <span>${message}</span>
    `;

    const formPanel = document.querySelector('.login-form-panel');
    if (formPanel) {
        formPanel.insertBefore(successDiv, formPanel.firstChild);

        setTimeout(() => {
            successDiv.style.animation = 'slideOutRight 0.5s ease-out forwards';
            setTimeout(() => successDiv.remove(), 500);
        }, duration);
    }
}

// Network status indicator
function initNetworkStatus() {
    window.addEventListener('online', () => {
        showSuccess('חיבור לאינטרנט חודש');
    });

    window.addEventListener('offline', () => {
        showError('אין חיבור לאינטרנט', 0); // Don't auto-hide
    });
}

// Performance monitoring for login
function initPerformanceMonitoring() {
    const startTime = performance.now();

    window.addEventListener('load', () => {
        const loadTime = performance.now() - startTime;
        console.log(`🚀 Login page loaded in ${Math.round(loadTime)}ms`);

        // Show performance warning if page loads slowly
        if (loadTime > 3000) {
            console.warn('⚠️ Slow page load detected');
        }
    });
}

// Enhanced accessibility features
function initAccessibility() {
    // Add ARIA labels
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (emailInput) {
        emailInput.setAttribute('aria-label', 'כתובת אימייל');
        emailInput.setAttribute('aria-describedby', 'email-help');
    }

    if (passwordInput) {
        passwordInput.setAttribute('aria-label', 'סיסמה');
        passwordInput.setAttribute('aria-describedby', 'password-help');
    }

    // Add focus indicators for keyboard navigation
    const focusableElements = document.querySelectorAll('input, button, a');
    focusableElements.forEach(element => {
        element.addEventListener('focus', function() {
            this.style.outline = '2px solid #667eea';
            this.style.outlineOffset = '2px';
        });

        element.addEventListener('blur', function() {
            this.style.outline = 'none';
        });
    });
}

// Initialize all features when force login modal is present
if (document.querySelector('.force-login-modal')) {
    initForceLoginModal();
}

// Initialize user preferences
window.addEventListener('load', () => {
    initUserPreferences();
    initNetworkStatus();
    initPerformanceMonitoring();
    initAccessibility();
});

// Global utilities
window.loginUtils = {
    showError,
    showSuccess,
    clearForm
};

// Console helper messages
console.log(`
🔐 Login Page Features:
- Real-time validation
- Keyboard shortcuts (Alt+L, Alt+P, Enter, Esc)
- Password visibility toggle
- Auto-focus and remember email
- Enhanced error handling
- Accessibility improvements
`);

// Add ripple effect to buttons
function addRippleEffect() {
    const buttons = document.querySelectorAll('.submit-btn, .register-btn, .force-login-btn, .cancel-btn');

    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.6);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;

            // Add ripple animation if not present
            if (!document.getElementById('ripple-animation-styles')) {
                const rippleStyles = document.createElement('style');
                rippleStyles.id = 'ripple-animation-styles';
                rippleStyles.textContent = `
                    @keyframes ripple {
                        to {
                            transform: scale(4);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(rippleStyles);
            }

            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Initialize ripple effect
setTimeout(addRippleEffect, 100);
