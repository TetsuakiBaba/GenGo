// Smooth scroll for navigation links
document.addEventListener('DOMContentLoaded', function () {
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', function () {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            navbar.style.padding = '0.5rem 0';
        } else {
            navbar.style.padding = '1rem 0';
        }

        lastScroll = currentScroll;
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));

            if (target) {
                const navbarHeight = navbar.offsetHeight;
                const targetPosition = target.offsetTop - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                const navbarCollapse = document.querySelector('.navbar-collapse');
                if (navbarCollapse.classList.contains('show')) {
                    navbarCollapse.classList.remove('show');
                }
            }
        });
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    renderPractices();

    // Observe feature cards
    document.querySelectorAll('.feature-card, .screenshot-card, .tech-card, .setup-card, .setup-provider-panel').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease-out';
        observer.observe(card);
    });

    // Active navigation highlight
    const sections = document.querySelectorAll('section[id]');

    window.addEventListener('scroll', function () {
        const scrollPosition = window.pageYOffset;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });

    // Counter animation for stats (if you want to add stats)
    animateCounters();

    syncProviderMedia();

    // Keep media still; card-level motion handles visual feedback.
});

function renderPractices() {
    const container = document.getElementById('practicesContainer');
    if (!container) return;

    const lang = typeof currentLanguage === 'string' ? currentLanguage : 'ja';

    if (typeof bestPracticesData === 'undefined' || bestPracticesData.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-inbox" style="font-size: 4rem; color: #cccccc;"></i>
                <p class="text-muted mt-3 mb-0">
                    <span data-i18n="bestPractices.emptyMessage">まだベストプラクティスが登録されていません。</span>
                </p>
            </div>
        `;
        applyTranslations(lang);
        return;
    }

    container.innerHTML = bestPracticesData.map(practice => `
        <div class="col-md-6 col-lg-4">
            <div class="feature-card h-100 position-relative">
                <div class="feature-icon">
                    <i class="bi ${escapeHtml(practice.icon)}"></i>
                </div>
                <h3 class="h4 mb-3">${escapeHtml(practice.title[lang] || practice.title.ja)}</h3>
                <p class="text-muted mb-3">${escapeHtml(practice.description[lang] || practice.description.ja)}</p>
                <div class="prompt-container">
                    <pre class="prompt-text">${escapeHtml(practice.prompt)}</pre>
                    <button class="btn btn-sm btn-outline-primary copy-btn" onclick="copyPromptDirect(this)">
                        <i class="bi bi-clipboard"></i> <span data-i18n="bestPractices.copyBtn">コピー</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    applyTranslations(lang);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function copyPromptDirect(button) {
    const promptElement = button.previousElementSibling;
    const promptText = promptElement.textContent.trim();

    navigator.clipboard.writeText(promptText).then(() => {
        const icon = button.querySelector('i');
        const originalClass = icon.className;
        icon.className = 'bi bi-check-circle-fill';
        button.classList.add('btn-success');
        button.classList.remove('btn-outline-primary');

        const toastElement = document.getElementById('copyToast');
        if (toastElement && window.bootstrap) {
            const toast = new bootstrap.Toast(toastElement);
            toast.show();
        }

        setTimeout(() => {
            icon.className = originalClass;
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-primary');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('コピーに失敗しました');
    });
}

const originalChangeLanguage = window.changeLanguage;
if (typeof originalChangeLanguage === 'function') {
    window.changeLanguage = function (lang) {
        originalChangeLanguage(lang);
        renderPractices();
    };
}

function syncProviderMedia() {
    document.querySelectorAll('[data-media-group][data-media-target]').forEach(button => {
        const updateMedia = () => {
            const group = button.getAttribute('data-media-group');
            const targetId = button.getAttribute('data-media-target');

            document.querySelectorAll(`[data-media-group="${group}"][data-media-pane]`).forEach(pane => {
                const isTarget = pane.id === targetId;
                pane.classList.toggle('active', isTarget);
                pane.classList.toggle('show', isTarget);
            });
        };

        if (button.classList.contains('active')) {
            updateMedia();
        }

        button.addEventListener('shown.bs.tab', updateMedia);
        button.addEventListener('click', updateMedia);
    });
}

// Counter animation
function animateCounters() {
    const counters = document.querySelectorAll('.counter');

    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const increment = target / (duration / 16); // 60fps
        let current = 0;

        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.textContent = Math.ceil(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };

        // Start animation when element is visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            });
        });

        observer.observe(counter);
    });
}

// Add CSS for active navigation state
const style = document.createElement('style');
style.textContent = `
    .navbar-nav .nav-link.active {
        color: #111111 !important;
        background: #f9f9f9;
        border-radius: 0;
        padding: 0.5rem 1rem;
    }
`;
document.head.appendChild(style);

// Handle download button clicks
document.addEventListener('click', function (e) {
    if (e.target.closest('a[href*="releases"]')) {
        // Track download clicks (you can integrate analytics here)
        console.log('Download button clicked');
    }
});

// Add loading animation for images
document.querySelectorAll('img').forEach(img => {
    // 既にロード済みの画像（キャッシュされている画像）をチェック
    if (img.complete) {
        img.style.opacity = '1';
    } else {
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.5s ease-in';

        img.addEventListener('load', function () {
            this.style.opacity = '1';
        });
    }
});

// Easter egg: Konami code
let konamiCode = [];
const konamiPattern = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', function (e) {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);

    if (konamiCode.join(',') === konamiPattern.join(',')) {
        activateEasterEgg();
    }
});

function activateEasterEgg() {
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        heroSection.style.background = '#eeeeee';
        setTimeout(() => {
            heroSection.style.background = '#ffffff';
        }, 3000);
    }
    console.log('Easter egg activated. GenGo rocks.');
}
