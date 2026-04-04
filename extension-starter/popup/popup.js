/**
 * OmniStream Extension 2.0 — Popup Script
 * Premium UI · Dashboard · Library · Activity · Stats
 */

// ============ Configuration ============
const CONFIG = {
  APP_URL: '',
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
};

// Load APP_URL from storage
chrome.storage.local.get('appUrl').then(({ appUrl }) => {
  if (appUrl) CONFIG.APP_URL = appUrl;
});

// ============ DOM Elements ============
const $ = (id) => document.getElementById(id);
const elements = {
  // Auth gate
  authGate: $('authGate'),
  mainApp: $('mainApp'),
  authGateSignIn: $('authGateSignIn'),
  authGateSettings: $('authGateSettings'),

  // Header
  refreshBtn: $('refreshBtn'),
  settingsBtn: $('settingsBtn'),
  userAvatar: $('userAvatar'),

  // Current Page
  currentPageSection: $('currentPageSection'),
  currentPageContent: $('currentPageContent'),

  // Quick Add
  urlInput: $('urlInput'),
  pasteBtn: $('pasteBtn'),
  fetchBtn: $('fetchBtn'),

  // File Preview
  filePreview: $('filePreview'),
  filePreviewContent: $('filePreviewContent'),

  // Tabs
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),
  libraryCount: $('libraryCount'),

  // Dashboard
  dashRecentList: $('dashRecentList'),

  // Library
  libraryList: $('libraryList'),
  librarySearch: $('librarySearch'),

  // Activity
  activityTimeline: $('activityTimeline'),

  // Stats
  statDownloads: $('statDownloads'),
  statFavorites: $('statFavorites'),
  statStreams: $('statStreams'),
  statSearches: $('statSearches'),
  streamBar: $('streamBar'),
  downloadBar: $('downloadBar'),
  favBar: $('favBar'),
  searchBar: $('searchBar'),
  authEmail: $('authEmail'),
  authAvatarEl: $('authAvatarEl'),
  authBtn: $('authBtn'),

  // Footer
  openAppBtn: $('openAppBtn'),

  // Toast
  toast: $('toast'),
};

// ============ State ============
let currentFile = null;
let isAuthenticated = false;
let currentUser = null;
let libraryItems = [];
let activityLog = [];
let currentFilter = 'all';

// ============ Initialize ============
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await checkAuth();

  if (!isAuthenticated) {
    showAuthGate();
    setupAuthGateListeners();
    return;
  }

  showMainApp();
  await loadCurrentPageInfo();

  await Promise.all([
    loadLibrary(),
    loadActivity(),
    loadStats(),
  ]);

  setupEventListeners();
  loadActivityFromStorage();
}

function showAuthGate() {
  elements.authGate.classList.remove('hidden');
  elements.mainApp.classList.add('hidden');
}

function showMainApp() {
  elements.authGate.classList.add('hidden');
  elements.mainApp.classList.remove('hidden');
}

