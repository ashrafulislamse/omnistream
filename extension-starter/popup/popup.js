/**
 * OmniStream Extension 2.0 - Popup Script
 * Handles all popup UI interactions and API calls
 */

// ============ Configuration ============
const CONFIG = {
  APP_URL: 'https://terastream-vault.lovable.app',
  VALID_DOMAINS: ['terabox.com', '1024terabox.com', 'teraboxapp.com', '1024tera.com'],
};

// ============ DOM Elements ============
const elements = {
  // Header
  refreshBtn: document.getElementById('refreshBtn'),
  settingsBtn: document.getElementById('settingsBtn'),

  // Current Page
  currentPageSection: document.getElementById('currentPageSection'),
  currentPageContent: document.getElementById('currentPageContent'),

  // Quick Add
  urlInput: document.getElementById('urlInput'),
  pasteBtn: document.getElementById('pasteBtn'),
  fetchBtn: document.getElementById('fetchBtn'),

  // File Preview
  filePreview: document.getElementById('filePreview'),
  filePreviewContent: document.getElementById('filePreviewContent'),

  // Tabs
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),
  libraryCount: document.getElementById('libraryCount'),

  // Tab Contents
  libraryList: document.getElementById('libraryList'),
  recentList: document.getElementById('recentList'),

  // Stats
  statDownloads: document.getElementById('statDownloads'),
  statFavorites: document.getElementById('statFavorites'),
  statStreams: document.getElementById('statStreams'),
  authEmail: document.getElementById('authEmail'),
  authBtn: document.getElementById('authBtn'),

  // Footer
  openAppBtn: document.getElementById('openAppBtn'),

  // Toast
  toast: document.getElementById('toast'),
};

// ============ State ============
let currentFile = null;
let isAuthenticated = false;
let currentUser = null;

// ============ Initialize ============
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Check authentication
  await checkAuth();

  // Load current page info
  await loadCurrentPageInfo();

  // Load data
  await Promise.all([
    loadLibrary(),
    loadRecent(),
    loadStats(),
  ]);

  // Set up event listeners
  setupEventListeners();
}

// ============ Event Listeners ============
function setupEventListeners() {
  // Header actions
  elements.refreshBtn.addEventListener('click', handleRefresh);
  elements.settingsBtn.addEventListener('click', openSettings);

  // Quick add
  elements.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleFetch();
  });
  elements.urlInput.addEventListener('input', validateInput);
  elements.pasteBtn.addEventListener('click', handlePaste);
  elements.fetchBtn.addEventListener('click', handleFetch);

  // Tabs
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Auth button
  elements.authBtn.addEventListener('click', handleAuth);

  // Footer
  elements.openAppBtn.addEventListener('click', openApp);
}

// ============ Authentication ============
async function checkAuth() {
  try {
    const response = await sendMessage({ action: 'getAuth' });
    isAuthenticated = response?.authenticated ?? false;
    currentUser = response?.user;

    updateAuthUI();
  } catch (error) {
    console.error('Auth check error:', error);
    isAuthenticated = false;
  }
}

function updateAuthUI() {
  if (isAuthenticated && currentUser) {
    elements.authEmail.textContent = currentUser.email || 'Signed in';
    elements.authEmail.nextElementSibling.textContent = 'Connected to OmniStream';
    elements.authBtn.textContent = 'Sign Out';
  } else {
    elements.authEmail.textContent = 'Not signed in';
    elements.authEmail.nextElementSibling.textContent = 'Sign in to sync your data';
    elements.authBtn.textContent = 'Sign In';
  }
}

async function handleAuth() {
  if (isAuthenticated) {
    await sendMessage({ action: 'logout' });
    isAuthenticated = false;
    currentUser = null;
    updateAuthUI();
    showToast('Signed out successfully');
  } else {
    chrome.tabs.create({ url: `${CONFIG.APP_URL}/auth?redirect=extension` });
  }
}

