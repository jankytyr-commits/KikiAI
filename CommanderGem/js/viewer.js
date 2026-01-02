/* viewer.js */
import { state, CONSTANTS, DOM } from './state.js';
import { extOf, formatBytes, showError, iconForExt } from './utils.js';
import { createZipNodeFromFileHandle } from './zip-ops.js';
import { refreshPanel } from './ui-v2.js'; // Circular dependency, but should work if not called at top level

/* ===== Viewer helpers ===== */
export async function showBinaryViewFromFile(file, initialEncoding = 'utf-8') {
    try {
        const editorArea = DOM.$('editorArea');
        const editorImage = DOM.$('editorImage');
        const viewerPathEl = DOM.$('viewerPath');
        const editorModal = DOM.$('editorModal');
        const saveFileBtn = DOM.$('saveFile');

        const arr = await file.arrayBuffer();
        const bytes = new Uint8Array(arr);
        const encSelector = createOrGetEncodingSelector();
        encSelector.value = initialEncoding;
        function render(enc) {
            if (enc === 'utf-8') {
                try { const dec = new TextDecoder('utf-8', { fatal: false }); const txt = dec.decode(arr); editorArea.style.display = 'block'; editorArea.value = txt; } catch (e) { editorArea.style.display = 'block'; editorArea.value = '[Chyba dekódování UTF-8]'; }
            } else if (enc === 'ascii') {
                let s = '';
                for (let i = 0; i < bytes.length; i++) { const b = bytes[i]; s += (b <= 0x7f) ? String.fromCharCode(b) : ' '; }
                editorArea.style.display = 'block'; editorArea.value = s;
            } else {
                editorArea.style.display = 'block'; editorArea.value = '[Nepodporované kódování]';
            }
        }
        encSelector.onchange = () => render(encSelector.value);
        render(initialEncoding);
        editorImage.style.display = 'none';
        viewerPathEl.style.display = 'block';
        editorModal.style.display = 'flex';
        if (saveFileBtn) saveFileBtn.style.display = 'inline-block';
    } catch (e) { console.error('showBinaryViewFromFile failed', e); showError('Nelze zobrazit binární/tekstový pohled.'); }
}

function createOrGetEncodingSelector() {
    try {
        const existing = document.getElementById('encodingSelector');
        if (existing) return existing;
        const sel = document.createElement('select');
        sel.id = 'encodingSelector';
        const opt1 = document.createElement('option'); opt1.value = 'utf-8'; opt1.textContent = 'UTF-8';
        const opt2 = document.createElement('option'); opt2.value = 'ascii'; opt2.textContent = 'ASCII (bytes>127 =>  )';
        sel.appendChild(opt1); sel.appendChild(opt2);
        sel.style.marginLeft = '10px';
        const viewerPathEl = DOM.$('viewerPath');
        const editorModal = DOM.$('editorModal');
        if (viewerPathEl && viewerPathEl.parentNode) viewerPathEl.parentNode.insertBefore(sel, viewerPathEl.nextSibling);
        else (editorModal.querySelector('.card') || editorModal).appendChild(sel);
        return sel;
    } catch (e) { return document.getElementById('encodingSelector'); }
}

export function removeEncodingSelector() { try { const s = document.getElementById('encodingSelector'); if (s) s.remove(); } catch (e) { } }

