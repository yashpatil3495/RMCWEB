/**
 * Dynamic Member Rendering for members.html
 * Reads from Firebase Realtime Database path 'rmc_members'.
 * Groups members by Member Type and renders dynamically.
 * Falls back to static content if no members in Firebase.
 * Includes search and filter functionality.
 */

let allMembers = [];
let filteredMembers = [];
let currentFilter = 'all';
let currentSearchQuery = '';

/** Escape HTML to prevent XSS */
function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

/**
 * Get the photo URL for a member.
 * Uses photoData (base64) first, then photoUrl, then falls back to UI Avatars API.
 * @param {object} m - Member object
 * @returns {string} Photo URL or base64 data
 */
function getMemberPhotoUrl(m) {
    // Priority 1: photoData (base64 from uploaded file)
    if (m.photoData && m.photoData.trim()) return m.photoData;
    
    // Priority 2: photoUrl (external URL)
    if (m.photoUrl && m.photoUrl.trim()) return m.photoUrl;
    
    // Fallback: UI Avatars API
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name) +
        '&background=c9a84c&color=0a0a0a&size=256&bold=true&font-size=0.4';
}

/**
 * Filter and search members based on current filters and search query
 */
function filterAndSearchMembers() {
    let members = [...allMembers];
    
    // Apply type filter
    if (currentFilter !== 'all') {
        members = members.filter(m => (m.memberType || 'General Member') === currentFilter);
    }
    
    // Apply search filter
    if (currentSearchQuery.trim()) {
        const query = currentSearchQuery.toLowerCase().trim();
        members = members.filter(m => 
            (m.name && m.name.toLowerCase().includes(query)) ||
            (m.role && m.role.toLowerCase().includes(query)) ||
            (m.department && m.department.toLowerCase().includes(query))
        );
    }
    
    filteredMembers = members;
    renderDynamicMembers(members);
}

/**
 * Render all members dynamically.
 * Groups by memberType in order: Faculty Advisor, Core Committee, General Member.
 */