// ============ Current Page ============
async function loadCurrentPageInfo() {
  try {
    const response = await sendMessage({ action: 'getCurrentTabInfo' });

    if (response?.isTeraBox) {
      elements.currentPageContent.innerHTML = `
        <div class="current-page-info loading">
          <div class="current-page-icon">🔄</div>
          <div class="current-page-details">
            <div class="current-page-name">Loading file info...</div>
            <div class="current-page-meta">
              <span class="current-page-size">Fetching...</span>
            </div>
          </div>
        </div>
      `;

      // Fetch file info
      const fileInfo = await sendMessage({ action: 'fetchFileInfo', url: response.url });

      if (fileInfo?.list?.length > 0) {
        const file = fileInfo.list[0];
        currentFile = { ...file, sourceUrl: response.url };

        elements.currentPageContent.innerHTML = `
          <div class="current-page-info">
            <div class="current-page-icon">${getFileIcon(file)}</div>
            <div class="current-page-details">
              <div class="current-page-name">${escapeHtml(truncate(file.name, 35))}</div>
              <div class="current-page-meta">
                ${isVideo(file) ? '<span class="current-page-badge">VIDEO</span>' : ''}
                <span class="current-page-size">${formatSize(file.size)}</span>
                ${fileInfo.cached ? '<span class="current-page-size">⚡ Cached</span>' : ''}
              </div>
            </div>
            <div class="current-page-actions">
              ${isVideo(file) && file.stream_link ? `
                <button class="action-btn primary" data-action="stream" title="Stream">▶️</button>
              ` : ''}
              <button class="action-btn" data-action="download" title="Download">⬇️</button>
              <button class="action-btn" data-action="save" title="Save">❤️</button>
            </div>
          </div>
        `;

        // Add action listeners
        elements.currentPageContent.querySelectorAll('.action-btn').forEach(btn => {
          btn.addEventListener('click', () => handleFileAction(btn.dataset.action, currentFile));
        });

        // Show more files if available
        if (fileInfo.list.length > 1) {
          elements.currentPageContent.innerHTML += `
            <div class="more-files-hint" style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
              + ${fileInfo.list.length - 1} more file${fileInfo.list.length > 2 ? 's' : ''}
            </div>
          `;
        }
      } else {
        showCurrentPageEmpty();
      }
    } else {
      elements.currentPageContent.innerHTML = `
        <div class="not-terabox">
          <span class="not-terabox-icon">🔗</span>
          <span>Visit a TeraBox page to see file info</span>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading current page:', error);
    showCurrentPageEmpty();
  }
}

function showCurrentPageEmpty() {
  elements.currentPageContent.innerHTML = `
    <div class="not-terabox">
      <span class="not-terabox-icon">📄</span>
      <span>No file info available</span>
    </div>
  `;
}

// ============ Quick Add ============
function validateInput() {
  const url = elements.urlInput.value.trim();
  const isValid = isValidTeraBoxUrl(url);
  elements.fetchBtn.disabled = !url;

  if (url && !isValid) {
    elements.urlInput.style.borderColor = 'var(--error)';
  } else if (url && isValid) {
    elements.urlInput.style.borderColor = 'var(--accent-primary)';
  } else {
    elements.urlInput.style.borderColor = '';
  }
}

async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    elements.urlInput.value = text;
    validateInput();

    if (isValidTeraBoxUrl(text)) {
      handleFetch();
    }
  } catch (error) {
    showToast('Cannot access clipboard', 'error');
  }
}

async function handleFetch() {
  const url = elements.urlInput.value.trim();

  if (!url) {
    showToast('Please enter a URL', 'error');
    return;
  }

  if (!isValidTeraBoxUrl(url)) {
    showToast('Invalid TeraBox URL', 'error');
    return;
  }

  if (!isAuthenticated) {
    showToast('Please sign in first', 'error');
    chrome.tabs.create({ url: `${CONFIG.APP_URL}/auth` });
    return;
  }

  // Show loading state
  elements.fetchBtn.disabled = true;
  elements.fetchBtn.innerHTML = '<span class="spinner">⏳</span> Loading...';

  try {
    const response = await sendMessage({ action: 'fetchFileInfo', url });

    if (response?.error) {
      throw new Error(response.error);
    }

    if (response?.list?.length > 0) {
      showFilePreview(response, url);
      elements.urlInput.value = '';
    } else {
      showToast('No files found in this link', 'error');
    }
  } catch (error) {
    showToast(error.message || 'Failed to fetch', 'error');
  } finally {
    elements.fetchBtn.disabled = false;
    elements.fetchBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
      <span>Fetch</span>
    `;
  }
}

function showFilePreview(data, sourceUrl) {
  const file = data.list[0];

  elements.filePreview.classList.remove('hidden');
  elements.filePreviewContent.innerHTML = `
    <div class="file-card">
      <div class="file-thumb">
        ${file.thumbnail ? `<img src="${file.thumbnail}" alt="">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px">${getFileIcon(file)}</div>'}
      </div>
      <div class="file-info">
        <div class="file-name">${escapeHtml(truncate(file.name, 40))}</div>
        <div class="file-meta">
          <span class="current-page-badge">${isVideo(file) ? 'VIDEO' : getFileType(file)}</span>
          <span style="color:var(--text-muted);font-size:11px">${formatSize(file.size)}</span>
          ${data.cached ? '<span style="color:var(--accent-primary);font-size:11px">⚡ Cached</span>' : ''}
        </div>
        <div class="file-actions">
          ${isVideo(file) ? `
            <button class="btn btn-primary btn-sm" data-action="stream">▶️ Stream</button>
          ` : ''}
          <button class="btn btn-secondary btn-sm" data-action="download">⬇️ Download</button>
          <button class="btn btn-secondary btn-sm" data-action="save">❤️ Save</button>
        </div>
      </div>
    </div>
  `;

  // Store for actions
  currentFile = { ...file, sourceUrl };

  // Add listeners
  elements.filePreviewContent.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleFileAction(btn.dataset.action, currentFile));
  });
}

// ============ File Actions ============
async function handleFileAction(action, file) {
  if (!file) return;

  try {
    switch (action) {
      case 'stream':
        if (file.stream_link) {
          chrome.tabs.create({ url: file.stream_link });
        } else {
          chrome.tabs.create({ url: `${CONFIG.APP_URL}?stream=${encodeURIComponent(file.sourceUrl)}` });
        }
        break;

      case 'download':
        const downloadUrl = file.fast_link || file.dlink;
        if (downloadUrl) {
          chrome.tabs.create({ url: downloadUrl });
        } else {
          showToast('Download link not available', 'error');
        }
        break;

      case 'save':
        await sendMessage({
          action: 'saveToFavorites',
          file,
          sourceUrl: file.sourceUrl,
        });
        showToast('Saved to favorites! ❤️', 'success');
        await loadLibrary();
        break;
    }
  } catch (error) {
    showToast(error.message || 'Action failed', 'error');
  }
}

// ============ Tabs ============
function switchTab(tabName) {
  elements.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === tabName);
  });
}

// ============ Library ============
async function loadLibrary() {
  if (!isAuthenticated) {
    elements.libraryList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔐</div>
        <p>Sign in to see your library</p>
        <span>Your saved files will appear here</span>
      </div>
    `;
    elements.libraryCount.textContent = '0';
    return;
  }

  try {
    const response = await sendMessage({ action: 'getQueue' });
    const items = response?.queue || [];

    elements.libraryCount.textContent = items.length;

    if (items.length === 0) {
      elements.libraryList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <p>Your library is empty</p>
          <span>Save links to build your collection</span>
        </div>
      `;
      return;
    }

    elements.libraryList.innerHTML = items.slice(0, 20).map(item => `
      <div class="item" data-url="${escapeHtml(item.source_url || item.url)}">
        <div class="item-icon">${getFileIcon(item)}</div>
        <div class="item-content">
          <div class="item-name">${escapeHtml(truncate(item.title || item.name || 'Untitled', 30))}</div>
          <div class="item-meta">
            <span>${formatRelativeTime(item.created_at || item.addedAt)}</span>
            ${item.size ? `<span>• ${formatSize(item.size)}</span>` : ''}
          </div>
        </div>
        <div class="item-actions">
          <button class="item-btn" data-action="stream" title="Stream">▶️</button>
          <button class="item-btn" data-action="download" title="Download">⬇️</button>
        </div>
      </div>
    `).join('');

    // Add click handlers
    elements.libraryList.querySelectorAll('.item').forEach(item => {
      item.querySelectorAll('.item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = item.dataset.url;
          if (btn.dataset.action === 'stream') {
            chrome.tabs.create({ url: `${CONFIG.APP_URL}?stream=${encodeURIComponent(url)}` });
          } else {
            chrome.tabs.create({ url: `${CONFIG.APP_URL}?download=${encodeURIComponent(url)}` });
          }
        });
      });

      item.addEventListener('click', () => {
        chrome.tabs.create({ url: `${CONFIG.APP_URL}?url=${encodeURIComponent(item.dataset.url)}` });
      });
    });
  } catch (error) {
    console.error('Error loading library:', error);
  }
}

// ============ Recent ============
async function loadRecent() {
  try {
    const response = await sendMessage({ action: 'getRecent' });
    const items = response?.recent || [];

    if (items.length === 0) {
      elements.recentList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🕐</div>
          <p>No recent activity</p>
          <span>Your recent files will appear here</span>
        </div>
      `;
      return;
    }

    elements.recentList.innerHTML = items.slice(0, 20).map(item => `
      <div class="item" data-url="${escapeHtml(item.url)}">
        <div class="item-icon">📄</div>
        <div class="item-content">
          <div class="item-name">${escapeHtml(truncate(item.title || 'Untitled', 30))}</div>
          <div class="item-meta">
            <span>${formatRelativeTime(item.addedAt)}</span>
            <span>• ${item.status || 'saved'}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="item-btn" data-action="open" title="Open">↗️</button>
        </div>
      </div>
    `).join('');

    elements.recentList.querySelectorAll('.item').forEach(item => {
      item.addEventListener('click', () => {
        chrome.tabs.create({ url: item.dataset.url });
      });
    });
  } catch (error) {
    console.error('Error loading recent:', error);
  }
}

