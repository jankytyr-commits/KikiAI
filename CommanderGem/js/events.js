function handleKeyboardNav(e) {
    const panel = state.activePanel;
    const listId = panel === 'left' ? 'leftList' : 'rightList';
    const listEl = DOM.$(listId);
    if (!listEl) return;

    const entries = Array.from(listEl.querySelectorAll('.entry'));
    if (entries.length === 0) return;

    const selSet = panel === 'left' ? state.selectedLeft : state.selectedRight;

    // Find currently focused/selected index
    // If multiple selected, we take the last one in the DOM order as "focused" usually
    let focusedIndex = -1;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const name = entry.querySelector('.name').textContent + (entry.querySelector('.ext').textContent ? '.' + entry.querySelector('.ext').textContent : '');
        // Note: DOM name might differ from internal name if we strip extension in UI. 
        // Better to use the __entry property we attached in ui.js
        if (entry.__entry && selSet.has(entry.__entry.name)) {
            focusedIndex = i;
        }
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = focusedIndex + 1;
        if (nextIndex < entries.length) {
            const nextEntry = entries[nextIndex];
            if (nextEntry.__entry) {
                if (!e.shiftKey) selSet.clear();
                selSet.add(nextEntry.__entry.name);
                refreshPanel(panel).then(() => {
                    // We need to find the element again after refresh because DOM is rebuilt
                    const newList = DOM.$(listId);
                    const newEntries = newList.querySelectorAll('.entry');
                    if (newEntries[nextIndex]) newEntries[nextIndex].scrollIntoView({ block: 'nearest' });
                });
            }
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = focusedIndex - 1;
        if (prevIndex >= 0) {
            const prevEntry = entries[prevIndex];
            if (prevEntry.__entry) {
                if (!e.shiftKey) selSet.clear();
                selSet.add(prevEntry.__entry.name);
                refreshPanel(panel).then(() => {
                    const newList = DOM.$(listId);
                    const newEntries = newList.querySelectorAll('.entry');
                    if (newEntries[prevIndex]) newEntries[prevIndex].scrollIntoView({ block: 'nearest' });
                });
            }
        }
    } else if (e.key === 'Insert') {
        e.preventDefault();
        // Toggle current, move down
        if (focusedIndex === -1 && entries.length > 0) focusedIndex = 0;
        if (focusedIndex >= 0 && focusedIndex < entries.length) {
            const entry = entries[focusedIndex];
            if (entry.__entry) {
                if (selSet.has(entry.__entry.name)) selSet.delete(entry.__entry.name);
                else selSet.add(entry.__entry.name);

                const nextIndex = focusedIndex + 1;
                // If we are not at the end, move "focus" to next (but don't select it yet, just move cursor conceptually? 
                // In this simple model, selection IS focus. So we might want to just keep selection on current or move to next?
                // Total Commander Insert: Selects current, moves cursor down. The cursor is separate from selection.
                // We don't have separate cursor state yet. We will just select current and move selection to next? 
                // No, that would select the next one too.
                // For now: Just toggle selection. Moving down requires separate cursor state which is Phase 2.
                refreshPanel(panel);
            }
        }
    }
}

