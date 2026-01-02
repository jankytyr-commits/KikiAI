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
