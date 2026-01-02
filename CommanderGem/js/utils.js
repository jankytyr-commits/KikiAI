/* utils.js */
import { CONSTANTS, DOM } from './state.js';

/* IDB helpers */
export function openDB() { return new Promise((res, rej) => { const r = indexedDB.open(CONSTANTS.DB_NAME, 1); r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(CONSTANTS.DB_STORE)) db.createObjectStore(CONSTANTS.DB_STORE); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
export async function idbSet(k, v) { const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction(CONSTANTS.DB_STORE, 'readwrite'); tx.objectStore(CONSTANTS.DB_STORE).put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }
export async function idbGet(k) { const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction(CONSTANTS.DB_STORE, 'readonly'); const r = tx.objectStore(CONSTANTS.DB_STORE).get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
export async function idbDelete(k) { const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction(CONSTANTS.DB_STORE, 'readwrite'); tx.objectStore(CONSTANTS.DB_STORE).delete(k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }

/* small utils */
export function formatBytes(b) { if (b == null) return ''; const u = ['B', 'KB', 'MB', 'GB']; let i = 0, n = b; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return (i ? n.toFixed(1) : Math.floor(n)) + ' ' + u[i]; }
export function extOf(name) { const m = /(?:\.([^.]+))?$/.exec(name); return (m && m[1]) ? m[1].toLowerCase() : ''; }
export function nameWithoutExt(name) { const e = extOf(name); return e ? name.slice(0, -(e.length + 1)) : name; }
export function fmtDate(ts) { if (!ts) return ''; try { const d = new Date(ts); return d.toLocaleString(); } catch (e) { return ''; } }

export function showError(msg, persistent = false) {
    const errorBar = DOM.$('errorBar');
    const errorMsg = DOM.$('errorMsg');
    if (!errorBar) return console.warn(msg);
    errorMsg.textContent = msg;
    errorBar.style.display = 'flex';
    if (!persistent) setTimeout(() => { try { errorBar.style.display = 'none'; } catch (_) { } }, 6000);
}

/* file icons */
export function iconForExt(ext, kind) {
    if (kind === 'directory') return '📁';
    const m = {
        'mp4': '🎬', 'mkv': '🎬', 'webm': '🎬',
        'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
        'pdf': '📕', 'zip': '🗜️', 'rar': '🗜️',
        'html': '🌐', 'htm': '🌐',
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'bmp': '🖼️',
        'txt': '📝', 'md': '📝', 'log': '📝',
        'js': '📄', 'json': '📄', 'css': '🎨'
    };
    return m[ext] || '📄';
}

/* comparator */
export function makeComparator(by, dir) {
    return (a, b) => {
        let va = null, vb = null;
        if (by === 'name') { va = a.nameLower || a.name.toLowerCase(); vb = b.nameLower || b.name.toLowerCase(); }
        else if (by === 'ext') { va = (a.ext || '').toLowerCase(); vb = (b.ext || '').toLowerCase(); }
        else if (by === 'size') { va = (typeof a.size === 'number') ? a.size : -1; vb = (typeof b.size === 'number') ? b.size : -1; }
        else if (by === 'date') { va = a.mtime || 0; vb = b.mtime || 0; }
        if (a.kind !== b.kind) {
            if (a.kind === 'directory') return -1;
            if (b.kind === 'directory') return 1;
        }
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        const na = a.name.toLowerCase(), nb = b.name.toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
    };
}

/* IDB restore helper (robust) */
export async function tryRestoreHandle(key) {
    try {
        const h = await idbGet(key).catch(() => null);
        if (!h) return null;
        if (typeof h.entries !== 'function' && typeof h.kind === 'undefined') {
            await idbDelete(key);
            return null;
        }
        try {
            if (typeof h.entries === 'function') {
                for await (const _ of h.entries()) {
                    break;
                }
            }
        } catch (e) {
            await idbDelete(key);
            return null;
        }
        return h;
    } catch (e) {
        try { await idbDelete(key); } catch (_) { }
        return null;
    }
}
