/* =============================================
   INDEX.JS — Main page logic
   Loads events from Firebase, renders featured/rail,
   upcoming events, announcement banner.
   ============================================= */

/* ===== EVENTS DATA — FROM FIREBASE ===== */
let events = [];
let currentIndex = 0;
let autoTimer = null;
let eventsLoaded = false;

/* ===== LOAD EVENTS FROM FIREBASE ===== */
function initEventsFromFirebase() {
    const arena = document.querySelector('.events-arena');
    const statsBar = document.querySelector('.events-stats-bar');

    // Show loading state
    if (arena) {
        arena.innerHTML = `
            <div class="events-loading" style="width:100%;">
                <i class='bx bx-loader-alt'></i>
                <p>Loading events...</p>
            </div>
        `;
    }

    function handleEvents(data) {
        if (!data) {
            events = [];
        } else {
            const arr = Array.isArray(data) ? data : Object.values(data);
            // Map Firebase event objects to display format
            events = arr.map((ev, i) => ({
                img: ev.posterUrl || ev.img || './img/2026.jpeg',
                title: ev.name || ev.title || 'Untitled Event',
                tag: ev.tag || (ev.status === 'Completed' ? 'Past' : 'Upcoming'),
                date: ev.date || '',
                badge: ev.badge || ev.status || 'EVENT',
                num: String(i + 1).padStart(2, '0'),
                stat1: ev.stat1 || '—',
                stat1Label: ev.stat1Label || 'Info',
                stat2: ev.stat2 || '—',
                stat2Label: ev.stat2Label || 'Info',
                desc: ev.description || ev.desc || ''
            }));
        }

        if (events.length === 0) {
            // Show empty state
            if (arena) {
                arena.innerHTML = `
                    <div class="events-empty" style="width:100%;">
                        <i class='bx bx-calendar-x'></i>
                        <p>No events yet. Check back soon!</p>
                    </div>
                `;
            }
            if (statsBar) statsBar.style.display = 'none';
            return;
        }

        if (statsBar) statsBar.style.display = '';

        // Restore the arena HTML structure
        if (arena) {
            arena.innerHTML = `
                <div class="event-featured" id="featuredCard">
                    <div class="event-featured-img-wrap">
                        <img id="featuredImg" src="./img/2026.jpeg" alt="Event" loading="lazy">
                        <div class="event-featured-badge" id="featuredBadge">FEATURED</div>
                        <div class="event-featured-overlay">
                            <span class="event-featured-num" id="featuredNum">01</span>
                        </div>
                    </div>
                    <div class="event-featured-info">
                        <div class="event-meta-row">
                            <span class="event-tag" id="featuredTag">Technical</span>
                            <span class="event-date" id="featuredDate">2026</span>
                        </div>
                        <h3 class="event-featured-title" id="featuredTitle">Loading...</h3>
                        <p class="event-featured-desc" id="featuredDesc"></p>
                        <div class="event-featured-footer">
                            <div class="event-stat">
                                <span class="stat-num" id="featuredStat">—</span>
                                <span class="stat-label" id="featuredStatLabel">Info</span>
                            </div>
                            <div class="event-stat">
                                <span class="stat-num" id="featuredStat2">—</span>
                                <span class="stat-label" id="featuredStat2Label">Info</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="events-rail">
                    <div class="rail-label">ALL EVENTS</div>
                    <div class="rail-cards" id="railCards"></div>
                    <div class="rail-nav">
                        <button class="rail-btn" id="prevBtn" onclick="prevEvent()">&#8592;</button>
                        <div class="rail-progress" id="railProgress"></div>
                        <button class="rail-btn" id="nextBtn" onclick="nextEvent()">&#8594;</button>
                    </div>
                </div>
            `;
        }

        currentIndex = 0;
        buildRail();
        updateFeatured(false);

        // Setup autoplay
        if (autoTimer) clearInterval(autoTimer);
        autoTimer = setInterval(nextEvent, 5000);
        const arenaEl = document.querySelector('.events-arena');
        if (arenaEl) {
            arenaEl.onmouseenter = () => clearInterval(autoTimer);
            arenaEl.onmouseleave = () => {
                clearInterval(autoTimer);
                autoTimer = setInterval(nextEvent, 5000);
            };
        }

        eventsLoaded = true;

        // Also render upcoming events with countdown timers
        renderUpcomingEvents(data);
    }

    if (window._firebaseReady) {
        fbListen('rmc_events', handleEvents);
    } else {
        window.addEventListener('firebaseReady', () => {
            fbListen('rmc_events', handleEvents);
        });
    }
}