export function setupEventListeners() {
    /* wiring */
    const pickLeft = DOM.$('pickLeft'); if (pickLeft) pickLeft.onclick = () => { state.activePanel = 'left'; pickFor('left'); };
    const pickRight = DOM.$('pickRight'); if (pickRight) pickRight.onclick = () => { state.activePanel = 'right'; pickFor('right'); };
    const refreshAllBtn = DOM.$('refreshAll'); if (refreshAllBtn) refreshAllBtn.onclick = refreshAll;

    const leftNewFileBtn = DOM.$('leftNewFile'); if (leftNewFileBtn) leftNewFileBtn.onclick = () => createNew('left', 'file');
    const leftNewDirBtn = DOM.$('leftNewDir'); if (leftNewDirBtn) leftNewDirBtn.onclick = () => createNew('left', 'dir');
    const rightNewFileBtn = DOM.$('rightNewFile'); if (rightNewFileBtn) rightNewFileBtn.onclick = () => createNew('right', 'file');
    const rightNewDirBtn = DOM.$('rightNewDir'); if (rightNewDirBtn) rightNewDirBtn.onclick = () => createNew('right', 'dir');

    const saveFileBtn = DOM.$('saveFile');
    if (saveFileBtn) saveFileBtn.onclick = () => {
        try {
            const editorArea = DOM.$('editorArea');
            if (editorArea && editorArea.style && editorArea.style.display === 'block') {
                if (confirm('Opravdu chcete přepsat soubor?')) saveEditor();
            } else {
                saveAs();
            }
        } catch (e) { }
    };

    const saveAsBtn = DOM.$('saveAsFile'); if (saveAsBtn) saveAsBtn.onclick = saveAs;

    /* toggle full button */
    const toggleFullBtn = DOM.$('toggleFull');
    const editorModal = DOM.$('editorModal');
    if (toggleFullBtn) toggleFullBtn.onclick = () => { const c = editorModal.querySelector('.card'); if (!c) return; c.classList.toggle('fullscreen'); toggleFullBtn.textContent = c.classList.contains('fullscreen') ? 'Obnovit' : 'Maximalizovat'; };

    /* download button */
    const downloadBtn = DOM.$('downloadFile');
    if (downloadBtn) downloadBtn.addEventListener('click', async (ev) => {
        try {
            ev.preventDefault(); ev.stopPropagation();
            if (state.editorFileHandle) {
                const f = await state.editorFileHandle.getFile();
                triggerDownload(f, f.name);
            } else {
                showError('Chyba: žádný handle pro stažení.', false);
            }
        } catch (e) { showError('Chyba při stahování: ' + (e && e.message ? e.message : e)); }
    });

    /* search buttons */
    const searchCancel = DOM.$('searchCancel'); if (searchCancel) searchCancel.onclick = () => { if (state.searchAbortController) state.searchAbortController.abort(); searchCancel.style.display = 'none'; showError('Hledání zrušeno.', false); };
    const resultsHide = DOM.$('resultsHide'); if (resultsHide) resultsHide.onclick = () => { DOM.$('resultsPanel').style.display = 'none'; };
    const resultsClear = DOM.$('resultsClear'); if (resultsClear) resultsClear.onclick = () => { state.searchResults = []; DOM.$('resultsList').innerHTML = ''; DOM.$('resultsSummary').textContent = ''; DOM.$('resultsPanel').style.display = 'none'; };
    const searchLeft = DOM.$('searchLeft'); if (searchLeft) searchLeft.onclick = () => runSearch('left');
    const searchRight = DOM.$('searchRight'); if (searchRight) searchRight.onclick = () => runSearch('right');

    /* extract button */
    const extractToBtn = DOM.$('extractTo'); // might not exist in HTML yet?
    if (extractToBtn) extractToBtn.addEventListener('click', (ev) => { ev.preventDefault(); extractSelectedTo(state.activePanel); });

    /* meta close */
    const metaClose = DOM.$('metaClose'); if (metaClose) metaClose.onclick = () => { const mm = DOM.$('metaModal'); if (mm) mm.style.display = 'none'; };

    /* error dismiss */
    const errDismiss = DOM.$('errDismiss'); if (errDismiss) errDismiss.onclick = () => { DOM.$('errorBar').style.display = 'none'; };

    /* Global Keyboard Shortcuts */
    window.addEventListener('keydown', e => {
        const anyModalOpen = editorModal && editorModal.style && editorModal.style.display === 'flex';
        const tag = (e.target && e.target.tagName || '').toLowerCase();
        if (anyModalOpen || tag === 'input' || tag === 'textarea') return;

        const panel = state.activePanel;
        const sel = panel === 'left' ? state.selectedLeft : state.selectedRight;

        // Navigation
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Insert') {
            handleKeyboardNav(e);
            return;
        }
        if (e.key === 'Tab') {
            e.preventDefault();
            state.activePanel = state.activePanel === 'left' ? 'right' : 'left';
            // Visual feedback for active panel?
            // Currently we don't have a strong visual indicator other than selection color.
            // We could add a class to the panel.
            DOM.$('leftPanel').classList.toggle('active', state.activePanel === 'left');
            DOM.$('rightPanel').classList.toggle('active', state.activePanel === 'right');
            return;
        }

        // Actions
        if (e.key === 'F5') { e.preventDefault(); if (sel.size) bulkCopy(panel, Array.from(sel)); }
        if (e.key === 'F6') { e.preventDefault(); if (sel.size) bulkMove(panel, Array.from(sel)); }
        if (e.key === 'F8') { e.preventDefault(); if (sel.size) bulkDelete(panel, Array.from(sel)); }
        if (e.key === 'F9') { e.preventDefault(); if (sel.size) extractSelectedTo(panel); }
        if (e.key === 'F2') { e.preventDefault(); if (sel.size === 1) renameByName(panel, Array.from(sel)[0]); }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (sel.size === 1) {
                getHandleByName(panel, Array.from(sel)[0]).then(h => {
                    if (h.kind === 'directory') enterDir(panel, Array.from(sel)[0], h);
                    else { state.activePanel = panel; openFile(h); }
                }).catch(() => { });
            }
        }
        if (e.key.toLowerCase() === 'i') { e.preventDefault(); if (sel.size === 1) getHandleByName(panel, Array.from(sel)[0]).then(h => { showMetadataForHandle(h, panel); }).catch(() => { }); }
    });

    /* Editor Close Handlers */
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

    wireEditorCloseHandlers();
}
