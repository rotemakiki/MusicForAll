// Info Page - Interactive Features
document.addEventListener('DOMContentLoaded', function() {
    initInfoPage();
    initCharCounter();
    initPostInteractions();
    initFormValidation();
    initKeyboardShortcuts();
});

function initInfoPage() {
    console.log('📢 Info page initialized');

    // Add smooth scrolling to new posts
    const posts = document.querySelectorAll('.post-card');
    posts.forEach((post, index) => {
        post.style.animationDelay = `${index * 0.1}s`;
        post.classList.add('fade-in');
    });

    // Add relative time display
    updateRelativeTimes();
    setInterval(updateRelativeTimes, 60000); // Update every minute
}

function initCharCounter() {
    const textarea = document.getElementById('content');
    const charCount = document.getElementById('charCount');

    if (textarea && charCount) {
        textarea.addEventListener('input', function() {
            const count = this.value.length;
            charCount.textContent = count;

            // Change color based on character count
            if (count > 450) {
                charCount.style.color = '#dc2626';
            } else if (count > 400) {
                charCount.style.color = '#f59e0b';
            } else {
                charCount.style.color = '#64748b';
            }
        });
    }
}

function initPostInteractions() {
    // Initialize like counters from localStorage
    const posts = document.querySelectorAll('.post-card');
    posts.forEach(post => {
        const postId = post.dataset.postId;
        const likeCount = localStorage.getItem(`post-likes-${postId}`) || 0;
        const likeElement = document.getElementById(`likes-${postId}`);
        if (likeElement) {
            likeElement.textContent = likeCount;
        }
    });
}

function initFormValidation() {
    const form = document.getElementById('newPostForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            const content = document.getElementById('content').value.trim();

            if (content.length < 10) {
                e.preventDefault();
                showNotification('ההודעה חייבת להכיל לפחות 10 תווים', 'error');
                return;
            }

            if (content.length > 500) {
                e.preventDefault();
                showNotification('ההודעה ארוכה מדי (מקסימום 500 תווים)', 'error');
                return;
            }

            // Show loading state
            const submitBtn = form.querySelector('.publish-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="btn-icon">⏳</span><span>מפרסם...</span>';
            submitBtn.disabled = true;

            // Reset after form submission (this will be replaced by page reload)
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 3000);
        });
    }
}

function previewPost() {
    const content = document.getElementById('content').value.trim();

    if (!content) {
        showNotification('אנא כתוב תוכן להודעה לפני התצוגה המקדימה', 'warning');
        return;
    }

    const previewContent = document.getElementById('previewContent');
    const modal = document.getElementById('previewModal');

    // Format the content for preview
    const formattedContent = content.replace(/\n/g, '<br>');
    previewContent.innerHTML = formattedContent;

    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Track preview action
    console.log('👁️ Post preview opened');
}

function closePreview() {
    const modal = document.getElementById('previewModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function likePost(postId) {
    const likeElement = document.getElementById(`likes-${postId}`);
    const likeBtn = event.currentTarget;

    if (!likeElement) return;

    // Get current likes
    let currentLikes = parseInt(localStorage.getItem(`post-likes-${postId}`)) || 0;
    const hasLiked = localStorage.getItem(`post-liked-${postId}`) === 'true';

    if (hasLiked) {
        // Unlike
        currentLikes = Math.max(0, currentLikes - 1);
        localStorage.setItem(`post-liked-${postId}`, 'false');
        likeBtn.style.background = '#f1f5f9';
        showNotification('הוסר לייק', 'info');
    } else {
        // Like
        currentLikes += 1;
        localStorage.setItem(`post-liked-${postId}`, 'true');
        likeBtn.style.background = '#fef2f2';
        likeBtn.style.borderColor = '#fca5a5';
        likeBtn.style.color = '#dc2626';

        // Add animation
        likeBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            likeBtn.style.transform = '';
        }, 200);

        showNotification('תודה על הלייק! 👍', 'success');
    }

    // Update display and storage
    localStorage.setItem(`post-likes-${postId}`, currentLikes);
    likeElement.textContent = currentLikes;

    console.log(`👍 Post ${postId} ${hasLiked ? 'unliked' : 'liked'}`);
}