/* ===== BUILD RAIL CARDS ===== */
function buildRail() {
    const rail = document.getElementById('railCards');
    const progress = document.getElementById('railProgress');
    if (!rail || !progress) return;
    rail.innerHTML = '';
    progress.innerHTML = '';

    events.forEach((ev, i) => {
        const card = document.createElement('div');
        card.className = 'rail-card' + (i === currentIndex ? ' active' : '');
        // Build rail card via DOM (prevents XSS from Firebase data)
        const imgWrap = document.createElement('div');
        imgWrap.className = 'rail-card-img';
        const img = document.createElement('img');
        img.src = ev.img || './img/2026.jpeg';
        img.alt = ev.title || '';
        img.onerror = function(){ this.src='./img/2026.jpeg'; };
        imgWrap.appendChild(img);

        const infoWrap = document.createElement('div');
        infoWrap.className = 'rail-card-info';
        const tagSpan = document.createElement('span');
        tagSpan.className = 'rail-card-tag';
        tagSpan.textContent = ev.tag || '';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'rail-card-title';
        titleSpan.textContent = ev.title || '';
        const dateSpan = document.createElement('span');
        dateSpan.className = 'rail-card-date';
        dateSpan.textContent = ev.date || '';
        infoWrap.appendChild(tagSpan);
        infoWrap.appendChild(titleSpan);
        infoWrap.appendChild(dateSpan);
        card.appendChild(imgWrap);
        card.appendChild(infoWrap);
        card.onclick = () => goToEvent(i);
        rail.appendChild(card);

        const dot = document.createElement('div');
        dot.className = 'progress-dot' + (i === currentIndex ? ' active' : '');
        dot.onclick = () => goToEvent(i);
        progress.appendChild(dot);
    });
}

/* ===== UPDATE FEATURED ===== */
function updateFeatured(animate = true) {
    if (events.length === 0) return;
    const ev = events[currentIndex];
    const featured = document.getElementById('featuredCard');
    if (!featured) return;

    if (animate) {
        featured.classList.add('transitioning');
        setTimeout(() => featured.classList.remove('transitioning'), 450);
    }

    const featImg = document.getElementById('featuredImg');
    if (featImg) {
        featImg.src = ev.img;
        featImg.onerror = function(){ this.src='./img/2026.jpeg'; };
    }
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('featuredBadge', ev.badge);
    el('featuredNum', ev.num);
    el('featuredTag', ev.tag);
    el('featuredDate', ev.date);
    el('featuredTitle', ev.title);
    el('featuredDesc', ev.desc);
    el('featuredStat', ev.stat1);
    el('featuredStat2', ev.stat2);

    // Also update stat labels
    const sl1 = document.getElementById('featuredStatLabel');
    if (sl1) sl1.textContent = ev.stat1Label;
    const sl2 = document.getElementById('featuredStat2Label');
    if (sl2) sl2.textContent = ev.stat2Label;

    document.querySelectorAll('.rail-card').forEach((c, i) => {
        c.classList.toggle('active', i === currentIndex);
    });
    document.querySelectorAll('.progress-dot').forEach((d, i) => {
        d.classList.toggle('active', i === currentIndex);
    });

    const ticker = document.getElementById('tickerText');
    if (ticker) ticker.textContent = `NOW VIEWING: ${ev.title.toUpperCase()} — ${ev.tag.toUpperCase()} EVENT — ${ev.date}`;
}

function goToEvent(i) {
    currentIndex = i;
    updateFeatured(true);
}

function nextEvent() {
    if (events.length === 0) return;
    currentIndex = (currentIndex + 1) % events.length;
    updateFeatured(true);
}

function prevEvent() {
    if (events.length === 0) return;
    currentIndex = (currentIndex - 1 + events.length) % events.length;
    updateFeatured(true);
}

/* ===== INIT EVENTS ===== */
initEventsFromFirebase();

/* ===== KEYBOARD NAV ===== */
document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') nextEvent();
    if (e.key === 'ArrowLeft') prevEvent();
});


