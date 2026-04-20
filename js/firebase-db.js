/* =============================================
   FIREBASE DB HELPERS
   Drop-in replacements for localStorage calls.
   Requires Firebase SDK to be loaded and exposed
   on window via the module script in the HTML.
   ============================================= */

async function fbGet(path) {
    const db = window._firebaseDB;
    const ref = window._firebaseRef;
    const get = window._firebaseGet;
    if (!db) return null;
    try {
        const snapshot = await get(ref(db, path));
        return snapshot.exists() ? snapshot.val() : null;
    } catch (err) {
        console.error('Firebase GET error:', path, err);
        return null;
    }
}

async function fbSet(path, value) {
    const db = window._firebaseDB;
    const ref = window._firebaseRef;
    const set = window._firebaseSet;
    if (!db) return;
    try {
        await set(ref(db, path), value);
    } catch (err) {
        console.error('Firebase SET error:', path, err);
    }
}

async function fbRemove(path) {
    const db = window._firebaseDB;
    const ref = window._firebaseRef;
    const remove = window._firebaseRemove;
    if (!db) return;
    try {
        await remove(ref(db, path));
    } catch (err) {
        console.error('Firebase REMOVE error:', path, err);
    }
}

function fbListen(path, callback) {
    const db = window._firebaseDB;
    const ref = window._firebaseRef;
    const onValue = window._firebaseOnValue;
    if (!db) return;
    onValue(ref(db, path), (snapshot) => {
        callback(snapshot.exists() ? snapshot.val() : null);
    });
}

window.fbGet = fbGet;
window.fbSet = fbSet;
window.fbRemove = fbRemove;
window.fbListen = fbListen;

/* =============================================
   FIREBASE CACHE — sessionStorage with TTL
   Reduces redundant Firebase reads on page load.
   Cache TTL: 2 minutes for fast-changing data
              10 minutes for stable data (members)
   ============================================= */
const _fbCache = {
    TTL_SHORT: 2 * 60 * 1000,   // 2 min — events, registrations
    TTL_LONG:  10 * 60 * 1000,  // 10 min — members, cert config

    _longPaths: ['rmc_members', 'rmc_cert_config', 'rmc_cert_template'],

    key(path) { return 'rmc_fc_' + path.replace(/\//g, '__'); },

    ttl(path) {
        return this._longPaths.some(p => path.startsWith(p))
            ? this.TTL_LONG : this.TTL_SHORT;
    },

    get(path) {
        try {
            const raw = sessionStorage.getItem(this.key(path));
            if (!raw) return undefined;
            const { ts, val } = JSON.parse(raw);
            if (Date.now() - ts > this.ttl(path)) {
                sessionStorage.removeItem(this.key(path));
                return undefined;
            }
            return val;
        } catch { return undefined; }
    },

    set(path, val) {
        try {
            sessionStorage.setItem(this.key(path), JSON.stringify({ ts: Date.now(), val }));
        } catch { /* quota exceeded — silently skip */ }
    },

    bust(path) {
        // Invalidate this path and any parent paths
        try {
            const prefix = 'rmc_fc_' + path.split('/')[0];
            Object.keys(sessionStorage)
                .filter(k => k.startsWith(prefix))
                .forEach(k => sessionStorage.removeItem(k));
        } catch { /* ignore */ }
    }
};

/* Cached fbGet — use for read-heavy public data */
async function fbGetCached(path) {
    const cached = _fbCache.get(path);
    if (cached !== undefined) return cached;
    const val = await fbGet(path);
    if (val !== null) _fbCache.set(path, val);
    return val;
}

/* Bust cache on writes so stale data isn't served */
const _origFbSet = fbSet;
window.fbSet = async function(path, value) {
    _fbCache.bust(path);
    return _origFbSet(path, value);
};

const _origFbRemove = fbRemove;
window.fbRemove = async function(path) {
    _fbCache.bust(path);
    return _origFbRemove(path);
};

window.fbGetCached = fbGetCached;
window._fbCache = _fbCache;
