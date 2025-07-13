// Register Page - Enhanced User Experience and Validation

document.addEventListener('DOMContentLoaded', function() {
    initFormValidation();
    initPasswordStrength();
    initRoleSelection();
    initFormProgress();
    initAnimations();
    initKeyboardShortcuts();
    initFormSubmission();

    console.log('📝 Register page loaded with enhanced features');
});

// Comprehensive form validation
function initFormValidation() {
    const form = document.querySelector('.register-form');
    if (!form) return;

    const fields = {
        username: {
            element: document.getElementById('username'),
            rules: [
                { test: val => val.length >= 2, message: 'שם משתמש חייב להכיל לפחות 2 תווים' },
                { test: val => val.length <= 30, message: 'שם משתמש ארוך מדי (מקסימום 30 תווים)' },
                { test: val => /^[a-zA-Z0-9א-ת\s]+$/.test(val), message: 'שם משתמש יכול להכיל רק אותיות, מספרים ורווחים' }
            ]
        },
        email: {
            element: document.getElementById('email'),
            rules: [
                { test: val => val.length > 0, message: 'יש להזין כתובת אימייל' },
                { test: val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), message: 'כתובת אימייל לא תקינה' }
            ]
        },
        password: {
            element: document.getElementById('password'),
            rules: [
                { test: val => val.length >= 6, message: 'סיסמה חייבת להכיל לפחות 6 תווים' },
                { test: val => /[A-Za-z]/.test(val), message: 'סיסמה חייבת להכיל לפחות אות אחת' },
                { test: val => /[0-9]/.test(val), message: 'סיסמה חייבת להכיל לפחות מספר אחד' }
            ]
        }
    };

    // Add real-time validation to each field
    Object.keys(fields).forEach(fieldName => {
        const field = fields[fieldName];
        if (!field.element) return;

        field.element.addEventListener('input', () => {
            validateField(fieldName, field);
            updateFormProgress();
        });

        field.element.addEventListener('blur', () => {
            validateField(fieldName, field);
        });
    });

    function validateField(fieldName, field) {
        const value = field.element.value.trim();
        const errors = [];

        // Run all validation rules
        field.rules.forEach(rule => {
            if (!rule.test(value)) {
                errors.push(rule.message);
            }
        });

        // Update UI based on validation result
        removeValidationClasses(field.element);

        if (value === '') {
            // Empty field - neutral state
            return false;
        } else if (errors.length > 0) {
            // Has errors
            addErrorClass(field.element, errors[0]); // Show first error
            return false;
        } else {
            // Valid
            addSuccessClass(field.element);
            return true;
        }
    }

    function addErrorClass(element, message) {
        element.classList.add('error');
        showValidationMessage(element, message, 'error');
    }

    function addSuccessClass(element) {
        element.classList.add('success');
        showValidationMessage(element, 'נראה טוב!', 'success');
    }

    function removeValidationClasses(element) {
        element.classList.remove('error', 'success');
        removeValidationMessage(element);
    }

    function showValidationMessage(element, message, type) {
        removeValidationMessage(element);

        const messageDiv = document.createElement('div');
        messageDiv.className = `validation-message ${type}`;
        messageDiv.innerHTML = `
            <span>${type === 'error' ? '⚠️' : '✅'}</span>
            <span>${message}</span>
        `;

        element.parentNode.appendChild(messageDiv);
    }

    function removeValidationMessage(element) {
        const existingMessage = element.parentNode.querySelector('.validation-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    // Email availability check (simulated)
    const emailField = fields.email.element;
    if (emailField) {
        let emailCheckTimeout;
        emailField.addEventListener('input', () => {
            clearTimeout(emailCheckTimeout);
            emailCheckTimeout = setTimeout(() => {
                checkEmailAvailability(emailField.value);
            }, 1000);
        });
    }

    function checkEmailAvailability(email) {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

        // Simulate API call
        const simulatedTakenEmails = ['test@gmail.com', 'admin@example.com'];

        setTimeout(() => {
            const emailField = document.getElementById('email');
            if (emailField && emailField.value === email) {
                if (simulatedTakenEmails.includes(email)) {
                    removeValidationClasses(emailField);
                    addErrorClass(emailField, 'כתובת אימייל זו כבר תפוסה');
                } else {
                    removeValidationClasses(emailField);
                    addSuccessClass(emailField);
                }
            }
        }, 500);
    }
}

// Password strength indicator
function initPasswordStrength() {
    const passwordField = document.getElementById('password');
    if (!passwordField) return;

    // Create strength indicator
    const strengthContainer = document.createElement('div');
    strengthContainer.className = 'password-strength';
    strengthContainer.innerHTML = `
        <div class="strength-bar"></div>
        <div class="strength-text">חוזק סיסמה</div>
    `;

    passwordField.parentNode.appendChild(strengthContainer);

    const strengthBar = strengthContainer.querySelector('.strength-bar');
    const strengthText = strengthContainer.querySelector('.strength-text');

    passwordField.addEventListener('input', () => {
        const password = passwordField.value;
        const strength = calculatePasswordStrength(password);

        updateStrengthIndicator(strength, strengthBar, strengthText);
    });

    function calculatePasswordStrength(password) {
        let score = 0;
        let feedback = [];

        // Length check
        if (password.length >= 6) score += 20;
        if (password.length >= 8) score += 15;
        if (password.length >= 12) score += 15;

        // Character variety
        if (/[a-z]/.test(password)) score += 10;
        if (/[A-Z]/.test(password)) score += 15;
        if (/[0-9]/.test(password)) score += 15;
        if (/[^A-Za-z0-9]/.test(password)) score += 10;

        // Determine strength level
        let level = 'weak';
        let text = 'חלשה';
        let color = '#dc3545';

        if (score >= 60) {
            level = 'medium';
            text = 'בינונית';
            color = '#ffc107';
        }
        if (score >= 80) {
            level = 'strong';
            text = 'חזקה';
            color = '#28a745';
        }

        return { score, level, text, color };
    }

    function updateStrengthIndicator(strength, bar, text) {
        bar.style.width = `${Math.min(strength.score, 100)}%`;
        bar.style.background = strength.color;
        text.textContent = `חוזק סיסמה: ${strength.text}`;
        text.style.color = strength.color;
    }
}

// Enhanced role selection
// Enhanced role selection
function initRoleSelection() {
    const roleCards = document.querySelectorAll('.role-card');
    const roleRadios = document.querySelectorAll('.role-radio');

    roleCards.forEach((card, index) => {
        card.addEventListener('click', () => {
            // Uncheck all radios
            roleRadios.forEach(radio => {
                radio.checked = false;
                radio.closest('.role-option').querySelector('.role-card').classList.remove('selected');
            });

            // Check the clicked radio - השתמש ב-closest כדי לחפש את הlabel הקרוב ביותר
            const radio = card.closest('.role-option').querySelector('.role-radio');
            radio.checked = true;
            card.classList.add('selected');

            // Animate selection
            card.style.transform = 'scale(1.02)';
            setTimeout(() => {
                card.style.transform = '';
            }, 200);

            updateFormProgress();
        });

        // Keyboard support
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });

        // Make focusable
        card.setAttribute('tabindex', '0');
    });
}
// Form progress tracking
function initFormProgress() {
    const progressSteps = [
        { id: 'step-info', label: 'פרטים אישיים', fields: ['username', 'email'] },
        { id: 'step-security', label: 'אבטחה', fields: ['password'] },
        { id: 'step-role', label: 'תפקיד', fields: ['role'] }
    ];

    // Create progress indicator
    const progressContainer = document.createElement('div');
    progressContainer.className = 'form-progress';

    progressSteps.forEach((step, index) => {
        const stepElement = document.createElement('div');
        stepElement.className = 'progress-step';
        stepElement.id = step.id;
        stepElement.innerHTML = `
            <div class="step-circle">${index + 1}</div>
            <span>${step.label}</span>
        `;
        progressContainer.appendChild(stepElement);
    });

    // Insert progress indicator at the top of form
    const formHeader = document.querySelector('.form-header');
    if (formHeader) {
        formHeader.appendChild(progressContainer);
    }

    function updateFormProgress() {
        progressSteps.forEach(step => {
            const stepElement = document.getElementById(step.id);
            const isCompleted = step.fields.every(fieldId => {
                if (fieldId === 'role') {
                    // בדיקה פשוטה יותר לתפקיד
                    const roleChecked = document.querySelector('input[name="role"]:checked');
                    console.log('Role checked:', roleChecked); // דיבוג
                    return roleChecked !== null;
                }

                const field = document.getElementById(fieldId);
                if (!field) {
                    console.log('Field not found:', fieldId); // דיבוג
                    return false;
                }

                const isValid = field.value.trim() !== '' && field.classList.contains('success');
                console.log(`Field ${fieldId} valid:`, isValid); // דיבוג
                return isValid;
            });

            console.log(`Step ${step.id} completed:`, isCompleted); // דיבוג
            stepElement.classList.toggle('completed', isCompleted);
            stepElement.classList.toggle('active', !isCompleted && hasStartedStep(step));
        });

        updateSubmitButton();
    }

    function hasStartedStep(step) {
        return step.fields.some(fieldId => {
            if (fieldId === 'role') {
                return document.querySelector('input[name="role"]:checked') !== null;
            }

            const field = document.getElementById(fieldId);
            if (!field) return false;

            return field.value.trim() !== '';
        });
    }

    function updateSubmitButton() {
        const submitBtn = document.querySelector('.submit-btn');
        if (!submitBtn) return;

        const allStepsCompleted = progressSteps.every(step => {
            const stepElement = document.getElementById(step.id);
            return stepElement && stepElement.classList.contains('completed');
        });

        submitBtn.disabled = !allStepsCompleted;
        submitBtn.style.opacity = allStepsCompleted ? '1' : '0.6';
    }

    // Make updateFormProgress globally accessible
    window.updateFormProgress = updateFormProgress;

    // Initial progress check
    setTimeout(updateFormProgress, 100);
}