/* ===== MENU TOGGLE — with backdrop + focus trap ===== */
(function setupNavBackdrop() {
    const backdrop = document.createElement('div');
    backdrop.id = 'navBackdrop';
    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:997;opacity:0;pointer-events:none;transition:opacity 0.3s;';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', () => closeMenu());
    document.body.appendChild(backdrop);
})();

function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    const backdrop = document.getElementById('navBackdrop');
    const isOpen = menu.classList.contains('active');
    if (isOpen) { closeMenu(); } else { openMenu(); }
}

function openMenu() {
    const menu = document.getElementById('sideMenu');
    const backdrop = document.getElementById('navBackdrop');
    menu.classList.add('active');
    if (backdrop) { backdrop.style.opacity = '1'; backdrop.style.pointerEvents = 'auto'; }
    document.body.style.overflow = 'hidden';
    // Focus first link for accessibility
    const firstLink = menu.querySelector('a');
    if (firstLink) setTimeout(() => firstLink.focus(), 50);
    // Trap focus within menu
    menu.addEventListener('keydown', trapFocus);
}

function closeMenu() {
    const menu = document.getElementById('sideMenu');
    const backdrop = document.getElementById('navBackdrop');
    menu.classList.remove('active');
    if (backdrop) { backdrop.style.opacity = '0'; backdrop.style.pointerEvents = 'none'; }
    document.body.style.overflow = '';
    menu.removeEventListener('keydown', trapFocus);
    // Return focus to menu icon
    const icon = document.querySelector('.menu-icon');
    if (icon) icon.focus();
}

function trapFocus(e) {
    if (e.key !== 'Tab' && e.key !== 'Escape') return;
    if (e.key === 'Escape') { closeMenu(); return; }
    const menu = document.getElementById('sideMenu');
    const focusable = Array.from(menu.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])'));
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
    }
}

const sections = document.querySelectorAll('.about-section, .events-section');

/* Hero logo scroll fade */
const heroLogo = document.querySelector('.video-overlay .logo');
const LOGO_HIDE_THRESHOLD = window.innerHeight * 0.18;

/* After the intro animation completes, switch to CSS transitions so
   scroll-based fading works smoothly (animation fill-mode blocks transitions). */
if (heroLogo) {
    const ANIM_DURATION_MS = 2250; // slightly longer than 2.2s to be safe
    setTimeout(() => {
        heroLogo.style.opacity = '1';          // lock computed value as inline style
        heroLogo.style.transform = 'scale(1)'; // lock computed transform
        heroLogo.classList.add('logo-transition-ready'); // enable transitions
    }, ANIM_DURATION_MS);
}

window.addEventListener('scroll', () => {
    /* Section blur effect */
    sections.forEach(sec => {
        const rect = sec.getBoundingClientRect();
        const vh = window.innerHeight;
        let visible = 1 - Math.abs(rect.top - vh / 2) / vh;
        visible = Math.min(Math.max(visible, 0), 1);
        const blur = 6 + visible * 6;
        sec.style.setProperty('--blur', blur + 'px');
    });

    /* Logo smooth fade on scroll — inline style overrides animation fill */
    if (heroLogo) {
        if (window.scrollY > LOGO_HIDE_THRESHOLD) {
            heroLogo.style.opacity = '0';
            heroLogo.style.transform = 'scale(0.85)';
            heroLogo.style.pointerEvents = 'none';
        } else {
            heroLogo.style.opacity = '1';
            heroLogo.style.transform = 'scale(1)';
            heroLogo.style.pointerEvents = '';
        }
    }
});

