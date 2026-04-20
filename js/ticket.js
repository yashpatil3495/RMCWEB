/* =============================================
   TICKET.JS — Ticket viewer/download page
   Reads ?id=TICKET_ID from URL, loads from Firebase
   ============================================= */

async function loadTicket() {
    const params = new URLSearchParams(window.location.search);
    const ticketId = params.get('id');

    if (!ticketId) {
        showTicketError('No ticket ID provided.', 'Please use the link from your registration confirmation.');
        return;
    }

    showTicketLoading(true);

    try {
        const ticket = await fbGet('rmc_tickets/' + ticketId);
        showTicketLoading(false);

        if (!ticket) {
            showTicketError('Ticket not found.', 'This ticket ID does not exist or has been removed.');
            return;
        }

        if (!ticket.isValid) {
            showTicketInvalid(ticket);
            return;
        }

        renderTicket(ticket);
    } catch (err) {
        showTicketLoading(false);
        showTicketError('Failed to load ticket.', err.message || 'Please try again later.');
    }
}

function renderTicket(ticket) {
    const qrUrl = getQRCodeURL(ticket.ticketId);
    const issuedDate = ticket.generatedAt
        ? new Date(ticket.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : '—';

    document.getElementById('ticketContainer').innerHTML = `
        <div class="ticket-card" id="ticketCard">
            <div class="ticket-header">
                <img src="img/logo.png" alt="RMC Logo" class="ticket-logo">
                <div class="ticket-header-text">
                    <div class="ticket-club">RSCOE MATHEMATICS CLUB</div>
                    <div class="ticket-subtitle">Digital Entry Ticket</div>
                </div>
            </div>
            <div class="ticket-id">🎟️ ${escapeHtml(ticket.ticketId)}</div>
            <div class="ticket-body">
                <div class="ticket-row"><span>Event</span><strong>${escapeHtml(ticket.eventName)}</strong></div>
                <div class="ticket-row"><span>Name</span><strong>${escapeHtml(ticket.studentName)}</strong></div>
                <div class="ticket-row"><span>RBT No.</span><strong>${escapeHtml(ticket.rbt || '—')}</strong></div>
                <div class="ticket-row"><span>Department</span><strong>${escapeHtml(ticket.department || '—')}</strong></div>
                <div class="ticket-row"><span>Year</span><strong>${escapeHtml(ticket.year || '—')}</strong></div>
                <div class="ticket-row"><span>Group Size</span><strong>${ticket.groupSize || 1} member${(ticket.groupSize || 1) > 1 ? 's' : ''}</strong></div>
                <div class="ticket-status valid">✅ VALID TICKET</div>
            </div>
            <div class="ticket-qr">
                <img src="${qrUrl}" alt="QR Code for ticket verification">
                <p>Scan at event entry</p>
            </div>
            <div class="ticket-footer">
                Issued: ${issuedDate}
            </div>
        </div>
        <button class="ticket-download-btn" onclick="downloadTicketPDF()">
            📥 Download Ticket
        </button>
    `;
}

function showTicketInvalid(ticket) {
    document.getElementById('ticketContainer').innerHTML = `
        <div class="ticket-card" id="ticketCard">
            <div class="ticket-header">
                <img src="img/logo.png" alt="RMC Logo" class="ticket-logo">
                <div class="ticket-header-text">
                    <div class="ticket-club">RSCOE MATHEMATICS CLUB</div>
                    <div class="ticket-subtitle">Digital Entry Ticket</div>
                </div>
            </div>
            <div class="ticket-id">🎟️ ${escapeHtml(ticket.ticketId)}</div>
            <div class="ticket-body">
                <div class="ticket-row"><span>Event</span><strong>${escapeHtml(ticket.eventName)}</strong></div>
                <div class="ticket-row"><span>Name</span><strong>${escapeHtml(ticket.studentName)}</strong></div>
                <div class="ticket-status invalid">❌ TICKET INVALIDATED</div>
            </div>
            <div class="ticket-footer">
                This ticket has been cancelled or invalidated by the administrator.
            </div>
        </div>
    `;
}

function showTicketLoading(show) {
    const container = document.getElementById('ticketContainer');
    if (show) {
        container.innerHTML = `
            <div class="ticket-loading">
                <i class='bx bx-loader-alt'></i>
                <p>Loading ticket...</p>
            </div>
        `;
    }
}

function showTicketError(title, msg) {
    document.getElementById('ticketContainer').innerHTML = `
        <div class="ticket-error">
            <i class='bx bx-error-circle'></i>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(msg)}</p>
        </div>
    `;
}

function getQRCodeURL(ticketId) {
    const data = encodeURIComponent('https://rmcwebsite10.web.app/ticket.html?id=' + ticketId);
    return 'https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=' + data + '&choe=UTF-8';
}

function downloadTicketPDF() {
    const ticketCard = document.getElementById('ticketCard');
    if (!ticketCard) return;

    const printContent = `
        <html>
        <head>
            <title>RMC Ticket</title>
            <link rel="stylesheet" href="css/ticket.css">
            <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Raleway:wght@300;400;500;600&display=swap" rel="stylesheet">
            <style>
                body { margin: 0; padding: 30px; background: white; display: flex; justify-content: center; }
                .ticket-download-btn { display: none; }
                .ticket-card { border-color: #c0a060; }
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
        </head>
        <body>${ticketCard.outerHTML}</body>
        </html>
    `;

    const w = window.open('', '_blank');
    w.document.write(printContent);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 600);
}

function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// Init when Firebase is ready
function initTicketPage() {
    if (window._firebaseReady) {
        loadTicket();
    } else {
        window.addEventListener('firebaseReady', loadTicket);
    }
}
initTicketPage();
