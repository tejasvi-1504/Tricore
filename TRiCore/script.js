/* ==========================================================================
   Particle System — Live Background
   ========================================================================== */
class ParticleNet {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: -9999, y: -9999 };
        this.color = [99, 102, 241];
        this.maxDist = 120;
        this.raf = null;

        this._resize = () => this.resize();
        this._mouse = (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        };
        this._leave = () => { this.mouse.x = -9999; this.mouse.y = -9999; };

        window.addEventListener('resize', this._resize);
        canvas.closest('.hero').addEventListener('mousemove', this._mouse);
        canvas.closest('.hero').addEventListener('mouseleave', this._leave);

        this.resize();
        this.init();
        this.animate();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.offsetWidth;
        this.canvas.height = this.canvas.parentElement.offsetHeight;
        this.count = Math.min(90, Math.floor(this.canvas.width * this.canvas.height / 12000));
        this.init();
    }

    init() {
        this.particles = Array.from({ length: this.count }, () => ({
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 0.45,
            vy: (Math.random() - 0.5) * 0.45,
            r: Math.random() * 1.6 + 0.4
        }));
    }

    syncColor() {
        const map = {
            default:   [99, 102, 241],
            ocean:     [14, 165, 233],
            emerald:   [16, 185, 129],
            sunset:    [249, 115, 22],
            cyberpunk: [217, 70, 239],
            clean:     [37, 99, 235],
            lavender:  [147, 51, 234],
            golden:    [234, 179, 8]
        };
        const theme = document.documentElement.getAttribute('data-theme') || 'default';
        this.color = map[theme] || map.default;
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.syncColor();
        const [r, g, b] = this.color;

        this.particles.forEach((p, i) => {
            const dx = p.x - this.mouse.x;
            const dy = p.y - this.mouse.y;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < 100 && d > 0) {
                p.vx += (dx / d) * 0.25;
                p.vy += (dy / d) * 0.25;
            }
            p.vx *= 0.985; p.vy *= 0.985;
            const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (spd > 1.3) { p.vx = p.vx / spd * 1.3; p.vy = p.vy / spd * 1.3; }
            p.x = (p.x + p.vx + this.canvas.width)  % this.canvas.width;
            p.y = (p.y + p.vy + this.canvas.height) % this.canvas.height;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
            this.ctx.fill();

            for (let j = i + 1; j < this.particles.length; j++) {
                const q = this.particles[j];
                const ex = p.x - q.x, ey = p.y - q.y;
                const ed = Math.sqrt(ex * ex + ey * ey);
                if (ed < this.maxDist) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(q.x, q.y);
                    this.ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - ed / this.maxDist) * 0.22})`;
                    this.ctx.lineWidth = 0.6;
                    this.ctx.stroke();
                }
            }
        });
        this.raf = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        cancelAnimationFrame(this.raf);
        window.removeEventListener('resize', this._resize);
    }
}

document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================================
       Init Particle Canvas
       ========================================================================== */
    const pCanvas = document.getElementById('particle-canvas');
    if (pCanvas) {
        const pNet = new ParticleNet(pCanvas);
        // Re-sync color when theme changes
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.addEventListener('click', () => setTimeout(() => pNet.syncColor(), 50));
        });
    }

    /* ==========================================================================
       Scroll Progress Bar
       ========================================================================== */
    const progressBar = document.querySelector('.scroll-progress-bar');
    function updateProgress() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.width = (scrollTop / docHeight * 100) + '%';
    }
    window.addEventListener('scroll', updateProgress, { passive: true });

    /* ==========================================================================
       Custom Cursor Glow (desktop only)
       ========================================================================== */
    const cursorGlow = document.querySelector('.cursor-glow');
    let mouseX = -500, mouseY = -500;
    let glowX = -500, glowY = -500;

    if (window.innerWidth > 768) {
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animateGlow() {
            glowX += (mouseX - glowX) * 0.08;
            glowY += (mouseY - glowY) * 0.08;
            cursorGlow.style.left = glowX + 'px';
            cursorGlow.style.top = glowY + 'px';
            requestAnimationFrame(animateGlow);
        }
        animateGlow();
    } else {
        cursorGlow.style.display = 'none';
    }

    /* ==========================================================================
       Theme Switcher
       ========================================================================== */
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeDropdown = document.getElementById('theme-dropdown');
    const themeOptions = document.querySelectorAll('.theme-option');
    const htmlEl = document.documentElement;

    const savedTheme = localStorage.getItem('tricore-theme') || 'default';
    htmlEl.setAttribute('data-theme', savedTheme);

    themeToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
        if (!themeDropdown.contains(e.target) && e.target !== themeToggleBtn) {
            themeDropdown.classList.remove('active');
        }
    });
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            htmlEl.setAttribute('data-theme', theme);
            localStorage.setItem('tricore-theme', theme);
            themeDropdown.classList.remove('active');
        });
    });

    /* ==========================================================================
       Mobile Navigation
       ========================================================================== */
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    mobileBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = mobileBtn.querySelector('i');
        icon.classList.toggle('ph-list');
        icon.classList.toggle('ph-x');
    });
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileBtn.querySelector('i').className = 'ph ph-list';
        });
    });

    /* ==========================================================================
       Navbar Scroll Effect
       ========================================================================== */
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    /* ==========================================================================
       Scroll Reveal
       ========================================================================== */
    const revealEls = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));

    /* ==========================================================================
       Animated Counters
       ========================================================================== */
    const counters = document.querySelectorAll('.counter');
    let countersStarted = false;

    const counterObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !countersStarted) {
            countersStarted = true;
            counters.forEach(counter => {
                const target = +counter.dataset.target;
                const customSuffix = counter.dataset.suffix;
                const parentText = counter.parentElement.textContent;
                let suffix = customSuffix || (parentText.includes('Satisfaction') || parentText.includes('%') ? '%' : '+');
                const duration = 2000;
                const fps = 60;
                const increment = target / (duration / (1000 / fps));
                let current = 0;

                const update = () => {
                    current = Math.min(current + increment, target);
                    counter.textContent = Math.ceil(current) + suffix;
                    if (current < target) requestAnimationFrame(update);
                };
                update();
            });
        }
    }, { threshold: 0.5 });

    const statsGrid = document.querySelector('.stats-grid');
    if (statsGrid) counterObserver.observe(statsGrid);

    /* ==========================================================================
       Portfolio Filter
       ========================================================================== */
    const filterBtns = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;

            portfolioItems.forEach(item => {
                const show = filter === 'all' || item.dataset.category === filter;
                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                if (show) {
                    item.classList.remove('hidden');
                    requestAnimationFrame(() => {
                        item.style.opacity = '1';
                        item.style.transform = '';
                    });
                } else {
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.95)';
                    setTimeout(() => item.classList.add('hidden'), 300);
                }
            });
        });
    });

    /* ==========================================================================
       Testimonials Navigation
       ========================================================================== */
    const track = document.getElementById('testimonials-track');
    const dots = document.querySelectorAll('.t-dot');
    const prevBtn = document.getElementById('t-prev');
    const nextBtn = document.getElementById('t-next');
    let currentTestimonial = 0;
    const testimonialCards = document.querySelectorAll('.testimonial-card');

    function isMobileTestimonials() {
        return window.innerWidth <= 900;
    }

    function showTestimonial(index) {
        if (!isMobileTestimonials()) return;
        testimonialCards.forEach((card, i) => {
            card.style.display = i === index ? 'block' : 'none';
        });
        dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    }

    function setupTestimonials() {
        if (isMobileTestimonials()) {
            showTestimonial(currentTestimonial);
        } else {
            testimonialCards.forEach(card => card.style.display = '');
            dots.forEach((dot, i) => dot.classList.toggle('active', i === 1));
        }
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (!isMobileTestimonials()) return;
            currentTestimonial = (currentTestimonial - 1 + testimonialCards.length) % testimonialCards.length;
            showTestimonial(currentTestimonial);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (!isMobileTestimonials()) return;
            currentTestimonial = (currentTestimonial + 1) % testimonialCards.length;
            showTestimonial(currentTestimonial);
        });
    }
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            currentTestimonial = +dot.dataset.index;
            showTestimonial(currentTestimonial);
        });
    });

    setupTestimonials();
    window.addEventListener('resize', setupTestimonials);

    /* ==========================================================================
       Contact Form
       ========================================================================== */
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button[type="submit"]');
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-check-circle"></i> Message Sent!';
            btn.style.background = 'linear-gradient(135deg, #22c55e, #10b981)';
            btn.disabled = true;
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.background = '';
                btn.disabled = false;
                contactForm.reset();
            }, 3500);
        });
    }

    /* ==========================================================================
       Newsletter Form
       ========================================================================== */
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = newsletterForm.querySelector('button');
            btn.innerHTML = '<i class="ph ph-check"></i>';
            setTimeout(() => {
                btn.innerHTML = '<i class="ph ph-paper-plane-right"></i>';
                newsletterForm.reset();
            }, 2500);
        });
    }

    /* ==========================================================================
       Scroll Indicator Hide on Scroll
       ========================================================================== */
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        window.addEventListener('scroll', () => {
            scrollIndicator.style.opacity = window.scrollY > 80 ? '0' : '1';
        }, { passive: true });
    }

    /* ==========================================================================
       Chart Bar Hover Animation
       ========================================================================== */
    const chartBars = document.querySelectorAll('.chart-bar');
    chartBars.forEach(bar => {
        bar.addEventListener('mouseenter', () => { bar.style.opacity = '1'; });
        bar.addEventListener('mouseleave', () => {
            bar.style.opacity = bar.style.getPropertyValue('--is-active') || '0.7';
        });
    });

    /* ==========================================================================
       Pricing Carousel (mobile / tablet only)
       ========================================================================== */
    const pricingTrack = document.getElementById('pricing-track');
    const pcPrev       = document.getElementById('pc-prev');
    const pcNext       = document.getElementById('pc-next');
    const pcDots       = document.querySelectorAll('.pc-dot');
    const pcNav        = document.querySelector('.pc-nav');
    let pcIndex = 0;
    const PC_COUNT = 3;

    function isPricingMobile() {
        return window.innerWidth <= 900;
    }

    function pcShow(idx) {
        pcIndex = (idx + PC_COUNT) % PC_COUNT;
        /* translate by exact pixel width of the wrapper (one card = wrapper width) */
        const slideWidth = pricingTrack.parentElement.offsetWidth;
        pricingTrack.style.transform = `translateX(-${pcIndex * slideWidth}px)`;
        pcDots.forEach((d, i) => d.classList.toggle('active', i === pcIndex));
    }

    function setupPricingCarousel() {
        if (isPricingMobile()) {
            pcNav.style.display = 'flex';
            pcShow(pcIndex);
        } else {
            pcNav.style.display = 'none';
            pricingTrack.style.transform = '';
        }
    }

    if (pcPrev) pcPrev.addEventListener('click', () => pcShow(pcIndex - 1));
    if (pcNext) pcNext.addEventListener('click', () => pcShow(pcIndex + 1));
    pcDots.forEach(d => d.addEventListener('click', () => pcShow(+d.dataset.idx)));

    setupPricingCarousel();
    window.addEventListener('resize', setupPricingCarousel);

    /* Touch/swipe support for pricing carousel */
    let pcTouchX = null;
    if (pricingTrack) {
        pricingTrack.addEventListener('touchstart', e => { pcTouchX = e.touches[0].clientX; }, { passive: true });
        pricingTrack.addEventListener('touchend', e => {
            if (pcTouchX === null) return;
            const diff = pcTouchX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) pcShow(pcIndex + (diff > 0 ? 1 : -1));
            pcTouchX = null;
        }, { passive: true });
    }

});
