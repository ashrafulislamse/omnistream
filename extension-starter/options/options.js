/**
 * OmniStream Options Page Script
 */

const CONFIG = {
    APP_URL: 'https://terastream-vault.lovable.app',
};

// DOM Elements
const elements = {
    theme: document.getElementById('theme'),
    notifications: document.getElementById('notifications'),
    sound: document.getElementById('sound'),
    showOverlay: document.getElementById('showOverlay'),
    autoDetectClipboard: document.getElementById('autoDetectClipboard'),
    defaultAction: document.getElementById('defaultAction'),
    customizeShortcuts: document.getElementById('customizeShortcuts'),
    authEmail: document.getElementById('authEmail'),
    authBtn: document.getElementById('authBtn'),
    toast: document.getElementById('toast'),
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadSettings();
    await loadAuth();
    setupEventListeners();
}

// Load saved settings
async function loadSettings() {
    const response = await sendMessage({ action: 'getSettings' });
    const settings = response || {};

    elements.theme.value = settings.theme || 'dark';
    elements.notifications.checked = settings.notifications !== false;
    elements.sound.checked = settings.sound || false;
    elements.showOverlay.checked = settings.showOverlay !== false;
    elements.autoDetectClipboard.checked = settings.autoDetectClipboard || false;
    elements.defaultAction.value = settings.defaultAction || 'ask';
}

// Load auth status
async function loadAuth() {
    const response = await sendMessage({ action: 'getAuth' });

    if (response?.authenticated && response?.user) {
        elements.authEmail.textContent = response.user.email || 'Signed in';
        elements.authEmail.nextElementSibling.textContent = 'Connected to OmniStream';
        elements.authBtn.textContent = 'Sign Out';
        elements.authBtn.dataset.action = 'logout';
    } else {
        elements.authEmail.textContent = 'Not signed in';
        elements.authEmail.nextElementSibling.textContent = 'Sign in to sync your data across devices';
        elements.authBtn.textContent = 'Sign In';
        elements.authBtn.dataset.action = 'login';
    }
}

// Event listeners
function setupEventListeners() {
    // Settings changes
    elements.theme.addEventListener('change', saveSettings);
    elements.notifications.addEventListener('change', saveSettings);
    elements.sound.addEventListener('change', saveSettings);
    elements.showOverlay.addEventListener('change', saveSettings);
    elements.autoDetectClipboard.addEventListener('change', saveSettings);
    elements.defaultAction.addEventListener('change', saveSettings);

    // Customize shortcuts
    elements.customizeShortcuts.addEventListener('click', () => {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });

    // Auth button
    elements.authBtn.addEventListener('click', handleAuth);
}

// Save settings
async function saveSettings() {
    const settings = {
        theme: elements.theme.value,
        notifications: elements.notifications.checked,
        sound: elements.sound.checked,
        showOverlay: elements.showOverlay.checked,
        autoDetectClipboard: elements.autoDetectClipboard.checked,
        defaultAction: elements.defaultAction.value,
    };

    await sendMessage({ action: 'updateSettings', settings });
    showToast('Settings saved!', 'success');
}

// Handle auth
async function handleAuth() {
    const action = elements.authBtn.dataset.action;

    if (action === 'logout') {
        await sendMessage({ action: 'logout' });
        await loadAuth();
        showToast('Signed out successfully');
    } else {
        chrome.tabs.create({ url: `${CONFIG.APP_URL}/auth?redirect=extension` });
    }
}

// Send message to background
function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
    });
}

// Show toast notification
function showToast(message, type = 'success') {
    elements.toast.textContent = message;
    elements.toast.className = `toast show ${type}`;

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}
