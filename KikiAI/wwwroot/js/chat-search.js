function filterChats() {
    const query = document.getElementById('chatSearch').value.trim().toLowerCase();
    const list = document.getElementById('sessions');
    const items = list.querySelectorAll('li');

    items.forEach(li => {
        const title = (li.title || '').toLowerCase();
        const preview = (li.textContent || '').toLowerCase();

        // Search in both title (hover text) and visible text
        const visible = title.includes(query) || preview.includes(query);

        li.style.display = visible ? '' : 'none';
    });
}

// Expose globally if needed, though it's used directly in HTML
window.filterChats = filterChats;
