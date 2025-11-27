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
                currentSessionTitle = 'Nový chat';
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
            currentSessionTitle = session.title || 'Nový chat';
            conversationHistory = session.messages || [];
            chatDiv.innerHTML = '';
            totalTokens = 0;
            conversationHistory.forEach(msg => {
                const tokens = estimateTokens(msg.content);
                totalTokens += tokens;
                addMessage(msg.content, msg.role === 'assistant' ? 'bot' : 'user', tokens, msg.metadata);
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
                    currentSessionTitle = 'Nový chat';
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

    // Create metadata for user message
    const userMetadata = createMessageMetadata('user');

    // Show user message with image if present
    let displayMessage = userInput;
    if (currentImage) {
        displayMessage = `📷 ${currentImage.name}\n${userInput}`;
    }
    addMessage(displayMessage, 'user', userTokens, userMetadata);
    input.value = '';

    conversationHistory.push({ role: 'user', content: userInput, metadata: userMetadata });
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

            // Display bot response
            console.log('🎨 Bot response received, adding to UI...');
            conversationHistory.push({ role: 'assistant', content: botMsg, metadata: data.metadata });
            const botTokens = estimateTokens(botMsg);
            totalTokens += botTokens;
            addMessage(botMsg, 'assistant', botTokens, data.metadata);
            updateAllTokenDisplays();
            console.log('✅ Bot message added to UI');
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

function addMessage(text, role, tokens = 0, metadata = null) {
    console.log('🔍 addMessage called:', { text: text.substring(0, 50) + '...', role, tokens, chatDivExists: !!chatDiv });

    // Verify chatDiv exists
    if (!chatDiv) {
        console.error('❌ CRITICAL: chatDiv is null or undefined!');
        chatDiv = document.getElementById('chat');
        if (!chatDiv) {
            console.error('❌ FATAL: Cannot find #chat element in DOM!');
            return;
        }
        console.warn('⚠️ chatDiv was null, but recovered by re-querying DOM');
    }

    // Create default metadata if not provided
    if (!metadata) {
        metadata = createMessageMetadata(role, role === 'assistant' ? currentProvider : null);
    }

    const el = document.createElement('div');
    el.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    if (role === 'assistant') el.dataset.provider = metadata.model || currentProvider;

    // Header
    const header = document.createElement('div');
    header.className = 'msgHeader';

    // Icon & Name
    const icon = role === 'user' ? '🧑‍💻' : getModelIcon(metadata.model);
    const name = role === 'user' ? 'Uživatel' : 'AI';

    let headerHtml = `
        <span class="msgIcon">${icon}</span>
        <span class="msgName">${name}</span>
    `;

    // Model Badge
    if (role === 'assistant' && metadata.model) {
        const color = getModelColor(metadata.model);
        headerHtml += `<span class="modelBadge" style="color:${color};border:1px solid ${color};background:${color}20">${metadata.model}</span>`;
    }

    // Spacer
    headerHtml += `<div style="flex:1"></div>`;

    // Tokens
    if (tokens > 0) {
        headerHtml += `<span class="msgTokens">${tokens.toLocaleString()} tok.</span>`;
    }

    // Time
    if (metadata.timestamp) {
        headerHtml += `<span class="msgTime">${formatTimestamp(metadata.timestamp)}</span>`;
    }

    // Actions
    headerHtml += `
        <div class="msgActions">
            <button class="actionBtn" onclick="copyMessage(this)" title="Kopírovat">📋</button>
            <button class="actionBtn" onclick="editMessage(this)" title="Upravit">✏️</button>
            ${role === 'assistant' ? '<button class="actionBtn" onclick="regenerateResponse(this)" title="Regenerovat">🔄</button>' : ''}
            <button class="actionBtn" onclick="deleteMessage(this)" title="Smazat">🗑️</button>
        </div>
    `;

    header.innerHTML = headerHtml;
    el.appendChild(header);

    // Content
    const content = document.createElement('div');
    content.className = 'msgContent';
    content.innerHTML = parseMarkdown(text);
    el.appendChild(content);

    chatDiv.appendChild(el);
    console.log('✅ Message appended to chatDiv. Child count:', chatDiv.children.length);
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
    if (conversationHistory.length === 0) {
        addNotification('Warn', 'Žádné zprávy k exportu.');
        return;
    }

    let content = `# ${currentSessionTitle}\n\n`;
    content += `*Exportováno: ${new Date().toLocaleString()}*\n\n---\n\n`;

    conversationHistory.forEach(msg => {
        const role = msg.role === 'user' ? '🧑‍💻 User' : '🤖 AI';
        const model = msg.metadata?.model ? ` (${msg.metadata.model})` : '';
        const time = msg.metadata?.timestamp ? ` - ${new Date(msg.metadata.timestamp).toLocaleTimeString()}` : '';

        content += `## ${role}${model}${time}\n\n`;
        content += `${msg.content}\n\n`;
        content += `---\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Sanitize filename
    const safeTitle = currentSessionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `chat_${safeTitle}_${new Date().toISOString().slice(0, 10)}.md`;

    a.click();
    URL.revokeObjectURL(url);
    addNotification('Success', 'Chat exportován jako Markdown.');
}

function importChat() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt,.json';
    input.onchange = async e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async event => {
            const content = event.target.result;
            const messages = parseImportedChat(content);

            if (messages.length > 0) {
                try {
                    const session = {
                        title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                        messages: messages
                    };

                    const r = await fetch('/api/chat/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(session)
                    });

                    if (r.ok) {
                        const res = await r.json();
                        addNotification('Success', 'Chat importován.');
                        loadSession(res.id);
                    } else {
                        addNotification('Error', 'Chyba při importu.');
                    }
                } catch (err) {
                    console.error(err);
                    addNotification('Error', 'Chyba sítě.');
                }
            } else {
                addNotification('Warn', 'Nepodařilo se rozpoznat žádné zprávy.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function parseImportedChat(content) {
    console.log('Parsing imported content, length:', content.length);

    // 1. Try JSON
    try {
        // Remove BOM and whitespace
        const cleanContent = content.trim().replace(/^\uFEFF/, '');
        const json = JSON.parse(cleanContent);
        console.log('JSON parsed successfully:', json);

        let msgs = null;

        if (Array.isArray(json)) msgs = json;
        else if (json.messages && Array.isArray(json.messages)) msgs = json.messages;
        else if (json.Messages && Array.isArray(json.Messages)) msgs = json.Messages; // Handle PascalCase

        if (msgs) {
            console.log('Found messages array:', msgs.length);
            // Normalize keys to lowercase
            return msgs.map(m => ({
                role: (m.role || m.Role || 'user').toLowerCase(),
                content: m.content || m.Content || '',
                metadata: m.metadata || m.Metadata || null
            }));
        } else {
            console.warn('JSON parsed but no messages array found');
        }
    } catch (e) {
        console.error('JSON parse error:', e);
    }

    // 2. Try Markdown (Current Export Format)
    if (content.includes('# ') && content.includes('## ')) {
        const messages = [];
        const parts = content.split(/^## /gm);

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const lines = part.split('\n');
            const headerLine = lines[0];
            const body = lines.slice(1).join('\n').trim();

            let role = 'user';
            if (headerLine.toLowerCase().includes('ai') || headerLine.toLowerCase().includes('assistant') || headerLine.toLowerCase().includes('bot')) {
                role = 'assistant';
            }

            // Remove separator lines
            const cleanBody = body.replace(/^---$/gm, '').trim();

            if (cleanBody) {
                messages.push({ role: role, content: cleanBody });
            }
        }
        if (messages.length > 0) return messages;
    }

    // 3. Try Plain Text (Old Format: [USER]: ...)
    const regex = /\[(USER|ASSISTANT|BOT|AI)\]:\s*/gi;
    if (regex.test(content)) {
        const messages = [];
        const parts = content.split(regex);

        if (parts.length > 2) {
            for (let i = 1; i < parts.length; i += 2) {
                const roleStr = parts[i].toUpperCase();
                const text = parts[i + 1].trim();

                let role = 'user';
                if (['ASSISTANT', 'BOT', 'AI'].includes(roleStr)) role = 'assistant';

                messages.push({ role: role, content: text });
            }
            return messages;
        }
    }

    // 4. Fallback: Treat as single user message
    return [{ role: 'user', content: content }];
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

// Configure marked options
if (typeof marked !== 'undefined') {
    marked.setOptions({
        highlight: function (code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-', // highlight.js css expects this
        breaks: true,
        gfm: true
    });

    // Custom renderer for file links
    const renderer = new marked.Renderer();
    const originalLink = renderer.link;

    renderer.link = function ({ href, title, text }) {
        // Handle session file links
        if (href && href.startsWith('/api/chat/session/') && href.includes('/file/')) {
            const fileName = href.split('/').pop();
            const ext = fileName.split('.').pop().toLowerCase();
            let icon = '📎';
            if (['pdf'].includes(ext)) icon = '📄';
            else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) icon = '📷';
            else if (['txt', 'md'].includes(ext)) icon = '📝';
            else if (['cs', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'h'].includes(ext)) icon = '💻';
            else if (['xml', 'json', 'yaml', 'yml'].includes(ext)) icon = '📋';

            return `<span style="display:inline-flex;align-items:center;gap:4px;background:#2c2c2c;padding:4px 8px;border-radius:4px;margin:2px;">
                ${icon} <a href="${href}" download style="color:#4a9eff;text-decoration:none;">${text}</a>
                <button class="copyBtn inline" onclick="copyToClipboard('${href}')" title="Kopírovat odkaz">📋</button>
            </span>`;
        }

        // Default link
        return `<a href="${href}" target="_blank" title="${title || ''}">${text}</a>`;
    };

    // Override code block renderer to add copy button and HTML preview
    renderer.code = function ({ text, lang, escaped }) {
        const language = (lang && hljs.getLanguage(lang)) ? lang : 'plaintext';
        const highlighted = hljs.highlight(text, { language }).value;

        // For HTML, add preview button
        if (language === 'html' || language === 'xml') {
            const previewId = 'html-preview-' + Date.now() + Math.random().toString(36).substr(2, 9);
            // Store HTML for preview
            window.htmlPreviews = window.htmlPreviews || {};
            window.htmlPreviews[previewId] = text;

            return `<pre><button class="copyBtn" onclick="copyToClipboard(this.nextElementSibling.textContent)">Kopírovat</button><button class="copyBtn" onclick="showHtmlPreview('${previewId}')" style="margin-left:4px;">👁️ Náhled</button><code class="hljs language-${language}">${highlighted}</code></pre>`;
        }

        return `<pre><button class="copyBtn" onclick="copyToClipboard(this.nextElementSibling.textContent)">Kopírovat</button><code class="hljs language-${language}">${highlighted}</code></pre>`;
    };

    marked.use({ renderer });
}

function parseMarkdown(text) {
    if (typeof marked === 'undefined') {
        console.warn('Marked.js not loaded, using fallback.');
        return text.replace(/\n/g, '<br>');
    }
    try {
        return marked.parse(text);
    } catch (e) {
        console.error('Markdown parsing error:', e);
        return text;
    }
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
// ============================================
// Message Management Functions
// ============================================

async function updateSessionMessages() {
    if (!currentSessionId) return;
    try {
        await fetch(`/api/chat/session/${currentSessionId}/messages`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(conversationHistory)
        });
    } catch (e) {
        console.error('Failed to update session:', e);
        addNotification('Error', 'Chyba při ukládání chatu.');
    }
}

function deleteMessage(button) {
    if (!confirm('Smazat tuto zprávu?')) return;
    const msgDiv = button.closest('.msg');
    const index = Array.from(chatDiv.children).indexOf(msgDiv);

    if (index > -1) {
        conversationHistory.splice(index, 1);
        msgDiv.remove();
        updateSessionMessages();
        addNotification('Info', 'Zpráva smazána.');
    }
}

function editMessage(button) {
    const msgDiv = button.closest('.msg');
    const index = Array.from(chatDiv.children).indexOf(msgDiv);
    const contentDiv = msgDiv.querySelector('.msgContent');
    const currentText = conversationHistory[index].content;

    // Switch to edit mode
    contentDiv.innerHTML = `
        <textarea class="editInput" style="width:100%;min-height:100px;background:#333;color:#fff;border:1px solid #555;padding:8px;border-radius:4px;">${currentText}</textarea>
        <div style="margin-top:8px;display:flex;gap:8px;">
            <button onclick="saveEditedMessage(this, ${index})" style="background:#4CAF50;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;">Uložit</button>
            <button onclick="cancelEdit(this, ${index})" style="background:#666;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;">Zrušit</button>
        </div>
    `;

    // Hide actions during edit
    msgDiv.querySelector('.msgActions').style.display = 'none';
}

function saveEditedMessage(button, index) {
    const msgDiv = button.closest('.msg');
    const textarea = msgDiv.querySelector('textarea');
    const newText = textarea.value;

    conversationHistory[index].content = newText;
    if (!conversationHistory[index].metadata) conversationHistory[index].metadata = {};
    conversationHistory[index].metadata.edited = true;

    // Restore view
    const contentDiv = msgDiv.querySelector('.msgContent');
    contentDiv.innerHTML = parseMarkdown(newText);
    msgDiv.querySelector('.msgActions').style.display = 'flex';

    updateSessionMessages();
    addNotification('Success', 'Zpráva upravena.');
}

function cancelEdit(button, index) {
    const msgDiv = button.closest('.msg');
    const originalText = conversationHistory[index].content;

    // Restore view
    const contentDiv = msgDiv.querySelector('.msgContent');
    contentDiv.innerHTML = parseMarkdown(originalText);
    msgDiv.querySelector('.msgActions').style.display = 'flex';
}

async function regenerateResponse(button) {
    const msgDiv = button.closest('.msg');
    const index = Array.from(chatDiv.children).indexOf(msgDiv);

    if (index === -1) return;

    // Check if previous message exists and is user
    if (index > 0 && conversationHistory[index - 1].role === 'user') {
        // Truncate history to include the user message
        conversationHistory = conversationHistory.slice(0, index);

        // Remove from DOM
        while (chatDiv.children.length > index) {
            chatDiv.lastChild.remove();
        }

        // Trigger generation
        await sendChatRequest();
    } else {
        addNotification('Warn', 'Nelze regenerovat (chybí kontext).');
    }
}

async function sendChatRequest() {
    const lastMsg = conversationHistory[conversationHistory.length - 1];
    if (lastMsg.role !== 'user') return;

    const userTokens = estimateTokens(lastMsg.content);
    addNotification('Info', `Regeneruji odpověď...`);

    try {
        const requestBody = {
            messages: conversationHistory,
            provider: currentProvider,
            sessionId: currentSessionId,
            useSearch: isSearchEnabled
        };

        const resp = await fetch('/api/chat/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await resp.json();
        if (data.success) {
            let botMsg = data.response;
            const botTokens = estimateTokens(botMsg);
            const botMetadata = createMessageMetadata('assistant', currentProvider);

            addMessage(botMsg, 'assistant', botTokens, botMetadata);
            conversationHistory.push({ role: 'assistant', content: botMsg, metadata: botMetadata });
            totalTokens += botTokens;
            updateAllTokenDisplays();
        } else {
            addNotification('Error', data.error);
        }
    } catch (e) {
        addNotification('Error', 'Network Error: ' + e.message);
    }
}