export async function showTextView(file) {
    try {
        const editorArea = DOM.$('editorArea');
        const editorImage = DOM.$('editorImage');
        const viewerPathEl = DOM.$('viewerPath');
        const editorModal = DOM.$('editorModal');
        const saveFileBtn = DOM.$('saveFile');

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
export async function openFile(handleOrZipRef) {
    if (!handleOrZipRef) return;

    const editorFilename = DOM.$('editorFilename');
    const editorPath = DOM.$('editorPath');
    const editorArea = DOM.$('editorArea');
    const viewerPathEl = DOM.$('viewerPath');
    const editorModal = DOM.$('editorModal');
    const saveFileBtn = DOM.$('saveFile');
    const editorImage = DOM.$('editorImage');
    const viewAsTextBtn = DOM.$('viewAsText');

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
            state.editorFileHandle = null;
            const virtualPath = (handleOrZipRef.zipObj && handleOrZipRef.zipObj.name) ? (handleOrZipRef.zipObj.name + ':' + handleOrZipRef.zipPath) : handleOrZipRef.zipPath;
            editorFilename.textContent = handleOrZipRef.name || handleOrZipRef.zipPath;
            editorPath.textContent = (state.basePathPrefixVal ? state.basePathPrefixVal + '/' : '') + virtualPath;
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
                    editorPath.textContent = (state.basePathPrefixVal ? state.basePathPrefixVal + '/' : '') + maybeFile.name;
                    editorArea.style.display = 'block';
                    editorArea.value = `[Soubor ZIP; JSZip není dostupný. Můžeš stáhnout (Stáhnout / Uložit jako).]\n${editorPath.textContent || ''}`;
                    viewerPathEl.style.display = 'block'; viewerPathEl.textContent = editorPath.textContent || '';
                    editorModal.style.display = 'flex';
                    state.editorBlobUrl = null;
                    if (saveFileBtn) saveFileBtn.style.display = 'none';
                    return;
                }
                // create zip node and enter it
                const zipNode = await createZipNodeFromFileHandle(handleOrZipRef);
                if (state.activePanel === 'left') {
                    state.leftStack = state.leftStack && state.leftStack.length ? state.leftStack : (state.leftHandle ? [state.leftHandle] : []);
                    state.leftStack.push(zipNode); state.leftCurrent = zipNode; state.selectedLeft.clear();
                } else {
                    state.rightStack = state.rightStack && state.rightStack.length ? state.rightStack : (state.rightHandle ? [state.rightHandle] : []);
                    state.rightStack.push(zipNode); state.rightCurrent = zipNode; state.selectedRight.clear();
                }
                await refreshPanel(state.activePanel);
                return;
            }
            // not a zip -> normal file
            f = maybeFile;
            state.editorFileHandle = handleOrZipRef;
            const stack = state.activePanel === 'left' ? state.leftStack : state.rightStack;
            const virtualPath = (stack && stack.length ? stack.map(h => h.name || '<root>').join('/') + '/' : '') + f.name;
            editorFilename.textContent = f.name;
            editorPath.textContent = (state.basePathPrefixVal ? state.basePathPrefixVal + '/' : '') + virtualPath;
        } else if (handleOrZipRef instanceof Blob) {
            f = handleOrZipRef;
            state.editorFileHandle = null;
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
        const isImage = type.startsWith('image/') || CONSTANTS.IMAGE_EXTS.has(ext);
        const isAudio = type.startsWith('audio/');
        const isVideo = type.startsWith('video/');
        const isPdf = type === 'application/pdf' || ext === 'pdf';
        const isHtml = type === 'text/html' || ext === 'html' || ext === 'htm';
        const isText = type.startsWith('text/') || CONSTANTS.TEXT_EXTS.has(ext) || ext === '';

        // Show 'Zobrazit kód' (view as text/hex) for non-media files (XAML, config, logs etc.)
        try {
            if (viewAsTextBtn) {
                if (!isImage && !isAudio && !isVideo && !isPdf) {
                    viewAsTextBtn.style.display = 'inline-block';
                    viewAsTextBtn.textContent = 'Zobrazit kód';
                    viewAsTextBtn.onclick = () => showBinaryViewFromFile(f, 'utf-8');
                } else {
                    viewAsTextBtn.style.display = 'none';
                }
            }
        } catch (e) { console.warn('setting viewAsTextBtn failed', e); }

        if (saveFileBtn) saveFileBtn.style.display = isText ? 'inline-block' : 'none';
        if (viewAsTextBtn) viewAsTextBtn.style.display = 'none';

        // show everything inline unless special-case (we lifted the 1MB block; now 5MB threshold applies only to non-media)
        if (!isImage && !isHtml && !isAudio && !isVideo && !isPdf && !isText && typeof f.size === 'number' && f.size > CONSTANTS.BIG_FILE_THRESHOLD) {
            editorArea.style.display = 'block';
            editorArea.value = `[Soubor ${formatBytes(f.size)} přesahuje limit ${formatBytes(CONSTANTS.BIG_FILE_THRESHOLD)}; nelze zobrazit inline. Použij "Stáhnout" nebo "Uložit jako".]\n${editorPath.textContent || ''}`;
            viewerPathEl.style.display = 'block'; viewerPathEl.textContent = editorPath.textContent || '';
            editorModal.style.display = 'flex';
            state.editorBlobUrl = null;
            if (saveFileBtn) saveFileBtn.style.display = 'none';
            return;
        }

        // IMAGE
        if (isImage) {
            const url = URL.createObjectURL(f);
            state.editorBlobUrl = url;
            editorImage.src = url;
            editorImage.style.display = 'block';
            editorArea.style.display = 'none';
            viewerPathEl.style.display = 'block'; viewerPathEl.textContent = editorPath.textContent || '';
            editorModal.style.display = 'flex';
            tryCreateOpenInTabButton(url);
            editorImage.onload = () => { };
            editorImage.onerror = async () => {
                editorImage.style.display = 'none';
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
            state.editorBlobUrl = url;
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
            state.editorBlobUrl = url;
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
                        iframe.remove();
                        editorArea.style.display = 'block'; editorArea.value = decoded;
                        viewAsTextBtn.textContent = 'Zobrazit náhled';
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
                viewAsTextBtn.textContent = 'Zobrazit kód';
                viewAsTextBtn.onclick = () => showTextView(f);
            }
            const txt = await (typeof f.text === 'function' ? f.text() : (new Response(f)).text());
            editorArea.style.display = 'block';
            editorArea.value = txt;
            editorImage.style.display = 'none';
            viewerPathEl.style.display = 'block'; viewerPathEl.textContent = editorPath.textContent || '';
            editorModal.style.display = 'flex';
            if (saveFileBtn) saveFileBtn.style.display = 'inline-block';
            return;
        }

        // fallback
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

/* revoke blob */
export function revokeEditorBlob() { if (state.editorBlobUrl) { try { URL.revokeObjectURL(state.editorBlobUrl); } catch (_) { } state.editorBlobUrl = null; } }

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
        const editorModal = DOM.$('editorModal');
        const container = editorModal.querySelector('.meta div[style*="display:flex"]') || editorModal.querySelector('.meta') || editorModal;
        if (container) container.appendChild(btn);
    } catch (e) { console.warn('open-in-tab button failed', e); }
}

