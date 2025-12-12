/**
 * The Divine Story of Lord Venkateswara
 * Interactive Storytelling Script
 */

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll for navigation
    initSmoothScroll();

    // Animate elements on scroll
    initScrollAnimations();

    // Image placeholder interactions
    initImagePlaceholders();

    // Initialize tab navigation
    initTabNavigation();
});

/**
 * Tab Navigation - Switch between Sacred Story and Alternative Perspectives
 */
function initTabNavigation() {
    // Ensure tab content visibility is correct on load
    const sacredTab = document.getElementById('sacred-tab');
    const altTab = document.getElementById('alternative-tab');

    if (sacredTab && altTab) {
        sacredTab.classList.add('active');
        altTab.classList.remove('active');
    }

    // Add attention-grabbing animation to tabs after a short delay
    setTimeout(() => {
        const tabNav = document.getElementById('tab-nav');
        if (tabNav) {
            tabNav.classList.add('attention');
        }
    }, 2000);
}

/**
 * Switch between tabs
 * @param {string} tabName - 'sacred' or 'alternative'
 */
function switchTab(tabName) {
    const sacredTab = document.getElementById('sacred-tab');
    const altTab = document.getElementById('alternative-tab');
    const buttons = document.querySelectorAll('.tab-button');

    if (!sacredTab || !altTab) return;

    // Update button states
    buttons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Switch tab content
    if (tabName === 'sacred') {
        sacredTab.classList.add('active');
        altTab.classList.remove('active');
    } else if (tabName === 'alternative') {
        altTab.classList.add('active');
        sacredTab.classList.remove('active');

        // Re-trigger scroll animations for alternative content
        setTimeout(() => {
            initAlternativeAnimations();
        }, 100);
    }

    // Scroll to tab navigation
    const tabNav = document.getElementById('tab-nav');
    if (tabNav) {
        const navTop = tabNav.offsetTop;
        window.scrollTo({
            top: navTop,
            behavior: 'smooth'
        });
    }
}

/**
 * Initialize animations for alternative perspective tab elements
 */
function initAlternativeAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe alternative tab elements
    document.querySelectorAll('.alt-chapter, .phenomenon-card, .lens-card, .reinterpretation-card, .synthesis-card').forEach(el => {
        if (!el.classList.contains('animate-in')) {
            el.classList.add('animate-ready');
            observer.observe(el);
        }
    });
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
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

/**
 * Animate elements as they come into view
 */
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all major elements
    document.querySelectorAll('.chapter, .character-card, .image-frame, .fact-card, .tradition-card').forEach(el => {
        el.classList.add('animate-ready');
        observer.observe(el);
    });
}

/**
 * Image placeholder click handling
 * Shows information about where to source the image
 */