function renderDynamicMembers(members = null) {
    if (members === null) {
        members = allMembers;
    }

    const container = document.getElementById('dynamicMembersContainer');
    const staticSection = document.getElementById('staticMembers');

    // If no members, show static fallback
    if (!members || members.length === 0) {
        container.style.display = 'none';
        staticSection.style.display = 'block';
        // Re-apply intersection observer for static cards
        initStaticObserver();
        return;
    }

    // Hide static, show dynamic
    staticSection.style.display = 'none';
    container.style.display = 'block';

    // Define display order for member types
    const typeOrder = ['Faculty Advisor', 'Founding Member', 'Core Committee', 'General Member'];
    const typeLabels = {
        'Faculty Advisor': 'Faculty Advisors',
        'Founding Member': 'Founding Members',
        'Core Committee': 'Core Committee',
        'General Member': 'General Members'
    };

    // Group members by type
    const grouped = {};
    members.forEach(m => {
        const type = m.memberType || 'General Member';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(m);
    });

    let html = '';

    typeOrder.forEach(type => {
        const group = grouped[type];
        if (!group || group.length === 0) return;

        html += `<div class="member-type-section">`;
        html += `<h2 class="member-type-title">${escapeHtml(typeLabels[type] || type)}</h2>`;
        html += `<div class="member-type-grid">`;

        group.forEach(m => {
            const photo = getMemberPhotoUrl(m);
            const alumniBadge = m.status === 'Alumni'
                ? '<span class="alumni-badge">Alumni</span>' : '';
            const foundingBadge = (m.memberType === 'Founding Member')
                ? '<span class="founding-badge">★ Founder</span>' : '';

            // Designation line — shown for Faculty Advisors and Founding Members
            const showDesignation = (m.memberType === 'Faculty Advisor' || m.memberType === 'Founding Member');
            const designationHtml = (showDesignation && m.qualification)
                ? `<p class="dyn-member-designation"><i class='bx bx-award'></i> ${escapeHtml(m.qualification)}</p>`
                : '';

            // Year + Department line
            let detailLine = '';
            if (m.year || m.department) {
                const parts = [m.year, m.department].filter(Boolean);
                detailLine = `<div class="dyn-member-detail">${escapeHtml(parts.join(' • '))}</div>`;
            }

            // Social links
            let linksHtml = '';
            if (m.linkedin || m.email) {
                linksHtml = '<div class="dyn-member-links">';
                if (m.linkedin) {
                    linksHtml += `<a href="${escapeHtml(m.linkedin)}" target="_blank" title="LinkedIn"><i class='bx bxl-linkedin'></i></a>`;
                }
                if (m.email) {
                    linksHtml += `<a href="mailto:${escapeHtml(m.email)}" title="Email"><i class='bx bx-envelope'></i></a>`;
                }
                linksHtml += '</div>';
            }

            const fallbackUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name) +
                '&background=c9a84c&color=0a0a0a&size=256&bold=true&font-size=0.4';

            html += `
                <div class="dyn-member-card">
                    ${alumniBadge}
                    ${foundingBadge}
                    <img src="${escapeHtml(photo)}" alt="${escapeHtml(m.name)}" class="dyn-member-photo"
                         onerror="this.src='${escapeHtml(fallbackUrl)}'">
                    <h3 class="dyn-member-name">${escapeHtml(m.name)}</h3>
                    <p class="dyn-member-role">${escapeHtml(m.role)}</p>
                    ${designationHtml}
                    ${detailLine}
                    ${linksHtml}
                </div>
            `;
        });

        html += `</div></div>`;
    });

    // Check for any types not in the predefined order
    Object.keys(grouped).forEach(type => {
        if (!typeOrder.includes(type)) {
            const group = grouped[type];
            html += `<div class="member-type-section">`;
            html += `<h2 class="member-type-title">${escapeHtml(type)}</h2>`;
            html += `<div class="member-type-grid">`;
            group.forEach(m => {
                const photo = getMemberPhotoUrl(m);
                const alumniBadge = m.status === 'Alumni'
                    ? '<span class="alumni-badge">Alumni</span>' : '';
                const showDesignation = (m.memberType === 'Faculty Advisor' || m.memberType === 'Founding Member');
                const designationHtml = (showDesignation && m.qualification)
                    ? `<p class="dyn-member-designation"><i class='bx bx-award'></i> ${escapeHtml(m.qualification)}</p>`
                    : '';
                let detailLine = '';
                if (m.year || m.department) {
                    const parts = [m.year, m.department].filter(Boolean);
                    detailLine = `<div class="dyn-member-detail">${escapeHtml(parts.join(' • '))}</div>`;
                }
                let linksHtml = '';
                if (m.linkedin || m.email) {
                    linksHtml = '<div class="dyn-member-links">';
                    if (m.linkedin) linksHtml += `<a href="${escapeHtml(m.linkedin)}" target="_blank" title="LinkedIn"><i class='bx bxl-linkedin'></i></a>`;
                    if (m.email) linksHtml += `<a href="mailto:${escapeHtml(m.email)}" title="Email"><i class='bx bx-envelope'></i></a>`;
                    linksHtml += '</div>';
                }
                const fallbackUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name) +
                    '&background=c9a84c&color=0a0a0a&size=256&bold=true&font-size=0.4';
                html += `
                    <div class="dyn-member-card">
                        ${alumniBadge}
                        <img src="${escapeHtml(photo)}" alt="${escapeHtml(m.name)}" class="dyn-member-photo"
                             onerror="this.src='${escapeHtml(fallbackUrl)}'">
                        <h3 class="dyn-member-name">${escapeHtml(m.name)}</h3>
                        <p class="dyn-member-role">${escapeHtml(m.role)}</p>
                        ${designationHtml}
                        ${detailLine}
                        ${linksHtml}
                    </div>
                `;
            });
            html += `</div></div>`;
        }
    });

    // If no members rendered (all types empty), show placeholder
    if (html === '') {
        html = `
            <div class="members-placeholder">
                <i class='bx bx-user-circle'></i>
                <p>No members match your search. Try adjusting your filters.</p>
            </div>
        `;
    }

    container.innerHTML = html;

    // Animate cards appearing with intersection observer
    setTimeout(() => {
        const dynCards = document.querySelectorAll('.dyn-member-card');
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('show');
                }
            });
        }, { threshold: 0.2 });
        dynCards.forEach(card => observer.observe(card));
    }, 50);
}

/** Initialize intersection observer for static fallback cards */
function initStaticObserver() {
    const cards = document.querySelectorAll('.member-card');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    }, { threshold: 0.4 });
    cards.forEach(card => observer.observe(card));
}

/**
 * Initialize search and filter functionality
 */
function initSearchAndFilter() {
    const searchInput = document.getElementById('memberSearch');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value;
            filterAndSearchMembers();
        });
    }
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterAndSearchMembers();
        });
    });
}

// Use Firebase real-time listener to load members
function initMembersFromFirebase() {
    if (window._firebaseReady) {
        fbListen('rmc_members', (data) => {
            if (!data) {
                allMembers = [];
            } else {
                allMembers = Array.isArray(data) ? data : Object.values(data);
            }
            filterAndSearchMembers();
        });
    } else {
        window.addEventListener('firebaseReady', () => {
            fbListen('rmc_members', (data) => {
                if (!data) {
                    allMembers = [];
                } else {
                    allMembers = Array.isArray(data) ? data : Object.values(data);
                }
                filterAndSearchMembers();
            });
        });
    }
}

// Initialize on page load
initMembersFromFirebase();

// Initialize search and filter when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchAndFilter);
} else {
    initSearchAndFilter();
}
