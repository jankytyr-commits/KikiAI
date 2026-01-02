/* state.js */

export const state = {
    leftHandle: null,
    rightHandle: null,
    leftCurrent: null,
    rightCurrent: null,
    leftStack: [],
    rightStack: [],
    selectedLeft: new Set(),
    selectedRight: new Set(),
    activePanel: 'left',
    editorFileHandle: null,
    editorBlobUrl: null,
    basePathPrefixVal: '',

    /* Sorting */
    leftSort: { by: 'name', dir: 1 },
    rightSort: { by: 'name', dir: 1 },

    /* Search */
    searchResults: [],
    searchAbortController: null
};

export const CONSTANTS = {
    DB_NAME: 'mini-commander',
    DB_STORE: 'handles',
    TEXT_EXTS: new Set([
        'txt', 'md', 'markdown', 'json', 'js', 'ts', 'css', 'gitignore', 'py', 'java', 'cs', 'csproj', 'sln', 'vb', 'c', 'cpp', 'h', 'hpp',
        'rb', 'php', 'sh', 'bat', 'cmd', 'ps1', 'csv', 'log', 'xml', 'xsd', 'xsl', 'html', 'htm', 'yaml', 'yml', 'ini', 'cfg', 'config',
        'gradle', 'properties', 'dockerfile', 'toml', 'makefile', 'mk', 'props', 'targets', 'cshtml', 'aspx', 'sql', 'pyw',
        'jsx', 'tsx', 'erl', 'ex', 'exs', 'clj', 'cljc', 'scala', 'kt', 'kts', 'xaml'
    ]),
    IMAGE_EXTS: new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif', 'tiff', 'tif', 'svg']),
    SEARCH_RESULTS_CAP: 2000,
    MAX_READ_BYTES: 5 * 1024 * 1024,
    BIG_FILE_THRESHOLD: 5 * 1024 * 1024
};

export const DOM = {
    $: (id) => document.getElementById(id)
};
