// Home Guest Page - Interactive Features and Animations

document.addEventListener('DOMContentLoaded', function() {
    initFloatingNotes();
    initScrollAnimations();
    initTypeWriter();
    initStatsCounter();
    initParallax();
    initVideoModal();

    console.log('🎵 Home Guest page loaded with enhanced features');
});

// Floating musical notes animation
function initFloatingNotes() {
    const floatingContainer = document.createElement('div');
    floatingContainer.className = 'floating-elements';
    document.body.appendChild(floatingContainer);

    const musicNotes = ['♪', '♫', '♬', '♩', '♭', '♯', '𝄞', '𝄢'];

    for (let i = 0; i < 8; i++) {
        const note = document.createElement('div');
        note.className = 'floating-note';
        note.textContent = musicNotes[Math.floor(Math.random() * musicNotes.length)];
        note.style.left = `${10 + (i * 10)}%`;
        note.style.animationDelay = `${i * 2}s`;
        note.style.fontSize = `${1.5 + Math.random() * 1}rem`;
        floatingContainer.appendChild(note);
    }

    // Refresh notes periodically
    setInterval(() => {
        const notes = document.querySelectorAll('.floating-note');
        notes.forEach((note, index) => {
            if (Math.random() > 0.7) {
                note.textContent = musicNotes[Math.floor(Math.random() * musicNotes.length)];
            }
        });
    }, 5000);
}

// Scroll-triggered animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.8s ease-out forwards';
                entry.target.style.opacity = '1';
            }
        });
    }, observerOptions);

    // Observe feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.animationDelay = `${index * 0.2}s`;
        observer.observe(card);
    });

    // Observe stats
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.animationDelay = `${index * 0.1}s`;
        observer.observe(item);
    });
}

// Typewriter effect for hero subtitle
function initTypeWriter() {
    const subtitle = document.querySelector('.hero-subtitle');
    if (!subtitle) return;

    const originalText = subtitle.textContent;
    subtitle.textContent = '';

    let index = 0;
    function typeWriter() {
        if (index < originalText.length) {
            subtitle.textContent += originalText.charAt(index);
            index++;
            setTimeout(typeWriter, 50);
        }
    }

    // Start typewriter after hero animation
    setTimeout(typeWriter, 1000);
}

// Animated counter for stats
function initStatsCounter() {
    const statNumbers = document.querySelectorAll('.stat-number');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(stat => {
        observer.observe(stat);
    });
}

function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'));
    const increment = target / 100;
    let current = 0;

    const timer = setInterval(() => {
        current += increment;
        element.textContent = Math.ceil(current);

        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        }
    }, 20);
}

// Parallax effect for hero section
function initParallax() {
    const hero = document.querySelector('.hero-section');
    if (!hero) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        hero.style.transform = `translateY(${rate}px)`;
    });
}

// Video modal functionality
function initVideoModal() {
    const video = document.querySelector('.hero-video video');
    if (!video) return;

    video.addEventListener('click', openVideoModal);

    function openVideoModal() {
        const modal = document.createElement('div');
        modal.className = 'video-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeVideoModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <button class="close-btn" onclick="closeVideoModal()">&times;</button>
                    <video controls autoplay>
                        <source src="${video.querySelector('source').src}" type="video/mp4">
                        הדפדפן שלך לא תומך בניגון וידאו.
                    </video>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Add modal styles
        if (!document.getElementById('video-modal-styles')) {
            const modalStyles = document.createElement('style');
            modalStyles.id = 'video-modal-styles';
            modalStyles.textContent = `
                .video-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.3s ease-out;
                }

                .modal-content {
                    position: relative;
                    max-width: 90vw;
                    max-height: 90vh;
                }

                .modal-content video {
                    width: 100%;
                    height: auto;
                    border-radius: 10px;
                }

                .close-btn {
                    position: absolute;
                    top: -40px;
                    right: 0;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 2rem;
                    cursor: pointer;
                    z-index: 1001;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `;
            document.head.appendChild(modalStyles);
        }

        window.closeVideoModal = function() {
            modal.remove();
            document.body.style.overflow = 'auto';
        };
    }
}

// Smooth scrolling for navigation links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Interactive hover effects for buttons
function initButtonEffects() {
    const buttons = document.querySelectorAll('.hero-btn, .cta-btn');

    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.05)';
        });

        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });

        // Ripple effect on click
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
                background: rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;

            if (!document.getElementById('ripple-styles')) {
                const rippleStyles = document.createElement('style');
                rippleStyles.id = 'ripple-styles';
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

// Initialize all features when page loads (stats come from server - data-target already set in HTML)
window.addEventListener('load', function() {
    initButtonEffects();
    initSmoothScroll();
});

// Add some keyboard shortcuts for better UX
document.addEventListener('keydown', function(e) {
    // Press 'L' to go to login
    if (e.key === 'l' || e.key === 'L') {
        const loginBtn = document.querySelector('a[href*="login"]');
        if (loginBtn) loginBtn.click();
    }

    // Press 'R' to go to register
    if (e.key === 'r' || e.key === 'R') {
        const registerBtn = document.querySelector('a[href*="register"]');
        if (registerBtn) registerBtn.click();
    }

    // Press 'S' to scroll to songs
    if (e.key === 's' || e.key === 'S') {
        const songsSection = document.querySelector('#songs-section');
        if (songsSection) {
            songsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
});

// Add console welcome message
console.log(`
🎵 ברוכים הבאים למוזיקה לכולם! 🎵
Keyboard shortcuts:
- L: Login
- R: Register
- S: Songs section
`);

// Performance monitoring
const perfObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
            console.log(`⚡ Page loaded in ${Math.round(entry.loadEventEnd - entry.fetchStart)}ms`);
        }
    });
});

if ('PerformanceObserver' in window) {
    perfObserver.observe({ entryTypes: ['navigation'] });
}
