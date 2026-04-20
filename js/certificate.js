/* =============================================
   CERTIFICATE.JS — Certificate search & download
   ============================================= */

async function initCertPage() {
    // Populate event filter dropdown
    try {
        const events = await (window.fbGetCached || fbGet)('rmc_events');
        const select = document.getElementById('certEventFilter');
        if (events) {
            const arr = Array.isArray(events) ? events : Object.values(events);
            arr.forEach(ev => {
                const opt = document.createElement('option');
                opt.value = ev.name;
                opt.textContent = ev.name;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('Failed to load events for filter:', err);
    }
}

async function searchCertificates() {
    const query = document.getElementById('certSearch').value.trim().toLowerCase();
    const eventFilter = document.getElementById('certEventFilter').value;

    if (query.length < 2) {
        showCertToast('Please enter at least 2 characters.', 'error');
        return;
    }

    showCertLoading(true);

    try {
        const allCerts = await (window.fbGetCached || fbGet)('rmc_certificates');
        showCertLoading(false);

        if (!allCerts) {
            showNoCerts();
            return;
        }

        const certs = Object.values(allCerts);
        const filtered = certs.filter(c => {
            const nameMatch = c.studentName && c.studentName.toLowerCase().includes(query);
            const rbtMatch = c.rbt && c.rbt.toLowerCase().includes(query);
            const eventMatch = !eventFilter || c.eventName === eventFilter;
            return (nameMatch || rbtMatch) && eventMatch;
        });

        renderCertResults(filtered);
    } catch (err) {
        showCertLoading(false);
        showCertToast('Error searching certificates: ' + err.message, 'error');
    }
}

function renderCertResults(certs) {
    const container = document.getElementById('certResults');

    if (certs.length === 0) {
        container.innerHTML = `
            <div class="cert-empty">
                <i class='bx bx-search-alt'></i>
                <p>No certificate found. Make sure your name or RBT number is correct.</p>
                <small>If you participated and don't see your certificate, contact the admin.</small>
            </div>
        `;
        return;
    }

    container.innerHTML = certs.map(c => `
        <div class="cert-result-card">
            <div class="cert-result-info">
                <div class="cert-name">${escapeHtml(c.studentName)}</div>
                <div class="cert-meta">
                    <span>📋 ${escapeHtml(c.certId)}</span>
                    <span>🎓 ${escapeHtml(c.eventName)}</span>
                    <span>📅 ${c.issuedAt ? new Date(c.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                </div>
            </div>
            <button class="cert-download-btn" onclick="downloadCertificate('${escapeHtmlAttr(c.certId)}')">
                📥 Download
            </button>
        </div>
    `).join('');
}

function showNoCerts() {
    document.getElementById('certResults').innerHTML = `
        <div class="cert-empty">
            <i class='bx bx-search-alt'></i>
            <p>No certificates found in the database.</p>
        </div>
    `;
}

function showCertLoading(show) {
    const container = document.getElementById('certResults');
    if (show) {
        container.innerHTML = `
            <div class="cert-loading">
                <i class='bx bx-loader-alt'></i>
                <p>Searching...</p>
            </div>
        `;
    }
}

/* ===== Certificate Canvas Generation ===== */
async function downloadCertificate(certId) {
    const cert = await fbGet('rmc_certificates/' + certId);
    if (!cert) { showCertToast('Certificate not found.', 'error'); return; }

    // Increment download count
    const currentCount = cert.downloadCount || 0;
    await fbSet('rmc_certificates/' + certId + '/downloadCount', currentCount + 1);

    const canvas = document.createElement('canvas');
    canvas.width = 1122;
    canvas.height = 794;
    const ctx = canvas.getContext('2d');

    // Draws the default dark background + borders (skipped when a template image is used)
    const drawBackground = () => {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Gold border
        ctx.strokeStyle = '#c0a060';
        ctx.lineWidth = 8;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        ctx.strokeStyle = 'rgba(192,160,96,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

        // Corner decorations
        ctx.strokeStyle = '#c0a060';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(40, 80); ctx.lineTo(40, 40); ctx.lineTo(80, 40); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(canvas.width - 80, 40); ctx.lineTo(canvas.width - 40, 40); ctx.lineTo(canvas.width - 40, 80); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(40, canvas.height - 80); ctx.lineTo(40, canvas.height - 40); ctx.lineTo(80, canvas.height - 40); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(canvas.width - 80, canvas.height - 40); ctx.lineTo(canvas.width - 40, canvas.height - 40); ctx.lineTo(canvas.width - 40, canvas.height - 80); ctx.stroke();

        // Club name
        ctx.fillStyle = '#c0a060';
        ctx.font = 'bold 28px serif';
        ctx.textAlign = 'center';
        ctx.fillText("JSPM's RSCOE MATHEMATICS CLUB", canvas.width / 2, 100);

        // Certificate of Participation
        ctx.fillStyle = '#e8e0d0';
        ctx.font = 'italic 22px serif';
        ctx.fillText('Certificate of Participation', canvas.width / 2, 145);

        // Decorative divider
        ctx.strokeStyle = '#c0a060';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(200, 165);
        ctx.lineTo(canvas.width - 200, 165);
        ctx.stroke();
    };

    // Overlays the participant text on top of whatever is already on canvas, then triggers download
    const overlayTextAndDownload = () => {
        // This is to certify
        ctx.fillStyle = '#888';
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('This is to certify that', canvas.width / 2, 220);

        // Student name
        ctx.fillStyle = '#c0a060';
        ctx.font = 'bold 42px serif';
        ctx.fillText(cert.studentName, canvas.width / 2, 285);

        // Underline under name
        const nameWidth = ctx.measureText(cert.studentName).width;
        ctx.strokeStyle = 'rgba(192,160,96,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo((canvas.width - nameWidth) / 2 - 20, 295);
        ctx.lineTo((canvas.width + nameWidth) / 2 + 20, 295);
        ctx.stroke();

        // has participated in
        ctx.fillStyle = '#888';
        ctx.font = '18px sans-serif';
        ctx.fillText('has successfully participated in', canvas.width / 2, 340);

        // Event name
        ctx.fillStyle = '#e8e0d0';
        ctx.font = 'bold 28px serif';
        ctx.fillText(cert.eventName, canvas.width / 2, 390);

        // organized by
        ctx.fillStyle = '#888';
        ctx.font = '16px sans-serif';
        ctx.fillText('organized by RSCOE Mathematics Club', canvas.width / 2, 425);

        // Event date
        if (cert.eventDate) {
            ctx.fillStyle = '#888';
            ctx.font = '18px sans-serif';
            ctx.fillText('held on ' + new Date(cert.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), canvas.width / 2, 460);
        }

        // Divider
        ctx.strokeStyle = 'rgba(192,160,96,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(200, 490);
        ctx.lineTo(canvas.width - 200, 490);
        ctx.stroke();

        // Certificate ID & date
        ctx.fillStyle = '#555';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Certificate ID: ' + cert.certId, 60, 530);
        ctx.textAlign = 'right';
        ctx.fillText('Issued: ' + new Date(cert.issuedAt).toLocaleDateString('en-IN'), canvas.width - 60, 530);

        // Signature areas
        ctx.fillStyle = '#888';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';

        ctx.strokeStyle = 'rgba(192,160,96,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 320, 640);
        ctx.lineTo(canvas.width / 2 - 120, 640);
        ctx.stroke();
        ctx.fillText('Club Coordinator', canvas.width / 2 - 220, 660);

        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 + 120, 640);
        ctx.lineTo(canvas.width / 2 + 320, 640);
        ctx.stroke();
        ctx.fillText('Faculty Advisor', canvas.width / 2 + 220, 660);

        // Footer
        ctx.fillStyle = 'rgba(192,160,96,0.5)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("JSPM's Rajarshi Shahu College of Engineering, Tathawade, Pune", canvas.width / 2, 740);

        // Trigger download
        const link = document.createElement('a');
        link.download = 'RMC_Certificate_' + cert.studentName.replace(/\s+/g, '_') + '_' + cert.certId + '.png';
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

        showCertToast('Certificate downloaded!', 'success');
    };

    // Check for admin-uploaded template (stored as base64 in rmc_cert_template)
    try {
        const templateData = await (window.fbGetCached || fbGet)('rmc_cert_template');
        if (templateData) {
            const template = new Image();
            template.onload = () => {
                // Draw template as background, then overlay participant text
                ctx.drawImage(template, 0, 0, canvas.width, canvas.height);
                overlayTextAndDownload();
            };
            template.onerror = () => {
                // Template failed to load — fall back to default design
                drawBackground();
                overlayTextAndDownload();
            };
            template.src = templateData; // base64 data URL
        } else {
            drawBackground();
            overlayTextAndDownload();
        }
    } catch {
        drawBackground();
        overlayTextAndDownload();
    }
}

/* ===== Utilities ===== */
function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function escapeHtmlAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showCertToast(message, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast ' + (type || '');
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Handle Enter key in search
const _certSearchInput = document.getElementById('certSearch');
if (_certSearchInput) {
    _certSearchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') searchCertificates();
    });
}

// Init when Firebase is ready
function initCertificatePage() {
    if (window._firebaseReady) {
        initCertPage();
    } else {
        window.addEventListener('firebaseReady', initCertPage);
    }
}
initCertificatePage();
