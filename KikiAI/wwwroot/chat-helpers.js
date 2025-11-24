// ============================================
// API Communication Functions
// ============================================

let isSearchEnabled = false;
let currentImage = null; // Store uploaded image data

// ============================================
// Image Upload Functions
// ============================================

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        addNotification('Error', 'Obrázek je příliš velký. Maximum je 10MB.');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result;
        currentImage = {
            data: base64Data,
            mimeType: file.type,
            name: file.name,
            uploadedFile: null
        };

        // Show preview
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#2c2c2c;border-radius:4px;">
                <img src="${base64Data}" style="max-width:100px;max-height:100px;border-radius:4px;" />
                <span style="flex:1;font-size:0.9em;">${file.name}</span>
                <button onclick="removeImage()" style="background:#ff6b6b;border:none;color:white;padding:4px 8px;border-radius:4px;cursor:pointer;">✕</button>
            </div>
        `;
        preview.style.display = 'block';
        addNotification('Success', `Obrázek "${file.name}" nahrán.`);

        // Save to server for permanent storage (but don't insert link yet)
        if (currentSessionId) {
            try {
                const uploadResp = await fetch(`/api/chat/session/${currentSessionId}/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: file.name,
                        fileData: base64Data.split(',')[1],
                        mimeType: file.type
                    })
                });

                const uploadResult = await uploadResp.json();
                if (uploadResult.success) {
                    currentImage.uploadedFile = uploadResult.file;
                }
            } catch (err) {
                console.error('Failed to save image to server:', err);
            }
        }
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    currentImage = null;
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imageInput').value = '';
    document.getElementById('fileInput').value = '';
    addNotification('Info', 'Soubor odstraněn.');
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Determine if file is text or binary
    const textExtensions = ['.txt', '.cs', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.xml', '.json', '.html', '.css', '.md', '.sql', '.sh', '.bat', '.ps1', '.jsx', '.tsx', '.vue', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'];
    const binaryExtensions = ['.pdf'];

    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    const isTextFile = textExtensions.includes(fileExt);
    const isBinaryFile = binaryExtensions.includes(fileExt) || file.type.startsWith('image/');

    if (isTextFile) {
        // TEXT FILE - Read and insert into message
        const maxSize = 1 * 1024 * 1024; // 1MB for text files
        if (file.size > maxSize) {
            addNotification('Error', 'Textový soubor je příliš velký. Maximum je 1MB.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const fileContent = e.target.result;
            const currentText = input.value.trim();

            // Detect language for syntax highlighting hint
            const langMap = {
                '.cs': 'csharp', '.js': 'javascript', '.ts': 'typescript', '.py': 'python',
                '.java': 'java', '.cpp': 'cpp', '.c': 'c', '.h': 'c', '.xml': 'xml',
                '.json': 'json', '.html': 'html', '.css': 'css', '.md': 'markdown',
                '.sql': 'sql', '.sh': 'bash', '.bat': 'batch', '.ps1': 'powershell'
            };
            const lang = langMap[fileExt] || '';

            // Insert file content into textarea
            const fileBlock = `\n\n**Soubor: ${file.name}**\n\`\`\`${lang}\n${fileContent}\n\`\`\`\n`;
            input.value = currentText + fileBlock;
            input.focus();

            addNotification('Success', `Obsah souboru "${file.name}" vložen do zprávy.`);
            event.target.value = ''; // Reset input
        };
        reader.onerror = () => {
            addNotification('Error', 'Nepodařilo se přečíst soubor.');
            event.target.value = '';
        };
        reader.readAsText(file);

    } else if (isBinaryFile) {
        // BINARY FILE (PDF, images) - Upload to server and create link
        const maxSize = file.type === 'application/pdf' ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
            addNotification('Error', `Soubor je příliš velký. Maximum je ${maxSize / (1024 * 1024)}MB.`);
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target.result;

            // Upload file to server
            try {
                if (!currentSessionId) {
                    addNotification('Warn', 'Nejprve zahajte chat.');
                    event.target.value = '';
                    return;
                }

                const uploadResp = await fetch(`/api/chat/session/${currentSessionId}/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: file.name,
                        fileData: base64Data.split(',')[1],
                        mimeType: file.type
                    })
                });

                const uploadResult = await uploadResp.json();
                if (uploadResult.success) {
                    currentImage = {
                        data: base64Data,
                        mimeType: file.type,
                        name: file.name,
                        uploadedFile: uploadResult.file
                    };
                    addNotification('Success', `Soubor "${file.name}" nahrán.`);

                    // Show preview if it's an image
                    if (file.type.startsWith('image/')) {
                        const preview = document.getElementById('imagePreview');
                        preview.innerHTML = `
                            <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#2c2c2c;border-radius:4px;">
                                <img src="${base64Data}" style="max-width:100px;max-height:100px;border-radius:4px;" />
                                <span style="flex:1;font-size:0.9em;">${file.name}</span>
                                <button onclick="removeImage()" style="background:#ff6b6b;border:none;color:white;padding:4px 8px;border-radius:4px;cursor:pointer;">✕</button>
                            </div>
                        `;
                        preview.style.display = 'block';
                    } else {
                        // For PDF, just show a notification or small indicator
                        addNotification('Info', 'PDF připraveno k odeslání.');
                    }
                } else {
                    addNotification('Error', 'Chyba při nahrávání souboru: ' + uploadResult.message);
                }
            } catch (err) {
                console.error('Failed to upload file:', err);
                addNotification('Error', 'Chyba sítě při nahrávání souboru.');
            }
        };
        reader.readAsDataURL(file);
    } else {
        addNotification('Warn', 'Tento typ souboru není podporován.');
        event.target.value = '';
    }
}

async function startNewChat() {
    if (confirm('Zahájit nový chat?')) {
        try {
            const r = await fetch('/api/chat/new', { method: 'POST' });
            if (r.ok) {
                const session = await r.json();
                currentSessionId = session.id;
                conversationHistory = [];
                chatDiv.innerHTML = '';
                totalTokens = 0;
                lastUserMessage = '';
                updateAllTokenDisplays();
                addNotification('Info', 'Nový chat zahájen.');
                loadSessions();
            }
        } catch (e) {
            addNotification('Error', 'Chyba při vytváření nového chatu.');
        }
    }
}

async function loadSessions() {
    try {
        const r = await fetch('/api/chat/sessions');
        if (r.ok) {
            const list = await r.json();
            const ul = document.getElementById('sessions');
            ul.innerHTML = '';
            list.forEach(s => {
                const li = document.createElement('li');
                // container for timestamp + title
                const contentDiv = document.createElement('div');
                contentDiv.style.display = 'flex';
                contentDiv.style.flexDirection = 'column';
                contentDiv.style.flex = '1';
                contentDiv.style.overflow = 'hidden';
                contentDiv.onclick = () => loadSession(s.id);

                const timeSpan = document.createElement('span');
                timeSpan.textContent = new Date(s.createdAt).toLocaleString();
                timeSpan.style.fontSize = '0.75rem';
                timeSpan.style.color = '#888';
                timeSpan.style.marginBottom = '2px';

                const titleSpan = document.createElement('span');
                titleSpan.textContent = (s.title && s.title !== 'Nový chat') ? s.title : 'Nový chat';
                titleSpan.style.whiteSpace = 'nowrap';
                titleSpan.style.overflow = 'hidden';
                titleSpan.style.textOverflow = 'ellipsis';
                titleSpan.style.fontWeight = 'bold';

                contentDiv.appendChild(timeSpan);
                contentDiv.appendChild(titleSpan);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.className = 'deleteSessionBtn';
                deleteBtn.title = 'Smazat chat';
                deleteBtn.onclick = e => deleteSession(s.id, e);

                li.title = `${s.title || 'Nový chat'} - ${new Date(s.createdAt).toLocaleString()}`;
                if (s.id === currentSessionId) li.classList.add('active');

                li.appendChild(contentDiv);
                li.appendChild(deleteBtn);
                ul.appendChild(li);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadSession(id) {
    try {
        const r = await fetch(`/api/chat/session/${id}`);
        if (r.ok) {
            const session = await r.json();
            currentSessionId = session.id;
            conversationHistory = session.messages || [];
            chatDiv.innerHTML = '';
            totalTokens = 0;
            conversationHistory.forEach(msg => {
                const tokens = estimateTokens(msg.content);
                totalTokens += tokens;
                addMessage(msg.content, msg.role === 'assistant' ? 'bot' : 'user', tokens);
            });
            updateAllTokenDisplays();
            chatDiv.scrollTop = chatDiv.scrollHeight;
            addNotification('Info', 'Chat načten.');
            loadSessions();
        }
    } catch (e) {
        console.error(e);
    }
}

async function deleteSession(id, event) {
    event.stopPropagation();
    if (confirm('Opravdu chcete smazat tento chat?')) {
        try {
            const r = await fetch(`/api/chat/session/${id}`, { method: 'DELETE' });
            if (r.ok) {
                addNotification('Success', 'Chat byl smazán.');
                if (currentSessionId === id) {
                    currentSessionId = null;
                    conversationHistory = [];
                    chatDiv.innerHTML = '';
                    totalTokens = 0;
                    updateAllTokenDisplays();
                }
                loadSessions();
            } else {
                addNotification('Error', 'Nepodařilo se smazat chat.');
            }
        } catch (e) {
            console.error(e);
            addNotification('Error', 'Chyba při mazání chatu.');
        }
    }
}

function toggleSearch() {
    isSearchEnabled = !isSearchEnabled;
    const btn = document.getElementById('searchToggle');
    if (isSearchEnabled) {
        btn.classList.add('active');
        addNotification('Info', 'Webové vyhledávání zapnuto.');
    } else {
        btn.classList.remove('active');
        addNotification('Info', 'Webové vyhledávání vypnuto.');
    }
}

async function sendMessage() {
    const userInput = input.value.trim();
    if (!userInput && !currentImage) return; // Allow sending just an image

    lastUserMessage = userInput;
    const userTokens = estimateTokens(userInput);

    // Show user message with image if present
    let displayMessage = userInput;
    if (currentImage) {
        displayMessage = `📷 ${currentImage.name}\n${userInput}`;
    }
    addMessage(displayMessage, 'user', userTokens);
    input.value = '';

    conversationHistory.push({ role: 'user', content: userInput });
    totalTokens += userTokens;
    updateAllTokenDisplays();

    const searchStatus = isSearchEnabled ? ' + 🌐 Web Search' : '';
    const imageStatus = currentImage ? ' + 📷 Obrázek' : '';
    addNotification('Info', `Odesílám... (${userTokens} tokenů)${searchStatus}${imageStatus}`);

    try {
        const requestBody = {
            messages: conversationHistory,
            provider: currentProvider,
            sessionId: currentSessionId,
            useSearch: isSearchEnabled
        };

        // Add image data if present
        if (currentImage) {
            requestBody.image = {
                data: currentImage.data.split(',')[1], // Remove data:image/...;base64, prefix
                mimeType: currentImage.mimeType
            };
        }

        const resp = await fetch('/api/chat/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await resp.json();
        if (data.success) {
            if (data.sessionId) currentSessionId = data.sessionId;
            let botMsg = data.response;
            if (botMsg.startsWith('[[FALLBACK_WARNING]]')) {
                botMsg = botMsg.replace('[[FALLBACK_WARNING]]', '');
                addNotification('Warn', 'Model vyčerpán. Použit fallback.');
                disableProvider(currentProvider, 'Quota Exceeded');
            }
            const botTokens = estimateTokens(botMsg);
            addMessage(botMsg, 'bot', botTokens);
            conversationHistory.push({ role: 'assistant', content: botMsg });
            totalTokens += botTokens;
            updateAllTokenDisplays();
            if (currentProvider === 'claude-haiku' || currentProvider === 'claude') await loadClaudeUsage();
            addNotification('Success', `Odpověď přijata. Celkem: ${totalTokens.toLocaleString()} tokenů.`);
            loadSessions();

            // Add file link to the user message in chat history (after successful send)
            if (currentImage && currentImage.uploadedFile) {
                const fileLink = `\n\n📷 [${currentImage.uploadedFile.fileName}](/api/chat/session/${currentSessionId}/file/${currentImage.uploadedFile.fileName})`;

                // Find the last user message element and append the file link
                const userMessages = chatDiv.querySelectorAll('.msg.user');
                if (userMessages.length > 0) {
                    const lastUserMsg = userMessages[userMessages.length - 1];
                    const contentDiv = lastUserMsg.querySelector('.msgContent');
                    if (contentDiv) {
                        contentDiv.innerHTML += parseMarkdown(fileLink);
                    }
                }
            }

            // Clear image after successful send
            if (currentImage) {
                removeImage();
            }
        } else {
            addNotification('Error', data.error);
            if (/(429|TooManyRequests|Quota|403)/.test(data.error))
                disableProvider(currentProvider, 'Quota Exceeded');
        }
    } catch (e) {
        addNotification('Error', 'Network Error: ' + e.message);
    }
}

async function loadClaudeUsage() {
    try {
        const r = await fetch('/api/chat/claude-usage');
        if (r.ok) {
            claudeUsage = await r.json();
            updateClaudeDisplay();
        }
    } catch (e) {
        console.error('Failed to load Claude usage:', e);
    }
}

// ============================================
// UI Rendering Functions
// ============================================

function addMessage(text, role, tokens = 0) {
    const el = document.createElement('div');
    el.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    const header = document.createElement('div');
    header.className = 'msgHeader';
    header.textContent = role === 'user' ? '🧑‍💻 Uživatel' : '🤖 AI';
    if (tokens > 0 && role === 'user') header.textContent += ` • ${tokens.toLocaleString()} tokenů`;
    if (role === 'user') {
        const timeStr = new Date().toLocaleTimeString();
        header.textContent += ` • ${timeStr}`;
    }
    const content = document.createElement('div');
    content.className = 'msgContent';
    content.innerHTML = parseMarkdown(text);
    el.appendChild(header);
    el.appendChild(content);
    chatDiv.appendChild(el);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function addNotification(type, msg) {
    const el = document.createElement('div');
    el.className = 'note ' + type.toLowerCase();
    const time = new Date().toLocaleTimeString();
    el.innerHTML = `<strong>${type}</strong> <span style="font-size:0.8em;opacity:0.7">(${time})</span><br/>${msg}`;
    notificationsDiv.insertBefore(el, notificationsDiv.firstChild);
}

function updateClaudeDisplay() {
    ['claude', 'claude-haiku'].forEach(p => {
        const btn = document.querySelector(`[data-provider="${p}"]`);
        if (btn && !btn.classList.contains('disabled')) {
            const s = btn.querySelector('.modelStats');
            if (s) s.innerHTML = `<span class="tokenUsage">$${claudeUsage.totalCost.toFixed(2)}</span> / $5.00`;
            if (!claudeUsage.isWithinLimit) disableProvider(p, 'Monthly Limit Reached');
        }
    });
}

function updateAllTokenDisplays() {
    document.querySelectorAll('.modelBtn').forEach(btn => {
        if (!btn.classList.contains('disabled')) {
            const p = btn.dataset.provider;
            if (p === 'claude-haiku' || p === 'claude') return;
            const u = btn.querySelector('.tokenUsage');
            if (u) u.textContent = totalTokens.toLocaleString();
            const limit = tokenLimits[p];
            if (limit && totalTokens > limit) disableProvider(p, 'Token Limit Exceeded');
        }
    });
    updateClaudeDisplay();
}

// ============================================
// Model Management Functions
// ============================================

function selectModel(p) {
    const btn = document.querySelector(`[data-provider="${p}"]`);
    if (!btn || btn.classList.contains('disabled')) return;
    document.querySelectorAll('.modelBtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentProvider = p;
    updateImageButtonVisibility();
    addNotification('Info', `Přepnuto na: ${btn.querySelector('.modelName').textContent}`);
}

function updateImageButtonVisibility() {
    const visionProviders = ['gemini', 'gemini-2.5', 'gemini-1.5-pro', 'gemini-1.5-flash', 'openai', 'openai-test', 'claude', 'claude-haiku'];
    const fileProviders = ['gemini', 'gemini-2.5', 'gemini-1.5-pro', 'gemini-1.5-flash']; // Only Gemini supports PDF

    const imageBtn = document.getElementById('imageUpload');
    const fileBtn = document.getElementById('fileUpload');

    // Image button visibility (all vision models)
    if (imageBtn) {
        if (visionProviders.includes(currentProvider)) {
            imageBtn.style.display = 'inline-block';
        } else {
            imageBtn.style.display = 'none';
        }
    }

    // File button visibility (only Gemini)
    if (fileBtn) {
        if (fileProviders.includes(currentProvider)) {
            fileBtn.style.display = 'inline-block';
        } else {
            fileBtn.style.display = 'none';
        }
    }

    // If image/file is loaded and we switch to non-supporting model, remove it
    if (currentImage) {
        const isPDF = currentImage.mimeType === 'application/pdf';
        const shouldRemove = isPDF ? !fileProviders.includes(currentProvider) : !visionProviders.includes(currentProvider);

        if (shouldRemove) {
            removeImage();
            addNotification('Info', 'Soubor odstraněn - vybraný model ho nepodporuje.');
        }
    }
}

function disableProvider(p, reason = 'Unavailable') {
    const btn = document.querySelector(`[data-provider="${p}"]`);
    if (btn && !btn.classList.contains('disabled')) {
        btn.classList.add('disabled');
        btn.disabled = true;
        btn.querySelector('.modelStats').innerHTML = `<span style="color:#ff6b6b;">${reason}</span>`;
        addNotification('Warn', `Provider '${p}' deaktivován: ${reason}`);
        const next = Array.from(document.querySelectorAll('.modelBtn:not(.disabled)')).find(b => !b.disabled);
        if (next) selectModel(next.dataset.provider);
    }
}

// ============================================
// User Action Functions
// ============================================

function exportChat() {
    const text = conversationHistory.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification('Success', 'Chat exportován.');
}

function repeatLast() {
    if (lastUserMessage) {
        input.value = lastUserMessage;
        input.focus();
        addNotification('Info', 'Předchozí dotaz zkopírován.');
    } else {
        addNotification('Warn', 'Žádný předchozí dotaz.');
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        addNotification('Success', 'Zkopírováno do schránky!');
    }).catch(() => {
        addNotification('Error', 'Nelze zkopírovat');
    });
}

// ============================================
// Text Processing Functions
// ============================================

function parseMarkdown(text) {
    const placeholders = [];
    const addPlaceholder = (content, type) => {
        placeholders.push({ content, type });
        return `%%%LINKPH${placeholders.length - 1}%%%`;
    };
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, title, url) => addPlaceholder({ title, url }, 'mdlink'));
    text = text.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, m => addPlaceholder(m, 'email'));
    text = text.replace(/(https?:\/\/[^\s<>"]+)/g, m => addPlaceholder(m, 'url'));
    text = text.replace(/(^|[\s(])(www\.[^\s<>"]+)/g, (m, prefix, u) => prefix + addPlaceholder(u, 'www'));
    let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/```([\s\S]*?)```/g, '<pre><button class="copyBtn" onclick="copyToClipboard(this.nextElementSibling.textContent)">Kopírovat</button><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/%%%LINKPH(\d+)%%%/g, (m, i) => {
        const item = placeholders[parseInt(i)];
        if (!item) return m;

        if (item.type === 'mdlink') {
            const url = item.content.url;
            const title = item.content.title;

            // Check if it's a session file link
            if (url.startsWith('/api/chat/session/') && url.includes('/file/')) {
                // Extract file extension for icon
                const fileName = url.split('/').pop();
                const ext = fileName.split('.').pop().toLowerCase();

                // Determine icon based on file type
                let icon = '📎';
                if (['pdf'].includes(ext)) icon = '📄';
                else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) icon = '📷';
                else if (['txt', 'md'].includes(ext)) icon = '📝';
                else if (['cs', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'h'].includes(ext)) icon = '💻';
                else if (['xml', 'json', 'yaml', 'yml'].includes(ext)) icon = '📋';

                return `<span style="display:inline-flex;align-items:center;gap:4px;background:#2c2c2c;padding:4px 8px;border-radius:4px;margin:2px;">
                    ${icon} <a href="${url}" download style="color:#4a9eff;text-decoration:none;">${title}</a>
                    <button class="copyBtn inline" onclick="copyToClipboard('${url}')" title="Kopírovat odkaz">📋</button>
                </span>`;
            }

            // Regular markdown link
            return `<a href="${url}" target="_blank">${title}</a> <button class="copyBtn inline" onclick="copyToClipboard(\`${url}\`)">📋</button>`;
        }

        if (item.type === 'email') return `<a href="mailto:${item.content}">${item.content}</a> <button class="copyBtn inline" onclick="copyToClipboard(\`${item.content}\`)">📋</button>`;
        if (item.type === 'url' || item.type === 'www') {
            const href = item.type === 'www' ? 'http://' + item.content : item.content;
            return `<a href="${href}" target="_blank">${item.content}</a> <button class="copyBtn inline" onclick="copyToClipboard(\`${href}\`)">📋</button>`;
        }
        return m;
    });
    return html;
}

// ============================================
// Utility Functions
// ============================================

function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}

// ============================================
// API KEY MANAGEMENT FUNCTIONS
// ============================================

let currentProviderForSettings = '';

function openModelSettings(provider) {
    currentProviderForSettings = provider;
    fetch(`/api/apikeys/${provider}`)
        .then(r => r.json())
        .then(data => renderKeysList(data))
        .catch(err => console.error(err));
    document.getElementById('apiKeysModal').style.display = 'flex';
}

function closeApiKeysModal() {
    document.getElementById('apiKeysModal').style.display = 'none';
    document.getElementById('keysList').innerHTML = '';
    document.getElementById('newKeyAlias').value = '';
    document.getElementById('newKeyValue').value = '';
    currentProviderForSettings = '';
}

function renderKeysList(providerData) {
    const listDiv = document.getElementById('keysList');
    listDiv.innerHTML = '';
    if (!providerData.keys || providerData.keys.length === 0) {
        listDiv.innerHTML = '<div style="text-align:center;opacity:0.6;padding:1rem">Žádné klíče. Přidejte první.</div>';
        return;
    }
    providerData.keys.forEach(key => {
        const div = document.createElement('div');
        div.className = 'keyItem' + (providerData.activeKeyId === key.id ? ' active' : '');
        div.dataset.keyId = key.id;
        div.innerHTML = `
            <span title="${key.key}" class="keyAlias">${key.alias} ${providerData.activeKeyId === key.id ? '(Aktivní)' : ''}</span>
            <div class="keyActions">
                <span class="validationStatus" id="status-${key.id}"></span>
                <button onclick="validateKey('${key.id}', '${key.key}')" title="Ověřit platnost" class="validateBtn">🔄</button>
                ${providerData.activeKeyId !== key.id ? `<button onclick="setActiveKey('${key.id}')">✅ Aktivovat</button>` : ''}
                <button onclick="deleteKey('${key.id}')" style="color:#ff6b6b;border-color:#ff6b6b">🗑️</button>
            </div>
        `;
        listDiv.appendChild(div);
    });
}

function addNewApiKey() {
    const alias = document.getElementById('newKeyAlias').value.trim();
    const key = document.getElementById('newKeyValue').value.trim();
    if (!alias || !key) { addNotification('Warn', 'Zadejte název i klíč.'); return; }
    fetch(`/api/apikeys/${currentProviderForSettings}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, key })
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                addNotification('Success', 'Klíč přidán.');
                document.getElementById('newKeyAlias').value = '';
                document.getElementById('newKeyValue').value = '';
                fetch(`/api/apikeys/${currentProviderForSettings}`).then(r => r.json()).then(data => renderKeysList(data));
            } else {
                addNotification('Error', res.message);
            }
        })
        .catch(err => console.error(err));
}

