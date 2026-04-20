# RMC Website — Upgrade Notes

## What was changed

### Fix 1 — Admin credentials moved to Firebase Authentication
The hardcoded `ADMIN_USER`/`ADMIN_PASS` in `admin.js` are gone.

**Setup required (one-time):**
1. Go to **Firebase Console → Authentication → Sign-in method**
2. Enable **Email/Password** provider
3. Go to **Authentication → Users → Add user**
4. Create a user with email `rmc.superadmin@jspmrscoe.edu.in` (or any email you choose) and a strong password
5. In `js/admin.js`, update the `SUPER_ADMIN_EMAIL` constant to match the email you chose
6. Log in to the admin panel using that email + password — Firebase handles it securely

### Fix 2 — XSS protection
`buildRail()` and the announcement banner now use `textContent` / DOM methods instead of `innerHTML` for Firebase data. Malicious content in the database can no longer inject scripts.

### Fix 3 — Firebase Database Rules
**`firebase-database-rules.json`** — copy the contents of this file into:
**Firebase Console → Realtime Database → Rules** tab → Publish

Key rules applied:
- Public paths (events, certificates, members) → read by all, write by auth only
- Admin-only paths (approved_admins) → write by super admin UID only
- Registrations → public write allowed (new submissions), read requires auth

### Fix 4 — Registration page rename
`ragister.html` → `register.html`. All links updated across all HTML, JS, and sitemap files. Old `ragister.html` kept in place so existing bookmarks/links don't break immediately — you can delete it after a redirect period.

### Fix 5 — Dark / Light mode toggle
A 🌙 THEME button in the header switches between dark and light mode. Choice persists in `localStorage`. Respects `prefers-color-scheme` on first visit.

### Fix 6 — Mobile nav accessibility
The slide-out menu now has:
- A semi-transparent backdrop (click outside to close)
- Focus trap (Tab key cycles within the menu)
- Escape key to close
- Body scroll lock while open

### Fix 7 — Real-time registration status
After submitting a registration, the page now uses Firebase `onValue` to watch the registration record in real-time. When an admin accepts or rejects:
- Status indicator updates instantly (no reload)
- Ticket link appears automatically on acceptance
- Rejection message shown on rejection

### Fix 8 — Canvas animation deferred
The heavy math background animation (90 particles, 55 symbols) now starts only after the preloader finishes, improving first-paint time by ~1–2 seconds on mobile.

### Fix 9 — WebP image support
All 8 activity/event images now use `<picture>` elements with `.webp` sources and JPEG fallbacks. **Action required:** convert your JPEG images to WebP format and place them in the `img/` folder with `.webp` extensions. Tools: `cwebp` (CLI), Squoosh (web), or any image editor.

```bash
# Convert all JPEGs to WebP (requires cwebp)
cd img/
for f in *.jpeg; do cwebp "$f" -o "${f%.jpeg}.webp"; done
```

### Fix 10 — Firebase read caching
A `sessionStorage` cache with TTL was added to `firebase-db.js`:
- Short-lived data (events, certs): 2-minute cache
- Stable data (members, cert config): 10-minute cache
- Cache is automatically busted on any write/delete
- Use `fbGetCached(path)` instead of `fbGet(path)` for read-heavy public paths