function showImageFallbackMessage(blobUrl, filename, fullPath, fileObj) {
    try {
        const editorArea = DOM.$('editorArea');
        const editorModal = DOM.$('editorModal');
        const viewAsTextBtn = DOM.$('viewAsText');
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
export function triggerDownload(blobOrFile, filename) {
    try {
        const blob = blobOrFile instanceof Blob ? blobOrFile : new Blob([blobOrFile], { type: (blobOrFile && blobOrFile.type) || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename || 'file'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) { } }, 15000);
    } catch (e) { console.warn('download error', e); }
}

/* saveEditor */
export async function saveEditor() {
    const editorArea = DOM.$('editorArea');
    if (editorArea && editorArea.style && editorArea.style.display === 'block') {
        if (!state.editorFileHandle) return showError('Žádný otevřený soubor k uložení.');
        try {
            const w = await state.editorFileHandle.createWritable();
            await w.write(new Blob([editorArea.value], { type: 'text/plain;charset=utf-8' }));
            await w.close();
            showError('Uloženo.', false);
        } catch (e) { showError('Chyba při ukládání: ' + (e && e.message ? e.message : e)); }
    } else {
        await saveAs();
    }
}

/* saveAs */
export async function saveAs() {
    const editorFilename = DOM.$('editorFilename');
    const editorArea = DOM.$('editorArea');
    try {
        const suggested = editorFilename.textContent || 'file.bin';
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({ suggestedName: suggested });
                const writable = await handle.createWritable();
                if (editorArea && editorArea.style && editorArea.style.display === 'block') {
                    await writable.write(editorArea.value);
                } else if (state.editorFileHandle) {
                    const f = await state.editorFileHandle.getFile();
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
        } else if (state.editorFileHandle) {
            const f = await state.editorFileHandle.getFile();
            triggerDownload(f, name);
        } else {
            triggerDownload(new Blob([]), name);
        }
        showError('Staženo (fallback).', true);
    } catch (e) { showError('Chyba Uložit jako: ' + (e && e.message ? e.message : e)); }
}

/* modal close handlers & cleanup */
let _closing = false;
export function closeEditorModal() {
    const editorModal = DOM.$('editorModal');
    const editorImage = DOM.$('editorImage');
    const editorArea = DOM.$('editorArea');
    const viewerPathEl = DOM.$('viewerPath');
    const toggleFullBtn = DOM.$('toggleFull');
    const saveFileBtn = DOM.$('saveFile');
    const viewAsTextBtn = DOM.$('viewAsText');

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
