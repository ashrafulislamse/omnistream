/**
 * OmniStream Extension 2.0 - Background Service Worker
 * Handles: API calls, authentication, notifications, context menus
 */

// ============ Configuration ============
const CONFIG = {
  API_BASE: 'https://jgjrjvlogegincqlsarn.supabase.co/functions/v1',
  APP_URL: 'https://terastream-vault.lovable.app',
  VALID_DOMAINS: ['terabox.com', '1024terabox.com', 'teraboxapp.com', '1024tera.com'],
  CACHE_TTL: 30 * 60 * 1000, // 30 minutes
};

// ============ Initialization ============
chrome.runtime.onInstalled.addListener(onInstalled);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.contextMenus.onClicked.addListener(handleContextMenu);
chrome.commands.onCommand.addListener(handleCommand);
chrome.alarms.onAlarm.addListener(handleAlarm);

/**
 * Extension installed/updated
 */
async function onInstalled(details) {
  console.log('[OmniStream] Extension installed:', details.reason);

  // Create context menus
  await createContextMenus();

  // Set up periodic alarm for link health check
  chrome.alarms.create('checkExpiredLinks', { periodInMinutes: 60 });

  // Initialize storage defaults
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    await chrome.storage.local.set({
      settings: {
        theme: 'dark',
        notifications: true,
        autoDetectClipboard: false,
        showOverlay: true,
        defaultAction: 'ask',
      },
    });
  }

  // Show welcome on first install
  if (details.reason === 'install') {
    chrome.tabs.create({ url: `${CONFIG.APP_URL}/tools?extension-installed=true` });
  }
}

/**
 * Create right-click context menus
 */
async function createContextMenus() {
  // Clear existing
  await chrome.contextMenus.removeAll();

  // Main menu for links
  chrome.contextMenus.create({
    id: 'omnistream-main',
    title: '🎬 OmniStream',
    contexts: ['link'],
    targetUrlPatterns: CONFIG.VALID_DOMAINS.map(d => `*://*.${d}/*`),
  });

  chrome.contextMenus.create({
    id: 'save-link',
    parentId: 'omnistream-main',
    title: '❤️ Save to Favorites',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'stream-link',
    parentId: 'omnistream-main',
    title: '▶️ Stream Now',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'download-link',
    parentId: 'omnistream-main',
    title: '⬇️ Download',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'copy-direct',
    parentId: 'omnistream-main',
    title: '📋 Copy Direct Link',
    contexts: ['link'],
  });

  // Page menu for TeraBox pages
  chrome.contextMenus.create({
    id: 'page-save',
    title: '🎬 Save to OmniStream',
    contexts: ['page'],
    documentUrlPatterns: CONFIG.VALID_DOMAINS.map(d => `*://*.${d}/*`),
  });

  // Selection menu for text with links
  chrome.contextMenus.create({
    id: 'selection-save',
    title: '🎬 Save TeraBox Link',
    contexts: ['selection'],
  });
}

/**
 * Handle messages from content scripts and popup
 */
function handleMessage(request, sender, sendResponse) {
  console.log('[OmniStream] Message received:', request.action);

  const handlers = {
    // Authentication
    getAuth: () => getAuthData(),
    setAuth: () => setAuthData(request.token, request.user),
    logout: () => logout(),
    checkAuth: () => checkAuthentication(),

    // File operations
    fetchFileInfo: () => fetchFileInfo(request.url),
    saveToFavorites: () => saveToFavorites(request.file, request.sourceUrl),
    getDownloadLink: () => getDownloadLink(request.url, request.fileId),
    getStreamLink: () => getStreamLink(request.url),

    // Queue & History
    addToQueue: () => addToQueue(request.url, request.title),
    getQueue: () => getQueue(),
    getRecent: () => getRecentLinks(),
    getStats: () => getUserStats(),

    // Current tab
    getCurrentTabInfo: () => getCurrentTabInfo(),
    detectPageType: () => detectPageType(sender.tab),

    // Storage
    getSettings: () => getSettings(),
    updateSettings: () => updateSettings(request.settings),
    getCache: () => getCachedData(request.key),
    setCache: () => setCachedData(request.key, request.data),
  };

  const handler = handlers[request.action];
  if (handler) {
    handler().then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open for async
  }

  sendResponse({ error: 'Unknown action' });
  return false;
}