// Enhanced animations
function initAnimations() {
    // Stagger animation for form groups
    const formGroups = document.querySelectorAll('.form-group');
    formGroups.forEach((group, index) => {
        group.style.opacity = '0';
        group.style.transform = 'translateY(20px)';
        group.style.animation = `slideInUp 0.6s ease-out ${index * 0.1}s forwards`;
    });

    // Role cards animation
    const roleCards = document.querySelectorAll('.role-card');
    roleCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.animation = `slideInUp 0.8s ease-out ${0.8 + index * 0.2}s forwards`;
    });

    // Add CSS animations if not present
    if (!document.getElementById('register-animation-styles')) {
        const animationStyles = document.createElement('style');
        animationStyles.id = 'register-animation-styles';
        animationStyles.textContent = `
            @keyframes slideInUp {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }

            .shake {
                animation: shake 0.5s ease-in-out;
            }
        `;
        document.head.appendChild(animationStyles);
    }

    // Success animation for completed fields
    function animateSuccess(element) {
        element.style.transform = 'scale(1.02)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }

    // Error shake animation
    function animateError(element) {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    }

    // Make animations globally accessible
    window.animateSuccess = animateSuccess;
    window.animateError = animateError;
}

// Keyboard shortcuts and accessibility
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Alt + U for username
        if (e.altKey && e.key === 'u') {
            e.preventDefault();
            const usernameField = document.getElementById('username');
            if (usernameField) usernameField.focus();
        }

        // Alt + E for email
        if (e.altKey && e.key === 'e') {
            e.preventDefault();
            const emailField = document.getElementById('email');
            if (emailField) emailField.focus();
        }

        // Alt + P for password
        if (e.altKey && e.key === 'p') {
            e.preventDefault();
            const passwordField = document.getElementById('password');
            if (passwordField) passwordField.focus();
        }

        // Alt + 1/2 for role selection
        if (e.altKey && (e.key === '1' || e.key === '2')) {
            e.preventDefault();
            const roleIndex = parseInt(e.key) - 1;
            const roleCards = document.querySelectorAll('.role-card');
            if (roleCards[roleIndex]) {
                roleCards[roleIndex].click();
            }
        }

        // Escape to clear form
        if (e.key === 'Escape') {
            clearForm();
        }

        // Enter to submit (if valid)
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn && !submitBtn.disabled) {
                e.preventDefault();
                submitBtn.click();
            }
        }
    });

    console.log('Keyboard shortcuts: Alt+U (username), Alt+E (email), Alt+P (password), Alt+1/2 (role), Enter (submit), Esc (clear)');
}