function setupAuthGateListeners() {
  elements.authGateSignIn.addEventListener('click', () => {
    const appUrl = CONFIG.APP_URL;
    chrome.tabs.create({ url: `${appUrl}/auth?redirect=extension` });
  });
  elements.authGateSettings.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// ============ Event Listeners ============
function setupEventListeners() {
  // Header
  elements.refreshBtn.addEventListener('click', handleRefresh);
  elements.settingsBtn.addEventListener('click', openSettings);
  elements.userAvatar.addEventListener('click', handleAuth);

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

  // Quick actions
  document.querySelectorAll('.quick-action').forEach(btn => {
    btn.addEventListener('click', () => handleQuickAction(btn.dataset.action));
  });

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderLibrary();
    });
  });

  // Library search
  if (elements.librarySearch) {
    elements.librarySearch.addEventListener('input', debounce(renderLibrary, 200));
  }

  // Empty CTA buttons
  document.querySelectorAll('.empty-cta').forEach(btn => {
    btn.addEventListener('click', () => handleQuickAction(btn.dataset.action));
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
  const avatar = elements.userAvatar;
  const authAvatar = elements.authAvatarEl;

  if (isAuthenticated && currentUser) {
    const initials = getInitials(currentUser.email || currentUser.name || '');
    avatar.classList.add('authed');
    avatar.textContent = initials;
    if (authAvatar) {
      authAvatar.classList.add('authed');
      authAvatar.textContent = initials;
    }
    elements.authEmail.textContent = currentUser.email || 'Signed in';
    elements.authEmail.nextElementSibling.textContent = 'Connected to OmniStream';
    elements.authBtn.textContent = 'Sign Out';
  } else {
    avatar.classList.remove('authed');
    avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    if (authAvatar) {
      authAvatar.classList.remove('authed');
      authAvatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    }
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
    showAuthGate();
    setupAuthGateListeners();
    return;
  } else {
    const appUrl = CONFIG.APP_URL;
    chrome.tabs.create({ url: `${appUrl}/auth?redirect=extension` });
  }
}

// ============ Current Page ============
async function loadCurrentPageInfo() {
  try {
    const response = await sendMessage({ action: 'getCurrentTabInfo' });

    if (response?.isTeraBox) {
      elements.currentPageContent.innerHTML = `
        <div class="current-page-info">
          <div class="current-page-icon">${svgIcon('loader', 20)}</div>
          <div class="current-page-details">
            <div class="current-page-name">Loading file info...</div>
            <div class="current-page-meta">
              <span class="current-page-size">Analyzing link...</span>
            </div>
          </div>
        </div>
      `;

      const fileInfo = await sendMessage({ action: 'fetchFileInfo', url: response.url });

      if (fileInfo?.list?.length > 0) {
        const file = fileInfo.list[0];
        currentFile = { ...file, sourceUrl: response.url };
        const type = getFileType(file).toLowerCase();
        const badgeClass = `badge-${type === 'archive' ? 'archive' : type === 'image' ? 'image' : type === 'audio' ? 'audio' : type === 'document' ? 'doc' : isVideo(file) ? 'video' : 'other'}`;

        elements.currentPageContent.innerHTML = `
          <div class="current-page-info">
            <div class="current-page-icon">${getFileIconSvg(file)}</div>
            <div class="current-page-details">
              <div class="current-page-name">${escapeHtml(truncate(file.name, 38))}</div>
              <div class="current-page-meta">
                <span class="current-page-badge ${badgeClass}">${isVideo(file) ? 'VIDEO' : getFileType(file).toUpperCase()}</span>
                <span class="current-page-size">${formatSize(file.size)}</span>
                ${fileInfo.cached ? '<span class="current-page-quality">CACHED</span>' : ''}
              </div>
            </div>
            <div class="current-page-actions">
              ${isVideo(file) ? `<button class="action-btn primary" data-action="stream" title="Stream">${svgIcon('play', 14)}</button>` : ''}
              <button class="action-btn" data-action="download" title="Download">${svgIcon('download', 14)}</button>
              <button class="action-btn" data-action="save" title="Save">${svgIcon('heart', 14)}</button>
            </div>
          </div>
        `;

        elements.currentPageContent.querySelectorAll('.action-btn').forEach(btn => {
          btn.addEventListener('click', () => handleFileAction(btn.dataset.action, currentFile));
        });

        if (fileInfo.list.length > 1) {
          elements.currentPageContent.innerHTML += `
            <div style="margin-top:6px;font-size:10px;color:var(--fg-dim);padding-left:58px">
              + ${fileInfo.list.length - 1} more file${fileInfo.list.length > 2 ? 's' : ''} in this link
            </div>
          `;
        }

        logActivity('stream', file.name, response.url);
      } else {
        showCurrentPageEmpty();
      }
    } else {
      elements.currentPageContent.innerHTML = `
        <div class="not-terabox">
          <span class="not-terabox-icon">${svgIcon('link', 20)}</span>
          <span>Visit a TeraBox page to detect files</span>
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
      <span class="not-terabox-icon">${svgIcon('file', 20)}</span>
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
    elements.urlInput.style.borderColor = 'hsl(173 80% 48%/.5)';
  } else {
    elements.urlInput.style.borderColor = '';
  }
}

async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    elements.urlInput.value = text;
    validateInput();
    if (isValidTeraBoxUrl(text)) handleFetch();
  } catch (error) {
    showToast('Cannot access clipboard', 'error');
  }
}

async function handleFetch() {
  const url = elements.urlInput.value.trim();
  if (!url) { showToast('Please enter a URL', 'error'); return; }
  if (!isValidTeraBoxUrl(url)) { showToast('Invalid TeraBox URL', 'error'); return; }

  if (!isAuthenticated) {
    showToast('Please sign in first', 'error');
    const appUrl = CONFIG.APP_URL;
    chrome.tabs.create({ url: `${appUrl}/auth` });
    return;
  }

  elements.fetchBtn.disabled = true;
  elements.fetchBtn.innerHTML = `<span class="spinner"></span> Fetching...`;

  try {
    const response = await sendMessage({ action: 'fetchFileInfo', url });
    if (response?.error) throw new Error(response.error);

    if (response?.list?.length > 0) {
      showFilePreview(response, url);
      elements.urlInput.value = '';
      logActivity('search', url);
      incrementStat('searches');
    } else {
      showToast('No files found in this link', 'error');
    }
  } catch (error) {
    showToast(error.message || 'Failed to fetch', 'error');
  } finally {
    elements.fetchBtn.disabled = false;
    elements.fetchBtn.innerHTML = `${svgIcon('search', 15)} Fetch`;
  }
}

function showFilePreview(data, sourceUrl) {
  const file = data.list[0];
  const type = getFileType(file).toLowerCase();
  const badgeClass = `badge-${isVideo(file) ? 'video' : type === 'archive' ? 'archive' : type === 'image' ? 'image' : type === 'audio' ? 'audio' : type === 'document' ? 'doc' : 'other'}`;

  elements.filePreview.classList.remove('hidden');
  elements.filePreviewContent.innerHTML = `
    <div class="file-card">
      <div class="file-thumb">
        ${file.thumbnail
          ? `<img src="${file.thumbnail}" alt="">`
          : `<div class="file-thumb-placeholder">${getFileIconSvg(file)}</div>`
        }
        ${isVideo(file) ? '<span class="duration-badge">VIDEO</span>' : ''}
      </div>
      <div class="file-info">
        <div class="file-name">${escapeHtml(truncate(file.name, 38))}</div>
        <div class="file-meta">
          <span class="file-meta-tag ${badgeClass}">${isVideo(file) ? 'VIDEO' : getFileType(file)}</span>
          <span class="file-meta-tag">${formatSize(file.size)}</span>
          ${data.cached ? `<span class="file-meta-tag" style="color:var(--primary)">CACHED</span>` : ''}
        </div>
        <div class="file-actions">
          ${isVideo(file) ? `<button class="btn btn-primary btn-xs" data-action="stream">${svgIcon('play', 12)} Stream</button>` : ''}
          <button class="btn btn-secondary btn-xs" data-action="download">${svgIcon('download', 12)} Download</button>
          <button class="btn btn-secondary btn-xs" data-action="save">${svgIcon('heart', 12)} Save</button>
        </div>
      </div>
    </div>
  `;

  currentFile = { ...file, sourceUrl };

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
          const appUrl = CONFIG.APP_URL;
          chrome.tabs.create({ url: `${appUrl}?stream=${encodeURIComponent(file.sourceUrl)}` });
        }
        logActivity('stream', file.name, file.sourceUrl);
        incrementStat('streams');
        break;

      case 'download':
        const downloadUrl = file.fast_link || file.dlink;
        if (downloadUrl) {
          chrome.tabs.create({ url: downloadUrl });
          logActivity('download', file.name, file.sourceUrl);
          incrementStat('downloads');
        } else {
          showToast('Download link not available', 'error');
        }
        break;

      case 'save':
        await sendMessage({ action: 'saveToFavorites', file, sourceUrl: file.sourceUrl });
        showToast('Saved to library!', 'success');
        logActivity('favorite', file.name, file.sourceUrl);
        incrementStat('favorites');
        await loadLibrary();
        break;
    }
  } catch (error) {
    showToast(error.message || 'Action failed', 'error');
  }
}

// ============ Quick Actions ============
function handleQuickAction(action) {
  const appUrl = CONFIG.APP_URL;
  switch (action) {
    case 'stream':
      elements.urlInput.focus();
      break;
    case 'favorites':
      switchTab('library');
      break;
    case 'history':
      switchTab('activity');
      break;
    case 'downloads':
      chrome.tabs.create({ url: `${appUrl}/dashboard` });
      break;
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
    libraryItems = [];
    renderLibrary();
    elements.libraryCount.textContent = '0';
    return;
  }

  try {
    const response = await sendMessage({ action: 'getQueue' });
    libraryItems = response?.queue || [];
    elements.libraryCount.textContent = libraryItems.length;
    renderLibrary();
  } catch (error) {
    console.error('Error loading library:', error);
  }
}

function renderLibrary() {
  const query = (elements.librarySearch?.value || '').toLowerCase().trim();
  let items = [...libraryItems];

  // Filter by search
  if (query) {
    items = items.filter(item =>
      (item.title || item.name || '').toLowerCase().includes(query) ||
      (item.source_url || item.url || '').toLowerCase().includes(query)
    );
  }

  // Filter by type
  if (currentFilter !== 'all') {
    items = items.filter(item => {
      const type = getFileType(item).toLowerCase();
      if (currentFilter === 'video') return isVideo(item);
      return type === currentFilter;
    });
  }

  if (!isAuthenticated) {
    elements.libraryList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${svgIcon('lock', 22)}</div>
        <p>Sign in to see your library</p>
        <span>Your saved files will appear here</span>
        <button class="empty-cta" onclick="handleAuth()">Sign In</button>
      </div>
    `;
    return;
  }

  if (items.length === 0) {
    const isFiltered = query || currentFilter !== 'all';
    elements.libraryList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${svgIcon(isFiltered ? 'search-x' : 'heart', 22)}</div>
        <p>${isFiltered ? 'No matches found' : 'Library is empty'}</p>
        <span>${isFiltered ? 'Try a different search or filter' : 'Save links to build your collection'}</span>
      </div>
    `;
    return;
  }

  elements.libraryList.innerHTML = items.slice(0, 30).map(item => `
    <div class="item" data-url="${escapeHtml(item.source_url || item.url)}">
      <div class="item-icon">${getFileIconSvg(item)}</div>
      <div class="item-content">
        <div class="item-name">${escapeHtml(truncate(item.title || item.name || 'Untitled', 32))}</div>
        <div class="item-meta">
          <span>${formatRelativeTime(item.created_at || item.addedAt)}</span>
          ${item.size ? `<span class="dot">&middot;</span><span>${formatSize(item.size)}</span>` : ''}
        </div>
      </div>
      <div class="item-actions">
        <button class="item-btn" data-action="stream" title="Stream">${svgIcon('play', 11)}</button>
        <button class="item-btn" data-action="download" title="Download">${svgIcon('download', 11)}</button>
      </div>
    </div>
  `).join('');

  // Attach handlers
  elements.libraryList.querySelectorAll('.item').forEach(item => {
    item.querySelectorAll('.item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = item.dataset.url;
        const appUrl = CONFIG.APP_URL;
        if (btn.dataset.action === 'stream') {
          chrome.tabs.create({ url: `${appUrl}?stream=${encodeURIComponent(url)}` });
        } else {
          chrome.tabs.create({ url: `${appUrl}?download=${encodeURIComponent(url)}` });
        }
      });
    });
    item.addEventListener('click', () => {
      const appUrl = CONFIG.APP_URL;
      chrome.tabs.create({ url: `${appUrl}?url=${encodeURIComponent(item.dataset.url)}` });
    });
  });
}

// ============ Activity ============
async function loadActivity() {
  try {
    const response = await sendMessage({ action: 'getRecent' });
    const recentItems = response?.recent || [];

    // Render dashboard recent list
    if (elements.dashRecentList) {
      if (recentItems.length === 0) {
        // Keep default empty state
      } else {
        elements.dashRecentList.innerHTML = recentItems.slice(0, 5).map(item => `
          <div class="item" data-url="${escapeHtml(item.url)}">
            <div class="item-icon">${getFileIconSvg(item)}</div>
            <div class="item-content">
              <div class="item-name">${escapeHtml(truncate(item.title || 'Untitled', 32))}</div>
              <div class="item-meta">
                <span>${formatRelativeTime(item.addedAt)}</span>
                <span class="dot">&middot;</span>
                <span>${item.status || 'viewed'}</span>
              </div>
            </div>
          </div>
        `).join('');

        elements.dashRecentList.querySelectorAll('.item').forEach(item => {
          item.addEventListener('click', () => {
            chrome.tabs.create({ url: item.dataset.url });
          });
        });
      }
    }
  } catch (error) {
    console.error('Error loading activity:', error);
  }
}

function loadActivityFromStorage() {
  chrome.storage.local.get('activityLog', ({ activityLog: log }) => {
    activityLog = log || [];
    renderActivityTimeline();
  });
}

function renderActivityTimeline() {
  if (!elements.activityTimeline) return;

  if (activityLog.length === 0) return; // keep default empty state

  elements.activityTimeline.innerHTML = activityLog.slice(0, 20).map(entry => `
    <div class="activity-item">
      <div class="activity-dot ${entry.type}"></div>
      <div class="activity-content">
        <div class="activity-text">
          <strong>${getActivityVerb(entry.type)}</strong> ${escapeHtml(truncate(entry.title || entry.url || '', 40))}
        </div>
        <div class="activity-time">${formatRelativeTime(entry.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

function logActivity(type, title, url) {
  const entry = { type, title: title || '', url: url || '', timestamp: new Date().toISOString() };
  activityLog.unshift(entry);
  activityLog = activityLog.slice(0, 50);
  chrome.storage.local.set({ activityLog });
  renderActivityTimeline();
}

function getActivityVerb(type) {
  switch (type) {
    case 'stream': return 'Streamed';
    case 'download': return 'Downloaded';
    case 'favorite': return 'Saved';
    case 'search': return 'Fetched';
    default: return 'Viewed';
  }
}

// ============ Stats ============
async function loadStats() {
  // Load local stats
  const stored = await chrome.storage.local.get('stats');
  const stats = stored?.stats || { streams: 0, downloads: 0, favorites: 0, searches: 0 };

  if (!isAuthenticated) {
    elements.statDownloads.textContent = stats.downloads || '—';
    elements.statFavorites.textContent = stats.favorites || '—';
    elements.statStreams.textContent = stats.streams || '—';
    if (elements.statSearches) elements.statSearches.textContent = stats.searches || '—';
    updateStatBars(stats);
    return;
  }

  try {
    const response = await sendMessage({ action: 'getStats' });
    const merged = {
      streams: Math.max(response?.streams ?? 0, stats.streams),
      downloads: Math.max(response?.downloads ?? 0, stats.downloads),
      favorites: Math.max(response?.favorites ?? 0, stats.favorites),
      searches: stats.searches || 0,
    };

    elements.statStreams.textContent = merged.streams;
    elements.statDownloads.textContent = merged.downloads;
    elements.statFavorites.textContent = merged.favorites;
    if (elements.statSearches) elements.statSearches.textContent = merged.searches;

    updateStatBars(merged);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function updateStatBars(stats) {
  const max = Math.max(stats.streams, stats.downloads, stats.favorites, stats.searches, 1);
  if (elements.streamBar) elements.streamBar.style.width = `${(stats.streams / max) * 100}%`;
  if (elements.downloadBar) elements.downloadBar.style.width = `${(stats.downloads / max) * 100}%`;
  if (elements.favBar) elements.favBar.style.width = `${(stats.favorites / max) * 100}%`;
  if (elements.searchBar) elements.searchBar.style.width = `${(stats.searches / max) * 100}%`;
}

async function incrementStat(key) {
  const stored = await chrome.storage.local.get('stats');
  const stats = stored?.stats || { streams: 0, downloads: 0, favorites: 0, searches: 0 };
  stats[key] = (stats[key] || 0) + 1;
  await chrome.storage.local.set({ stats });
}

// ============ Actions ============
async function handleRefresh() {
  elements.refreshBtn.classList.add('spinning');
  await Promise.all([loadCurrentPageInfo(), loadLibrary(), loadActivity(), loadStats()]);
  setTimeout(() => elements.refreshBtn.classList.remove('spinning'), 500);
  showToast('Refreshed!', 'success');
}

function openSettings() { chrome.runtime.openOptionsPage(); }

function openApp() {
  const appUrl = CONFIG.APP_URL;
  chrome.tabs.create({ url: appUrl });
}

// ============ SVG Icon Helper ============
function svgIcon(name, size = 16) {
  const s = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    play: `<svg ${s}><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
    download: `<svg ${s}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
    heart: `<svg ${s}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
    search: `<svg ${s}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    link: `<svg ${s}><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>`,
    file: `<svg ${s}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
    video: `<svg ${s}><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`,
    music: `<svg ${s}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    image: `<svg ${s}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
    archive: `<svg ${s}><path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"/><path d="M4 12h16"/><path d="m10 16 2-2 2 2"/><path d="m10 8 2 2 2-2"/></svg>`,
    lock: `<svg ${s}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    loader: `<svg ${s} class="spinning"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    'search-x': `<svg ${s}><path d="m13.5 8.5-5 5"/><path d="m8.5 8.5 5 5"/><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  };
  return icons[name] || icons.file;
}

function getFileIconSvg(file) {
  if (!file) return svgIcon('file', 18);
  if (isVideo(file)) return svgIcon('video', 18);
  const name = (file.name || file.title || '').toLowerCase();
  if (name.match(/\.(zip|rar|7z|tar|gz)$/)) return svgIcon('archive', 18);
  if (name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return svgIcon('image', 18);
  if (name.match(/\.(mp3|wav|flac|aac|ogg)$/)) return svgIcon('music', 18);
  return svgIcon('file', 18);
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
  const name = (file?.name || file?.title || '').toLowerCase();
  return videoExts.some(ext => name.endsWith(ext));
}

function getFileType(file) {
  const name = (file?.name || file?.title || '').toLowerCase();
  if (name.match(/\.(zip|rar|7z|tar|gz)$/)) return 'Archive';
  if (name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'Image';
  if (name.match(/\.(mp3|wav|flac|aac|ogg)$/)) return 'Audio';
  if (name.match(/\.(pdf|doc|docx|txt|xlsx|pptx)$/)) return 'Document';
  if (isVideo(file)) return 'Video';
  return 'File';
}

function getFileIcon(file) {
  if (!file) return svgIcon('file', 16);
  return getFileIconSvg(file);
}

function formatSize(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
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

function getInitials(str) {
  if (!str) return '?';
  const parts = str.split(/[@.\s]+/);
  return (parts[0]?.[0] || '?').toUpperCase();
}

function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

function showToast(message, type = 'success') {
  const iconSvg = type === 'success'
    ? svgIcon('heart', 14)
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;

  elements.toast.innerHTML = `<span class="toast-icon">${iconSvg}</span>${escapeHtml(message)}`;
  elements.toast.className = `toast show ${type}`;
  setTimeout(() => elements.toast.classList.remove('show'), 3000);
}