/* ===== HTML Escape Helpers ===== */
function escapeHtmlPublic(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function escapeHtmlAttr(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ===== ANNOUNCEMENT BANNER — Public Renderer (Firebase Real-time) ===== */
function renderAnnouncementBanner(data) {
    const banner = document.getElementById('announcementBanner');
    const content = document.getElementById('announcementContent');
    if (!banner || !content) return;

    if (sessionStorage.getItem('rmc_banner_dismissed') === 'true') {
        banner.style.display = 'none';
        return;
    }

    if (!data || !data.active || !data.message) {
        banner.style.display = 'none';
        return;
    }

    banner.style.display = 'flex';
    banner.style.background = data.color || '#c9a84c';

    // Build announcement content via DOM (no innerHTML with user data)
    content.textContent = '';
    const span = document.createElement('span');
    span.className = data.scrolling ? 'announcement-scroll-text' : 'announcement-static-text';
    span.style.color = data.textColor || '#000000';
    span.textContent = data.message; // textContent is always safe
    content.appendChild(span);
}

function dismissBanner() {
    sessionStorage.setItem('rmc_banner_dismissed', 'true');
    const banner = document.getElementById('announcementBanner');
    if (banner) {
        banner.style.animation = 'bannerSlideUp 0.3s ease forwards';
        setTimeout(() => { banner.style.display = 'none'; }, 300);
    }
}

function initAnnouncementBanner() {
    if (window._firebaseReady) {
        fbListen('rmc_announcement', renderAnnouncementBanner);
    } else {
        window.addEventListener('firebaseReady', () => {
            fbListen('rmc_announcement', renderAnnouncementBanner);
        });
    }
}
initAnnouncementBanner();

/* ===== MEMBERS PREVIEW — Public Renderer (Firebase Real-time) ===== */
function renderMembersPreview(members) {
    const grid = document.getElementById('membersPreviewGrid');
    if (!grid) return;

    if (!members) members = [];
    if (!Array.isArray(members)) members = Object.values(members);

    if (members.length === 0) {
        grid.innerHTML = '';
        return;
    }

    const typeOrder = { 'Faculty Advisor': 0, 'Founding Member': 1, 'Core Committee': 2, 'General Member': 3 };
    members.sort((a, b) => {
        const orderA = typeOrder[a.memberType] !== undefined ? typeOrder[a.memberType] : 4;
        const orderB = typeOrder[b.memberType] !== undefined ? typeOrder[b.memberType] : 4;
        return orderA - orderB;
    });

    const preview = members.slice(0, 10);

    grid.innerHTML = preview.map(m => {
        const photo = (m.photoData && m.photoData.trim())
            ? m.photoData
            : (m.photoUrl && m.photoUrl.trim())
            ? m.photoUrl
            : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name) +
              '&background=c9a84c&color=0a0a0a&size=128&bold=true';

        let subtitleHtml = '';
        if (m.qualification && m.qualification.trim()) {
            subtitleHtml = '<p class="mp-card-qualification">' + escapeHtmlPublic(m.qualification) + '</p>';
        } else {
            const parts = [m.year, m.department].filter(Boolean);
            if (parts.length > 0) {
                subtitleHtml = '<p class="mp-card-detail">' + escapeHtmlPublic(parts.join(' • ')) + '</p>';
            }
        }

        const typeBadge = m.memberType === 'Faculty Advisor'
            ? '<span class="mp-card-badge">Faculty</span>' : '';

        return `
            <div class="mp-card">
                ${typeBadge}
                <img src="${escapeHtmlAttr(photo)}" alt="${escapeHtmlAttr(m.name)}" class="mp-card-photo"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=c9a84c&color=0a0a0a&size=128'">
                <h4 class="mp-card-name">${escapeHtmlPublic(m.name)}</h4>
                <p class="mp-card-role">${escapeHtmlPublic(m.role)}</p>
                ${subtitleHtml}
            </div>
        `;
    }).join('');
}

// renderMembersPreview(); // Disabled - members only show on members.html after clicking VIEW ALL MEMBERS button

/* =============================================
   UPCOMING EVENTS + COUNTDOWN TIMER
   ============================================= */

function renderUpcomingEvents(data) {
    const container = document.getElementById('upcomingCards');
    if (!container) return;

    if (!data) {
        container.innerHTML = '<p class="no-events" style="text-align:center;color:#888;padding:40px;">No upcoming events at the moment. Stay tuned!</p>';
        return;
    }

    const arr = Array.isArray(data) ? data : Object.values(data);


    // Filter to upcoming/open events only
    const upcoming = arr.filter(ev =>
        ev.status === 'Registration Open' ||
        (ev.eventDateTime && new Date(ev.eventDateTime) > new Date())
    );

    if (upcoming.length === 0) {
        container.innerHTML = '<p class="no-events" style="text-align:center;color:#888;padding:40px;">No upcoming events at the moment. Stay tuned!</p>';
        return;
    }

    container.innerHTML = upcoming.map(ev => {
        const hasDateTime = ev.eventDateTime && new Date(ev.eventDateTime) > new Date();
        const evId = ev.id || Math.random().toString(36).slice(2, 8);
        return `
        <div class="upcoming-card">
            <div class="upcoming-card-header">
                <span class="upcoming-tag">${escapeHtmlPublic(ev.tag || 'Event')}</span>
                <span class="upcoming-status">${escapeHtmlPublic(ev.status || 'Coming Soon')}</span>
            </div>
            <h3 class="upcoming-title">${escapeHtmlPublic(ev.name || ev.title || 'Event')}</h3>
            <p class="upcoming-desc">${escapeHtmlPublic(ev.description || '')}</p>
            ${hasDateTime ? `
            <div class="countdown-box" data-target="${ev.eventDateTime}">
                <div class="countdown-label">⏳ Starts in</div>
                <div class="countdown-units">
                    <div class="cdu"><span class="cdu-num" id="cd-days-${evId}">--</span><span class="cdu-label">Days</span></div>
                    <div class="cdu-sep">:</div>
                    <div class="cdu"><span class="cdu-num" id="cd-hrs-${evId}">--</span><span class="cdu-label">Hours</span></div>
                    <div class="cdu-sep">:</div>
                    <div class="cdu"><span class="cdu-num" id="cd-min-${evId}">--</span><span class="cdu-label">Mins</span></div>
                    <div class="cdu-sep">:</div>
                    <div class="cdu"><span class="cdu-num" id="cd-sec-${evId}">--</span><span class="cdu-label">Secs</span></div>
                </div>
            </div>` : `<div class="countdown-box upcoming-soon">📅 Date to be announced</div>`}
            ${ev.registrationLink ? `
            <a href="${escapeHtmlAttr(ev.registrationLink)}" class="upcoming-reg-btn" target="_blank">Register Now →</a>` :
            (ev.status === 'Registration Open' ? `
            <a href="register.html?event=${encodeURIComponent(ev.id || '')}" class="upcoming-reg-btn">Register Now →</a>` : '')}
            <div style="margin-top:12px;">${buildRsvpButton(evId)}</div>
        </div>
        `;
    }).join('');

    // Start countdown timers
    startAllCountdowns();
}

function startAllCountdowns() {
    if (window._countdownInterval) clearInterval(window._countdownInterval);

    window._countdownInterval = setInterval(() => {
        document.querySelectorAll('.countdown-box[data-target]').forEach(box => {
            const target = new Date(box.dataset.target);
            const now = new Date();
            const diff = target - now;

            const daysEl = box.querySelector('[id^="cd-days-"]');
            if (!daysEl) return;
            const evId = daysEl.id.replace('cd-days-', '');

            if (diff <= 0) {
                box.innerHTML = '<div class="countdown-live">🔴 LIVE NOW!</div>';
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hrs  = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            const pad = n => String(n).padStart(2, '0');
            const d = document.getElementById('cd-days-' + evId);
            const h = document.getElementById('cd-hrs-' + evId);
            const m = document.getElementById('cd-min-' + evId);
            const s = document.getElementById('cd-sec-' + evId);
            if (d) d.textContent = pad(days);
            if (h) h.textContent = pad(hrs);
            if (m) m.textContent = pad(mins);
            if (s) s.textContent = pad(secs);
        });
    }, 1000);
}

/* =============================================
   FEATURE 1 — PRELOADER
   ============================================= */
(function initPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    function hidePreloader() {
        preloader.classList.add('hidden');
    }

    // Hide once page fully loads, min 1.6s so bar animation finishes
    if (document.readyState === 'complete') {
        setTimeout(hidePreloader, 1600);
    } else {
        window.addEventListener('load', () => setTimeout(hidePreloader, 1600));
    }
})();

/* =============================================
   FEATURE 2 — SCROLL REVEAL (Intersection Observer)
   ============================================= */
(function initScrollReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                // Stagger delay for child elements in same parent
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, Number(delay));
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => observer.observe(el));
})();