function deleteKey(keyId) {
    if (!confirm('Opravdu chcete smazat tento klíč?')) return;
    fetch(`/api/apikeys/${currentProviderForSettings}/${keyId}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                addNotification('Success', 'Klíč smazán.');
                fetch(`/api/apikeys/${currentProviderForSettings}`).then(r => r.json()).then(data => renderKeysList(data));
            } else {
                addNotification('Error', res.message);
            }
        })
        .catch(err => console.error(err));
}

function setActiveKey(keyId) {
    fetch(`/api/apikeys/${currentProviderForSettings}/active/${keyId}`, { method: 'PUT' })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                addNotification('Success', 'Aktivní klíč nastaven.');
                fetch(`/api/apikeys/${currentProviderForSettings}`).then(r => r.json()).then(data => renderKeysList(data));
            } else {
                addNotification('Error', res.message);
            }
        })
        .catch(err => console.error(err));
}

async function validateKey(keyId, keyString) {
    const statusSpan = document.getElementById(`status-${keyId}`);
    if (statusSpan) statusSpan.innerHTML = '⏳';
    try {
        const response = await fetch('/api/apikeys/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Provider: currentProviderForSettings, Key: keyString })
        });
        const data = await response.json();
        if (statusSpan) {
            if (data.isValid) { statusSpan.innerHTML = '✅'; statusSpan.title = 'Klíč je platný'; }
            else { statusSpan.innerHTML = '❌'; statusSpan.title = 'Klíč je neplatný'; }
        }
        return data.isValid;
    } catch (error) {
        console.error('Validation error:', error);
        if (statusSpan) { statusSpan.innerHTML = '⚠️'; statusSpan.title = 'Chyba ověření'; }
        return false;
    }
}

async function validateAllKeys() {
    const keys = document.querySelectorAll('.keyItem');
    let validCount = 0, totalCount = 0;
    addNotification('Info', 'Ověřování všech klíčů...');
    const promises = Array.from(keys).map(async keyDiv => {
        const keyId = keyDiv.dataset.keyId;
        const keyAliasSpan = keyDiv.querySelector('.keyAlias');
        const keyString = keyAliasSpan ? keyAliasSpan.title : '';
        if (keyId && keyString) {
            totalCount++;
            const isValid = await validateKey(keyId, keyString);
            if (isValid) validCount++;
        }
    });
    await Promise.all(promises);
    addNotification('Info', `Ověření dokončeno: ${validCount}/${totalCount} platných.`);
}
