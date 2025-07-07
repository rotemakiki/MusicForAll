// Home User Page JavaScript - Enhanced Functionality

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupScrollListeners();
    animateProgressBars();
    setupVideoInteractions();
    loadUserStats();
});

function initializePage() {
    // Add smooth entrance animations
    animateElements();

    // Setup auto-scroll for video sections
    setupAutoScroll();

    // Initialize intersection observers
    setupIntersectionObserver();
}

function animateElements() {
    const elements = document.querySelectorAll('.welcome-header, .video-section');
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

function setupScrollListeners() {
    // Enhanced scroll functionality with smooth animations
    window.scrollVideos = function(containerId, amount) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const currentScroll = container.scrollLeft;
        const targetScroll = currentScroll - amount;

        // Smooth scroll with easing
        animateScroll(container, currentScroll, targetScroll, 300);

        // Update arrow visibility
        setTimeout(() => updateArrowVisibility(containerId), 350);
    };
}

function animateScroll(element, start, end, duration) {
    const startTime = performance.now();
    const change = end - start;

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        element.scrollLeft = start + change * easeProgress;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}

function updateArrowVisibility(containerId) {
    const container = document.getElementById(containerId);
    const wrapper = container.closest('.video-scroll-wrapper');
    const leftArrow = wrapper.querySelector('.scroll-left');
    const rightArrow = wrapper.querySelector('.scroll-right');

    if (!leftArrow || !rightArrow) return;

    const canScrollLeft = container.scrollLeft > 0;
    const canScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth);

    leftArrow.style.opacity = canScrollLeft ? '1' : '0.3';
    rightArrow.style.opacity = canScrollRight ? '1' : '0.3';

    leftArrow.style.pointerEvents = canScrollLeft ? 'auto' : 'none';
    rightArrow.style.pointerEvents = canScrollRight ? 'auto' : 'none';
}

function setupAutoScroll() {
    // Auto-scroll for video sections every 10 seconds
    const videoContainers = document.querySelectorAll('.video-scroll-container');

    videoContainers.forEach(container => {
        let autoScrollInterval;
        let isUserInteracting = false;

        function startAutoScroll() {
            autoScrollInterval = setInterval(() => {
                if (!isUserInteracting && !isElementInViewport(container)) {
                    const scrollAmount = container.clientWidth * 0.8;
                    const maxScroll = container.scrollWidth - container.clientWidth;

                    if (container.scrollLeft >= maxScroll) {
                        // Reset to beginning
                        animateScroll(container, container.scrollLeft, 0, 500);
                    } else {
                        // Scroll to next section
                        const newScroll = Math.min(container.scrollLeft + scrollAmount, maxScroll);
                        animateScroll(container, container.scrollLeft, newScroll, 500);
                    }
                }
            }, 8000);
        }

        function stopAutoScroll() {
            clearInterval(autoScrollInterval);
        }

        // Start auto-scroll
        startAutoScroll();

        // Pause on user interaction
        container.addEventListener('mouseenter', () => {
            isUserInteracting = true;
            stopAutoScroll();
        });

        container.addEventListener('mouseleave', () => {
            isUserInteracting = false;
            startAutoScroll();
        });

        // Pause when user scrolls manually
        container.addEventListener('scroll', () => {
            isUserInteracting = true;
            stopAutoScroll();

            // Resume after 5 seconds of no interaction
            setTimeout(() => {
                if (!container.matches(':hover')) {
                    isUserInteracting = false;
                    startAutoScroll();
                }
            }, 5000);
        });
    });
}

function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

function animateProgressBars() {
    const progressBars = document.querySelectorAll('.progress-fill');

    progressBars.forEach(bar => {
        const targetWidth = bar.dataset.progress || '0';
        bar.style.width = '0%';

        setTimeout(() => {
            bar.style.transition = 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
            bar.style.width = targetWidth + '%';
        }, 500);
    });
}

