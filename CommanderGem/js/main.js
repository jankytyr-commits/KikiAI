/* main.js - Entry Point */
import { state, DOM } from './state.js';
alert('Main loaded');
import { ensureJSZip, createZipNodeFromFileHandle } from './zip-ops.js';
import { refreshAll, refreshPanel, pickFor, attachDropHandlers, toggleSort, showMetadataForHandle, extractSelectedTo } from './ui-v2.js';
import { setupEventListeners } from './events.js';
import { setUI } from './fs-ops.js';

// Inject UI dependencies to break circular loop
setUI(refreshPanel, refreshAll);
import { tryRestoreHandle, idbGet, showError } from './utils.js';
import { openFile, closeEditorModal } from './viewer.js';
import { copyToOther, moveToOther, getHandleByName } from './fs-ops.js';

/* ===== Initialization ===== */
window.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('[main] DOMContentLoaded fired');

        // 1. Load JSZip
        console.log('[main] Loading JSZip');
        await ensureJSZip();

        // 2. Restore State
        console.log('[main] Restoring state');
        const lr = await tryRestoreHandle('leftRoot'); if (lr) { state.leftHandle = lr; state.leftCurrent = lr; state.leftStack = [lr]; }
        const rr = await tryRestoreHandle('rightRoot'); if (rr) { state.rightHandle = rr; state.rightCurrent = rr; state.rightStack = [rr]; }

        try { const ls = await idbGet('leftSort').catch(() => null); if (ls && ls.by) state.leftSort = ls; } catch (e) { }
        try { const rs = await idbGet('rightSort').catch(() => null); if (rs && rs.by) state.rightSort = rs; } catch (e) { }
        try { const p = await idbGet('basePrefix'); if (p) state.basePathPrefixVal = p; } catch (_) { }

        // 3. Setup UI
        console.log('[main] Setting up UI');
        const saveFileBtn = DOM.$('saveFile');
        const viewAsTextBtn = DOM.$('viewAsText');
        if (saveFileBtn) saveFileBtn.style.display = 'none';
        if (viewAsTextBtn) viewAsTextBtn.style.display = 'none';

        attachDropHandlers(DOM.$('leftList'), 'left');
        attachDropHandlers(DOM.$('rightList'), 'right');

        // 4. Setup Events
        console.log('[main] Setting up event listeners');
        setupEventListeners();

        // 5. Initial Refresh
        console.log('[main] Calling refreshAll');
        await refreshAll();
        console.log('[main] refreshAll completed');

        // 6. Expose debug helpers
        window.__mc = Object.assign(window.__mc || {}, {
            refreshAll, refreshPanel, openFile, pickFor, getHandleByName, copyToOther, moveToOther, toggleSort, closeEditorModal, extractSelectedTo, state
        });

        // 7. Helper wrapper to open zip file handle as zip-node (used by some external scripts or console?)
        // We keep it for compatibility if needed, or just for robustness
        window.__mc_openOrEnter = async function (panel, maybeHandle) {
            try {
                if (maybeHandle && typeof maybeHandle.getFile === 'function') {
                    const f = await maybeHandle.getFile();
                    const ext = (f.name.split('.').pop() || '').toLowerCase();
                    if (ext === 'zip' || (f.type && f.type.includes('zip'))) {
                        if (typeof JSZip === 'undefined' || window.__MC_JSZIP_AVAILABLE === false) { showError('JSZip není dostupný — ZIP nelze otevřít.', true); return; }
                        const zipNode = await createZipNodeFromFileHandle(maybeHandle);
                        if (panel === 'left') { state.leftStack = state.leftStack && state.leftStack.length ? state.leftStack : (state.leftHandle ? [state.leftHandle] : []); state.leftStack.push(zipNode); state.leftCurrent = zipNode; state.selectedLeft.clear(); }
                        else { state.rightStack = state.rightStack && state.rightStack.length ? state.rightStack : (state.rightHandle ? [state.rightHandle] : []); state.rightStack.push(zipNode); state.rightCurrent = zipNode; state.selectedRight.clear(); }
                        await refreshPanel(panel); return;
                    }
                }
                if (maybeHandle) openFile(maybeHandle);
            } catch (e) { console.warn('openOrEnter wrapper failed', e); }
        };

    } catch (e) { console.warn('init restore error', e); }
});
