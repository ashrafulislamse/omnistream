/**
 * OmniStream Options Page Script
 */

let APP_URL = '';

function getInitials(str) {
    if (!str) return '?';
    return str.split(/[@.\s]+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
}

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
    authBanner: document.getElementById('authBanner'),
    authBannerBtn: document.getElementById('authBannerBtn'),
    // Appwrite config fields
    appwriteEndpoint: document.getElementById('appwriteEndpoint'),
    appwriteProjectId: document.getElementById('appwriteProjectId'),
    cloudServiceFnId: document.getElementById('cloudServiceFnId'),
    platformApiFnId: document.getElementById('platformApiFnId'),
    appUrl: document.getElementById('appUrl'),
    saveConfigBtn: document.getElementById('saveConfigBtn'),
    testConnectionBtn: document.getElementById('testConnectionBtn'),
    connectionStatus: document.getElementById('connectionStatus'),
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadSettings();
    await loadAppwriteConfig();
    await loadAuth();
    setupAboutLinks();
    setupEventListeners();
}

function setupAboutLinks() {
    const base = APP_URL;
    const website = document.getElementById('aboutWebsite');
    const privacy = document.getElementById('aboutPrivacy');
    const help = document.getElementById('aboutHelp');
    if (website) website.href = base;
    if (privacy) privacy.href = base + '/privacy';
    if (help) help.href = base + '/help';
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

// Load Appwrite config
async function loadAppwriteConfig() {
    const config = await sendMessage({ action: 'getAppwriteConfig' });
    const { appUrl } = await chrome.storage.local.get('appUrl');
    APP_URL = appUrl || '';

    if (elements.appwriteEndpoint) elements.appwriteEndpoint.value = config?.endpoint || 'https://cloud.appwrite.io/v1';
    if (elements.appwriteProjectId) elements.appwriteProjectId.value = config?.projectId || '';
    if (elements.cloudServiceFnId) elements.cloudServiceFnId.value = config?.cloudServiceFnId || '';
    if (elements.platformApiFnId) elements.platformApiFnId.value = config?.platformApiFnId || '';
    if (elements.appUrl) elements.appUrl.value = APP_URL;
}

// Load auth status
async function loadAuth() {
    const response = await sendMessage({ action: 'getAuth' });
    const avatar = document.querySelector('.auth-avatar');

    if (response?.authenticated && response?.user) {
        const initials = getInitials(response.user.email || response.user.name || '');
        elements.authEmail.textContent = response.user.email || 'Signed in';
        elements.authEmail.nextElementSibling.textContent = 'Connected to OmniStream';
        elements.authBtn.textContent = 'Sign Out';
        elements.authBtn.dataset.action = 'logout';
        if (avatar) {
            avatar.textContent = initials;
            avatar.classList.add('authed');
        }
        if (elements.authBanner) elements.authBanner.classList.add('hidden');
    } else {
        elements.authEmail.textContent = 'Not signed in';
        elements.authEmail.nextElementSibling.textContent = 'Sign in to sync your data across devices';
        elements.authBtn.textContent = 'Sign In';
        elements.authBtn.dataset.action = 'login';
        if (avatar) {
            avatar.textContent = '';
            avatar.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
            avatar.classList.remove('authed');
        }
        if (elements.authBanner) elements.authBanner.classList.remove('hidden');
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

    // Appwrite config
    if (elements.saveConfigBtn) elements.saveConfigBtn.addEventListener('click', saveAppwriteConfig);
    if (elements.testConnectionBtn) elements.testConnectionBtn.addEventListener('click', testConnection);

    // Auth banner sign-in
    if (elements.authBannerBtn) elements.authBannerBtn.addEventListener('click', handleAuth);
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

// Save Appwrite config
async function saveAppwriteConfig() {
    const config = {
        endpoint: elements.appwriteEndpoint?.value?.trim() || 'https://cloud.appwrite.io/v1',
        projectId: elements.appwriteProjectId?.value?.trim() || '',
        cloudServiceFnId: elements.cloudServiceFnId?.value?.trim() || '',
        platformApiFnId: elements.platformApiFnId?.value?.trim() || '',
    };

    if (!config.projectId) {
        showToast('Project ID is required', 'error');
        return;
    }

    await sendMessage({ action: 'setAppwriteConfig', config });

    // Save APP_URL separately
    const newAppUrl = elements.appUrl?.value?.trim() || '';
    if (newAppUrl) {
        await sendMessage({ action: 'setAppUrl', url: newAppUrl });
        APP_URL = newAppUrl;
    }

    showToast('Configuration saved!', 'success');
}

// Test connection to Appwrite
async function testConnection() {
    if (elements.connectionStatus) {
        elements.connectionStatus.textContent = 'Testing...';
        elements.connectionStatus.className = 'connection-status testing';
    }

    try {
        // First save the current config
        await saveAppwriteConfig();

        // Try to check auth (which calls the platform-api function)
        const result = await sendMessage({ action: 'checkAuth' });

        if (elements.connectionStatus) {
            if (result?.authenticated) {
                elements.connectionStatus.textContent = 'Connected & Authenticated';
                elements.connectionStatus.className = 'connection-status success';
            } else {
                elements.connectionStatus.textContent = 'Connected but not authenticated. Sign in first.';
                elements.connectionStatus.className = 'connection-status warning';
            }
        }
    } catch (error) {
        if (elements.connectionStatus) {
            elements.connectionStatus.textContent = `Connection failed: ${error.message}`;
            elements.connectionStatus.className = 'connection-status error';
        }
    }
}

// Handle auth
async function handleAuth() {
    const action = elements.authBtn.dataset.action;

    if (action === 'logout') {
        await sendMessage({ action: 'logout' });
        await loadAuth();
        showToast('Signed out successfully');
    } else {
        const appUrl = APP_URL;
        chrome.tabs.create({ url: `${appUrl}/auth?redirect=extension` });
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