function setupVideoInteractions() {
    const videoCards = document.querySelectorAll('.video-card');

    videoCards.forEach(card => {
        const video = card.querySelector('video');

        // Hover effects
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px) scale(1.02)';
            if (video) {
                video.style.filter = 'brightness(1.1)';
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
            if (video) {
                video.style.filter = 'brightness(1)';
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
                }, 1000);
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

                // Trigger progress bar animations
                const progressBars = entry.target.querySelectorAll('.progress-fill');
                progressBars.forEach(bar => {
                    if (!bar.classList.contains('animated')) {
                        bar.classList.add('animated');
                        const targetWidth = bar.dataset.progress || '0';
                        bar.style.width = targetWidth + '%';
                    }
                });
            }
        });
    }, observerOptions);

    // Observe video sections and progress indicators
    document.querySelectorAll('.video-section, .progress-indicator').forEach(section => {
        observer.observe(section);
    });
}

function loadUserStats() {
    // Animate statistics counters
    const statNumbers = document.querySelectorAll('.stat-number');

    statNumbers.forEach(stat => {
        const finalValue = parseInt(stat.textContent);
        let currentValue = 0;
        const increment = finalValue / 50;
        const duration = 1500;
        const stepTime = duration / 50;

        stat.textContent = '0';

        const counter = setInterval(() => {
            currentValue += increment;
            if (currentValue >= finalValue) {
                stat.textContent = finalValue;
                clearInterval(counter);
            } else {
                stat.textContent = Math.floor(currentValue);
            }
        }, stepTime);
    });
}

// Video modal functionality
function openVideoModal(videoSrc, title) {
    const modal = document.createElement('div');
    modal.className = 'video-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeVideoModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-btn" onclick="closeVideoModal()">&times;</button>
                </div>
                <div class="modal-video">
                    <video controls autoplay>
                        <source src="${videoSrc}" type="video/mp4">
                        הדפדפן שלך לא תומך בניגון וידאו.
                    </video>
                </div>
            </div>
        </div>
    `;

    // Add modal styles
    const modalStyles = `
        .video-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        }

        .modal-content {
            background: white;
            border-radius: 20px;
            overflow: hidden;
            max-width: 90vw;
            max-height: 90vh;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }

        .modal-header h3 {
            margin: 0;
            font-size: 1.2rem;
        }

        .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 5px;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s;
        }

        .close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .modal-video {
            padding: 0;
        }

        .modal-video video {
            width: 100%;
            height: auto;
            max-height: 70vh;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(50px) scale(0.9);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
    `;

    // Add styles to document
    const styleSheet = document.createElement('style');
    styleSheet.textContent = modalStyles;
    document.head.appendChild(styleSheet);

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeVideoModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function closeVideoModal() {
    const modal = document.querySelector('.video-modal');
    if (modal) {
        modal.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// Enhanced touch/swipe support for mobile
function setupTouchSupport() {
    const videoContainers = document.querySelectorAll('.video-scroll-container');

    videoContainers.forEach(container => {
        let startX = 0;
        let scrollLeft = 0;
        let isDown = false;

        container.addEventListener('touchstart', (e) => {
            isDown = true;
            startX = e.touches[0].pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });

        container.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.touches[0].pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        });

        container.addEventListener('touchend', () => {
            isDown = false;
        });
    });
}

// Initialize touch support
setupTouchSupport();

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    const focusedContainer = document.querySelector('.video-scroll-container:hover');
    if (!focusedContainer) return;

    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            scrollVideos(focusedContainer.id, -300);
            break;
        case 'ArrowRight':
            e.preventDefault();
            scrollVideos(focusedContainer.id, 300);
            break;
    }
});

// Performance optimization: Lazy load videos
function setupLazyLoading() {
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

// Initialize lazy loading
setupLazyLoading();

// Add CSS animations for better UX
const additionalStyles = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }

    .stat-item:hover {
        animation: pulse 0.6s ease-in-out;
    }

    .action-btn:active {
        transform: translateY(-1px) scale(0.98);
    }

    .video-card.loading {
        position: relative;
        overflow: hidden;
    }

    .video-card.loading::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
    }

    .animate-in {
        animation: fadeInUp 0.6s ease forwards;
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

// Add additional styles
const additionalStyleSheet = document.createElement('style');
additionalStyleSheet.textContent = additionalStyles;
document.head.appendChild(additionalStyleSheet);
