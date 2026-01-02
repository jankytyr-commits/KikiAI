import { state } from './state.js';
import { showError } from './utils.js';
import { isZipNode, listZipEntriesAt } from './zip-ops.js';
import { openFile } from './viewer.js';

let __refreshPanel = async () => { };
let __refreshAll = async () => { };

export function setUI(_refreshPanel, _refreshAll) {
    __refreshPanel = _refreshPanel;
    __refreshAll = _refreshAll;
}

/* ===== File ops helpers ===== */
export async function ensureRW(dir) {
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

/* getHandleByName supports zip */
export async function getHandleByName(panel, name) {
    const cur = panel === 'left' ? state.leftCurrent : state.rightCurrent;
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

/* copyToOther supports zip entries */
export async function copyToOther(fromPanel, name, handle) {
    const target = fromPanel === 'left' ? state.rightCurrent : state.leftCurrent;
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
        await _refreshAll();
    } catch (e) { showError('Chyba kopírování: ' + (e && e.message ? e.message : e)); }
}

/* moveToOther */
export async function moveToOther(fromPanel, name, handle) {
    const src = fromPanel === 'left' ? state.leftCurrent : state.rightCurrent;
    const target = fromPanel === 'left' ? state.rightCurrent : state.leftCurrent;
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
        await _refreshAll();
    } catch (e) { showError('Chyba přesunu: ' + (e && e.message ? e.message : e)); }
}

/* deleteEntry */
export async function deleteEntry(panel, name) {
    const cur = panel === 'left' ? state.leftCurrent : state.rightCurrent;
    if (!cur) return;
    if (!confirm(`Opravdu chcete smazat '${name}'? (Ano/Ne)`)) return;
    try {
        if (isZipNode(cur)) {
            alert('Mazání uvnitř ZIP není podporováno.');
            return;
        }
        if ('removeEntry' in cur) await cur.removeEntry(name, { recursive: true });
        await _refreshPanel(panel);
    } catch (e) { showError('Chyba mazání: ' + (e && e.message ? e.message : e)); }
}

/* CRUD helpers */
export async function createNew(panel, type) { const cur = panel === 'left' ? state.leftCurrent : state.rightCurrent; if (!cur) return alert('Otevři panel nejdřív'); const name = prompt('Název ' + (type === 'dir' ? 'složky' : 'souboru')); if (!name) return; try { if (type === 'dir') await cur.getDirectoryHandle(name, { create: true }); else { const fh = await cur.getFileHandle(name, { create: true }); const w = await fh.createWritable(); await w.close(); } await _refreshPanel(panel); } catch (e) { showError('Chyba při vytváření: ' + (e && e.message ? e.message : e)); } }

export async function renameByName(panel, name) { const cur = panel === 'left' ? state.leftCurrent : state.rightCurrent; if (!cur) return; const handle = await getHandleByName(panel, name).catch(() => null); if (!handle) return; const newName = prompt('Nové jméno', name); if (!newName || newName === name) return; try { if (handle.kind === 'file') { const f = await handle.getFile(); const nh = await cur.getFileHandle(newName, { create: true }); const w = await nh.createWritable(); await w.write(await f.arrayBuffer()); await w.close(); if ('removeEntry' in cur) await cur.removeEntry(name); } else { await copyDirRecursive(handle, cur, newName); if ('removeEntry' in cur) await cur.removeEntry(name, { recursive: true }); } await _refreshPanel(panel); } catch (e) { showError('Chyba při přejmenování: ' + (e && e.message ? e.message : e)); } }

export async function bulkCopy(panel, names) { for (const n of names) { try { const h = await getHandleByName(panel, n); await copyToOther(panel, n, h); } catch (e) { console.warn('bulk copy failed', n, e); } } await _refreshAll(); }
export async function bulkMove(panel, names) { for (const n of names) { try { const h = await getHandleByName(panel, n); await moveToOther(panel, n, h); } catch (e) { console.warn('bulk move failed', n, e); } } await _refreshAll(); }
export async function bulkDelete(panel, names) { for (const n of names) { try { await deleteEntry(panel, n); } catch (e) { console.warn('bulk delete failed', n, e); } } await _refreshPanel(panel); }

/* ZIP extract selected to target dir */
export async function extractSelectedTo(panel) {
    try {
        const sel = panel === 'left' ? Array.from(state.selectedLeft) : Array.from(state.selectedRight);
        if (sel.length === 0) return alert('Vyber položky v ZIPu, které chceš rozbalit.');
        const cur = panel === 'left' ? state.leftCurrent : state.rightCurrent;
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
        await _refreshPanel(panel);
    } catch (e) { console.error('extractSelectedTo failed', e); showError('Chyba při extrakci: ' + (e && e.message ? e.message : e)); }
}

export function enterDir(panel, name, handle) {
    if (panel === 'left') {
        if (!state.leftStack || state.leftStack.length === 0) { if (state.leftHandle) state.leftStack = [state.leftHandle]; else state.leftStack = []; }
        state.leftStack.push(handle); state.leftCurrent = handle; state.selectedLeft.clear();
    } else {
        if (!state.rightStack || state.rightStack.length === 0) { if (state.rightHandle) state.rightStack = [state.rightHandle]; else state.rightStack = []; }
        state.rightStack.push(handle); state.rightCurrent = handle; state.selectedRight.clear();
    }
    _refreshPanel(panel);
}

export function multiAwareContextMenu(panel, name, handle) {
    const action = prompt('Akce: open / copy / move / rename / delete / info / extract', 'open');
    if (!action) return;
    if (action === 'open') { if (handle.kind === 'file' || handle.kind === 'zip-entry' || handle.zipPath) { state.activePanel = panel; openFile(handle); } else enterDir(panel, name, handle); }
    if (action === 'copy') copyToOther(panel, name, handle);
    if (action === 'move') moveToOther(panel, name, handle);
    if (action === 'rename') renameByName(panel, name);
    if (action === 'delete') deleteEntry(panel, name);
    if (action === 'info') alert('Info zatím není implementováno v modulech'); // TODO: move showMetadataForHandle to viewer or ui
    if (action === 'extract') extractSelectedTo(panel);
}