function initImagePlaceholders() {
    const imageSources = {
        'vaikuntha': {
            title: 'Vishnu in Vaikuntha',
            description: 'Vishnu reclining on Adishesha with Lakshmi',
            sources: [
                'https://www.exoticindiaart.com/product/paintings/vaikuntha-narayana-vishnu-as-lord-of-vaikuntha-traditional-colors-with-24k-gold-phc501/',
                'https://www.pinterest.com/fringues/vaikuntha/'
            ]
        },
        'bhrigu-journey': {
            title: 'Sage Bhrigu\'s Journey',
            description: 'Bhrigu visiting the three realms to test the Trimurti',
            sources: [
                'Traditional Pahari paintings',
                'Kangra miniature paintings'
            ]
        },
        'bhrigu-kick': {
            title: 'The Fateful Moment',
            description: 'Sage Bhrigu kicking Vishnu\'s chest',
            sources: [
                'https://dia.org/collection/krishna-rebuked-priest-48829 (Detroit Institute of Arts)',
                'https://www.chiswickauctions.co.uk - Kangra, Pahari Hills, 19th century'
            ]
        },
        'vishnu-penance': {
            title: 'Vishnu\'s Penance',
            description: 'Vishnu meditating in an anthill under a tamarind tree',
            sources: [
                'Traditional South Indian temple art',
                'Tirumala temple historical depictions'
            ]
        },
        'padmavathi-birth': {
            title: 'Birth of Padmavathi',
            description: 'Padmavathi emerging from a golden lotus',
            sources: [
                'https://www.exoticindiaart.com/article/goddess-padmavati/',
                'Tiruchanur temple artwork'
            ]
        },
        'srinivasa-birth': {
            title: 'Birth of Srinivasa',
            description: 'Vishnu reborn to Vakula Devi',
            sources: [
                'Traditional Tanjore paintings',
                'Temple murals'
            ]
        },
        'forest-meeting': {
            title: 'The Divine Meeting',
            description: 'Venkateswara as a hunter meets Padmavathi in the forest',
            sources: [
                'https://www.exoticindiaart.com/paintings/tanjore/venkateshwara-balaji/',
                'Traditional narrative paintings'
            ]
        },
        'narada': {
            title: 'Sage Narada',
            description: 'The celestial messenger with his veena',
            sources: [
                'Traditional Hindu iconography',
                'https://www.pinterest.com/ideas/narada-muni/'
            ]
        },
        'kubera-loan': {
            title: 'The Loan from Kubera',
            description: 'God of wealth granting the divine loan',
            sources: [
                'https://www.exoticindiaart.com/blog/kubera-the-treasurer-of-the-gods-and-king-of-yaksha/',
                'Traditional depictions of Kubera'
            ]
        },
        'divine-wedding': {
            title: 'The Celestial Wedding',
            description: 'Venkateswara and Padmavathi wedding ceremony',
            sources: [
                'https://www.exoticindiaart.com/product/paintings/lord-venkateshvara-tirupati-balaji-with-goddess-padmavathi-24-karat-gold-work-framed-tanjore-painting-ddn728/',
                'Kalyana Venkateswara Temple, Narayanavanam'
            ]
        },
        'tirumala-temple': {
            title: 'Tirumala Venkateswara Temple',
            description: 'The Temple of Seven Hills',
            sources: [
                'https://www.gettyimages.com/photos/temple-of-seven-hills',
                'https://www.dreamstime.com/photos-images/tirumala-temple.html',
                'https://www.shutterstock.com/search/tirumala-hills'
            ]
        },
        'ramanujacharya': {
            title: 'Ramanujacharya',
            description: 'The great philosopher-saint (1017-1137 CE)',
            sources: [
                'Traditional portraits and temple sculptures',
                'Sri Vaishnava iconography'
            ]
        },
        'lord-venkateswara-final': {
            title: 'Lord Venkateswara',
            description: 'The presiding deity of Tirumala',
            sources: [
                'https://www.exoticindiaart.com/paintings/tanjore/venkateshwara-balaji/',
                'https://govindaarts.com/collections/lord-balaji-collections',
                'https://www.tallengestore.com/products/sri-tirupati-venkateswara-swamy-balaji-painting'
            ]
        }
    };

    document.querySelectorAll('.image-placeholder').forEach(placeholder => {
        const scene = placeholder.dataset.scene;
        if (scene && imageSources[scene]) {
            placeholder.style.cursor = 'pointer';
            placeholder.title = 'Click for image source suggestions';

            placeholder.addEventListener('click', function() {
                const info = imageSources[scene];
                showImageInfo(info);
            });
        }
    });
}

/**
 * Display image source information
 */
function showImageInfo(info) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'image-info-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>${info.title}</h3>
            <p>${info.description}</p>
            <h4>Suggested Sources:</h4>
            <ul>
                ${info.sources.map(src => `<li>${src.startsWith('http') ? `<a href="${src}" target="_blank">${src}</a>` : src}</li>`).join('')}
            </ul>
            <button onclick="this.parentElement.parentElement.remove()">Close</button>
        </div>
    `;

    // Add modal styles
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    const content = modal.querySelector('.modal-content');
    content.style.cssText = `
        background: #faf0e6;
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
    `;

    const button = modal.querySelector('button');
    button.style.cssText = `
        background: #d4a012;
        color: #1a1a1a;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 6px;
        cursor: pointer;
        margin-top: 1rem;
        font-family: inherit;
        font-size: 1rem;
    `;

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });

    document.body.appendChild(modal);
}

// Add animation CSS
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    .animate-ready {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }

    .animate-in {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(animationStyles);