/**
 * Handle context menu clicks
 */
async function handleContextMenu(info, tab) {
  const url = info.linkUrl || info.pageUrl;

  if (!isValidTeraBoxUrl(url)) {
    if (info.menuItemId === 'selection-save') {
      const text = info.selectionText;
      const extracted = extractTeraBoxUrl(text);
      if (extracted) {
        await handleLinkAction('save', extracted);
      }
    }
    return;
  }

  switch (info.menuItemId) {
    case 'save-link':
    case 'page-save':
      await handleLinkAction('save', url);
      break;
    case 'stream-link':
      await handleLinkAction('stream', url);
      break;
    case 'download-link':
      await handleLinkAction('download', url);
      break;
    case 'copy-direct':
      await handleLinkAction('copy', url);
      break;
  }
}

/**
 * Handle keyboard shortcuts
 */
async function handleCommand(command) {
  console.log('[OmniStream] Command:', command);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  switch (command) {
    case 'save-link':
      if (isValidTeraBoxUrl(tab.url)) {
        await handleLinkAction('save', tab.url);
      }
      break;
    case 'quick-download':
      if (isValidTeraBoxUrl(tab.url)) {
        await handleLinkAction('download', tab.url);
      }
      break;
  }
}

/**
 * Handle periodic alarms
 */
function handleAlarm(alarm) {
  if (alarm.name === 'checkExpiredLinks') {
    cleanupExpiredCache();
  }
}

// ============ API Functions ============

async function getAuthData() {
  const { token, user } = await chrome.storage.local.get(['token', 'user']);
  return { token, user, authenticated: !!token };
}

async function setAuthData(token, user) {
  await chrome.storage.local.set({ token, user });
  return { success: true };
}

async function logout() {
  await chrome.storage.local.remove(['token', 'user']);
  return { success: true };
}

async function checkAuthentication() {
  const { token } = await chrome.storage.local.get('token');
  if (!token) return { authenticated: false };

  try {
    const response = await fetch(`${CONFIG.API_BASE}/extension-api/auth-check`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    return { authenticated: data.authenticated ?? false, user: data.user };
  } catch {
    return { authenticated: false };
  }
}

async function fetchFileInfo(url) {
  // Check cache first
  const cacheKey = `file:${normalizeUrl(url)}`;
  const cached = await getCachedData(cacheKey);
  if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
    return { ...cached.data, cached: true };
  }

  const { token } = await chrome.storage.local.get('token');
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${CONFIG.API_BASE}/streaming-service`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch');

  // Cache the result
  await setCachedData(cacheKey, { data, timestamp: Date.now() });

  return data;
}

async function saveToFavorites(file, sourceUrl) {
  const { token } = await chrome.storage.local.get('token');
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${CONFIG.API_BASE}/extension-api/add-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: sourceUrl,
      title: file?.name || 'Untitled',
      file,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to save');

  // Show notification
  await showNotification('Saved!', `${file?.name || 'Link'} added to your library`);

  return data;
}

async function getDownloadLink(url, fileId) {
  const { token } = await chrome.storage.local.get('token');
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${CONFIG.API_BASE}/download-service`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url, fs_id: fileId }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to get download link');

  return data;
}

async function getStreamLink(url) {
  return fetchFileInfo(url);
}

async function addToQueue(url, title) {
  const { recentLinks = [] } = await chrome.storage.local.get('recentLinks');

  const newLink = {
    id: Date.now().toString(),
    url,
    title: title || 'Untitled',
    addedAt: new Date().toISOString(),
    status: 'pending',
  };

  const updated = [newLink, ...recentLinks.filter(l => l.url !== url).slice(0, 99)];
  await chrome.storage.local.set({ recentLinks: updated });

  // Try to save to server
  try {
    await saveToFavorites({ name: title }, url);
    newLink.status = 'saved';
  } catch {
    newLink.status = 'local';
  }

  return newLink;
}