// Enhanced form submission
// Enhanced form submission
function initFormSubmission() {
    const form = document.querySelector('.register-form');
    const submitBtn = document.querySelector('.submit-btn');

    if (!form || !submitBtn) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Final validation check
        if (!validateAllFields()) {
            showError('יש לתקן את השגיאות בטופס');
            return;
        }

        // Add loading state
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<span>🚀</span><span>נרשם...</span>';

        // Submit the form normally after brief delay
        setTimeout(() => {
            // Create and submit form data
            const formData = new FormData(form);

            // Actually submit
            form.removeEventListener('submit', arguments.callee);
            form.submit();
        }, 500);
    });

    function validateAllFields() {
        const fields = ['username', 'email', 'password'];
        let allValid = true;

        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field || !field.classList.contains('success')) {
                allValid = false;
                if (field) {
                    window.animateError && window.animateError(field);
                }
            }
        });

        // Check role selection
        const roleSelected = document.querySelector('input[name="role"]:checked');
        if (!roleSelected) {
            allValid = false;
            const roleCards = document.querySelectorAll('.role-card');
            roleCards.forEach(card => window.animateError && window.animateError(card));
        }

        return allValid;
    }
}

// Utility functions
function clearForm() {
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.value = '';
        input.classList.remove('error', 'success');
    });

    // Clear role selection
    const roleRadios = document.querySelectorAll('.role-radio');
    roleRadios.forEach(radio => {
        radio.checked = false;
        radio.parentNode.querySelector('.role-card').classList.remove('selected');
    });

    // Remove validation messages
    const validationMessages = document.querySelectorAll('.validation-message');
    validationMessages.forEach(message => message.remove());

    // Reset progress
    if (window.updateFormProgress) {
        window.updateFormProgress();
    }

    // Focus first input
    const firstInput = document.getElementById('username');
    if (firstInput) firstInput.focus();
}

