// Modern Menu Toggle Function
function toggleMenu() {
    const menu = document.getElementById("navbar-menu");
    const body = document.body;
    
    menu.classList.toggle("active");
    
    // Prevent body scroll when menu is open
    if (menu.classList.contains("active")) {
        body.style.overflow = "hidden";
    } else {
        body.style.overflow = "auto";
    }
}

// Close menu when clicking outside
document.addEventListener('click', function(event) {
    const menu = document.getElementById("navbar-menu");
    const navbar = document.querySelector(".modern-navbar");
    
    if (menu && menu.classList.contains("active") && !navbar.contains(event.target)) {
        menu.classList.remove("active");
        document.body.style.overflow = "auto";
    }
});

// Close menu on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const menu = document.getElementById("navbar-menu");
        if (menu && menu.classList.contains("active")) {
            menu.classList.remove("active");
            document.body.style.overflow = "auto";
        }
    }
});

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth hover effects
    const menuLinks = document.querySelectorAll('.menu-link');
    menuLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(-5px) scale(1.02)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0) scale(1)';
        });
    });
});
