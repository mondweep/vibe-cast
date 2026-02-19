// Microsoft Integration Guide - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavigation();
    initPatternTabs();
    initProblemFilters();
    initDecisionTree();
    initSmoothScrolling();
    initMobileMenu();
});

// Navigation - Active state on scroll
function initNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    function updateActiveNav() {
        const scrollPosition = window.scrollY + 100;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav();
}

// Pattern Tabs
function initPatternTabs() {
    const tabs = document.querySelectorAll('.pattern-tab');
    const groups = document.querySelectorAll('.pattern-group');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetPattern = this.getAttribute('data-pattern');

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Show corresponding pattern group
            groups.forEach(group => {
                group.classList.remove('active');
                if (group.id === `patterns-${targetPattern}`) {
                    group.classList.add('active');
                }
            });
        });
    });
}

// Problem Card Filters
function initProblemFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const problemCards = document.querySelectorAll('.problem-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');

            // Update active filter button
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Filter cards
            problemCards.forEach(card => {
                if (filter === 'all' || card.getAttribute('data-category') === filter) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 200);
                }
            });
        });
    });
}

// Decision Tree Interactive
function initDecisionTree() {
    const decisionBtns = document.querySelectorAll('.decision-btn');
    const backBtns = document.querySelectorAll('.decision-back');
    const restartBtns = document.querySelectorAll('.decision-restart');
    const steps = document.querySelectorAll('.decision-step');
    const results = document.querySelectorAll('.decision-result');

    // Decision button clicks
    decisionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const nextStep = this.getAttribute('data-next');
            const result = this.getAttribute('data-result');

            // Hide all steps and results
            steps.forEach(step => step.classList.remove('active'));
            results.forEach(res => res.classList.remove('active'));

            if (nextStep) {
                // Show next step
                const nextElement = document.getElementById(nextStep);
                if (nextElement) {
                    nextElement.classList.add('active');
                }
            } else if (result) {
                // Show result
                const resultElement = document.getElementById(`result-${result}`);
                if (resultElement) {
                    resultElement.classList.add('active');
                }
            }
        });
    });

    // Back button clicks
    backBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            steps.forEach(step => step.classList.remove('active'));
            results.forEach(res => res.classList.remove('active'));
            document.getElementById('step-1').classList.add('active');
        });
    });

    // Restart button clicks
    restartBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            steps.forEach(step => step.classList.remove('active'));
            results.forEach(res => res.classList.remove('active'));
            document.getElementById('step-1').classList.add('active');
        });
    });
}

// Smooth Scrolling for anchor links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                document.querySelector('.nav-links')?.classList.remove('active');
            }
        });
    });
}

// Mobile Menu Toggle
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            this.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!menuBtn.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
                menuBtn.classList.remove('active');
            }
        });
    }
}

// Tech item hover effects (optional enhancement)
document.querySelectorAll('.tech-item').forEach(item => {
    item.addEventListener('click', function() {
        const tech = this.getAttribute('data-tech');
        const detailCard = document.getElementById(`detail-${tech}`);

        if (detailCard) {
            // Scroll to detail card
            detailCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Add highlight effect
            detailCard.style.boxShadow = '0 0 0 3px var(--primary)';
            setTimeout(() => {
                detailCard.style.boxShadow = '';
            }, 2000);
        }
    });
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.problem-card, .guide-card, .pattern-card, .tech-detail-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
});

// Add animation class
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    </style>
`);

// Console welcome message
console.log('%c Microsoft Integration Guide ', 'background: #0078d4; color: white; padding: 10px; font-size: 14px; font-weight: bold;');
console.log('Documentation: https://github.com/mondweep/vibe-cast/tree/microsoft-graph-exploration');
console.log('Author: Mondweep Chakravorty - https://www.linkedin.com/in/mondweepchakravorty/');
