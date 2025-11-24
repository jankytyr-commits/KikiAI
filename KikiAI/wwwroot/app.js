// ============================================
// Global State & DOM References
// ============================================

let chatDiv;
let input;
let sendBtn;
let notificationsDiv;

let conversationHistory = [];
let currentProvider = 'gemini';
let totalTokens = 0;
let claudeUsage = { totalCost: 0, isWithinLimit: true };
let lastUserMessage = '';
let currentSessionId = null;

const tokenLimits = {
    'gemini': 1000000,
    'gemini-2.5': 1000000,
    'openai': 128000,
    'openai-test': 128000,
    'claude': 200000,
    'claude-haiku': 200000,
    'mistral': 32000,
    'mistral-large': 128000
};

// ============================================
// Application Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM references
    chatDiv = document.getElementById('chat');
    input = document.getElementById('input');
    sendBtn = document.getElementById('send');
    notificationsDiv = document.getElementById('notifications');

    // Setup event listeners
    sendBtn.addEventListener('click', sendMessage);

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.ctrlKey) {
            e.preventDefault();
            sendMessage();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const value = input.value;
            input.value = value.slice(0, start) + '\n' + value.slice(end);
            input.selectionStart = input.selectionEnd = start + 1;
            e.preventDefault();
        }
    });

    // Load initial data
    loadClaudeUsage();
    loadHistory();
    loadSessions();

    // Update image button visibility based on default model
    if (typeof updateImageButtonVisibility === 'function') {
        updateImageButtonVisibility();
    }
});
