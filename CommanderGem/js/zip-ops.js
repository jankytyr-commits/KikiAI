/* zip-ops.js */
import { extOf } from './utils.js';

/* ===== JSZip runtime loader ===== */
export async function ensureJSZip() {
    if (typeof JSZip !== 'undefined') {
        window.__MC_JSZIP_AVAILABLE = true;
        console.log('JSZip: found global, version=', JSZip.version || '(unknown)');
        return;
    }
    const tryLoad = (src) => new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = () => { console.log('Loaded script', src); res(true); };
        s.onerror = (e) => { console.warn('Failed to load', src); rej(e); };
        document.head.appendChild(s);
    });

    const localCandidates = ['./jszip.min.js', './libs/jszip.min.js', './vendor/jszip.min.js'];
    for (const p of localCandidates) {
        try {
            await tryLoad(p);
            if (typeof JSZip !== 'undefined') { window.__MC_JSZIP_AVAILABLE = true; return; }
        } catch (_) { }
    }

    const cdn = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    try {
        await tryLoad(cdn);
        if (typeof JSZip === 'undefined') throw new Error('JSZip still undefined after CDN load');
        window.__MC_JSZIP_AVAILABLE = true;
    } catch (err) {
        console.error('Unable to load JSZip from local candidates or CDN. ZIP functionality will be disabled.', err);
        window.__MC_JSZIP_AVAILABLE = false;
    }
}

/* ===== ZIP helpers ===== */
export function isZipNode(n) { return n && n.kind === 'zip' && n.zipObj; }

export async function createZipNodeFromFileHandle(fileHandle) {
    if (typeof JSZip === 'undefined' || window.__MC_JSZIP_AVAILABLE === false) {
        throw new Error('JSZip není dostupný. Zkontroluj, že jszip.min.js je načtený.');
    }
    const f = await fileHandle.getFile();
    const zipObj = await JSZip.loadAsync(f);
    return { kind: 'zip', name: f.name, zipObj, path: '' };
}

export function listZipEntriesAt(zipObj, path) {
    const normalizedPath = path ? (path.endsWith('/') ? path : path + '/') : '';
    const files = Object.keys(zipObj.files);
    const map = new Map();
    for (const full of files) {
        if (normalizedPath) {
            if (!full.startsWith(normalizedPath)) continue;
            const rest = full.slice(normalizedPath.length);
            if (rest === '') continue;
            const firstSeg = rest.split('/')[0];
            if (rest.indexOf('/') === -1) {
                const entry = zipObj.files[normalizedPath + firstSeg];
                map.set(firstSeg, { name: firstSeg, kind: entry.dir ? 'directory' : 'file', size: entry.dir ? null : (entry._data && entry._data.uncompressedSize ? entry._data.uncompressedSize : null), mtime: null, zipPath: normalizedPath + firstSeg });
            } else {
                map.set(firstSeg, { name: firstSeg, kind: 'directory', size: null, mtime: null, zipPath: normalizedPath + firstSeg + '/' });
            }
        } else {
            const rest = full;
            const firstSeg = rest.split('/')[0];
            if (rest.indexOf('/') === -1) {
                const entry = zipObj.files[firstSeg];
                map.set(firstSeg, { name: firstSeg, kind: entry.dir ? 'directory' : 'file', size: entry.dir ? null : (entry._data && entry._data.uncompressedSize ? entry._data.uncompressedSize : null), mtime: null, zipPath: firstSeg });
            } else {
                map.set(firstSeg, { name: firstSeg, kind: 'directory', size: null, mtime: null, zipPath: firstSeg + '/' });
            }
        }
    }
    return Array.from(map.values()).map(it => { it.nameLower = it.name.toLowerCase(); it.ext = extOf(it.name); return it; });
}
