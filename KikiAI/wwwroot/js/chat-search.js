let searchDebounceTimer;

async function filterChats() {
    const query = document.getElementById('chatSearch').value.trim();
    const list = document.getElementById('sessions');

    // Clear previous timer
    clearTimeout(searchDebounceTimer);

    // If query is too short (<= 3 chars), reload generic list
    if (query.length <= 3) {
        loadSessions(); // This function is in chat-helpers.js
        return;
    }

    // Debounce API call
    searchDebounceTimer = setTimeout(async () => {
        try {
            list.innerHTML = '<li class="loading-item">Vyhledávám...</li>';

            const response = await fetch(`/api/chat/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Search failed');

            const results = await response.json();
            renderSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            list.innerHTML = '<li class="error-item">Chyba vyhledávání</li>';
        }
    }, 400); // 400ms delay
}

function renderSearchResults(results) {
    const list = document.getElementById('sessions');
    list.innerHTML = '';

    if (results.length === 0) {
        list.innerHTML = '<li class="no-results">Žádné výsledky</li>';
        return;
    }

    results.forEach(chat => {
        const li = document.createElement('li');
        li.className = 'session-item';
        li.onclick = () => loadChat(chat.id); // loadChat is global in chat-helpers.js

        // Main Title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'session-title';
        titleDiv.textContent = chat.title;
        li.appendChild(titleDiv);

        // Snippets
        if (chat.snippets && chat.snippets.length > 0) {
            const snippetsDiv = document.createElement('div');
            snippetsDiv.className = 'search-snippets';
            chat.snippets.forEach(snippet => {
                const snip = document.createElement('div');
                snip.className = 'search-snippet';
                snip.textContent = snippet;
                snippetsDiv.appendChild(snip);
            });
            li.appendChild(snippetsDiv);
        }

        // Date (optional, small)
        const dateDiv = document.createElement('div');
        dateDiv.className = 'session-date';
        dateDiv.textContent = new Date(chat.createdAt).toLocaleDateString('cs-CZ');
        li.appendChild(dateDiv);

        list.appendChild(li);
    });
}

// Expose globally
window.filterChats = filterChats;
