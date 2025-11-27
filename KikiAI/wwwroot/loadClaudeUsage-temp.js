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
