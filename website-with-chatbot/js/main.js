/**
 * BYD Malaysia Landing Page — JavaScript
 * Porsche-inspired interactions & animations
 */

document.addEventListener('DOMContentLoaded', () => {

    // ===== DOM Elements =====
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.querySelector('.nav-links');
    const videoModal = document.getElementById('videoModal');
    const videoModalEmbed = document.getElementById('videoModalEmbed');
    const videoModalClose = document.getElementById('videoModalClose');
    const heroVideo = document.getElementById('heroVideo');
    const statNumbers = document.querySelectorAll('.stat-number');

    // ===== NAVIGATION =====

    // Scroll handling
    let lastScrollY = 0;
    let scrollTimeout;

    function handleScroll() {
        const currentScrollY = window.scrollY;

        // Add scrolled class for background
        if (currentScrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Hide/show navbar on scroll direction
        if (currentScrollY > lastScrollY && currentScrollY > 200) {
            navbar.classList.add('hidden');
        } else {
            navbar.classList.remove('hidden');
        }

        lastScrollY = currentScrollY;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Mobile menu toggle
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile menu on link click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // ===== SCROLL ANIMATIONS =====

    // Intersection Observer for fade-in animations
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -80px 0px',
        threshold: 0.1
    };

    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all elements with animations
    document.querySelectorAll('.fade-in, .stagger-children').forEach(el => {
        fadeObserver.observe(el);
    });

    // Add fade-in classes to sections
    document.querySelectorAll('.model-card').forEach((card, index) => {
        card.classList.add('fade-in');
        card.style.transitionDelay = `${index * 0.1}s`;
    });

    document.querySelectorAll('.video-card').forEach((card, index) => {
        card.classList.add('fade-in');
        card.style.transitionDelay = `${index * 0.1}s`;
    });

    document.querySelectorAll('.tech-card').forEach((card, index) => {
        card.classList.add('fade-in');
        card.style.transitionDelay = `${index * 0.1}s`;
    });

    document.querySelectorAll('.stat-item').forEach((item, index) => {
        item.classList.add('fade-in');
        item.style.transitionDelay = `${index * 0.1}s`;
    });

    // Initialize observers after adding classes
    document.querySelectorAll('.fade-in').forEach(el => {
        fadeObserver.observe(el);
    });

    // ===== COUNTER ANIMATION =====

    let statsAnimated = false;

    function animateCounters() {
        if (statsAnimated) return;

        statNumbers.forEach(number => {
            const target = parseInt(number.getAttribute('data-count'));
            const duration = 2000; // ms
            const step = target / (duration / 16); // 60fps
            let current = 0;

            const counter = setInterval(() => {
                current += step;
                if (current >= target) {
                    number.textContent = target;
                    clearInterval(counter);
                } else {
                    number.textContent = Math.floor(current);
                }
            }, 16);
        });

        statsAnimated = true;
    }

    // Observe stats section
    const statsSection = document.querySelector('.stats');
    if (statsSection) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                    statsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        statsObserver.observe(statsSection);
    }

    // ===== VIDEO MODAL =====

    function openVideoModal(videoId) {
        videoModalEmbed.innerHTML = `
            <iframe
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1"
                frameborder="0"
                allow="autoplay; encrypted-media"
                allowfullscreen>
            </iframe>
        `;
        videoModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeVideoModal() {
        videoModalEmbed.innerHTML = '';
        videoModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Video card clicks
    document.querySelectorAll('.video-card-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => {
            const videoId = thumb.getAttribute('data-video-id');
            if (videoId) {
                openVideoModal(videoId);
            }
        });
    });

    // Video card whole card click
    document.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking the thumb (already handled)
            if (e.target.closest('.video-card-thumb')) return;
            const thumb = card.querySelector('.video-card-thumb');
            const videoId = thumb?.getAttribute('data-video-id');
            if (videoId) {
                openVideoModal(videoId);
            }
        });
    });

    // Close modal
    videoModalClose.addEventListener('click', closeVideoModal);

    videoModal.querySelector('.video-modal-overlay')?.addEventListener('click', closeVideoModal);

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && videoModal.classList.contains('active')) {
            closeVideoModal();
        }
    });

    // ===== HERO VIDEO FALLBACK =====

    // Ensure hero video plays (some browsers block autoplay)
    if (heroVideo) {
        // Post message to YouTube iframe to play
        const playVideo = () => {
            heroVideo.contentWindow?.postMessage(
                '{"event":"command","func":"playVideo","args":""}',
                '*'
            );
            heroVideo.contentWindow?.postMessage(
                '{"event":"command","func":"mute","args":""}',
                '*'
            );
        };

        // Try to play on load
        window.addEventListener('load', () => {
            setTimeout(playVideo, 500);
        });

        // Play on first user interaction
        document.addEventListener('click', playVideo, { once: true });
        document.addEventListener('scroll', playVideo, { once: true });
    }

    // ===== SMOOTH SCROLL FOR SAFARI =====
    // Polyfill smooth scroll for browsers that don't support it
    if (!('scrollBehavior' in document.documentElement.style)) {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);
                if (target) {
                    const offset = navbar.offsetHeight;
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // ===== PARALLAX EFFECT ON HERO =====
    function updateParallax() {
        const scrollY = window.scrollY;
        const heroContent = document.querySelector('.hero-content');
        const scrollIndicator = document.querySelector('.scroll-indicator');

        if (heroContent && scrollY < window.innerHeight) {
            const opacity = 1 - (scrollY / (window.innerHeight * 0.5));
            heroContent.style.opacity = Math.max(opacity, 0);
            heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
        }

        if (scrollIndicator && scrollY < 100) {
            scrollIndicator.style.opacity = 1 - (scrollY / 100);
        }
    }

    window.addEventListener('scroll', updateParallax, { passive: true });

    // ===== MODEL CARD HOVER EFFECT =====
    document.querySelectorAll('.model-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            document.querySelectorAll('.model-card').forEach(c => {
                if (c !== this) {
                    c.style.opacity = '0.6';
                }
            });
        });

        card.addEventListener('mouseleave', function() {
            document.querySelectorAll('.model-card').forEach(c => {
                c.style.opacity = '1';
            });
        });
    });

    // ===== KEYBOARD NAVIGATION =====
    document.addEventListener('keydown', (e) => {
        // Close mobile menu with Escape
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // ===== LOG INITIALIZATION =====
    console.log('%c BYD Malaysia %c Landing Page %c Ready ',
        'color: #fff; background: #000; padding: 4px 8px; font-weight: bold;',
        'color: #fff; background: #c41230; padding: 4px 8px;',
        'color: #888;'
    );
    console.log('%c Build Your Dreams 🚗⚡', 'color: #888; font-style: italic;');

});