function sharePost(postId) {
    const post = document.querySelector(`[data-post-id="${postId}"]`);
    const content = post.querySelector('.content-text').textContent;

    // Try to use Web Share API if available
    if (navigator.share) {
        navigator.share({
            title: 'הודעה מהאתר',
            text: content,
            url: window.location.href
        }).then(() => {
            showNotification('ההודעה נשותפה בהצלחה', 'success');
        }).catch(() => {
            fallbackShare(content);
        });
    } else {
        fallbackShare(content);
    }

console.log(`📤 Post ${postId} shared`);
}

function fallbackShare(content) {
   // Fallback to copying to clipboard
   const shareText = `הודעה מהאתר:\n\n${content}\n\n${window.location.href}`;

   if (navigator.clipboard) {
       navigator.clipboard.writeText(shareText).then(() => {
           showNotification('ההודעה הועתקה ללוח', 'success');
       }).catch(() => {
           showNotification('לא ניתן להעתיק את ההודעה', 'error');
       });
   } else {
       // Very old browser fallback
       const textarea = document.createElement('textarea');
       textarea.value = shareText;
       document.body.appendChild(textarea);
       textarea.select();
       document.execCommand('copy');
       document.body.removeChild(textarea);
       showNotification('ההודעה הועתקה ללוח', 'success');
   }
}

function updateRelativeTimes() {
   const timeElements = document.querySelectorAll('time[datetime]');

   timeElements.forEach(element => {
       const dateTime = new Date(element.getAttribute('datetime'));
       const now = new Date();
       const diffInMinutes = Math.floor((now - dateTime) / (1000 * 60));

       let relativeTime;
       if (diffInMinutes < 1) {
           relativeTime = 'כרגע';
       } else if (diffInMinutes < 60) {
           relativeTime = `לפני ${diffInMinutes} דקות`;
       } else if (diffInMinutes < 1440) {
           const hours = Math.floor(diffInMinutes / 60);
           relativeTime = `לפני ${hours} שעות`;
       } else {
           const days = Math.floor(diffInMinutes / 1440);
           relativeTime = `לפני ${days} ימים`;
       }

       // Update the title attribute for hover
       element.setAttribute('title', `${relativeTime} (${element.textContent})`);
   });
}

function initKeyboardShortcuts() {
   document.addEventListener('keydown', function(e) {
       // Only activate shortcuts if not typing in an input
       if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
           return;
       }

       if (e.ctrlKey || e.metaKey) {
           switch(e.key) {
               case 'n':
                   e.preventDefault();
                   const contentField = document.getElementById('content');
                   if (contentField) {
                       contentField.focus();
                       showNotification('מוכן לכתיבת הודעה חדשה', 'info');
                   }
                   break;

               case 'p':
                   e.preventDefault();
                   previewPost();
                   break;

               case 'Enter':
                   e.preventDefault();
                   const form = document.getElementById('newPostForm');
                   if (form && document.getElementById('content').value.trim()) {
                       form.submit();
                   }
                   break;
           }
       }

       // Escape to close modal
       if (e.key === 'Escape') {
           closePreview();
       }
   });
}

function showNotification(message, type = 'info') {
   // Remove existing notifications
   const existingNotifications = document.querySelectorAll('.notification');
   existingNotifications.forEach(n => n.remove());

   const notification = document.createElement('div');
   notification.className = `notification notification-${type}`;

   const icons = {
       success: '✅',
       error: '❌',
       warning: '⚠️',
       info: 'ℹ️'
   };

   notification.innerHTML = `
       <div class="notification-content">
           <span class="notification-icon">${icons[type] || icons.info}</span>
           <span class="notification-message">${message}</span>
           <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
       </div>
   `;

   document.body.appendChild(notification);

   // Auto remove after 5 seconds
   setTimeout(() => {
       if (notification.parentElement) {
           notification.style.opacity = '0';
           setTimeout(() => notification.remove(), 300);
       }
   }, 5000);
}

