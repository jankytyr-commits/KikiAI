/* virtual-fs.js — Adapter for FileList to FileSystemHandle interface */

class VirtualFileHandle {
    constructor(file) {
        this.kind = 'file';
        this.name = file.name;
        this._file = file;
    }

    async getFile() {
        return this._file;
    }

    async createWritable() {
        throw new Error('Zápis není v HTTP fallback režimu podporován (Read-only).');
    }
}

class VirtualDirectoryHandle {
    constructor(name) {
        this.kind = 'directory';
        this.name = name;
        this._children = new Map(); // name -> Handle
    }

    async getFileHandle(name, options) {
        if (options && options.create) throw new Error('Vytváření souborů není v HTTP fallback režimu podporováno.');
        const handle = this._children.get(name);
        if (!handle || handle.kind !== 'file') throw new Error(`Soubor '${name}' nenalezen.`);
        return handle;
    }

    async getDirectoryHandle(name, options) {
        if (options && options.create) throw new Error('Vytváření složek není v HTTP fallback režimu podporováno.');
        const handle = this._children.get(name);
        if (!handle || handle.kind !== 'directory') throw new Error(`Složka '${name}' nenalezena.`);
        return handle;
    }

    async *entries() {
        for (const [name, handle] of this._children) {
            yield [name, handle];
        }
    }

    // Helper to add child
    _addChild(handle) {
        this._children.set(handle.name, handle);
    }
}

/**
 * Converts a FileList (from <input type="file" webkitdirectory>) into a VirtualDirectoryHandle root.
 * @param {FileList} fileList 
 * @returns {VirtualDirectoryHandle}
 */
function createVirtualRoot(fileList) {
    if (!fileList || fileList.length === 0) return new VirtualDirectoryHandle('root');

    // Find common prefix to name the root correctly if possible, or just use 'root'
    // webkitRelativePath looks like "Folder/Subfolder/file.txt"
    // We want the top-level folder name.

    let rootName = 'root';
    if (fileList[0].webkitRelativePath) {
        const parts = fileList[0].webkitRelativePath.split('/');
        if (parts.length > 0) rootName = parts[0];
    }

    const root = new VirtualDirectoryHandle(rootName);

    for (const file of fileList) {
        const path = file.webkitRelativePath; // e.g. "MyFolder/sub/file.txt"
        if (!path) continue;

        const parts = path.split('/');
        // parts[0] is the root folder name, which we already have as 'root' object (conceptually)
        // So we iterate from parts[1] to parts[length-2] for directories

        let currentDir = root;

        // Skip the first part (root name) and the last part (filename)
        for (let i = 1; i < parts.length - 1; i++) {
            const part = parts[i];
            let nextDir = currentDir._children.get(part);
            if (!nextDir) {
                nextDir = new VirtualDirectoryHandle(part);
                currentDir._addChild(nextDir);
            }
            currentDir = nextDir;
        }

        // Last part is the file
        const fileName = parts[parts.length - 1];
        const fileHandle = new VirtualFileHandle(file);
        currentDir._addChild(fileHandle);
    }

    return root;
}
/* main.js — kompletní soubor
   Kikimmander — File System Access, ZIP hybrid, viewer, search, CRUD
   - Robustní JSZip loader (lokální candidates -> CDN)
   - Podpora ZIP jako virtuální složka (opravena: ZIP se otevře jako adresář)
   - Stabilní refresh panelů, viewer, save/saveAs, drop, drag, search
*/

/* ===== JSZip runtime loader - začátek =====
   Pokusí se najít JSZip v globálu, pak lokální cesty, nakonec CDN.
   Po dokončení nastaví window.__MC_JSZIP_AVAILABLE = true/false.
*/
(async function ensureJSZip() {
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
})();
/* ===== JSZip runtime loader - konec ===== */


/* ===== Helpers & state ===== */
const $ = id => document.getElementById(id);

/* App state */
let leftHandle = null, rightHandle = null;
let leftCurrent = null, rightCurrent = null;
let leftStack = [], rightStack = [];
let selectedLeft = new Set(), selectedRight = new Set();
let activePanel = 'left';
let editorFileHandle = null;
let editorBlobUrl = null;
let basePathPrefixVal = '';

/* Sorting */
let leftSort = { by: 'name', dir: 1 };
let rightSort = { by: 'name', dir: 1 };

/* Constants */
const DB_NAME = 'mini-commander', DB_STORE = 'handles';
const TEXT_EXTS = new Set([
    'txt', 'md', 'markdown', 'json', 'js', 'ts', 'css', 'gitignore', 'py', 'java', 'cs', 'csproj', 'sln', 'vb', 'c', 'cpp', 'h', 'hpp',
    'rb', 'php', 'sh', 'bat', 'cmd', 'ps1', 'csv', 'log', 'xml', 'xsd', 'xsl', 'html', 'htm', 'yaml', 'yml', 'ini', 'cfg', 'config',
    'gradle', 'properties', 'dockerfile', 'toml', 'makefile', 'mk', 'props', 'targets', 'cshtml', 'aspx', 'sql', 'pyw',
    'jsx', 'tsx', 'erl', 'ex', 'exs', 'clj', 'cljc', 'scala', 'kt', 'kts', 'xaml']);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif', 'tiff', 'tif', 'svg']);
const SEARCH_RESULTS_CAP = 2000;
const MAX_READ_BYTES = 5 * 1024 * 1024;
const BIG_FILE_THRESHOLD = 5 * 1024 * 1024;

/* DOM refs */
const leftList = $('leftList'), rightList = $('rightList');
const leftPath = $('leftPath'), rightPath = $('rightPath');

const editorModal = $('editorModal'), editorArea = $('editorArea'), editorImage = $('editorImage');
const editorFilename = $('editorFilename'), editorPath = $('editorPath'), viewerPathEl = $('viewerPath');

const searchInput = $('searchInput'), searchRecursive = $('searchRecursive'), searchTextOnly = $('searchTextOnly');
const searchLeft = $('searchLeft'), searchRight = $('searchRight'), searchCancel = $('searchCancel');
const resultsPanel = $('resultsPanel'), resultsList = $('resultsList'), resultsSummary = $('resultsSummary'), resultsHide = $('resultsHide'), resultsClear = $('resultsClear');

const errorBar = $('errorBar'), errorMsg = $('errorMsg');
const toggleFullBtn = $('toggleFull'), saveFileBtn = $('saveFile'), saveAsBtn = $('saveAsFile'), downloadBtn = $('downloadFile');
const viewAsTextBtn = $('viewAsText'); // optional
const extractToBtn = $('extractTo'); // optional

const leftNewFileBtn = $('leftNewFile'), leftNewDirBtn = $('leftNewDir');
const rightNewFileBtn = $('rightNewFile'), rightNewDirBtn = $('rightNewDir');

