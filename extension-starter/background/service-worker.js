/**
 * OmniStream Extension 2.0 - Background Service Worker
 * Handles: API calls, authentication, notifications, context menus
 */

// ============ Configuration ============
// >>> DEPLOYMENT: Change this ONE line to your production URL <<<
const DEFAULT_APP_URL = 'https://omnistream.appwrite.network';

const CONFIG = {
  // Appwrite endpoint — updated at runtime from storage
  APPWRITE_ENDPOINT: 'https://cloud.appwrite.io/v1',
  APPWRITE_PROJECT_ID: '',
  CLOUD_SERVICE_FN_ID: '',
  PLATFORM_API_FN_ID: '',
  APP_URL: DEFAULT_APP_URL,
  VALID_DOMAINS: [
    'terabox.com', 'teraboxapp.com', '1024terabox.com', '1024tera.com',
    '1024tera.co', '1024teraboxlink.com', '1024-terabox.com', 'tera1024box.com',
    'teraboxlink.com', 'teraboxlinks.com', 'teraboxlinke.com',
    'teraboxshare.com', 'teraboxsharefile.com',
    'teraboxshortlink.com', 'teraboxshort.com', 'teraboxurl.com',
    'teraboxfree.com', 'teraboxfan.com',
    'terabox.app', 'terabox.fun', 'terabox.link', 'terabox.club', 'terabox.click',
    'terasharelink.com', 'terasharefile.com', 'terashareus.com', 'terafileshare.com',
    'freeterabox.com',
    'mirrobox.com', 'nephobox.com', 'momerybox.com',
    'tibibox.com', 'gibibox.com', 'pebibox.com',
    '4funbox.com', '4funbox.co', '4funbox.in', 'fancybox.in',
    'teraboxdownloaderz.com', 'teraboxvideodownloader.com',
    'bestclouddrive.com', 'shortlinkshare.com', 'urlshortterabox.com',
  ],
  CACHE_TTL: 30 * 60 * 1000, // 30 minutes
};

// Load persisted Appwrite config from storage on startup
(async () => {
  const stored = await chrome.storage.local.get(['appwriteConfig', 'appUrl']);
  if (stored.appwriteConfig) {
    CONFIG.APPWRITE_ENDPOINT = stored.appwriteConfig.endpoint || CONFIG.APPWRITE_ENDPOINT;
    CONFIG.APPWRITE_PROJECT_ID = stored.appwriteConfig.projectId || '';
    CONFIG.CLOUD_SERVICE_FN_ID = stored.appwriteConfig.cloudServiceFnId || '';
    CONFIG.PLATFORM_API_FN_ID = stored.appwriteConfig.platformApiFnId || '';
  }
  if (stored.appUrl) CONFIG.APP_URL = stored.appUrl;
})();

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

  // Create context menus
  await createContextMenus();

  // Set up periodic alarm for link health check
  chrome.alarms.create('checkExpiredLinks', { periodInMinutes: 60 });

  // Initialize storage defaults
  const stored = await chrome.storage.local.get(['settings', 'appUrl']);
  if (!stored.settings) {
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
  // Write default APP_URL to storage if not yet configured
  if (!stored.appUrl) {
    await chrome.storage.local.set({ appUrl: DEFAULT_APP_URL });
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
    title: 'OmniStream',
    contexts: ['link'],
    targetUrlPatterns: CONFIG.VALID_DOMAINS.map(d => `*://*.${d}/*`),
  });

  chrome.contextMenus.create({
    id: 'save-link',
    parentId: 'omnistream-main',
    title: 'Save to Favorites',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'stream-link',
    parentId: 'omnistream-main',
    title: 'Stream Now',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'download-link',
    parentId: 'omnistream-main',
    title: 'Download',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'copy-direct',
    parentId: 'omnistream-main',
    title: 'Copy Direct Link',
    contexts: ['link'],
  });

  // Page menu for TeraBox pages
  chrome.contextMenus.create({
    id: 'page-save',
    title: 'Save to OmniStream',
    contexts: ['page'],
    documentUrlPatterns: CONFIG.VALID_DOMAINS.map(d => `*://*.${d}/*`),
  });

  // Selection menu for text with links
  chrome.contextMenus.create({
    id: 'selection-save',
    title: 'Save TeraBox Link',
    contexts: ['selection'],
  });
}

/**
 * Handle messages from content scripts and popup
 */
