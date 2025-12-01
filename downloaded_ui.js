/* ui.js */
import { state, CONSTANTS, DOM } from './state.js';
import { formatBytes, fmtDate, iconForExt, nameWithoutExt, showError, makeComparator, idbSet, idbDelete, extOf } from './utils.js';
import { isZipNode, listZipEntriesAt, createZipNodeFromFileHandle } from './zip-ops.js';
import { copyToOther, moveToOther, ensureRW, enterDir, multiAwareContextMenu, getHandleByName } from './fs-ops.js';
import { createVirtualRoot } from './virtual-fs.js';
import { openFile } from './viewer.js';

/* ===== PANEL rendering (FS dirs & ZIP nodes) ===== */
export async function refreshPanel(panel) {
    console.log('[refreshPanel] called for panel:', panel);
    const leftList = DOM.$('leftList');
    const rightList = DOM.$('rightList');
    const leftPath = DOM.$('leftPath');
    const rightPath = DOM.$('rightPath');

    const container = panel === 'left' ? leftList : rightList;
    const cur = panel === 'left' ? state.leftCurrent : state.rightCurrent;
    const stack = panel === 'left' ? state.leftStack : state.rightStack;
    console.log('[refreshPanel] container:', container, 'cur:', cur, 'stack:', stack);
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
        const es = document.createElement('div'); es.className = 'emptystate';
        es.style.margin = '8px';
        es.innerHTML = `<div class="title">Žádný adresář</div><div class="note">Klikni na "Vybrat adresář" pro výběr kořene.</div>`;
        const btn = document.createElement('button'); btn.textContent = 'Vybrat adresář'; btn.onclick = () => pickFor(panel);
        es.appendChild(btn);

        // Fallback for HTTP
        if (!('showDirectoryPicker' in window)) {
            const fallbackContainer = document.createElement('div');
            fallbackContainer.style.marginTop = '12px';
            fallbackContainer.style.borderTop = '1px solid rgba(255,255,255,0.1)';
            fallbackContainer.style.paddingTop = '12px';

            const note = document.createElement('div');
            note.className = 'note';
            note.textContent = 'HTTP Fallback (Read-only):';
            note.style.marginBottom = '6px';

            const fbBtn = document.createElement('button');
            fbBtn.textContent = 'Otevřít složku (Fallback)';
            fbBtn.style.background = 'rgba(255,255,255,0.05)';

            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'file';
            hiddenInput.webkitdirectory = true;
            hiddenInput.multiple = true;
            hiddenInput.style.display = 'none';

            hiddenInput.onchange = async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    try {
                        const vRoot = createVirtualRoot(e.target.files);
                        if (panel === 'left') {
                            state.leftHandle = vRoot; state.leftCurrent = vRoot; state.leftStack = [vRoot]; state.selectedLeft.clear();
                        } else {
                            state.rightHandle = vRoot; state.rightCurrent = vRoot; state.rightStack = [vRoot]; state.selectedRight.clear();
                        }
                        await refreshPanel(panel);
                    } catch (err) {
                        showError('Chyba při načítání fallback souborů: ' + err.message);
                    }
                }
            };

            fbBtn.onclick = () => hiddenInput.click();

            fallbackContainer.appendChild(note);
            fallbackContainer.appendChild(fbBtn);
            fallbackContainer.appendChild(hiddenInput);
            es.appendChild(fallbackContainer);
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
        if (panel === 'left') { state.leftCurrent = null; state.leftStack = []; idbDelete('leftRoot').catch(() => { }); } else { state.rightCurrent = null; state.rightStack = []; idbDelete('rightRoot').catch(() => { }); }
        await refreshPanel(panel);
        return;
    }

    const sortState = panel === 'left' ? state.leftSort : state.rightSort;
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
                if (panel === 'left') { state.leftCurrent = newTop; state.leftStack = stack.slice(); state.selectedLeft.clear(); } else { state.rightCurrent = newTop; state.rightStack = stack.slice(); state.selectedRight.clear(); }
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
                const selSet = panel === 'left' ? state.selectedLeft : state.selectedRight;
                selSet.clear(); selSet.add(it.name);
                refreshPanel(panel);
            } catch (e) { console.warn('single-click action failed', e); }
            clickTimer = null; lastClickInfo = null;
        }, 250);
    }

    for (const it of items) {
        const row = document.createElement('div'); row.className = 'entry';
        if ((panel === 'left' && state.selectedLeft.has(it.name)) || (panel === 'right' && state.selectedRight.has(it.name))) row.classList.add('selected');

        const ic = document.createElement('div'); ic.className = 'icon'; ic.textContent = iconForExt(it.ext, it.kind);
        const nmEl = document.createElement('div'); nmEl.className = 'name'; nmEl.textContent = nameWithoutExt(it.name);
        const extEl = document.createElement('div'); extEl.className = 'ext'; extEl.textContent = it.ext || '';
        const szEl = document.createElement('div'); szEl.className = 'size'; szEl.textContent = it.size != null ? formatBytes(it.size) : '';
        const dtEl = document.createElement('div'); dtEl.className = 'date'; dtEl.textContent = it.mtime ? fmtDate(it.mtime) : '';

        row.appendChild(ic); row.appendChild(nmEl); row.appendChild(extEl); row.appendChild(szEl); row.appendChild(dtEl);

        if (it.kind === 'file' && typeof it.size === 'number' && it.size > CONSTANTS.BIG_FILE_THRESHOLD) {
            const b = document.createElement('span'); b.className = 'badge-large'; b.textContent = '>' + Math.round(CONSTANTS.BIG_FILE_THRESHOLD / 1024) + ' KB';
            szEl.appendChild(b);
        }

        row.__entry = it;

        row.addEventListener('click', (ev) => {
            try {
                state.activePanel = panel;
                const ctrl = ev.ctrlKey || ev.metaKey, shift = ev.shiftKey;
                const names = items.map(x => x.name);
                const selSet = panel === 'left' ? state.selectedLeft : state.selectedRight;

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
            state.activePanel = panel;
            if (it.kind === 'directory') {
                if (isZipNode(cur)) {
                    const newNode = { kind: 'zip', name: cur.name + ':' + it.name, zipObj: cur.zipObj, path: (cur.path ? (cur.path.endsWith('/') ? cur.path + it.name + '/' : cur.path + it.name + '/') : (it.name + '/')) };
                    if (panel === 'left') { state.leftStack.push(newNode); state.leftCurrent = newNode; state.selectedLeft.clear(); } else { state.rightStack.push(newNode); state.rightCurrent = newNode; state.selectedRight.clear(); }
                    refreshPanel(panel);
                } else {
                    if (panel === 'left') { state.leftStack = state.leftStack && state.leftStack.length ? state.leftStack : (state.leftHandle ? [state.leftHandle] : []); state.leftStack.push(it.handle); state.leftCurrent = it.handle; state.selectedLeft.clear(); }
                    else { state.rightStack = state.rightStack && state.rightStack.length ? state.rightStack : (state.rightHandle ? [state.rightHandle] : []); state.rightStack.push(it.handle); state.rightCurrent = it.handle; state.selectedRight.clear(); }
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
            state.activePanel = panel;
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

export async function refreshAll() { try { await refreshPanel('left'); } catch (e) { } try { await refreshPanel('right'); } catch (e) { } }

/* toggle sort */
export async function toggleSort(panel, by) {
    const s = panel === 'left' ? state.leftSort : state.rightSort;
    if (s.by === by) s.dir = -s.dir; else { s.by = by; s.dir = 1; }
    refreshPanel(panel);
}

/* pickFor */
export async function pickFor(panel) {
    if (!('showDirectoryPicker' in window)) {
        const isHTTP = window.location.protocol === 'http:' && !window.location.hostname.match(/^(localhost|127\.0\.0\.1)$/);
        const msg = isHTTP
            ? '⚠️ File System Access API vyžaduje HTTPS\n\n' +
            'Aplikace běží přes HTTP (' + window.location.origin + '), ' +
            'ale File System Access API je dostupné pouze přes HTTPS z bezpečnostních důvodů.\n\n' +
            '📌 ŘEŠENÍ:\n' +
            '1. Kontaktujte hosting support (Aspone.cz) pro instalaci SSL certifikátu\n' +
            '2. Nebo spusťte aplikaci lokálně (localhost)\n\n' +
            '💡 TIP: Můžete použít alternativní metodu přes "Otevřít soubory" (File Input), ' +
            'ale File System API poskytuje lepší funkčnost.'
            : 'File System Access API není dostupné v tomto prohlížeči / kontextu.';
        alert(msg);
        return;
    }
    try {
        const handle = await window.showDirectoryPicker();
        if (!handle) return;
        if (panel === 'left') {
            state.leftHandle = handle; state.leftCurrent = handle; state.leftStack = [handle]; state.selectedLeft.clear();
            try { await idbSet('leftRoot', handle); } catch (e) { }
        } else {
            state.rightHandle = handle; state.rightCurrent = handle; state.rightStack = [handle]; state.selectedRight.clear();
            try { await idbSet('rightRoot', handle); } catch (e) { }
        }
        await refreshPanel(panel);
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        showError('Chyba při výběru adresáře: ' + (e && e.message ? e.message : e));
    }
}

/* attach drop handlers */
export function attachDropHandlers(container, panel) {
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
        const targetCur = panel === 'left' ? state.leftCurrent : state.rightCurrent;
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

/* metadata */
export async function showMetadataForHandle(handle, panel) {
    try {
        if (!handle) return;
        let file = null;
        if (handle.kind === 'zip-entry' || handle.zipPath) {
            const entry = handle.zipObj.file(handle.zipPath);
            const meta = { name: handle.name || handle.zipPath, type: '', size: entry ? (entry._data && entry._data.uncompressedSize ? entry._data.uncompressedSize : null) : null, lastModified: '' };
            const mm = DOM.$('metaModal'), mc = DOM.$('metaContent'), mt = DOM.$('metaTitle');
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
            if ((file.type || '').startsWith('text/') || CONSTANTS.TEXT_EXTS.has(extOf(file.name)) || extOf(file.name) === '') {
                const t = await file.text(); meta.lines = t.split(/\r?\n/).length; meta.words = (t.match(/\S+/g) || []).length;
            }
        }
        const mm = DOM.$('metaModal'), mc = DOM.$('metaContent'), mt = DOM.$('metaTitle');
        if (mm && mc && mt) {
            mt.textContent = meta.name || '';
            mc.innerHTML = '';
            function addRow(k, v) { const d = document.createElement('div'); d.style.marginBottom = '6px'; d.innerHTML = `<strong>${k}</strong><div style="color:var(--muted)">${String(v || '')}</div>`; mc.appendChild(d); }
            addRow('Typ', meta.type); addRow('Velikost', meta.size != null ? formatBytes(meta.size) : ''); addRow('Cesta', panel + '/' + (handle.name || '')); if (meta.width || meta.height) addRow('Rozměry', (meta.width || '') + '×' + (meta.height || '')); if (meta.duration != null) addRow('Délka (s)', meta.duration); if (meta.lines != null) addRow('Řádky', meta.lines);
            mm.style.display = 'flex';
        } else alert(JSON.stringify(meta, null, 2));
    } catch (e) { console.warn('meta failed', e); alert('Chyba při získávání metadat: ' + (e && e.message ? e.message : e)); }
}

/* ===== SEARCH (FS only) ===== */
async function searchInDirectory(panel, dirHandle, prefixPath, query, options) {
    const results = [];
    for await (const [name, handle] of dirHandle.entries()) {
        if (state.searchAbortController && state.searchAbortController.signal.aborted) break;
        const fullPath = (prefixPath ? prefixPath + '/' : '') + name;
        try {
            if (handle.kind === 'directory') {
                if (options.searchNames && name.toLowerCase().includes(query)) { results.push({ panel, name, path: fullPath, matches: null }); if (state.searchResults.length + results.length >= CONSTANTS.SEARCH_RESULTS_CAP) return results; }
                if (options.recursive) {
                    const r = await searchInDirectory(panel, handle, fullPath, query, options);
                    results.push(...r);
                    if (state.searchResults.length + results.length >= CONSTANTS.SEARCH_RESULTS_CAP) return results;
                }
            } else {
                if (options.searchNames && name.toLowerCase().includes(query)) {
                    results.push({ panel, name, path: fullPath, matches: null });
                    if (state.searchResults.length + results.length >= CONSTANTS.SEARCH_RESULTS_CAP) return results;
                }
                let allowContent = true;
                if (options.searchTextOnly) {
                    const ext = extOf(name);
                    if (!CONSTANTS.TEXT_EXTS.has(ext) && ext !== '') allowContent = false;
                }
                if (!allowContent) continue;
                try {
                    const f = await handle.getFile();
                    if (typeof f.size === 'number' && f.size > CONSTANTS.MAX_READ_BYTES) continue;
                    const text = await f.text();
                    const count = (text.toLowerCase().match(new RegExp(query, 'g')) || []).length;
                    if (count > 0) {
                        results.push({ panel, name, path: fullPath, matches: count });
                        if (state.searchResults.length + results.length >= CONSTANTS.SEARCH_RESULTS_CAP) return results;
                    }
                } catch (e) { }
            }
        } catch (e) { }
    }
    return results;
}

async function renderResultsUI() {
    const resultsList = DOM.$('resultsList');
    const resultsSummary = DOM.$('resultsSummary');
    resultsList.innerHTML = '';
    resultsSummary.textContent = `${state.searchResults.length} výsledků`;
    for (const r of state.searchResults) {
        const row = document.createElement('div'); row.className = 'result';
        row.innerHTML = `<div><strong>${r.name}</strong></div><div class="path">${r.path} ${r.matches ? (' — výskytů: ' + r.matches) : ''}</div>`;
        row.addEventListener('click', async () => {
            try {
                const panel = r.panel;
                let cur = panel === 'left' ? (state.leftStack && state.leftStack[0]) : (state.rightStack && state.rightStack[0]);
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

export async function runSearch(panel) {
    const searchInput = DOM.$('searchInput');
    const searchRecursive = DOM.$('searchRecursive');
    const searchTextOnly = DOM.$('searchTextOnly');
    const resultsPanel = DOM.$('resultsPanel');
    const resultsList = DOM.$('resultsList');
    const resultsSummary = DOM.$('resultsSummary');
    const searchCancel = DOM.$('searchCancel');

    const qRaw = (searchInput && searchInput.value) ? searchInput.value.trim() : '';
    if (!qRaw) { showError('Zadej hledaný text.'); return; }
    const query = qRaw.toLowerCase();
    state.searchResults = [];
    resultsList.innerHTML = '';
    resultsSummary.textContent = 'Probíhá...';
    resultsPanel.style.display = 'flex';
    searchCancel.style.display = 'inline-block';
    state.searchAbortController = new AbortController();
    const options = { recursive: searchRecursive && searchRecursive.checked, searchTextOnly: searchTextOnly && searchTextOnly.checked, searchNames: true };

    try {
        const rootHandle = panel === 'left' ? (state.leftStack && state.leftStack[0]) : (state.rightStack && state.rightStack[0]);
        if (!rootHandle) { showError('Neotevřen žádný root pro panel ' + panel); return; }
        const chunkResults = await searchInDirectory(panel, rootHandle, '', query, options);
        state.searchResults.push(...chunkResults);
        if (state.searchResults.length >= CONSTANTS.SEARCH_RESULTS_CAP) showError('Počet výsledků dosáhl limitu (' + CONSTANTS.SEARCH_RESULTS_CAP + ').', true);
        await renderResultsUI();
    } catch (e) {
        if (state.searchAbortController && state.searchAbortController.signal.aborted) showError('Hledání zrušeno.', false);
        else showError('Chyba při hledání.');
    } finally {
        if (searchCancel) searchCancel.style.display = 'none';
        state.searchAbortController = null;
    }
}