/* =============================================
   FEATURE 4 — TESTIMONIALS SLIDER (Firebase-powered)
   ============================================= */
(function initTestimonials() {
    const track   = document.getElementById('testiTrack');
    const dotsEl  = document.getElementById('testiDots');
    const prevBtn = document.getElementById('testiBtnPrev');
    const nextBtn = document.getElementById('testiBtnNext');
    if (!track) return;

    let current  = 0;
    let autoPlay = null;
    let cardCount = 0;

    function buildCard(t) {
        const card = document.createElement('div');
        card.className = 'testimonial-card';
        card.innerHTML = `
            <span class="testimonial-quote-icon">&#8220;</span>
            <p class="testimonial-text">${escapeHtml(t.text)}</p>
            <div class="testimonial-author">
                <div class="testimonial-avatar">&#10022;</div>
                <div class="testimonial-info">
                    <div class="testimonial-name">${escapeHtml(t.name)}</div>
                    <div class="testimonial-role">${escapeHtml(t.role)}</div>
                </div>
            </div>`;
        return card;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function goTo(idx) {
        if (!cardCount) return;
        current = ((idx % cardCount) + cardCount) % cardCount;
        track.style.transform = `translateX(-${current * 100}%)`;
        dotsEl.querySelectorAll('.testi-dot').forEach((d, i) =>
            d.classList.toggle('active', i === current)
        );
        resetAuto();
    }

    function resetAuto() {
        clearInterval(autoPlay);
        if (cardCount > 1) autoPlay = setInterval(() => goTo(current + 1), 5000);
    }

    function buildDots() {
        dotsEl.innerHTML = '';
        for (let i = 0; i < cardCount; i++) {
            const dot = document.createElement('button');
            dot.className = 'testi-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Testimonial ' + (i + 1));
            dot.addEventListener('click', () => goTo(i));
            dotsEl.appendChild(dot);
        }
    }

    function renderTestimonials(data) {
        track.innerHTML = '';
        dotsEl.innerHTML = '';
        clearInterval(autoPlay);
        current = 0;

        if (!data || Object.keys(data).length === 0) {
            track.innerHTML = `<div class="testi-empty"><i class='bx bx-comment-x'></i>No testimonials yet. Check back soon!</div>`;
            cardCount = 0;
            return;
        }

        const list = Object.values(data);
        cardCount = list.length;
        list.forEach(t => track.appendChild(buildCard(t)));
        buildDots();

        // Touch / swipe support
        let startX = 0;
        track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
        track.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
        });

        resetAuto();
    }

    prevBtn && prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn && nextBtn.addEventListener('click', () => goTo(current + 1));

    // Load from Firebase — wait for Firebase to be ready
    function loadFromFirebase() {
        if (window._firebaseReady && window.fbListen) {
            window.fbListen('rmc_testimonials', renderTestimonials);
        } else {
            window.addEventListener('firebaseReady', () => {
                window.fbListen('rmc_testimonials', renderTestimonials);
            }, { once: true });
        }
    }
    loadFromFirebase();
})();