/* IDB helpers */
function openDB() { return new Promise((res, rej) => { const r = indexedDB.open(DB_NAME, 1); r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbSet(k, v) { const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }
async function idbGet(k) { const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction(DB_STORE, 'readonly'); const r = tx.objectStore(DB_STORE).get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbDelete(k) { const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).delete(k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }

/* small utils */
function formatBytes(b) { if (b == null) return ''; const u = ['B', 'KB', 'MB', 'GB']; let i = 0, n = b; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return (i ? n.toFixed(1) : Math.floor(n)) + ' ' + u[i]; }
function extOf(name) { const m = /(?:\.([^.]+))?$/.exec(name); return (m && m[1]) ? m[1].toLowerCase() : ''; }
function nameWithoutExt(name) { const e = extOf(name); return e ? name.slice(0, -(e.length + 1)) : name; }
function fmtDate(ts) { if (!ts) return ''; try { const d = new Date(ts); return d.toLocaleString(); } catch (e) { return ''; } }
function showError(msg, persistent = false) { if (!errorBar) return console.warn(msg); errorMsg.textContent = msg; errorBar.style.display = 'flex'; if (!persistent) setTimeout(() => { try { errorBar.style.display = 'none'; } catch (_) { } }, 6000); }

/* revoke blob */
function revokeEditorBlob() { if (editorBlobUrl) { try { URL.revokeObjectURL(editorBlobUrl); } catch (_) { } editorBlobUrl = null; } }

/* file icons */
function iconForExt(ext, kind) {
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
function makeComparator(by, dir) {
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

/* ===== IDB restore helper (robust) ===== */
async function tryRestoreHandle(key) {
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

/* ===== ZIP helpers ===== */
function isZipNode(n) { return n && n.kind === 'zip' && n.zipObj; }

async function createZipNodeFromFileHandle(fileHandle) {
    if (typeof JSZip === 'undefined' || window.__MC_JSZIP_AVAILABLE === false) {
        throw new Error('JSZip není dostupný. Zkontroluj, že jszip.min.js je načtený.');
    }
    const f = await fileHandle.getFile();
    const zipObj = await JSZip.loadAsync(f);
    return { kind: 'zip', name: f.name, zipObj, path: '' };
}

function listZipEntriesAt(zipObj, path) {
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

/* ===== PANEL rendering (FS dirs & ZIP nodes) ===== */
async function refreshPanel(panel) {
    const container = panel === 'left' ? leftList : rightList;
    const cur = panel === 'left' ? leftCurrent : rightCurrent;
    const stack = panel === 'left' ? leftStack : rightStack;
    if (!container) return;

    const prevScroll = container.scrollTop || 0;

    const header = document.createElement('div'); header.className = 'header';
    header.innerHTML = `
    <div class="col icon" style="flex:0 0 36px"></div>
    <div class="col name col-name" style="flex:1">Název <span class="dir"></span></div>
    <div class="col ext col-ext" style="flex:0 0 90px">Přípona <span class="dir"></span></div>
    <div class="col size col-size" style="flex:0 0 100px;text-align:right">Velikost <span class="dir"></span></div>
    <div class="col date col-date" style="flex:0 0 180px;text-align:right">Datum <span class="dir"></span></div>
  `;
    header.querySelector('.col-name').onclick = () => { toggleSort(panel, 'name'); };
    header.querySelector('.col-ext').onclick = () => { toggleSort(panel, 'ext'); };
    header.querySelector('.col-size').onclick = () => { toggleSort(panel, 'size'); };
    header.querySelector('.col-date').onclick = () => { toggleSort(panel, 'date'); };

    if (!cur) {
        const frag = document.createDocumentFragment();
        const es = document.createElement('div');
        es.className = 'flex flex-col items-center justify-center p-8 h-full';

        es.innerHTML = `
            <div class="glass-panel p-8 rounded-2xl flex flex-col items-center gap-6 max-w-sm w-full shadow-2xl border border-white/10 relative overflow-hidden group">
                <div class="absolute inset-0 bg-gradient-to-br from-cosmic-teal/5 to-cosmic-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                
                <div class="text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">📂</div>
                
                <div class="text-center relative z-10">
                    <h3 class="text-xl font-display text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-purple-200 mb-2">Vybrat kořenový adresář</h3>
                    <p class="text-sm text-gray-400 leading-relaxed">Pro procházení souborů nejprve zvolte složku.</p>
                </div>
                
                <div class="flex flex-col gap-3 w-full relative z-10">
                    <button id="btn-pick-${panel}" class="px-4 py-3 bg-cosmic-teal/10 hover:bg-cosmic-teal/20 border border-cosmic-teal/30 hover:border-cosmic-teal/60 rounded-xl text-cyan-100 transition-all font-medium flex items-center justify-center gap-2 group/btn shadow-[0_0_10px_rgba(45,212,191,0.1)] hover:shadow-[0_0_20px_rgba(45,212,191,0.25)]">
                        <span>✨</span> Vybrat adresář
                    </button>
                </div>
            </div>
        `;

        const btnPick = es.querySelector(`#btn-pick-${panel}`);
        if (btnPick) btnPick.onclick = () => pickFor(panel);

        // Fallback for HTTP or missing API
        if (!('showDirectoryPicker' in window) || !window.isSecureContext) {
            const btnContainer = es.querySelector('.flex.flex-col');

            const fallbackBtn = document.createElement('button');
            fallbackBtn.className = 'px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-gray-400 hover:text-gray-200 transition-all text-sm flex flex-col items-center justify-center gap-1';
            fallbackBtn.innerHTML = `
                <div class="flex items-center gap-2"><span class="text-xs">🔧</span> Vybrat (Legacy)</div>
                <div class="text-[10px] opacity-40">Pro starší prohlížeče / HTTP</div>
            `;

            fallbackBtn.onclick = () => {
                const input = document.createElement('input');
                input.type = 'file'; input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.onchange = async () => {
                    if (input.files && input.files.length > 0) {
                        const root = createVirtualRoot(input.files);
                        if (panel === 'left') { leftHandle = root; leftCurrent = root; leftStack = [root]; selectedLeft.clear(); }
                        else { rightHandle = root; rightCurrent = root; rightStack = [root]; selectedRight.clear(); }
                        await refreshPanel(panel);
                    }
                    input.remove();
                };
                input.click();
            };

            if (btnContainer) btnContainer.appendChild(fallbackBtn);

            // Update main button to warn if clicked (though user should use fallback)
            if (btnPick) {
                if (!window.isSecureContext) {
                    btnPick.classList.add('opacity-50', 'cursor-not-allowed');
                    btnPick.title = 'Vyžaduje HTTPS context';
                    // We don't disable it completely to let the click handler show the alert, 
                    // or better, we override onclick to explain.
                    btnPick.onclick = () => alert('File System Access API vyžaduje zabezpečené připojení (HTTPS). Použijte prosím tlačítko "Vybrat (Legacy)".');
                }
            }
        }

        frag.appendChild(es);
        container.replaceChildren(header, frag);
        try { container.scrollTop = Math.min(prevScroll, Math.max(0, container.scrollHeight - container.clientHeight)); } catch (_) { }
        return;
    }

    try { (panel === 'left' ? leftPath : rightPath).textContent = stack.map(h => h && h.name ? h.name : '<root>').join('/'); } catch (e) { }

    const items = [];
    const skipped = [];

    try {
        if (isZipNode(cur)) {
            const zipItems = listZipEntriesAt(cur.zipObj, cur.path);
            for (const it of zipItems) items.push({ name: it.name, nameLower: it.nameLower, kind: it.kind, size: it.size, mtime: it.mtime, ext: it.ext, zipPath: it.zipPath, zipObj: cur.zipObj });
        } else {
            for await (const [name, handle] of cur.entries()) {
                try {
                    const kind = handle.kind;
                    let size = null, mtime = null;
                    if (kind === 'file') {
                        try { const f = await handle.getFile(); size = typeof f.size === 'number' ? f.size : null; mtime = f.lastModified || null; } catch (_) { }
                    }
                    const extv = extOf(name);
                    items.push({ name, nameLower: name.toLowerCase(), handle, kind, size, mtime, ext: extv });
                } catch (e) { skipped.push(name); }
            }
        }
    } catch (e) {
        showError('Adresář nelze načíst (práva / odstraněn). Otevři kořen znovu.', true);
        if (panel === 'left') { leftCurrent = null; leftStack = []; idbDelete('leftRoot').catch(() => { }); } else { rightCurrent = null; rightStack = []; idbDelete('rightRoot').catch(() => { }); }
        await refreshPanel(panel);
        return;
    }

    const sortState = panel === 'left' ? leftSort : rightSort;
    Array.from(header.querySelectorAll('.dir')).forEach(el => el.textContent = '');
    const dirMap = { name: '.col-name .dir', ext: '.col-ext .dir', size: '.col-size .dir', date: '.col-date .dir' };
    const sel = header.querySelector(dirMap[sortState.by]);
    if (sel) sel.textContent = sortState.dir === 1 ? '▲' : '▼';

    items.sort(makeComparator(sortState.by, sortState.dir));

    const frag = document.createDocumentFragment();

    // up / pick
    (() => {
        const topRow = document.createElement('div'); topRow.className = 'entry parent';
        const icon = document.createElement('div'); icon.className = 'icon'; icon.textContent = '⬆️';
        const nm = document.createElement('div'); nm.className = 'name'; nm.textContent = '..';
        const ext = document.createElement('div'); ext.className = 'ext'; ext.textContent = '';
        const sz = document.createElement('div'); sz.className = 'size'; sz.textContent = '';
        const dt = document.createElement('div'); dt.className = 'date'; dt.textContent = '';
        topRow.appendChild(icon); topRow.appendChild(nm); topRow.appendChild(ext); topRow.appendChild(sz); topRow.appendChild(dt);
        topRow.addEventListener('click', () => {
            if (stack && stack.length > 1) {
                stack.pop();
                const newTop = stack[stack.length - 1];
                if (panel === 'left') { leftCurrent = newTop; leftStack = stack.slice(); selectedLeft.clear(); } else { rightCurrent = newTop; rightStack = stack.slice(); selectedRight.clear(); }
                refreshPanel(panel);
            } else {
                pickFor(panel);
            }
        });
        frag.appendChild(topRow);
    })();

    // click/dblclick handling (single click selection, dblclick open)
    let clickTimer = null;
    let lastClickInfo = null;
    function scheduleSingleClickAction(info) {
        if (clickTimer) clearTimeout(clickTimer);
        lastClickInfo = info;
        clickTimer = setTimeout(() => {
            try {
                const { panel, it } = lastClickInfo;
                const selSet = panel === 'left' ? selectedLeft : selectedRight;
                selSet.clear(); selSet.add(it.name);
                refreshPanel(panel);
            } catch (e) { console.warn('single-click action failed', e); }
            clickTimer = null; lastClickInfo = null;
        }, 250);
    }

    for (const it of items) {
        const row = document.createElement('div'); row.className = 'entry';
        if ((panel === 'left' && selectedLeft.has(it.name)) || (panel === 'right' && selectedRight.has(it.name))) row.classList.add('selected');

        const ic = document.createElement('div'); ic.className = 'icon'; ic.textContent = iconForExt(it.ext, it.kind);
        const nmEl = document.createElement('div'); nmEl.className = 'name'; nmEl.textContent = nameWithoutExt(it.name);
        const extEl = document.createElement('div'); extEl.className = 'ext'; extEl.textContent = it.ext || '';
        const szEl = document.createElement('div'); szEl.className = 'size'; szEl.textContent = it.size != null ? formatBytes(it.size) : '';
        const dtEl = document.createElement('div'); dtEl.className = 'date'; dtEl.textContent = it.mtime ? fmtDate(it.mtime) : '';

        row.appendChild(ic); row.appendChild(nmEl); row.appendChild(extEl); row.appendChild(szEl); row.appendChild(dtEl);

        if (it.kind === 'file' && typeof it.size === 'number' && it.size > BIG_FILE_THRESHOLD) {
            const b = document.createElement('span'); b.className = 'badge-large'; b.textContent = '>' + Math.round(BIG_FILE_THRESHOLD / 1024) + ' KB';
            szEl.appendChild(b);
        }

        row.__entry = it;

        row.addEventListener('click', (ev) => {
            try {
                activePanel = panel;
                const ctrl = ev.ctrlKey || ev.metaKey, shift = ev.shiftKey;
                const names = items.map(x => x.name);
                const selSet = panel === 'left' ? selectedLeft : selectedRight;

                if (ctrl) {
                    if (selSet.has(it.name)) selSet.delete(it.name); else selSet.add(it.name);
                    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; lastClickInfo = null; }
                    refreshPanel(panel);
                    return;
                }
                if (shift) {
                    const last = Array.from(selSet).pop();
                    const i1 = last ? names.indexOf(last) : 0;
                    const i2 = names.indexOf(it.name);
                    const from = Math.min(Math.max(i1, 0), i2), to = Math.max(i1, i2);
                    selSet.clear();
                    for (let k = from; k <= to; k++) selSet.add(names[k]);
                    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; lastClickInfo = null; }
                    refreshPanel(panel);
                    return;
                }

                scheduleSingleClickAction({ panel, it });
            } catch (e) { console.warn('click handler failed', e); }
        });

        row.addEventListener('dblclick', async (ev) => {
            try { if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; lastClickInfo = null; } } catch (_) { }
            ev.preventDefault(); ev.stopPropagation();
            activePanel = panel;
            if (it.kind === 'directory') {
                if (isZipNode(cur)) {
                    const newNode = { kind: 'zip', name: cur.name + ':' + it.name, zipObj: cur.zipObj, path: (cur.path ? (cur.path.endsWith('/') ? cur.path + it.name + '/' : cur.path + it.name + '/') : (it.name + '/')) };
                    if (panel === 'left') { leftStack.push(newNode); leftCurrent = newNode; selectedLeft.clear(); } else { rightStack.push(newNode); rightCurrent = newNode; selectedRight.clear(); }
                    refreshPanel(panel);
                } else {
                    if (panel === 'left') { leftStack = leftStack && leftStack.length ? leftStack : (leftHandle ? [leftHandle] : []); leftStack.push(it.handle); leftCurrent = it.handle; selectedLeft.clear(); }
                    else { rightStack = rightStack && rightStack.length ? rightStack : (rightHandle ? [rightHandle] : []); rightStack.push(it.handle); rightCurrent = it.handle; selectedRight.clear(); }
                    refreshPanel(panel);
                }
            } else {
                // file: open (openFile will now intercept ZIP file handles and open as zip node)
                if (isZipNode(cur)) {
                    const zipEntryPath = it.zipPath;
                    const zipEntryRef = { kind: 'zip-entry', zipObj: cur.zipObj, zipPath: zipEntryPath, name: it.name, size: it.size };
                    openFile(zipEntryRef);
                } else {
                    openFile(it.handle);
                }
            }
        });

        row.addEventListener('contextmenu', ev => { ev.preventDefault(); multiAwareContextMenu(panel, it.name, it); });

        // dragstart
        row.draggable = true;
        row.addEventListener('dragstart', e => {
            activePanel = panel;
            const token = Math.random().toString(36).slice(2);
            try { e.dataTransfer.setData('application/x-mini-commander', token); } catch (_) { }
            window.__drag = window.__drag || new Map();
            const payload = isZipNode(cur) ? { panel, name: it.name, zipEntry: { zipObj: cur.zipObj, zipPath: it.zipPath } } : { panel, name: it.name, handle: it.handle };
            window.__drag.set(token, payload);
            e.dataTransfer.effectAllowed = 'copyMove';
        });

        frag.appendChild(row);
    }

    if (items.length === 0) {
        const es = document.createElement('div'); es.className = 'emptystate';
        es.style.margin = '8px';
        es.innerHTML = `<div class="title">Prázdné</div><div class="note">Zkus vybrat jiný kořen nebo vytvořit soubor.</div>`;
        const btn = document.createElement('button'); btn.textContent = 'Vybrat adresář'; btn.onclick = () => pickFor(panel);
        es.appendChild(btn);
        frag.appendChild(es);
    }

    if (skipped.length) showError('Některé položky nelze číst (přeskočeno ' + skipped.length + ')', true);

    container.replaceChildren(header, frag);

    try {
        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        container.scrollTop = Math.min(prevScroll, maxScroll);
    } catch (_) { }
}

/* toggle sort */
async function toggleSort(panel, by) {
    const s = panel === 'left' ? leftSort : rightSort;
    if (s.by === by) s.dir = -s.dir; else { s.by = by; s.dir = 1; }
    try { await idbSet(panel + 'Sort', s); } catch (e) { console.warn('persist sort failed', e); }
    refreshPanel(panel);
}

/* attach drop handlers */
function attachDropHandlers(container, panel) {
    if (!container) return;
    container.ondragover = ev => {
        try {
            if (ev.dataTransfer && ev.dataTransfer.types && (Array.from(ev.dataTransfer.types).includes('Files') || Array.from(ev.dataTransfer.types).includes('application/x-mini-commander'))) {
                ev.preventDefault();
                container.classList.add('droptarget');
                ev.dataTransfer.dropEffect = ev.shiftKey ? 'move' : 'copy';
            }
        } catch (_) { }
    };
    container.ondragleave = () => container.classList.remove('droptarget');
    container.ondrop = async ev => {
        ev.preventDefault(); container.classList.remove('droptarget');
        const targetCur = panel === 'left' ? leftCurrent : rightCurrent;
        if (!targetCur) { alert('Nejdřív otevřete cílový panel.'); return; }
        try {
            if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length) {
                await ensureRW(targetCur);
                for (const f of ev.dataTransfer.files) {
                    const fh = await targetCur.getFileHandle(f.name, { create: true });
                    const w = await fh.createWritable(); await w.write(await f.arrayBuffer()); await w.close();
                }
                await refreshPanel(panel);
                return;
            }
            let token = null;
            try { token = ev.dataTransfer.getData('application/x-mini-commander'); } catch (_) { }
            const drag = token && window.__drag && window.__drag.get(token);
            if (drag) {
                if (drag.zipEntry) {
                    await ensureRW(targetCur);
                    const entry = drag.zipEntry.zipObj.file(drag.zipEntry.zipPath);
                    if (entry) {
                        const arr = await entry.async('arraybuffer');
                        const name = drag.name;
                        const fh = await targetCur.getFileHandle(name, { create: true });
                        const w = await fh.createWritable(); await w.write(arr); await w.close();
                        await refreshPanel(panel);
                        return;
                    }
                }
                if (drag.handle) {
                    if (ev.shiftKey) await moveToOther(drag.panel, drag.name, drag.handle);
                    else await copyToOther(drag.panel, drag.name, drag.handle);
                    if (window.__drag) window.__drag.delete(token);
                    return;
                }
            }
        } catch (e) { showError('Import/drop failed: ' + (e && e.message ? e.message : e)); }
    };
}

/* ===== File ops ===== */
async function ensureRW(dir) {
    if (!dir) throw new Error('No handle');
    if (typeof dir.queryPermission === 'function') {
        const q = await dir.queryPermission({ mode: 'readwrite' }).catch(() => null);
        if (q === 'granted') return true;
    }
    if (typeof dir.requestPermission === 'function') {
        const r = await dir.requestPermission({ mode: 'readwrite' }).catch(() => null);
        if (r === 'granted') return true;
    }
    return true;
}

async function copyFileHandleToTarget(fileHandle, targetDir, name) {
    const f = await fileHandle.getFile();
    const th = await targetDir.getFileHandle(name, { create: true });
    const w = await th.createWritable();
    await w.write(await f.arrayBuffer());
    await w.close();
}

async function copyDirRecursive(srcDir, targetParent, newName) {
    await ensureRW(targetParent);
    const dest = await targetParent.getDirectoryHandle(newName, { create: true });
    for await (const [n, h] of srcDir.entries()) {
        try {
            if (h.kind === 'file') await copyFileHandleToTarget(h, dest, n);
            else await copyDirRecursive(h, dest, n);
        } catch (e) { console.warn('copy skip', n, e); }
    }
}

/* copyToOther supports zip entries */
async function copyToOther(fromPanel, name, handle) {
    const target = fromPanel === 'left' ? rightCurrent : leftCurrent;
    if (!target) return alert('Cílový panel není otevřen');
    try {
        await ensureRW(target);
        if (handle.kind === 'file') {
            await copyFileHandleToTarget(handle, target, name);
        } else if (handle.kind === 'zip-entry' || handle.zipPath) {
            const zipEntry = handle.zipObj.file(handle.zipPath);
            if (zipEntry) {
                const arr = await zipEntry.async('arraybuffer');
                const fh = await target.getFileHandle(name, { create: true });
                const w = await fh.createWritable(); await w.write(arr); await w.close();
            }
        } else if (handle.kind === 'directory') {
            if (handle.zipPath && handle.zipObj) {
                await copyZipDirToFs(handle.zipObj, handle.zipPath, target);
            } else {
                await copyDirRecursive(handle, target, name);
            }
        }
        await refreshAll();
    } catch (e) { showError('Chyba kopírování: ' + (e && e.message ? e.message : e)); }
}

async function copyZipDirToFs(zipObj, zipDirPath, targetDir) {
    const segs = zipDirPath.replace(/\/$/, '').split('/');
    const dirName = segs[segs.length - 1];
    const dest = await targetDir.getDirectoryHandle(dirName, { create: true });
    for (const k of Object.keys(zipObj.files)) {
        if (k.startsWith(zipDirPath) && !k.endsWith('/')) {
            const rel = k.slice(zipDirPath.length);
            if (rel.indexOf('/') === -1) {
                const arr = await (zipObj.file(k)).async('arraybuffer');
                const fh = await dest.getFileHandle(rel, { create: true });
                const w = await fh.createWritable(); await w.write(arr); await w.close();
            } else {
                const parts = rel.split('/');
                let current = dest;
                for (let i = 0; i < parts.length - 1; i++) {
                    current = await current.getDirectoryHandle(parts[i], { create: true });
                }
                const fname = parts[parts.length - 1];
                const arr = await (zipObj.file(k)).async('arraybuffer');
                const fh = await current.getFileHandle(fname, { create: true });
                const w = await fh.createWritable(); await w.write(arr); await w.close();
            }
        }
    }
}

/* moveToOther */
async function moveToOther(fromPanel, name, handle) {
    const src = fromPanel === 'left' ? leftCurrent : rightCurrent;
    const target = fromPanel === 'left' ? rightCurrent : leftCurrent;
    if (!src || !target) return alert('Panely nejsou připravené');
    try {
        await ensureRW(target);
        if (handle.kind === 'file') {
            await copyFileHandleToTarget(handle, target, name);
            if ('removeEntry' in src) await src.removeEntry(name);
        } else if (handle.kind === 'zip-entry' || handle.zipPath) {
            const zipEntry = handle.zipObj.file(handle.zipPath);
            if (zipEntry) {
                const arr = await zipEntry.async('arraybuffer');
                const fh = await target.getFileHandle(name, { create: true });
                const w = await fh.createWritable(); await w.write(arr); await w.close();
            }
        } else {
            if (handle.zipPath && handle.zipObj) {
                await copyZipDirToFs(handle.zipObj, handle.zipPath, target);
            } else {
                await copyDirRecursive(handle, target, name);
                if ('removeEntry' in src) await src.removeEntry(name, { recursive: true });
            }
        }
        await refreshAll();
    } catch (e) { showError('Chyba přesunu: ' + (e && e.message ? e.message : e)); }
}

/* deleteEntry */
async function deleteEntry(panel, name) {
    const cur = panel === 'left' ? leftCurrent : rightCurrent;
    if (!cur) return;
    if (!confirm(`Opravdu chcete smazat '${name}'? (Ano/Ne)`)) return;
    try {
        if (isZipNode(cur)) {
            alert('Mazání uvnitř ZIP není podporováno.');
            return;
        }
        if ('removeEntry' in cur) await cur.removeEntry(name, { recursive: true });
        await refreshPanel(panel);
    } catch (e) { showError('Chyba mazání: ' + (e && e.message ? e.message : e)); }
}

/* getHandleByName supports zip */
async function getHandleByName(panel, name) {
    const cur = panel === 'left' ? leftCurrent : rightCurrent;
    if (!cur) throw new Error('no current dir');
    if (isZipNode(cur)) {
        const entries = listZipEntriesAt(cur.zipObj, cur.path);
        const found = entries.find(e => e.name === name);
        if (found) return { kind: found.kind, zipPath: found.zipPath, zipObj: cur.zipObj, name: found.name, size: found.size };
        throw new Error('not found in zip');
    }
    try {
        const fh = await cur.getFileHandle(name).catch(() => null);
        if (fh) return fh;
        const dh = await cur.getDirectoryHandle(name).catch(() => null);
        if (dh) return dh;
        for await (const [n, h] of cur.entries()) {
            if (n === name) return h;
        }
        throw new Error('not found');
    } catch (e) { throw e; }
}

/* enterDir */
function enterDir(panel, name, handle) {
    if (panel === 'left') {
        if (!leftStack || leftStack.length === 0) { if (leftHandle) leftStack = [leftHandle]; else leftStack = []; }
        leftStack.push(handle); leftCurrent = handle; selectedLeft.clear();
    } else {
        if (!rightStack || rightStack.length === 0) { if (rightHandle) rightStack = [rightHandle]; else rightStack = []; }
        rightStack.push(handle); rightCurrent = handle; selectedRight.clear();
    }
    refreshPanel(panel);
}

/* ===== Viewer helpers ===== */
function formatXml(xml) {
    const PADDING = '  ';
    const reg = /(>)(<)(\/*)/g;
    let formatted = '';
    let pad = 0;
    xml = xml.replace(reg, '$1\n$2$3');
    xml.split('\n').forEach(node => {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (node.match(/^<\/\w/)) {
            if (pad !== 0) pad -= 1;
        } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
            indent = 1;
        }
        formatted += PADDING.repeat(pad) + node + '\n';
        pad += indent;
    });
    return formatted.trim();
}

async function showBinaryViewFromFile(file, initialEncoding = 'utf-8') {
    try {
        const arr = await file.arrayBuffer();
        const bytes = new Uint8Array(arr);
        const encSelector = createOrGetEncodingSelector();
        encSelector.value = initialEncoding;
        function render(enc) {
            try {
                if (enc === 'utf-8') {
                    const dec = new TextDecoder('utf-8', { fatal: false });
                    editorArea.value = dec.decode(arr);
                } else if (enc === 'windows-1250') {
                    const dec = new TextDecoder('windows-1250', { fatal: false });
                    editorArea.value = dec.decode(arr);
                } else if (enc === 'iso-8859-2') {
                    const dec = new TextDecoder('iso-8859-2', { fatal: false });
                    editorArea.value = dec.decode(arr);
                } else if (enc === 'ascii') {
                    let s = '';
                    for (let i = 0; i < bytes.length; i++) { const b = bytes[i]; s += (b <= 0x7f) ? String.fromCharCode(b) : '.'; }
                    editorArea.value = s;
                } else if (enc === 'hex') {
                    let s = '';
                    for (let i = 0; i < bytes.length; i++) {
                        const hex = bytes[i].toString(16).padStart(2, '0').toUpperCase();
                        s += hex + ' ';
                        if ((i + 1) % 16 === 0) s += '\n';
                    }
                    editorArea.value = s;
                } else if (enc === 'binary') {
                    let s = '';
                    for (let i = 0; i < bytes.length; i++) {
                        const bin = bytes[i].toString(2).padStart(8, '0');
                        s += bin + ' ';
                        if ((i + 1) % 8 === 0) s += '\n';
                    }
                    editorArea.value = s;
                } else if (enc === 'json') {
                    const dec = new TextDecoder('utf-8');
                    const txt = dec.decode(arr);
                    try {
                        const parsed = JSON.parse(txt);
                        editorArea.value = JSON.stringify(parsed, null, 2);
                    } catch (e) {
                        editorArea.value = '[Neplatný JSON]\n' + txt;
                    }
                } else if (enc === 'xml') {
                    const dec = new TextDecoder('utf-8');
                    const txt = dec.decode(arr);
                    editorArea.value = formatXml(txt);
                } else if (enc === 'html') {
                    const dec = new TextDecoder('utf-8');
                    const txt = dec.decode(arr);
                    editorArea.value = formatXml(txt);
                } else {
                    editorArea.value = '[Nepodporované kódování]';
                }
                editorArea.style.display = 'block';
            } catch (e) {
                editorArea.value = '[Chyba při zobrazení: ' + e.message + ']';
                editorArea.style.display = 'block';
            }
        }
        encSelector.onchange = () => render(encSelector.value);
        render(initialEncoding);
        editorImage.style.display = 'none';
        viewerPathEl.style.display = 'block';
        editorModal.style.display = 'flex';
        if (saveFileBtn) saveFileBtn.style.display = 'inline-block';
    } catch (e) { console.error('showBinaryViewFromFile failed', e); showError('Nelze zobrazit binární/textový pohled.'); }
}

function createOrGetEncodingSelector() {
    try {
        const existing = document.getElementById('encodingSelector');
        if (existing) return existing;
        const sel = document.createElement('select');
        sel.id = 'encodingSelector';

        const opts = [
            { val: 'utf-8', txt: 'UTF-8' },
            { val: 'windows-1250', txt: 'Windows-1250 (CZ)' },
            { val: 'iso-8859-2', txt: 'ISO-8859-2 (Latin2)' },
            { val: 'ascii', txt: 'ASCII (7-bit)' },
            { val: 'hex', txt: 'Hex View' },
            { val: 'binary', txt: 'Binary View' },
            { val: 'json', txt: 'JSON (Formatted)' },
            { val: 'xml', txt: 'XML (Formatted)' },
            { val: 'html', txt: 'HTML (Formatted)' }
        ];

        opts.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.val;
            opt.textContent = o.txt;
            sel.appendChild(opt);
        });

        const closeBtn = document.getElementById('closeEditor');
        if (closeBtn && closeBtn.parentNode) {
            closeBtn.parentNode.insertBefore(sel, closeBtn);
            sel.style.marginRight = '8px';
        } else {
            if (viewerPathEl && viewerPathEl.parentNode) viewerPathEl.parentNode.insertBefore(sel, viewerPathEl.nextSibling);
            else (editorModal.querySelector('.card') || editorModal).appendChild(sel);
            sel.style.marginLeft = '10px';
        }
        return sel;
    } catch (e) { return document.getElementById('encodingSelector'); }
}

function removeEncodingSelector() { try { const s = document.getElementById('encodingSelector'); if (s) s.remove(); } catch (e) { } }

async function showTextView(file) {
    try {
        removeEncodingSelector();
        const txt = await file.text();
        editorArea.style.display = 'block';
        editorArea.value = txt;
        editorImage.style.display = 'none';
        viewerPathEl.style.display = 'block';
        editorModal.style.display = 'flex';
        if (saveFileBtn) saveFileBtn.style.display = 'inline-block';
    } catch (e) { console.error('showTextView failed', e); showError('Nelze načíst text.'); }
}

/* ===== openFile (FS handles and zip entries) ===== */
async function openFile(handleOrZipRef) {
    if (!handleOrZipRef) return;
    try {
        let f = null;
        let isZipEntry = false;

        // If it's a zip-entry already, handle as before
        if (handleOrZipRef.kind === 'zip-entry' || handleOrZipRef.zipPath) {
            isZipEntry = true;
            const zipEntry = handleOrZipRef.zipObj.file(handleOrZipRef.zipPath);
            if (!zipEntry) throw new Error('zip entry not found');
            const blob = await zipEntry.async('blob');
            f = blob;
            editorFileHandle = null;
            const virtualPath = (handleOrZipRef.zipObj && handleOrZipRef.zipObj.name) ? (handleOrZipRef.zipObj.name + ':' + handleOrZipRef.zipPath) : handleOrZipRef.zipPath;
            editorFilename.textContent = handleOrZipRef.name || handleOrZipRef.zipPath;
            editorPath.textContent = (basePathPrefixVal ? basePathPrefixVal + '/' : '') + virtualPath;
        } else if (typeof handleOrZipRef.getFile === 'function') {
            // It's a FileSystemFileHandle. IMPORTANT: if it's a .zip, open as virtual folder (ZIP node)
            const maybeFile = await handleOrZipRef.getFile();
            const maybeExt = extOf(maybeFile.name);
            const maybeType = (maybeFile.type || '').toLowerCase();
            if (maybeExt === 'zip' || (maybeType && maybeType.includes('zip'))) {
                // If JSZip is not available, show message and fallback to download
                if (typeof JSZip === 'undefined' || window.__MC_JSZIP_AVAILABLE === false) {
                    showError('JSZip není dostupný — ZIP nelze otevřít jako adresář. Použij "Stáhnout" nebo přidej jszip.min.js do projektu.', true);
                    // show informative modal with download option
                    editorFilename.textContent = maybeFile.name;
                    editorPath.textContent = (basePathPrefixVal ? basePathPrefixVal + '/' : '') + maybeFile.name;
                    editorArea.style.display = 'block';
                    editorArea.value = `[Soubor ZIP; JSZip není dostupný. Můžeš stáhnout (Stáhnout / Uložit jako).]\n${editorPath.textContent || ''}`;
                    viewerPathEl.style.display = 'block'; viewerPathEl.textContent = editorPath.textContent || '';
                    editorModal.style.display = 'flex';
                    editorBlobUrl = null;
                    if (saveFileBtn) saveFileBtn.style.display = 'none';
                    return;
                }
                // create zip node and enter it
                const zipNode = await createZipNodeFromFileHandle(handleOrZipRef);
                if (activePanel === 'left') {
                    leftStack = leftStack && leftStack.length ? leftStack : (leftHandle ? [leftHandle] : []);
                    leftStack.push(zipNode); leftCurrent = zipNode; selectedLeft.clear();
                } else {
                    rightStack = rightStack && rightStack.length ? rightStack : (rightHandle ? [rightHandle] : []);
                    rightStack.push(zipNode); rightCurrent = zipNode; selectedRight.clear();
                }
                await refreshPanel(activePanel);
                return;
            }
            // not a zip -> normal file
            f = maybeFile;
            editorFileHandle = handleOrZipRef;
            const stack = activePanel === 'left' ? leftStack : rightStack;
            const virtualPath = (stack && stack.length ? stack.map(h => h.name || '<root>').join('/') + '/' : '') + f.name;
            editorFilename.textContent = f.name;
            editorPath.textContent = (basePathPrefixVal ? basePathPrefixVal + '/' : '') + virtualPath;
        } else if (handleOrZipRef instanceof Blob) {
            f = handleOrZipRef;
            editorFileHandle = null;
            editorFilename.textContent = 'blob';
            editorPath.textContent = '';
        } else {
            console.warn('openFile: unsupported handle', handleOrZipRef);
            return;
        }

        // cleanup previous
        try {
            const oldMedia = document.getElementById('modalMediaEl'); if (oldMedia) { try { oldMedia.pause && oldMedia.pause(); } catch (_) { } oldMedia.remove(); }
            const oldPdf = document.getElementById('modalPdf'); if (oldPdf) oldPdf.remove();
            const oldObject = document.getElementById('modalObject'); if (oldObject) oldObject.remove();
            const oldOpenBtn = document.getElementById('openInTabBtn'); if (oldOpenBtn) oldOpenBtn.remove();
            removeEncodingSelector();
            editorImage.onload = null; editorImage.onerror = null;
            editorImage.src = '';
            editorImage.style.display = 'none';
            editorArea.style.display = 'none';
            revokeEditorBlob();
            if (viewAsTextBtn) { viewAsTextBtn.style.display = 'none'; viewAsTextBtn.onclick = null; viewAsTextBtn.textContent = ''; }
        } catch (e) { }

        const type = (f.type || '').toLowerCase();
        const name = (f.name) ? f.name : (handleOrZipRef.name || '');
        const ext = extOf(name);
        const isImage = type.startsWith('image/') || IMAGE_EXTS.has(ext);
        const isAudio = type.startsWith('audio/');
        const isVideo = type.startsWith('video/');
        const isPdf = type === 'application/pdf' || ext === 'pdf';
        const isHtml = type === 'text/html' || ext === 'html' || ext === 'htm';
        const isText = type.startsWith('text/') || TEXT_EXTS.has(ext) || ext === '';

        // Show 'Zobrazit kód' (view as text/hex) for non-media files (XAML, config, logs etc.)
        try {
            if (viewAsTextBtn) {
                if (!isImage && !isAudio && !isVideo && !isPdf) {
                    viewAsTextBtn.style.display = 'inline-block';
                    viewAsTextBtn.textContent = 'Zobrazit kód/Hex';
                    viewAsTextBtn.onclick = () => showBinaryViewFromFile(f, 'utf-8');
                } else {
                    viewAsTextBtn.style.display = 'none';
                }
            }
        } catch (e) { console.warn('setting viewAsTextBtn failed', e); }

        if (saveFileBtn) saveFileBtn.style.display = isText ? 'inline-block' : 'none';
        if (viewAsTextBtn) viewAsTextBtn.style.display = 'none';

        // show everything inline unless special-case (we lifted the 1MB block; now 5MB threshold applies only to non-media)
        if (!isImage && !isHtml && !isAudio && !isVideo && !isPdf && !isText && typeof f.size === 'number' && f.size > BIG_FILE_THRESHOLD) {
            editorArea.style.display = 'block';
            editorArea.value = `[Soubor ${formatBytes(f.size)} přesahuje limit ${formatBytes(BIG_FILE_THRESHOLD)}; nelze zobrazit inline. Použij "Stáhnout" nebo "Uložit jako".]\n${editorPath.textContent || ''}`;
            viewerPathEl.style.display = 'block'; viewerPathEl.textContent = editorPath.textContent || '';
            editorModal.style.display = 'flex';
            editorBlobUrl = null;
            if (saveFileBtn) saveFileBtn.style.display = 'none';
            return;
        }

        // IMAGE
        if (isImage) {
            // HEIC support via heic2any
            if ((ext === 'heic' || ext === 'heif') && window.heic2any) {
                try {
                    editorArea.style.display = 'block';
                    editorArea.value = '[Konverze HEIC...]';
                    editorModal.style.display = 'flex';
                    const convertedBlob = await heic2any({ blob: f, toType: "image/jpeg" });
                    const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                    const finalUrl = URL.createObjectURL(finalBlob);
                    editorBlobUrl = finalUrl;
                    editorImage.src = finalUrl;
                    editorImage.style.display = 'block';
                    editorArea.style.display = 'none';
                    viewerPathEl.style.display = 'block'; viewerPathEl.textContent = editorPath.textContent || '';
                    editorModal.style.display = 'flex';
                    tryCreateOpenInTabButton(finalUrl);
                    editorImage.onload = () => {
                        const dims = `${editorImage.naturalWidth}×${editorImage.naturalHeight}`;
                        const sizeStr = formatBytes(f.size);
                        editorPath.textContent += ` (${dims}, ${sizeStr})`;
                    };
                    editorImage.onerror = () => { showImageFallbackMessage(finalUrl, name, editorPath.textContent || '', f); };
                    return;
                } catch (e) { console.warn('heic conversion failed', e); }
            }

            const url = URL.createObjectURL(f);
            editorBlobUrl = url;
            editorImage.src = url;
            editorImage.style.display = 'block';
            editorArea.style.display = 'none';
            viewerPathEl.style.display = 'block'; viewerPathEl.textContent = editorPath.textContent || '';
            editorModal.style.display = 'flex';
            tryCreateOpenInTabButton(url);
            editorImage.onload = () => {
                const dims = `${editorImage.naturalWidth}×${editorImage.naturalHeight}`;
                const sizeStr = formatBytes(f.size);
                editorPath.textContent += ` (${dims}, ${sizeStr})`;
            };
            editorImage.onerror = async () => {
                editorImage.style.display = 'none';

                if (ext === 'heic' || ext === 'heif') {
                    showImageFallbackMessage(url, name, editorPath.textContent || '', f);
                    if (!window.heic2any) {
                        editorArea.value += '\n\n[Tip: Pro zobrazení HEIC přidej knihovnu heic2any.min.js do projektu.]';
                    }
                    return;
                }

                const obj = document.createElement('object');
                obj.id = 'modalObject';
                obj.type = type || (ext ? ('image/' + ext) : 'application/octet-stream');
                obj.data = url;
                obj.style.width = '100%';
                obj.style.height = '60vh';
                obj.style.display = 'block';
                obj.style.border = '0';
                const container = editorModal.querySelector('.card') || editorModal;
                container.insertBefore(obj, viewerPathEl);
                tryCreateOpenInTabButton(url);
                setTimeout(() => { showImageFallbackMessage(url, name, editorPath.textContent || '', f); }, 600);
            };
            return;
        }

        // AUDIO / VIDEO
        if (isAudio || isVideo) {
            const url = URL.createObjectURL(f);
            const media = document.createElement(isVideo ? 'video' : 'audio');
            media.id = 'modalMediaEl';
            media.controls = true;
            media.preload = 'metadata';
            media.src = url;
            media.style.maxWidth = '100%';
            media.style.maxHeight = '60vh';
            media.style.display = 'block';
            media.style.marginTop = '8px';
            const container = editorModal.querySelector('.card') || editorModal;
            container.insertBefore(media, viewerPathEl);
            editorBlobUrl = url;
            viewerPathEl.style.display = 'block'; viewerPathEl.textContent = editorPath.textContent || '';
            editorModal.style.display = 'flex';
            if (saveFileBtn) saveFileBtn.style.display = 'none';
            return;
        }

        // PDF
        if (isPdf) {
            const url = URL.createObjectURL(f);
            const iframe = document.createElement('iframe');
            iframe.id = 'modalPdf';
            iframe.src = url;
            iframe.width = '100%';
            iframe.style.height = '60vh';
            iframe.style.border = '0';
            const container = editorModal.querySelector('.card') || editorModal;
            container.insertBefore(iframe, viewerPathEl);
            editorBlobUrl = url;
            viewerPathEl.style.display = 'block'; viewerPathEl.textContent = editorPath.textContent || '';
            editorModal.style.display = 'flex';
            if (saveFileBtn) saveFileBtn.style.display = 'none';
            return;
        }

        // HTML preview
        if (isHtml) {
            try {
                const arrBuf = await f.arrayBuffer();
                const td = new TextDecoder('utf-8', { fatal: false });
                let decoded = '';
                try { decoded = td.decode(arrBuf); } catch (e) { decoded = new TextDecoder('utf-8').decode(arrBuf); }
                const iframe = document.createElement('iframe');
                iframe.id = 'htmlPreviewFrame';
                iframe.srcdoc = decoded;
                iframe.style.width = '100%';
                iframe.style.height = '60vh';
                iframe.style.border = '1px solid #444';
                iframe.style.marginTop = '10px';
                const card = editorModal.querySelector('.card') || editorModal;
                card.insertBefore(iframe, viewerPathEl);
                if (viewAsTextBtn) {
                    viewAsTextBtn.style.display = 'inline-block';
                    viewAsTextBtn.textContent = 'Zobrazit kód';
                    viewAsTextBtn.onclick = async () => {
                        if (iframe.style.display !== 'none') {
                            iframe.style.display = 'none';
                            await showBinaryViewFromFile(f, 'html');
                            viewAsTextBtn.textContent = 'Zobrazit náhled';
                        } else {
                            editorArea.style.display = 'none';
                            iframe.style.display = 'block';
                            removeEncodingSelector();
                            viewAsTextBtn.textContent = 'Zobrazit kód';
                        }
                    };
                }
                viewerPathEl.style.display = 'block';
                editorModal.style.display = 'flex';
                if (saveFileBtn) saveFileBtn.style.display = 'inline-block';
                return;
            } catch (e) { console.warn('html preview failed', e); }
        }

        // TEXT
        if (isText) {
            if (viewAsTextBtn) {
                viewAsTextBtn.style.display = 'inline-block';
                viewAsTextBtn.textContent = 'Zobrazit kód/Hex';
                viewAsTextBtn.onclick = () => showBinaryViewFromFile(f, 'utf-8');
            }
            viewerPathEl.textContent = editorPath.textContent || '';

            let initialEnc = 'utf-8';
            if (ext === 'json') initialEnc = 'json';
            if (ext === 'xml') initialEnc = 'xml';

            showBinaryViewFromFile(f, initialEnc);
            return;
        }

        // fallback
        if (viewAsTextBtn) {
            viewAsTextBtn.style.display = 'inline-block';
            viewAsTextBtn.textContent = 'Zobrazit kód/Hex';
            viewAsTextBtn.onclick = () => showBinaryViewFromFile(f, 'utf-8');
        }
        editorArea.style.display = 'block';
        editorArea.value = `[Soubor nebyl otevřen inline. Můžeš stáhnout (Stáhnout / Uložit jako).]\n${editorPath.textContent || ''}`;
        viewerPathEl.style.display = 'block'; viewerPathEl.textContent = editorPath.textContent || '';
        editorModal.style.display = 'flex';
        if (saveFileBtn) saveFileBtn.style.display = 'none';
    } catch (e) {
        console.error('openFile error', e);
        showError('Chyba při otevírání souboru: ' + (e && e.message ? e.message : e));
    }
}

/* open-in-tab button helper */
function tryCreateOpenInTabButton(url) {
    try {
        const old = document.getElementById('openInTabBtn'); if (old) old.remove();
        const btn = document.createElement('button');
        btn.id = 'openInTabBtn';
        btn.textContent = 'Otevřít v nové záložce';
        btn.style.marginLeft = '8px';
        btn.onclick = (ev) => {
            ev.preventDefault();
            try {
                const w = window.open(url, '_blank');
                if (!w) alert('Prohlížeč zablokoval otevření nové záložky. Použij Stáhnout.');
            } catch (e) { alert('Nelze otevřít: ' + (e && e.message ? e.message : e)); }
        };
        const container = editorModal.querySelector('.meta div[style*="display:flex"]') || editorModal.querySelector('.meta') || editorModal;
        if (container) container.appendChild(btn);
    } catch (e) { console.warn('open-in-tab button failed', e); }
}

function showImageFallbackMessage(blobUrl, filename, fullPath, fileObj) {
    try {
        editorArea.style.display = 'block';
        editorArea.value = `[Obrázek nelze zobrazit inline v tomto prohlížeči.]\nCesta: ${fullPath}\n\nMůžeš stáhnout soubor.`;
        editorModal.style.display = 'flex';
        tryCreateOpenInTabButton(blobUrl);
        if (fileObj && viewAsTextBtn) {
            viewAsTextBtn.style.display = 'inline-block';
            viewAsTextBtn.textContent = 'Zobrazit binární kód';
            viewAsTextBtn.onclick = () => showBinaryViewFromFile(fileObj, 'utf-8');
        }
    } catch (e) { }
}

/* download helper */
function triggerDownload(blobOrFile, filename) {
    try {
        const blob = blobOrFile instanceof Blob ? blobOrFile : new Blob([blobOrFile], { type: (blobOrFile && blobOrFile.type) || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename || 'file'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) { } }, 15000);
    } catch (e) { console.warn('download error', e); }
}

if (downloadBtn) downloadBtn.addEventListener('click', async (ev) => {
    try {
        ev.preventDefault(); ev.stopPropagation();
        if (editorFileHandle) {
            const f = await editorFileHandle.getFile();
            triggerDownload(f, f.name);
        } else {
            showError('Chyba: žádný handle pro stažení.', false);
        }
    } catch (e) { showError('Chyba při stahování: ' + (e && e.message ? e.message : e)); }
});

/* saveEditor */
async function saveEditor() {
    if (editorArea && editorArea.style && editorArea.style.display === 'block') {
        if (!editorFileHandle) return showError('Žádný otevřený soubor k uložení.');
        try {
            const w = await editorFileHandle.createWritable();
            await w.write(new Blob([editorArea.value], { type: 'text/plain;charset=utf-8' }));
            await w.close();
            showError('Uloženo.', false);
        } catch (e) { showError('Chyba při ukládání: ' + (e && e.message ? e.message : e)); }
    } else {
        await saveAs();
    }
}

/* saveAs */
async function saveAs() {
    try {
        const suggested = editorFilename.textContent || 'file.bin';
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({ suggestedName: suggested });
                const writable = await handle.createWritable();
                if (editorArea && editorArea.style && editorArea.style.display === 'block') {
                    await writable.write(editorArea.value);
                } else if (editorFileHandle) {
                    const f = await editorFileHandle.getFile();
                    await writable.write(await f.arrayBuffer());
                } else {
                    await writable.write(new Blob([]));
                }
                await writable.close();
                showError('Uloženo (Uložit jako).', true);
                return;
            } catch (e) { if (e && e.name === 'AbortError') return; }
        }
        const name = prompt('Název pro stažení (fallback):', suggested) || suggested;
        if (editorArea && editorArea.style && editorArea.style.display === 'block') {
            triggerDownload(new Blob([editorArea.value], { type: 'text/plain;charset=utf-8' }), name);
        } else if (editorFileHandle) {
            const f = await editorFileHandle.getFile();
            triggerDownload(f, name);
        } else {
            triggerDownload(new Blob([]), name);
        }
        showError('Staženo (fallback).', true);
    } catch (e) { showError('Chyba Uložit jako: ' + (e && e.message ? e.message : e)); }
}

/* pickFor */
async function pickFor(panel) {
    if (!('showDirectoryPicker' in window)) {
        alert('File System Access API není dostupné v tomto prohlížeči / kontextu.');
        return;
    }
    try {
        const handle = await window.showDirectoryPicker();
        if (!handle) return;
        if (panel === 'left') {
            leftHandle = handle; leftCurrent = handle; leftStack = [handle]; selectedLeft.clear();
            try { await idbSet('leftRoot', handle); } catch (e) { }
        } else {
            rightHandle = handle; rightCurrent = handle; rightStack = [handle]; selectedRight.clear();
            try { await idbSet('rightRoot', handle); } catch (e) { }
        }
        await refreshPanel(panel);
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        showError('Chyba při výběru adresáře: ' + (e && e.message ? e.message : e));
    }
}

/* refreshAll */
async function refreshAll() { try { await refreshPanel('left'); } catch (e) { } try { await refreshPanel('right'); } catch (e) { } }

/* wiring */
$('pickLeft') && ($('pickLeft').onclick = () => { activePanel = 'left'; pickFor('left'); });
$('pickRight') && ($('pickRight').onclick = () => { activePanel = 'right'; pickFor('right'); });
$('refreshAll') && ($('refreshAll').onclick = refreshAll);

if (leftNewFileBtn) leftNewFileBtn.onclick = () => createNew('left', 'file');
if (leftNewDirBtn) leftNewDirBtn.onclick = () => createNew('left', 'dir');
if (rightNewFileBtn) rightNewFileBtn.onclick = () => createNew('right', 'file');
if (rightNewDirBtn) rightNewDirBtn.onclick = () => createNew('right', 'dir');

if (saveFileBtn) saveFileBtn.onclick = () => {
    try {
        if (editorArea && editorArea.style && editorArea.style.display === 'block') {
            if (confirm('Opravdu chcete přepsat soubor?')) saveEditor();
        } else {
            saveAs();
        }
    } catch (e) { }
};

$('saveAsFile') && ($('saveAsFile').onclick = saveAs);

/* toggle full button */
if (toggleFullBtn) toggleFullBtn.onclick = () => { const c = editorModal.querySelector('.card'); if (!c) return; c.classList.toggle('fullscreen'); toggleFullBtn.textContent = c.classList.contains('fullscreen') ? 'Obnovit' : 'Maximalizovat'; };

/* keyboard shortcuts */
window.addEventListener('keydown', e => {
    const anyModalOpen = editorModal && editorModal.style && editorModal.style.display === 'flex';
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (anyModalOpen || tag === 'input' || tag === 'textarea') return;
    const panel = activePanel;
    const sel = panel === 'left' ? selectedLeft : selectedRight;
    if (e.key === 'F5') { e.preventDefault(); if (sel.size) bulkCopy(panel, Array.from(sel)); }
    if (e.key === 'F6') { e.preventDefault(); if (sel.size) bulkMove(panel, Array.from(sel)); }
    if (e.key === 'F8') { e.preventDefault(); if (sel.size) bulkDelete(panel, Array.from(sel)); }
    if (e.key === 'F9') { e.preventDefault(); if (sel.size) extractSelectedTo(panel); }
    if (e.key === 'F2') { e.preventDefault(); if (sel.size === 1) renameByName(panel, Array.from(sel)[0]); }
    if (e.key === 'Enter') { e.preventDefault(); if (sel.size === 1) { getHandleByName(panel, Array.from(sel)[0]).then(h => { if (h.kind === 'directory') enterDir(panel, Array.from(sel)[0], h); else { activePanel = panel; openFile(h); } }).catch(() => { }); } }
    if (e.key.toLowerCase() === 'i') { e.preventDefault(); if (sel.size === 1) getHandleByName(panel, Array.from(sel)[0]).then(h => { showMetadataForHandle(h, panel); }).catch(() => { }); }
});

/* CRUD and context menu helpers */
async function createNew(panel, type) { const cur = panel === 'left' ? leftCurrent : rightCurrent; if (!cur) return alert('Otevři panel nejdřív'); const name = prompt('Název ' + (type === 'dir' ? 'složky' : 'souboru')); if (!name) return; try { if (type === 'dir') await cur.getDirectoryHandle(name, { create: true }); else { const fh = await cur.getFileHandle(name, { create: true }); const w = await fh.createWritable(); await w.close(); } await refreshPanel(panel); } catch (e) { showError('Chyba při vytváření: ' + (e && e.message ? e.message : e)); } }
async function renameByName(panel, name) { const cur = panel === 'left' ? leftCurrent : rightCurrent; if (!cur) return; const handle = await getHandleByName(panel, name).catch(() => null); if (!handle) return; const newName = prompt('Nové jméno', name); if (!newName || newName === name) return; try { if (handle.kind === 'file') { const f = await handle.getFile(); const nh = await cur.getFileHandle(newName, { create: true }); const w = await nh.createWritable(); await w.write(await f.arrayBuffer()); await w.close(); if ('removeEntry' in cur) await cur.removeEntry(name); } else { await copyDirRecursive(handle, cur, newName); if ('removeEntry' in cur) await cur.removeEntry(name, { recursive: true }); } await refreshPanel(panel); } catch (e) { showError('Chyba při přejmenování: ' + (e && e.message ? e.message : e)); } }
async function bulkCopy(panel, names) { for (const n of names) { try { const h = await getHandleByName(panel, n); await copyToOther(panel, n, h); } catch (e) { console.warn('bulk copy failed', n, e); } } await refreshAll(); }
async function bulkMove(panel, names) { for (const n of names) { try { const h = await getHandleByName(panel, n); await moveToOther(panel, n, h); } catch (e) { console.warn('bulk move failed', n, e); } } await refreshAll(); }
async function bulkDelete(panel, names) { for (const n of names) { try { await deleteEntry(panel, n); } catch (e) { console.warn('bulk delete failed', n, e); } } await refreshPanel(panel); }
function multiAwareContextMenu(panel, name, handle) {
    const action = prompt('Akce: open / copy / move / rename / delete / info / extract', 'open');
    if (!action) return;
    if (action === 'open') { if (handle.kind === 'file' || handle.kind === 'zip-entry' || handle.zipPath) { activePanel = panel; openFile(handle); } else enterDir(panel, name, handle); }
    if (action === 'copy') copyToOther(panel, name, handle);
    if (action === 'move') moveToOther(panel, name, handle);
    if (action === 'rename') renameByName(panel, name);
    if (action === 'delete') deleteEntry(panel, name);
    if (action === 'info') showMetadataForHandle(handle, panel);
    if (action === 'extract') extractSelectedTo(panel);
}

/* metadata */
async function showMetadataForHandle(handle, panel) {
    try {
        if (!handle) return;
        let file = null;
        if (handle.kind === 'zip-entry' || handle.zipPath) {
            const entry = handle.zipObj.file(handle.zipPath);
            const meta = { name: handle.name || handle.zipPath, type: '', size: entry ? (entry._data && entry._data.uncompressedSize ? entry._data.uncompressedSize : null) : null, lastModified: '' };
            const mm = $('metaModal'), mc = $('metaContent'), mt = $('metaTitle');
            if (mm && mc && mt) {
                mt.textContent = meta.name || '';
                mc.innerHTML = '';
                function addRow(k, v) { const d = document.createElement('div'); d.style.marginBottom = '6px'; d.innerHTML = `<strong>${k}</strong><div style="color:var(--muted)">${String(v || '')}</div>`; mc.appendChild(d); }
                addRow('Typ', meta.type); addRow('Velikost', meta.size != null ? formatBytes(meta.size) : ''); addRow('Cesta', 'ZIP:' + (handle.zipPath || '')); mm.style.display = 'flex';
            } else alert(JSON.stringify(meta, null, 2));
            return;
        }
        if (handle.kind === 'file') file = await handle.getFile();
        else if (handle.getFile) file = await handle.getFile().catch(() => null);
        const meta = { name: handle.name || (file && file.name) || '', type: file ? file.type || '' : (handle.kind || ''), size: file ? file.size : null, lastModified: file ? (file.lastModified ? new Date(file.lastModified).toString() : '') : '' };
        if (file) {
            if ((file.type || '').startsWith('image/')) { const url = URL.createObjectURL(file); await new Promise((res, rej) => { const img = new Image(); img.onload = () => { meta.width = img.naturalWidth; meta.height = img.naturalHeight; URL.revokeObjectURL(url); res(); }; img.onerror = () => { URL.revokeObjectURL(url); rej(); }; img.src = url; }); }
            if ((file.type || '').startsWith('audio/') || (file.type || '').startsWith('video/')) { const url = URL.createObjectURL(file); await new Promise((res, rej) => { const el = document.createElement((file.type || '').startsWith('video/') ? 'video' : 'audio'); el.preload = 'metadata'; el.onloadedmetadata = () => { meta.duration = typeof el.duration === 'number' && !isNaN(el.duration) ? el.duration : null; el.src = ''; URL.revokeObjectURL(url); res(); }; el.onerror = () => { URL.revokeObjectURL(url); rej(); }; el.src = url; }); }
            if ((file.type || '').startsWith('text/') || TEXT_EXTS.has(extOf(file.name)) || extOf(file.name) === '') {
                const t = await file.text(); meta.lines = t.split(/\r?\n/).length; meta.words = (t.match(/\S+/g) || []).length;
            }
        }
        const mm = $('metaModal'), mc = $('metaContent'), mt = $('metaTitle');
        if (mm && mc && mt) {
            mt.textContent = meta.name || '';
            mc.innerHTML = '';
            function addRow(k, v) { const d = document.createElement('div'); d.style.marginBottom = '6px'; d.innerHTML = `<strong>${k}</strong><div style="color:var(--muted)">${String(v || '')}</div>`; mc.appendChild(d); }
            addRow('Typ', meta.type); addRow('Velikost', meta.size != null ? formatBytes(meta.size) : ''); addRow('Cesta', panel + '/' + (handle.name || '')); if (meta.width || meta.height) addRow('Rozměry', (meta.width || '') + '×' + (meta.height || '')); if (meta.duration != null) addRow('Délka (s)', meta.duration); if (meta.lines != null) addRow('Řádky', meta.lines);
            mm.style.display = 'flex';
        } else alert(JSON.stringify(meta, null, 2));
    } catch (e) { console.warn('meta failed', e); alert('Chyba při získávání metadat: ' + (e && e.message ? e.message : e)); }
}
$('metaClose') && ($('metaClose').onclick = () => { const mm = $('metaModal'); if (mm) mm.style.display = 'none'; });

/* ===== SEARCH (FS only) ===== */
let searchAbortController = null;
let searchResults = [];

function clearResultsUI() { if (resultsList) resultsList.innerHTML = ''; if (resultsSummary) resultsSummary.textContent = ''; if (resultsPanel) resultsPanel.style.display = 'none'; }

async function searchInDirectory(panel, dirHandle, prefixPath, query, options) {
    const results = [];
    for await (const [name, handle] of dirHandle.entries()) {
        if (searchAbortController && searchAbortController.signal.aborted) break;
        const fullPath = (prefixPath ? prefixPath + '/' : '') + name;
        try {
            if (handle.kind === 'directory') {
                if (options.searchNames && name.toLowerCase().includes(query)) { results.push({ panel, name, path: fullPath, matches: null }); if (searchResults.length + results.length >= SEARCH_RESULTS_CAP) return results; }
                if (options.recursive) {
                    const r = await searchInDirectory(panel, handle, fullPath, query, options);
                    results.push(...r);
                    if (searchResults.length + results.length >= SEARCH_RESULTS_CAP) return results;
                }
            } else {
                if (options.searchNames && name.toLowerCase().includes(query)) {
                    results.push({ panel, name, path: fullPath, matches: null });
                    if (searchResults.length + results.length >= SEARCH_RESULTS_CAP) return results;
                }
                let allowContent = true;
                if (options.searchTextOnly) {
                    const ext = extOf(name);
                    if (!TEXT_EXTS.has(ext) && ext !== '') allowContent = false;
                }
                if (!allowContent) continue;
                try {
                    const f = await handle.getFile();
                    if (typeof f.size === 'number' && f.size > MAX_READ_BYTES) continue;
                    const text = await f.text();
                    const count = (text.toLowerCase().match(new RegExp(query, 'g')) || []).length;
                    if (count > 0) {
                        results.push({ panel, name, path: fullPath, matches: count });
                        if (searchResults.length + results.length >= SEARCH_RESULTS_CAP) return results;
                    }
                } catch (e) { }
            }
        } catch (e) { }
    }
    return results;
}

async function renderResultsUI() {
    resultsList.innerHTML = '';
    resultsSummary.textContent = `${searchResults.length} výsledků`;
    for (const r of searchResults) {
        const row = document.createElement('div'); row.className = 'result';
        row.innerHTML = `<div><strong>${r.name}</strong></div><div class="path">${r.path} ${r.matches ? (' — výskytů: ' + r.matches) : ''}</div>`;
        row.addEventListener('click', async () => {
            try {
                const panel = r.panel;
                let cur = panel === 'left' ? (leftStack && leftStack[0]) : (rightStack && rightStack[0]);
                if (!cur) { showError('Root panel není otevřen.'); return; }
                const parts = r.path.split('/');
                for (let i = 0; i < parts.length; i++) {
                    const name = parts[i];
                    if (name === '') continue;
                    if (i === parts.length - 1) {
                        try { const h = await cur.getFileHandle(name).catch(() => null); if (h) { openFile(h); return; } } catch (_) { }
                        try { const hh = await cur.getDirectoryHandle(name).catch(() => null); if (hh) { enterDir(panel, name, hh); return; } } catch (_) { }
                    } else {
                        cur = await cur.getDirectoryHandle(name).catch(() => { throw new Error('path-resolve-failed'); });
                    }
                }
                showError('Nepodařilo se rozlišit cestu.');
            } catch (e) { showError('Nepodařilo se otevřít výsledek.'); }
        });
        resultsList.appendChild(row);
    }
}

async function runSearch(panel) {
    const qRaw = (searchInput && searchInput.value) ? searchInput.value.trim() : '';
    if (!qRaw) { showError('Zadej hledaný text.'); return; }
    const query = qRaw.toLowerCase();
    searchResults = [];
    resultsList.innerHTML = '';
    resultsSummary.textContent = 'Probíhá...';
    resultsPanel.style.display = 'flex';
    searchCancel.style.display = 'inline-block';
    searchAbortController = new AbortController();
    const options = { recursive: searchRecursive && searchRecursive.checked, searchTextOnly: searchTextOnly && searchTextOnly.checked, searchNames: true };

    try {
        const rootHandle = panel === 'left' ? (leftStack && leftStack[0]) : (rightStack && rightStack[0]);
        if (!rootHandle) { showError('Neotevřen žádný root pro panel ' + panel); return; }
        const chunkResults = await searchInDirectory(panel, rootHandle, '', query, options);
        searchResults.push(...chunkResults);
        if (searchResults.length >= SEARCH_RESULTS_CAP) showError('Počet výsledků dosáhl limitu (' + SEARCH_RESULTS_CAP + ').', true);
        await renderResultsUI();
    } catch (e) {
        if (searchAbortController && searchAbortController.signal.aborted) showError('Hledání zrušeno.', false);
        else showError('Chyba při hledání.');
    } finally {
        if (searchCancel) searchCancel.style.display = 'none';
        searchAbortController = null;
    }
}

if (searchCancel) searchCancel.onclick = () => { if (searchAbortController) searchAbortController.abort(); searchCancel.style.display = 'none'; showError('Hledání zrušeno.', false); };
$('resultsHide') && ($('resultsHide').onclick = () => { resultsPanel.style.display = 'none'; });
$('resultsClear') && ($('resultsClear').onclick = () => { searchResults = []; clearResultsUI(); });
if (searchLeft) searchLeft.onclick = () => runSearch('left');
if (searchRight) searchRight.onclick = () => runSearch('right');

/* ===== ZIP extract selected to target dir ===== */
async function extractSelectedTo(panel) {
    try {
        const sel = panel === 'left' ? Array.from(selectedLeft) : Array.from(selectedRight);
        if (sel.length === 0) return alert('Vyber položky v ZIPu, které chceš rozbalit.');
        const cur = panel === 'left' ? leftCurrent : rightCurrent;
        if (!isZipNode(cur)) return alert('Tato akce je dostupná pouze uvnitř ZIPu.');
        const entries = listZipEntriesAt(cur.zipObj, cur.path).filter(e => sel.includes(e.name));
        if (entries.length === 0) return alert('Vybrané položky nebyly nalezeny v aktuálním ZIPu.');
        const target = await window.showDirectoryPicker();
        if (!target) return;
        if (!confirm(`Extrahovat ${entries.length} položek do ${target.name}?`)) return;
        await ensureRW(target);
        let count = 0;
        for (const e of entries) {
            if (e.kind === 'directory') {
                await copyZipDirToFs(cur.zipObj, e.zipPath, target);
            } else {
                const entry = cur.zipObj.file(e.zipPath);
                if (!entry) continue;
                const arr = await entry.async('arraybuffer');
                const fh = await target.getFileHandle(e.name, { create: true });
                const w = await fh.createWritable(); await w.write(arr); await w.close();
            }
            count++;
        }
        showError(`Extrahováno ${count} položek.`, true);
        await refreshPanel(panel);
    } catch (e) { console.error('extractSelectedTo failed', e); showError('Chyba při extrakci: ' + (e && e.message ? e.message : e)); }
}

if (extractToBtn) extractToBtn.addEventListener('click', (ev) => { ev.preventDefault(); extractSelectedTo(activePanel); });

/* ===== modal close handlers & cleanup ===== */
let _closing = false;
function closeEditorModal() {
    if (!editorModal) return;
    if (_closing) return;
    _closing = true;
    try {
        const media = document.getElementById('modalMediaEl'); if (media) { try { media.pause && media.pause(); } catch (_) { } media.remove(); }
        const pdf = document.getElementById('modalPdf'); if (pdf) pdf.remove();
        const obj = document.getElementById('modalObject'); if (obj) obj.remove();
        const openBtn = document.getElementById('openInTabBtn'); if (openBtn) openBtn.remove();
        removeEncodingSelector();
        try { editorImage.onload = null; editorImage.onerror = null; } catch (e) { }
        try { editorImage.src = ''; } catch (e) { }
        if (editorImage) editorImage.style.display = 'none';
        if (editorArea) { editorArea.value = ''; editorArea.style.display = 'none'; }
        if (viewerPathEl) { viewerPathEl.style.display = 'none'; viewerPathEl.textContent = ''; }
        revokeEditorBlob();
        if (toggleFullBtn) toggleFullBtn.textContent = 'Maximalizovat';
        if (saveFileBtn) saveFileBtn.style.display = 'none';
        if (viewAsTextBtn) { viewAsTextBtn.style.display = 'none'; viewAsTextBtn.onclick = null; viewAsTextBtn.textContent = ''; }
        editorModal.style.display = 'none';
    } catch (e) { console.warn('closeEditorModal cleanup failed', e); } finally { setTimeout(() => { _closing = false; }, 50); }
}

function wireEditorCloseHandlers() {
    const ids = ['closeEditor', 'close-editor', 'editorClose', 'btnCloseEditor'];
    const dataSel = '[data-action="close-editor"]';
    const classSel = '.close-editor, .editor-close';
    const elems = [];
    try {
        ids.forEach(id => { const el = document.getElementById(id); if (el) elems.push(el); });
        const fromData = Array.from(document.querySelectorAll(dataSel));
        const fromClass = Array.from(document.querySelectorAll(classSel));
        elems.push(...fromData); elems.push(...fromClass);
        const modalButtons = Array.from((editorModal && editorModal.querySelectorAll('button')) || []);
        for (const b of modalButtons) { if (b && /zavřít/i.test(b.textContent || '')) elems.push(b); }
        const uniq = Array.from(new Set(elems));
        uniq.forEach(el => { if (!el) return; el.removeEventListener('click', _closeClickHandler); el.addEventListener('click', _closeClickHandler); });
        const overlay = document.querySelector('[data-modal-overlay]'); if (overlay) { overlay.removeEventListener('click', _overlayClickHandler); overlay.addEventListener('click', _overlayClickHandler); }
        window.removeEventListener('keydown', _escapeHandler); window.addEventListener('keydown', _escapeHandler);
    } catch (e) { console.warn('wireEditorCloseHandlers failed', e); }
}
function _closeClickHandler(ev) { try { ev.preventDefault(); ev.stopPropagation(); } catch (_) { } closeEditorModal(); }
function _overlayClickHandler(ev) { if (ev.target && ev.currentTarget && ev.target === ev.currentTarget) closeEditorModal(); }
function _escapeHandler(ev) { if (ev.key === 'Escape' || ev.key === 'Esc') { if (editorModal && editorModal.style && editorModal.style.display === 'flex') closeEditorModal(); } }
document.addEventListener('DOMContentLoaded', () => { try { wireEditorCloseHandlers(); } catch (e) { console.warn('initial wireEditorCloseHandlers failed', e); } });
window.__mc_rewireClose = wireEditorCloseHandlers;

/* expose debug helpers */
window.__mc = Object.assign(window.__mc || {}, { refreshAll, refreshPanel, openFile, pickFor, getHandleByName, copyToOther, moveToOther, toggleSort, closeEditorModal, extractSelectedTo });

/* ===== Initialization ===== */
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const lr = await tryRestoreHandle('leftRoot'); if (lr) { leftHandle = lr; leftCurrent = lr; leftStack = [lr]; }
        const rr = await tryRestoreHandle('rightRoot'); if (rr) { rightHandle = rr; rightCurrent = rr; rightStack = [rr]; }

        try { const ls = await idbGet('leftSort').catch(() => null); if (ls && ls.by) leftSort = ls; } catch (e) { }
        try { const rs = await idbGet('rightSort').catch(() => null); if (rs && rs.by) rightSort = rs; } catch (e) { }
        try { const p = await idbGet('basePrefix'); if (p) basePathPrefixVal = p; } catch (_) { }

        if (saveFileBtn) saveFileBtn.style.display = 'none';
        if (viewAsTextBtn) viewAsTextBtn.style.display = 'none';

        attachDropHandlers(leftList, 'left');
        attachDropHandlers(rightList, 'right');

        await refreshAll();
        try { wireEditorCloseHandlers(); } catch (e) { }

        // helper wrapper to open zip file handle as zip-node
        window.__mc_openOrEnter = async function (panel, maybeHandle) {
            try {
                if (maybeHandle && typeof maybeHandle.getFile === 'function') {
                    const f = await maybeHandle.getFile();
                    const ext = extOf(f.name);
                    if (ext === 'zip' || (f.type && f.type.includes('zip'))) {
                        if (typeof JSZip === 'undefined' || window.__MC_JSZIP_AVAILABLE === false) { showError('JSZip není dostupný — ZIP nelze otevřít.', true); return; }
                        const zipNode = await createZipNodeFromFileHandle(maybeHandle);
                        if (panel === 'left') { leftStack = leftStack && leftStack.length ? leftStack : (leftHandle ? [leftHandle] : []); leftStack.push(zipNode); leftCurrent = zipNode; selectedLeft.clear(); }
                        else { rightStack = rightStack && rightStack.length ? rightStack : (rightHandle ? [rightHandle] : []); rightStack.push(zipNode); rightCurrent = zipNode; selectedRight.clear(); }
                        await refreshPanel(panel); return;
                    }
                }
                if (maybeHandle) openFile(maybeHandle);
            } catch (e) { console.warn('openOrEnter wrapper failed', e); }
        };
    } catch (e) { console.warn('init restore error', e); }
});

/* End of main.js */
