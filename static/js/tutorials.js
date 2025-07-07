// Tutorials Page - Interactive Features
document.addEventListener('DOMContentLoaded', function() {
    initTutorials();
    initVideoPlayers();
    initAnalytics();
    initKeyboardShortcuts();
});

function initTutorials() {
    const tutorialCards = document.querySelectorAll('.tutorial-card');

    tutorialCards.forEach(card => {
        // Add click animation
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });

        // Add hover effects
        card.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.2)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.boxShadow = '';
        });
    });
}

function initVideoPlayers() {
    const videos = document.querySelectorAll('video');

    videos.forEach(video => {
        // Add loading state
        video.addEventListener('loadstart', function() {
            this.parentElement.classList.add('loading');
        });

        video.addEventListener('loadeddata', function() {
            this.parentElement.classList.remove('loading');
        });

        // Add play/pause analytics
        video.addEventListener('play', function() {
            const tutorialType = this.closest('.tutorial-card').dataset.tutorial;
            trackVideoEvent('play', tutorialType);
        });

        video.addEventListener('pause', function() {
            const tutorialType = this.closest('.tutorial-card').dataset.tutorial;
            trackVideoEvent('pause', tutorialType);
        });

        video.addEventListener('ended', function() {
            const tutorialType = this.closest('.tutorial-card').dataset.tutorial;
            trackVideoEvent('completed', tutorialType);
            showCompletionMessage(tutorialType);
        });

        // Add keyboard controls
        video.addEventListener('keydown', function(e) {
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    this.paused ? this.play() : this.pause();
                    break;
                case 'ArrowLeft':
                    this.currentTime -= 10;
                    break;
                case 'ArrowRight':
                    this.currentTime += 10;
                    break;
                case 'f':
                    this.requestFullscreen();
                    break;
            }
        });
    });
}

function trackVideoEvent(action, tutorialType) {
    console.log(`📹 Video ${action}: ${tutorialType}`);

    // Send to analytics if available
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            event_category: 'tutorial_video',
            event_label: tutorialType,
            value: 1
        });
    }
}

function showCompletionMessage(tutorialType) {
    const message = document.createElement('div');
    message.className = 'completion-message';
    message.innerHTML = `
        <div class="completion-content">
            <div class="completion-icon">🎉</div>
            <h3>כל הכבוד!</h3>
            <p>סיימת לצפות בהדרכה "${getTutorialTitle(tutorialType)}"</p>
            <button onclick="this.parentElement.parentElement.remove()">סגור</button>
        </div>
    `;

    document.body.appendChild(message);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (message.parentElement) {
            message.remove();
        }
    }, 5000);
}

function getTutorialTitle(tutorialType) {
    const titles = {
        'add-song': 'הוספת שיר חדש',
        'listen-song': 'האזנה לשיר',
        'login-register': 'התחברות והרשמה',
        'chords-editing': 'עריכת אקורדים'
    };
    return titles[tutorialType] || 'הדרכה';
}

function initAnalytics() {
    // Track page view
    console.log('📊 Tutorials page viewed');

    // Track time spent on page
    const startTime = Date.now();

    window.addEventListener('beforeunload', function() {
        const timeSpent = Date.now() - startTime;
        console.log(`⏱️ Time spent on tutorials: ${Math.round(timeSpent / 1000)}s`);
    });
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '1':
                    e.preventDefault();
                    focusOnTutorial('add-song');
                    break;
                case '2':
                    e.preventDefault();
                    focusOnTutorial('listen-song');
                    break;
                case '3':
                    e.preventDefault();
                    focusOnTutorial('login-register');
                    break;
                case '4':
                    e.preventDefault();
                    focusOnTutorial('chords-editing');
                    break;
            }
        }
    });
}

function focusOnTutorial(tutorialType) {
    const tutorial = document.querySelector(`[data-tutorial="${tutorialType}"]`);
    if (tutorial) {
        tutorial.scrollIntoView({ behavior: 'smooth', block: 'center' });
        tutorial.style.transform = 'scale(1.02)';
        setTimeout(() => {
            tutorial.style.transform = '';
        }, 300);
    }
}

// Add CSS for completion message
const completionCSS = `
    .completion-message {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    }

    .completion-content {
        background: white;
        padding: 40px;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 90%;
    }

    .completion-icon {
        font-size: 3rem;
        margin-bottom: 20px;
    }

    .completion-content h3 {
        color: #28a745;
        margin: 0 0 15px 0;
        font-size: 1.5rem;
    }

    .completion-content p {
        color: #64748b;
        margin: 0 0 25px 0;
    }

    .completion-content button {
        background: #28a745;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.3s ease;
    }

    .completion-content button:hover {
        background: #218838;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
    }
`;

// Add styles to document
const styleElement = document.createElement('style');
styleElement.textContent = completionCSS;
document.head.appendChild(styleElement);

// Console helper
console.log(`
📚 Tutorials Page Features:
- Interactive video players with analytics
- Keyboard shortcuts (Ctrl+1-4 for tutorials)
- Video controls (Space, ←/→, F for fullscreen)
- Completion tracking and messages
- Responsive design for all screen sizes
`);
