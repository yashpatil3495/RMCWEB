/* =============================================
   EMAIL SERVICE (EmailJS)
   Client-side email sending for:
   1. Ticket emails when registration is accepted
   2. Admin approval notifications
   
   ▸ SETUP INSTRUCTIONS:
     1. Create a free account at https://www.emailjs.com/
     2. Add an email service (Gmail, Outlook, etc.)
     3. Create two email templates:
        - "ticket_template" for event tickets
        - "admin_approval_template" for admin approvals
     4. Replace the constants below with your real values
   ============================================= */

const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';   // Replace with your public key
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';           // Replace with your service ID
const EMAILJS_TICKET_TEMPLATE = 'ticket_template';       // Template ID for tickets
const EMAILJS_ADMIN_TEMPLATE = 'admin_approval_template'; // Template ID for admin approval

let emailjsLoaded = false;

/**
 * Load EmailJS SDK dynamically
 */
function loadEmailJS() {
    return new Promise((resolve, reject) => {
        if (emailjsLoaded) { resolve(); return; }
        if (window.emailjs) { emailjsLoaded = true; resolve(); return; }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        script.onload = () => {
            window.emailjs.init(EMAILJS_PUBLIC_KEY);
            emailjsLoaded = true;
            resolve();
        };
        script.onerror = () => reject(new Error('Failed to load EmailJS SDK'));
        document.head.appendChild(script);
    });
}

/**
 * Generate a unique ticket ID
 */
function generateTicketId() {
    const prefix = 'RMC';
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${ts}-${rand}`;
}

/**
 * Send ticket confirmation email to accepted registrant
 */
async function sendTicketEmail(registration, eventData) {
    try {
        await loadEmailJS();

        const ticketId = registration.ticketId || generateTicketId();
        const eventDate = eventData.date
            ? new Date(eventData.date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
            })
            : 'TBA';

        const templateParams = {
            to_name: registration.name,
            to_email: registration.email,
            event_name: eventData.name || registration.eventName,
            event_date: eventDate,
            event_description: eventData.description || '',
            ticket_id: ticketId,
            applicant_name: registration.name,
            applicant_rbt: registration.rbt || '',
            applicant_department: registration.department || '',
            applicant_year: registration.year || '',
            group_size: registration.groupSize || '1',
            club_name: 'RSCOE Mathematics Club',
            reply_to: 'rmcshg1230@gmail.com'
        };

        if (EMAILJS_PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY') {
            console.warn('EmailJS not configured. Ticket email skipped.');
            console.log('Would have sent ticket email with params:', templateParams);
            return { success: true, ticketId, simulated: true };
        }

        await window.emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TICKET_TEMPLATE,
            templateParams
        );

        return { success: true, ticketId };
    } catch (err) {
        console.error('Failed to send ticket email:', err);
        return { success: false, error: err.message || err };
    }
}

/**
 * Send admin approval notification email
 */
async function sendAdminApprovalEmail(adminData) {
    try {
        await loadEmailJS();

        const templateParams = {
            to_name: adminData.name,
            to_email: adminData.email,
            admin_panel_url: window.location.origin + '/admin.html',
            club_name: 'RSCOE Mathematics Club',
            reply_to: 'rmcshg1230@gmail.com'
        };

        if (EMAILJS_PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY') {
            console.warn('EmailJS not configured. Admin approval email skipped.');
            console.log('Would have sent admin approval email with params:', templateParams);
            return { success: true, simulated: true };
        }

        await window.emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_ADMIN_TEMPLATE,
            templateParams
        );

        return { success: true };
    } catch (err) {
        console.error('Failed to send admin approval email:', err);
        return { success: false, error: err.message || err };
    }
}

// Expose globally
window.sendTicketEmail = sendTicketEmail;
window.sendAdminApprovalEmail = sendAdminApprovalEmail;
window.generateTicketId = generateTicketId;