/* =============================================
   FEATURE 5 — RSVP SYSTEM (localStorage)
   ============================================= */
function getRsvpData() {
    try { return JSON.parse(localStorage.getItem('rmc_rsvp') || '{}'); } catch { return {}; }
}
function saveRsvpData(data) {
    try { localStorage.setItem('rmc_rsvp', JSON.stringify(data)); } catch {}
}

function toggleRsvp(evId, btnEl) {
    const data = getRsvpData();
    const isRsvp = !!data[evId];

    if (isRsvp) {
        delete data[evId];
        data[evId + '_count'] = Math.max(0, (data[evId + '_count'] || 1) - 1);
    } else {
        data[evId] = true;
        data[evId + '_count'] = (data[evId + '_count'] || 0) + 1;
    }
    saveRsvpData(data);

    const newActive = !isRsvp;
    btnEl.classList.toggle('rsvp-active', newActive);
    const icon = btnEl.querySelector('.rsvp-icon');
    const countEl = btnEl.querySelector('.rsvp-count');
    if (icon) icon.textContent = newActive ? '★' : '☆';
    const labelEl = btnEl.querySelector('.rsvp-label');
    if (labelEl) labelEl.textContent = newActive ? 'INTERESTED' : 'MARK INTEREST';
    if (countEl) countEl.textContent = data[evId + '_count'] > 0 ? data[evId + '_count'] + ' interested' : '';
}

function buildRsvpButton(evId) {
    const data = getRsvpData();
    const active = !!data[evId];
    const count  = data[evId + '_count'] || 0;
    return `<button class="rsvp-btn${active ? ' rsvp-active' : ''}" onclick="toggleRsvp('${evId}', this)">
        <span class="rsvp-icon">${active ? '★' : '☆'}</span>
        <span class="rsvp-label">${active ? 'INTERESTED' : 'MARK INTEREST'}</span>
        ${count > 0 ? `<span class="rsvp-count">${count} interested</span>` : ''}
    </button>`;
}

