// ============================================
// Message UI Enhancements
// ============================================

// Create message metadata (only for UI, not sent to API)
function createMessageMetadata(role, model = null) {
    return {
        timestamp: new Date().toISOString(),
        model: role === 'assistant' ? (model || currentProvider) : null,
        rating: null,
        edited: false
    };
}

// Get model icon/emoji
function getModelIcon(model) {
    const icons = {
        'gemini': '✨',
        'gemini-2.5': '✨',
        'gemini-1.5-pro': '✨',
        'gemini-1.5-flash': '✨',
        'openai': '🤖',
        'openai-test': '🤖',
        'claude': '🧠',
        'claude-haiku': '🧠',
        'mistral': '🌪️',
        'mistral-large': '🌪️'
    };
    return icons[model] || '💬';
}

// Get model color
function getModelColor(model) {
    const colors = {
        'gemini': '#4285f4',
        'gemini-2.5': '#4285f4',
        'gemini-1.5-pro': '#4285f4',
        'gemini-1.5-flash': '#4285f4',
        'openai': '#10a37f',
        'openai-test': '#10a37f',
        'claude': '#cc785c',
        'claude-haiku': '#cc785c',
        'mistral': '#f2a663',
        'mistral-large': '#f2a663'
    };
    return colors[model] || '#666';
}

// Format timestamp for display
function formatTimestamp(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    // If today, show only time
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    }

    // If this week, show day and time
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
        return `${days[date.getDay()]} ${date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Otherwise, show date and time
    return date.toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Copy message content to clipboard
function copyMessage(button) {
    const messageDiv = button.closest('.msg');
    const contentDiv = messageDiv.querySelector('.msgContent');
    const text = contentDiv.innerText;

    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ Zkopírováno';
        button.style.background = '#4CAF50';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(() => {
        addNotification('Error', 'Nelze zkopírovat');
    });
}

// Delete message (future implementation)
function deleteMessage(button) {
    if (!confirm('Smazat tuto zprávu?')) return;
    const messageDiv = button.closest('.msg');
    messageDiv.remove();
    addNotification('Info', 'Zpráva smazána (tato funkce bude brzy implementována)');
}

// Edit message (future implementation)
function editMessage(button) {
    addNotification('Info', 'Editace zpráv bude brzy k dispozici');
}

// Regenerate response (future implementation)
function regenerateResponse(button) {
    addNotification('Info', 'Regenerace odpovědi bude brzy k dispozici');
}

// Rate message (future implementation)
function rateMessage(button, rating) {
    const messageDiv = button.closest('.msg');
    const messageId = messageDiv.dataset.messageId;

    // Visual feedback
    const allRatingBtns = messageDiv.querySelectorAll('.ratingBtn');
    allRatingBtns.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    addNotification('Success', `Hodnocení ${rating > 0 ? '👍' : '👎'} uloženo`);

    // TODO: Save to backend
}