function showError(message, duration = 5000) {
    // Remove existing errors
    const existingErrors = document.querySelectorAll('.dynamic-error');
    existingErrors.forEach(error => error.remove());

    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-message error dynamic-error';
    errorDiv.innerHTML = `
        <span>⚠️</span>
        <span>${message}</span>
    `;

    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
        animation: slideInRight 0.5s ease-out;
    `;

    document.body.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.style.animation = 'slideOutRight 0.5s ease-out forwards';
        setTimeout(() => errorDiv.remove(), 500);
    }, duration);
}

function showSuccess(message, duration = 3000) {
    const successDiv = document.createElement('div');
    successDiv.className = 'validation-message success dynamic-success';
    successDiv.innerHTML = `
        <span>✅</span>
        <span>${message}</span>
    `;

    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        animation: slideInRight 0.5s ease-out;
    `;

    document.body.appendChild(successDiv);

    setTimeout(() => {
        successDiv.style.animation = 'slideOutRight 0.5s ease-out forwards';
        setTimeout(() => successDiv.remove(), 500);
    }, duration);
}

// Add slide animations for notifications
if (!document.getElementById('notification-animation-styles')) {
    const notificationStyles = document.createElement('style');
    notificationStyles.id = 'notification-animation-styles';
    notificationStyles.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    document.head.appendChild(notificationStyles);
}

// Auto-focus first field after animations
window.addEventListener('load', () => {
    setTimeout(() => {
        const usernameField = document.getElementById('username');
        if (usernameField) usernameField.focus();
    }, 800);
});

// Performance monitoring
const startTime = performance.now();
window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime;
    console.log(`🚀 Register page loaded in ${Math.round(loadTime)}ms`);
});

// Global utilities
window.registerUtils = {
    showError,
    showSuccess,
    clearForm
};

// Console helper
console.log(`
📝 Register Page Features:
- Real-time field validation
- Password strength indicator
- Progress tracking
- Role selection with cards
- Keyboard shortcuts
- Enhanced animations
- Email availability check
- Accessibility improvements
`);
