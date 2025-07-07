// Teachers Page Interactive Features
document.addEventListener('DOMContentLoaded', function() {
    // Animation for teacher cards on load
    const teacherCards = document.querySelectorAll('.teacher-card');

    // Staggered animation for cards
    teacherCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 150);
    });

    // Enhanced hover effects
    teacherCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Click handling with smooth transition
    teacherCards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();

            // Add click animation
            this.style.transform = 'translateY(-2px) scale(0.98)';

            // Navigate after animation
            setTimeout(() => {
                window.location.href = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            }, 150);
        });
    });

    // Search functionality (if needed in future)
    function filterTeachers(searchTerm) {
        teacherCards.forEach(card => {
            const teacherName = card.querySelector('.teacher-name').textContent.toLowerCase();
            const shouldShow = teacherName.includes(searchTerm.toLowerCase());

            card.style.display = shouldShow ? 'block' : 'none';
        });
    }

    // Accessibility improvements
    teacherCards.forEach(card => {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        // Keyboard navigation
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
});