function handleMessage(request, sender, sendResponse) {

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

    // Config
    setAppwriteConfig: () => setAppwriteConfig(request.config),
    getAppwriteConfig: () => getAppwriteConfig(),
    setAppUrl: () => setAppUrl(request.url),

    // Misc
    openApp: () => openApp(request.path),
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

// ============ Appwrite Function Executor ============

/**
 * Execute an Appwrite function with the user's JWT for auth
 */
async function executeFunction(functionId, body = {}) {
  if (!CONFIG.APPWRITE_PROJECT_ID || !functionId) {
    throw new Error('Extension not configured. Open Settings → enter Appwrite details.');
  }

  const { token } = await chrome.storage.local.get('token');
  const headers = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': CONFIG.APPWRITE_PROJECT_ID,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${CONFIG.APPWRITE_ENDPOINT}/functions/${functionId}/executions`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ async: false, body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${text || response.statusText}`);
  }

  const execution = await response.json();

  // Appwrite returns execution result in responseBody
  const resBody = execution.responseBody || execution.response || '{}';
  try {
    return JSON.parse(resBody);
  } catch {
    return { raw: resBody };
  }
}

/** Shortcut: call cloud-service function */
async function callCloudService(body) {
  return executeFunction(CONFIG.CLOUD_SERVICE_FN_ID, body);
}

/** Shortcut: call platform-api function */
async function callPlatformApi(body) {
  return executeFunction(CONFIG.PLATFORM_API_FN_ID, body);
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
    const data = await callPlatformApi({ route: 'extension', action: 'auth-check' });
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

  const data = await callCloudService({ route: 'stream', url });
  if (data.error) throw new Error(data.error);

  // Cache the result
  await setCachedData(cacheKey, { data, timestamp: Date.now() });

  return data;
}

async function saveToFavorites(file, sourceUrl) {
  const { token } = await chrome.storage.local.get('token');
  if (!token) throw new Error('Not authenticated');

  const data = await callPlatformApi({
    route: 'extension',
    action: 'add-link',
    url: sourceUrl,
    title: file?.name || 'Untitled',
    file,
  });

  if (data.error) throw new Error(data.error);

  // Show notification
  await showNotification('Saved!', `${file?.name || 'Link'} added to your library`);

  return data;
}

async function getDownloadLink(url, fileId) {
  const { token } = await chrome.storage.local.get('token');
  if (!token) throw new Error('Not authenticated');

  const data = await callCloudService({ route: 'download', url, fs_id: fileId });
  if (data.error) throw new Error(data.error);

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
    return await callPlatformApi({ route: 'extension', action: 'queue' });
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
    return await callPlatformApi({ route: 'extension', action: 'stats' });
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
  const domainPattern = CONFIG.VALID_DOMAINS.map(d => d.replace(/\./g, '\\.')).join('|');
  const pattern = new RegExp(`https?://[^\\s]*(?:${domainPattern})[^\\s]*`, 'gi');
  const match = text.match(pattern);
  return match ? match[0] : null;
}

// ============ Config Management ============

async function setAppwriteConfig(config) {
  if (!config) throw new Error('Config required');
  const appwriteConfig = {
    endpoint: config.endpoint || CONFIG.APPWRITE_ENDPOINT,
    projectId: config.projectId || '',
    cloudServiceFnId: config.cloudServiceFnId || '',
    platformApiFnId: config.platformApiFnId || '',
  };
  await chrome.storage.local.set({ appwriteConfig });
  // Update in-memory config
  CONFIG.APPWRITE_ENDPOINT = appwriteConfig.endpoint;
  CONFIG.APPWRITE_PROJECT_ID = appwriteConfig.projectId;
  CONFIG.CLOUD_SERVICE_FN_ID = appwriteConfig.cloudServiceFnId;
  CONFIG.PLATFORM_API_FN_ID = appwriteConfig.platformApiFnId;
  return { success: true };
}

async function getAppwriteConfig() {
  const { appwriteConfig } = await chrome.storage.local.get('appwriteConfig');
  return appwriteConfig || {
    endpoint: CONFIG.APPWRITE_ENDPOINT,
    projectId: CONFIG.APPWRITE_PROJECT_ID,
    cloudServiceFnId: CONFIG.CLOUD_SERVICE_FN_ID,
    platformApiFnId: CONFIG.PLATFORM_API_FN_ID,
  };
}

async function setAppUrl(url) {
  if (!url) throw new Error('URL required');
  CONFIG.APP_URL = url;
  await chrome.storage.local.set({ appUrl: url });
  return { success: true };
}

async function openApp(path) {
  chrome.tabs.create({ url: `${CONFIG.APP_URL}${path || ''}` });
  return { success: true };
}