async function getQueue() {
  const { token } = await chrome.storage.local.get('token');
  if (!token) return { queue: [] };

  try {
    const response = await fetch(`${CONFIG.API_BASE}/extension-api/queue`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  } catch {
    return { queue: [] };
  }
}

async function getRecentLinks() {
  const { recentLinks = [] } = await chrome.storage.local.get('recentLinks');
  return { recent: recentLinks };
}

async function getUserStats() {
  const { token } = await chrome.storage.local.get('token');
  if (!token) return { favorites: 0, downloads: 0 };

  try {
    const response = await fetch(`${CONFIG.API_BASE}/extension-api/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  } catch {
    return { favorites: 0, downloads: 0 };
  }
}

// ============ Utility Functions ============

async function getCurrentTabInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return { isTeraBox: false };

  const isTeraBox = isValidTeraBoxUrl(tab.url);
  return {
    isTeraBox,
    url: tab.url,
    title: tab.title,
    tabId: tab.id,
  };
}

async function detectPageType(tab) {
  if (!tab?.url) return { type: 'unknown' };

  const isTeraBox = isValidTeraBoxUrl(tab.url);
  const isSharePage = tab.url.includes('/s/');

  return {
    type: isTeraBox ? (isSharePage ? 'share' : 'terabox') : 'other',
    url: tab.url,
  };
}

async function handleLinkAction(action, url) {
  try {
    const fileInfo = await fetchFileInfo(url);
    const file = fileInfo.list?.[0];

    switch (action) {
      case 'save':
        await saveToFavorites(file, url);
        break;
      case 'stream':
        if (file?.stream_link) {
          chrome.tabs.create({ url: `${CONFIG.APP_URL}?stream=${encodeURIComponent(url)}` });
        }
        break;
      case 'download':
        const downloadUrl = file?.dlink || file?.fast_link;
        if (downloadUrl) {
          chrome.tabs.create({ url: downloadUrl });
        }
        break;
      case 'copy':
        const directUrl = file?.dlink || file?.fast_link || url;
        // Send to content script to copy
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { action: 'copyToClipboard', text: directUrl });
        }
        await showNotification('Copied!', 'Direct link copied to clipboard');
        break;
    }
  } catch (error) {
    await showNotification('Error', error.message);
  }
}

async function showNotification(title, message) {
  const { settings } = await chrome.storage.local.get('settings');
  if (settings?.notifications === false) return;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icons/icon128.png',
    title: `OmniStream - ${title}`,
    message,
    priority: 1,
  });
}

async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return settings || {};
}

async function updateSettings(newSettings) {
  const current = await getSettings();
  const merged = { ...current, ...newSettings };
  await chrome.storage.local.set({ settings: merged });
  return merged;
}

async function getCachedData(key) {
  const { [key]: data } = await chrome.storage.local.get(key);
  return data;
}

async function setCachedData(key, data) {
  await chrome.storage.local.set({ [key]: data });
  return { success: true };
}

async function cleanupExpiredCache() {
  const all = await chrome.storage.local.get(null);
  const now = Date.now();
  const toRemove = [];

  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith('file:') && value?.timestamp) {
      if (now - value.timestamp > CONFIG.CACHE_TTL * 2) {
        toRemove.push(key);
      }
    }
  }

  if (toRemove.length > 0) {
    await chrome.storage.local.remove(toRemove);
    console.log('[OmniStream] Cleaned up', toRemove.length, 'expired cache entries');
  }
}

function isValidTeraBoxUrl(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return CONFIG.VALID_DOMAINS.some(d => urlObj.hostname.includes(d));
  } catch {
    return false;
  }
}

function normalizeUrl(url) {
  return url.trim().toLowerCase();
}

function extractTeraBoxUrl(text) {
  const pattern = /https?:\/\/[^\s]*(?:terabox|1024terabox|teraboxapp|1024tera)\.[^\s]*/gi;
  const match = text.match(pattern);
  return match ? match[0] : null;
}

console.log('[OmniStream] Service worker initialized');