/* RSVP injected directly into renderUpcomingEvents template above */

/* =============================================
   FEATURE 6 — SMOOTH SECTION TRANSITIONS
   ============================================= */
(function initPageTransitions() {
    const overlay = document.getElementById('page-transition');
    if (!overlay) return;

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (!target) return;
            e.preventDefault();

            overlay.classList.add('active');
            setTimeout(() => {
                target.scrollIntoView({ behavior: 'instant' });
                overlay.classList.remove('active');
            }, 320);
        });
    });
})();

/* =============================================
   FEATURE 8 — BACK TO TOP VISIBILITY
   ============================================= */
(function initBackToTop() {
    const btn = document.querySelector('.scroll-up');
    if (!btn) return;

    const threshold = window.innerHeight * 0.5;

    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible-btn', window.scrollY > threshold);
    }, { passive: true });
})();

/* ============================================================
   ★ RMC PREMIUM UPGRADE — ENHANCED FEATURE SCRIPTS
   ============================================================ */

/* =============================================
   FEATURE 1 — ENHANCED PRELOADER with floating math symbols
   ============================================= */
(function enhancePreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    // Inject floating math symbols into preloader
    const syms = ['∫','∑','π','∞','√','∂','Δ','Ω','∇','λ','θ','φ','α','β','σ','∈','≡','∝'];
    syms.forEach((sym, i) => {
        const el = document.createElement('span');
        el.className = 'preloader-sym';
        el.textContent = sym;
        const size = 18 + Math.random() * 36;
        el.style.cssText = `
            left: ${5 + Math.random() * 90}%;
            top: ${10 + Math.random() * 80}%;
            font-size: ${size}px;
            animation-duration: ${3 + Math.random() * 4}s;
            animation-delay: ${Math.random() * 2}s;
        `;
        preloader.appendChild(el);
    });
})();

/* =============================================
   FEATURE 5 — RSVP TOAST NOTIFICATION (enhanced)
   ============================================= */
(function enhanceRsvp() {
    // Create toast element
    if (!document.getElementById('rsvpToast')) {
        const toast = document.createElement('div');
        toast.id = 'rsvpToast';
        toast.className = 'rsvp-toast';
        document.body.appendChild(toast);
    }
})();

function showRsvpToast(msg) {
    const t = document.getElementById('rsvpToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

// Patch toggleRsvp to show toast
const _originalToggleRsvp = window.toggleRsvp;
window.toggleRsvp = function(evId, btnEl) {
    const wasActive = btnEl.classList.contains('rsvp-active');
    _originalToggleRsvp(evId, btnEl);
    const nowActive = btnEl.classList.contains('rsvp-active');
    if (nowActive) {
        showRsvpToast('★  You\'re marked as interested!');
    } else {
        showRsvpToast('☆  Interest removed');
    }
};

/* =============================================
   FEATURE 2 — SCROLL REVEAL DIRECTION VARIANTS
   (auto-assign alternating directions to sections)
   ============================================= */
(function assignRevealDirections() {
    const sections = document.querySelectorAll('section.reveal');
    sections.forEach((sec, i) => {
        // Already has a direction class? skip
        if (sec.classList.contains('reveal-left') ||
            sec.classList.contains('reveal-right') ||
            sec.classList.contains('reveal-scale')) return;
        // Alternate: scale, left, right, scale…
        if (i % 4 === 1)      sec.classList.add('reveal-left');
        else if (i % 4 === 2) sec.classList.add('reveal-right');
        else if (i % 4 === 3) sec.classList.add('reveal-scale');
        // i % 4 === 0 keeps default (up)
    });
})();

/* =============================================
   FEATURE 8 — SMOOTH SCROLL for all anchor links
   (enhance the existing page transition)
   ============================================= */
(function enhanceSmoothScroll() {
    // Also add smooth scrolling to footer quick links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const overlay = document.getElementById('page-transition');
                if (overlay) {
                    overlay.classList.add('active');
                    setTimeout(() => {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        setTimeout(() => overlay.classList.remove('active'), 200);
                    }, 300);
                } else {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
})();