// ============ Stats ============
async function loadStats() {
  if (!isAuthenticated) {
    elements.statDownloads.textContent = '—';
    elements.statFavorites.textContent = '—';
    elements.statStreams.textContent = '—';
    return;
  }

  try {
    const response = await sendMessage({ action: 'getStats' });

    elements.statDownloads.textContent = response?.downloads ?? 0;
    elements.statFavorites.textContent = response?.favorites ?? 0;
    elements.statStreams.textContent = response?.streams ?? 0;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// ============ Actions ============
async function handleRefresh() {
  elements.refreshBtn.classList.add('spinning');

  await Promise.all([
    loadCurrentPageInfo(),
    loadLibrary(),
    loadRecent(),
    loadStats(),
  ]);

  setTimeout(() => {
    elements.refreshBtn.classList.remove('spinning');
  }, 500);

  showToast('Refreshed!', 'success');
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

function openApp() {
  chrome.tabs.create({ url: CONFIG.APP_URL });
}

// ============ Utilities ============
function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve);
  });
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

function isVideo(file) {
  const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
  const name = (file?.name || '').toLowerCase();
  return videoExts.some(ext => name.endsWith(ext));
}

function getFileType(file) {
  const name = (file?.name || '').toLowerCase();
  if (name.match(/\.(zip|rar|7z|tar|gz)$/)) return 'Archive';
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'Image';
  if (name.match(/\.(mp3|wav|flac|aac)$/)) return 'Audio';
  if (name.match(/\.(pdf|doc|docx|txt)$/)) return 'Document';
  return 'File';
}

function getFileIcon(file) {
  if (!file) return '📄';
  if (isVideo(file)) return '🎬';
  const name = (file.name || '').toLowerCase();
  if (name.match(/\.(zip|rar|7z)$/)) return '📦';
  if (name.match(/\.(jpg|png|gif|webp)$/)) return '🖼️';
  if (name.match(/\.(mp3|wav|flac)$/)) return '🎵';
  if (name.match(/\.(pdf)$/)) return '📕';
  return '📄';
}

function formatSize(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 3) + '...' : str;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function showToast(message, type = 'success') {
  elements.toast.textContent = message;
  elements.toast.className = `toast show ${type}`;

  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

console.log('[OmniStream] Popup initialized');