// Add CSS for notifications and animations
const notificationCSS = `
   .notification {
       position: fixed;
       top: 20px;
       right: 20px;
       z-index: 10001;
       background: white;
       border-radius: 12px;
       box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
       animation: slideInRight 0.3s ease;
       max-width: 400px;
       width: 90%;
   }

   .notification-content {
       display: flex;
       align-items: center;
       gap: 12px;
       padding: 15px 20px;
   }

   .notification-icon {
       font-size: 1.2rem;
       flex-shrink: 0;
   }

   .notification-message {
       flex: 1;
       color: #374151;
       font-weight: 500;
   }

   .notification-close {
       background: none;
       border: none;
       font-size: 1.5rem;
       color: #6b7280;
       cursor: pointer;
       padding: 0;
       width: 24px;
       height: 24px;
       display: flex;
       align-items: center;
       justify-content: center;
       border-radius: 50%;
       transition: background 0.2s ease;
   }

   .notification-close:hover {
       background: #f3f4f6;
   }

   .notification-success {
       border-right: 4px solid #10b981;
   }

   .notification-error {
       border-right: 4px solid #ef4444;
   }

   .notification-warning {
       border-right: 4px solid #f59e0b;
   }

   .notification-info {
       border-right: 4px solid #3b82f6;
   }

   .fade-in {
       animation: fadeInUp 0.6s ease forwards;
       opacity: 0;
       transform: translateY(20px);
   }

   @keyframes slideInRight {
       from {
           transform: translateX(100%);
           opacity: 0;
       }
       to {
           transform: translateX(0);
           opacity: 1;
       }
   }

   @keyframes fadeInUp {
       to {
           opacity: 1;
           transform: translateY(0);
       }
   }

   /* Loading states */
   .publish-btn:disabled {
       opacity: 0.7;
       cursor: not-allowed;
       transform: none !important;
   }

   .publish-btn:disabled:hover {
       transform: none !important;
       box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3) !important;
   }
`;

// Add styles to document
const styleElement = document.createElement('style');
styleElement.textContent = notificationCSS;
document.head.appendChild(styleElement);

// Add click outside modal to close
document.addEventListener('click', function(e) {
   const modal = document.getElementById('previewModal');
   if (e.target === modal) {
       closePreview();
   }
});

// Initialize tooltips for better UX
function initTooltips() {
   const elements = document.querySelectorAll('[title]');
   elements.forEach(element => {
       element.addEventListener('mouseenter', function() {
           const tooltip = document.createElement('div');
           tooltip.className = 'custom-tooltip';
           tooltip.textContent = this.getAttribute('title');
           document.body.appendChild(tooltip);

           const rect = this.getBoundingClientRect();
           tooltip.style.position = 'fixed';
           tooltip.style.top = `${rect.bottom + 8}px`;
           tooltip.style.left = `${rect.left + rect.width/2}px`;
           tooltip.style.transform = 'translateX(-50%)';
           tooltip.style.zIndex = '10002';

           // Remove the title to prevent default tooltip
           this.dataset.originalTitle = this.getAttribute('title');
           this.removeAttribute('title');
       });

       element.addEventListener('mouseleave', function() {
           const tooltip = document.querySelector('.custom-tooltip');
           if (tooltip) tooltip.remove();

           // Restore the title
           if (this.dataset.originalTitle) {
               this.setAttribute('title', this.dataset.originalTitle);
               delete this.dataset.originalTitle;
           }
       });
   });
}

// Add tooltip styles
const tooltipCSS = `
   .custom-tooltip {
       background: #1f2937;
       color: white;
       padding: 8px 12px;
       border-radius: 6px;
       font-size: 0.85rem;
       font-weight: 500;
       pointer-events: none;
       animation: fadeIn 0.2s ease;
       box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
       max-width: 300px;
       text-align: center;
       white-space: nowrap;
   }

   .custom-tooltip::before {
       content: '';
       position: absolute;
       top: -4px;
       left: 50%;
       transform: translateX(-50%);
       border-left: 4px solid transparent;
       border-right: 4px solid transparent;
       border-bottom: 4px solid #1f2937;
   }
`;

styleElement.textContent += tooltipCSS;

// Initialize tooltips after DOM is ready
setTimeout(initTooltips, 1000);

// Console helper
console.log(`
📢 Info Page Features:
- Character counter with color feedback
- Post preview modal
- Like and share functionality
- Keyboard shortcuts (Ctrl+N, Ctrl+P, Ctrl+Enter, Esc)
- Real-time relative timestamps
- Custom notifications
- Form validation
- Responsive design
`);
