/**
 * OmniStream - TeraBox Page Enhancer
 * Injects floating overlay on TeraBox pages with file info and actions
 */

(function () {
    'use strict';

    // Prevent double injection
    if (window.__omniStreamEnhancer) return;
    window.__omniStreamEnhancer = true;

    const OVERLAY_ID = 'omnistream-overlay';
    let currentFileInfo = null;
    let isAuthenticated = false;

    // ============ Initialization ============
    init();

    async function init() {
        // Check settings
        const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
        if (response?.showOverlay === false) return;

        // Check auth
        const auth = await chrome.runtime.sendMessage({ action: 'getAuth' });
        isAuthenticated = auth?.authenticated ?? false;

        // Wait for page to settle
        await waitForPageLoad();

        // Detect if this is a share page
        if (isSharePage()) {
            await injectOverlay();
        }

        // Listen for navigation changes (SPA)
        observeUrlChanges();
    }

    function isSharePage() {
        return window.location.pathname.includes('/s/') ||
            window.location.pathname.includes('/sharing/');
    }

    function waitForPageLoad() {
        return new Promise(resolve => {
            if (document.readyState === 'complete') {
                setTimeout(resolve, 1000); // Extra delay for SPA content
            } else {
                window.addEventListener('load', () => setTimeout(resolve, 1000));
            }
        });
    }

    function observeUrlChanges() {
        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                if (isSharePage()) {
                    setTimeout(injectOverlay, 500);
                } else {
                    removeOverlay();
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    // ============ Overlay Injection ============
    async function injectOverlay() {
        // Remove existing
        removeOverlay();

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.innerHTML = getOverlayHTML('loading');
        document.body.appendChild(overlay);

        // Make draggable
        makeDraggable(overlay);

        // Fetch file info
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'fetchFileInfo',
                url: window.location.href,
            });

            if (response?.error) {
                updateOverlay('error', response.error);
            } else if (response?.list?.length > 0) {
                currentFileInfo = response;
                updateOverlay('loaded', response);
            } else {
                updateOverlay('empty');
            }
        } catch (error) {
            console.error('[OmniStream] Error fetching file info:', error);
            updateOverlay('error', error.message);
        }

        // Attach event listeners
        attachEventListeners();
    }

    function removeOverlay() {
        const existing = document.getElementById(OVERLAY_ID);
        if (existing) existing.remove();
    }

    function getOverlayHTML(state, data) {
        const baseHTML = `
      <div class="ts-overlay-inner">
        <div class="ts-header">
          <div class="ts-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5,3 19,12 5,21" fill="currentColor"/>
            </svg>
            <span>OmniStream</span>
          </div>
          <div class="ts-header-actions">
            <button class="ts-btn-icon ts-minimize" title="Minimize">─</button>
            <button class="ts-btn-icon ts-close" title="Close">×</button>
          </div>
        </div>
        <div class="ts-content">
          ${getContentHTML(state, data)}
        </div>
      </div>
    `;
        return baseHTML;
    }

    function getContentHTML(state, data) {
        switch (state) {
            case 'loading':
                return `
          <div class="ts-loading">
            <div class="ts-spinner"></div>
            <p>Fetching file info...</p>
          </div>
        `;

            case 'error':
                return `
          <div class="ts-error">
            <span class="ts-error-icon">⚠️</span>
            <p>${escapeHtml(data || 'Failed to fetch file info')}</p>
            <button class="ts-btn ts-btn-secondary ts-retry">Retry</button>
          </div>
        `;

            case 'empty':
                return `
          <div class="ts-empty">
            <span class="ts-empty-icon">📂</span>
            <p>No files found in this link</p>
          </div>
        `;

            case 'auth':
                return `
          <div class="ts-auth">
            <span class="ts-auth-icon">🔐</span>
            <p>Sign in to OmniStream to continue</p>
            <button class="ts-btn ts-btn-primary ts-login">Sign In</button>
          </div>
        `;

            case 'loaded':
                return getFileListHTML(data);

            case 'minimized':
                return `
          <div class="ts-minimized-content">
            <span>📁 ${data?.list?.length || 0} files</span>
            <button class="ts-btn-icon ts-expand">↗</button>
          </div>
        `;

            default:
                return '';
        }
    }

    function getFileListHTML(data) {
        const files = data.list || [];
        const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
        const isCached = data.cached;

        // Group files
        const videos = files.filter(f => isVideo(f));
        const others = files.filter(f => !isVideo(f));

        // Show first file featured, rest in list
        const featured = videos[0] || files[0];
        const remaining = files.filter(f => f !== featured);

        let html = `
      <div class="ts-file-info">
        ${isCached ? '<div class="ts-cache-badge">⚡ Cached</div>' : ''}
        
        <div class="ts-featured-file">
          ${featured.thumbnail ? `<img class="ts-thumbnail" src="${featured.thumbnail}" alt="">` : ''}
          <div class="ts-file-details">
            <h3 class="ts-file-name">${escapeHtml(truncate(featured.name, 50))}</h3>
            <div class="ts-file-meta">
              <span class="ts-badge ${isVideo(featured) ? 'ts-badge-video' : 'ts-badge-file'}">
                ${isVideo(featured) ? '🎬 Video' : '📄 ' + getFileType(featured)}
              </span>
              <span class="ts-size">${formatSize(featured.size)}</span>
            </div>
          </div>
        </div>

        <div class="ts-actions">
          ${isVideo(featured) && featured.stream_link ? `
            <button class="ts-btn ts-btn-primary ts-action" data-action="stream" data-index="0">
              <span class="ts-btn-icon">▶️</span> Stream
            </button>
          ` : ''}
          <button class="ts-btn ts-btn-accent ts-action" data-action="download" data-index="0">
            <span class="ts-btn-icon">⬇️</span> Download
          </button>
          <button class="ts-btn ts-btn-secondary ts-action" data-action="save" data-index="0">
            <span class="ts-btn-icon">❤️</span>
          </button>
          <button class="ts-btn ts-btn-ghost ts-action" data-action="copy" data-index="0" title="Copy link">
            <span class="ts-btn-icon">📋</span>
          </button>
        </div>
    `;

        // Show remaining files if any
        if (remaining.length > 0) {
            html += `
        <div class="ts-more-files">
          <button class="ts-toggle-more">
            <span>+ ${remaining.length} more file${remaining.length > 1 ? 's' : ''}</span>
            <span class="ts-toggle-icon">▼</span>
          </button>
          <div class="ts-files-list ts-hidden">
            ${remaining.map((f, i) => `
              <div class="ts-file-row">
                <div class="ts-file-row-info">
                  <span class="ts-file-row-name">${escapeHtml(truncate(f.name, 35))}</span>
                  <span class="ts-file-row-size">${formatSize(f.size)}</span>
                </div>
                <div class="ts-file-row-actions">
                  <button class="ts-btn-sm ts-action" data-action="download" data-index="${i + 1}">⬇️</button>
                  <button class="ts-btn-sm ts-action" data-action="save" data-index="${i + 1}">❤️</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
        }

        // Footer stats
        html += `
        <div class="ts-footer">
          <span class="ts-stats">${files.length} file${files.length > 1 ? 's' : ''} • ${formatSize(totalSize)} total</span>
          <button class="ts-btn-link ts-open-app">Open in OmniStream →</button>
        </div>
      </div>
    `;

        return html;
    }

    function updateOverlay(state, data) {
        const overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;

        const content = overlay.querySelector('.ts-content');
        if (content) {
            content.innerHTML = getContentHTML(state, data);
        }

        attachEventListeners();
    }

    // ============ Event Handlers ============
    function attachEventListeners() {
        const overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;

        // Close button
        overlay.querySelector('.ts-close')?.addEventListener('click', (e) => {
            e.stopPropagation();
            overlay.classList.add('ts-closing');
            setTimeout(() => overlay.remove(), 300);
        });

        // Minimize button
        overlay.querySelector('.ts-minimize')?.addEventListener('click', (e) => {
            e.stopPropagation();
            overlay.classList.toggle('ts-minimized');
            if (overlay.classList.contains('ts-minimized')) {
                updateOverlay('minimized', currentFileInfo);
            } else {
                updateOverlay('loaded', currentFileInfo);
            }
        });

        // Expand button (when minimized)
        overlay.querySelector('.ts-expand')?.addEventListener('click', (e) => {
            e.stopPropagation();
            overlay.classList.remove('ts-minimized');
            updateOverlay('loaded', currentFileInfo);
        });

        // Retry button
        overlay.querySelector('.ts-retry')?.addEventListener('click', () => {
            injectOverlay();
        });

        // Login button
        overlay.querySelector('.ts-login')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'openApp', path: '/auth' });
        });

        // Toggle more files
        overlay.querySelector('.ts-toggle-more')?.addEventListener('click', (e) => {
            const list = overlay.querySelector('.ts-files-list');
            const icon = e.currentTarget.querySelector('.ts-toggle-icon');
            if (list) {
                list.classList.toggle('ts-hidden');
                icon.textContent = list.classList.contains('ts-hidden') ? '▼' : '▲';
            }
        });

        // Action buttons
        overlay.querySelectorAll('.ts-action').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const action = btn.dataset.action;
                const index = parseInt(btn.dataset.index || '0');
                const file = currentFileInfo?.list?.[index];

                if (!file) return;

                // Visual feedback
                btn.classList.add('ts-loading');
                btn.disabled = true;

                try {
                    await handleAction(action, file, index);
                    btn.classList.remove('ts-loading');
                    btn.classList.add('ts-success');
                    setTimeout(() => btn.classList.remove('ts-success'), 2000);
                } catch (error) {
                    btn.classList.remove('ts-loading');
                    btn.classList.add('ts-error');
                    setTimeout(() => btn.classList.remove('ts-error'), 2000);
                }

                btn.disabled = false;
            });
        });

        // Open in app
        overlay.querySelector('.ts-open-app')?.addEventListener('click', () => {
            const url = encodeURIComponent(window.location.href);
            window.open(`https://terastream-vault.lovable.app?url=${url}`, '_blank');
        });
    }

    async function handleAction(action, file, index) {
        switch (action) {
            case 'stream':
                if (file.stream_link) {
                    window.open(file.stream_link, '_blank');
                } else {
                    const url = encodeURIComponent(window.location.href);
                    window.open(`https://terastream-vault.lovable.app?stream=${url}`, '_blank');
                }
                break;

            case 'download':
                const downloadUrl = file.fast_link || file.dlink;
                if (downloadUrl) {
                    window.open(downloadUrl, '_blank');
                }
                break;

            case 'save':
                await chrome.runtime.sendMessage({
                    action: 'saveToFavorites',
                    file,
                    sourceUrl: window.location.href,
                });
                break;

            case 'copy':
                const linkToCopy = file.fast_link || file.dlink || window.location.href;
                await navigator.clipboard.writeText(linkToCopy);
                break;
        }
    }

    // ============ Draggable ============
    function makeDraggable(element) {
        const header = element.querySelector('.ts-header');
        if (!header) return;

        let isDragging = false;
        let startX, startY, initialX, initialY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            element.style.transition = 'none';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            element.style.left = `${initialX + dx}px`;
            element.style.top = `${initialY + dy}px`;
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }

        function onMouseUp() {
            isDragging = false;
            element.style.transition = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }

    // ============ Utilities ============
    function isVideo(file) {
        const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
        const name = (file.name || '').toLowerCase();
        return videoExts.some(ext => name.endsWith(ext)) || file.type?.includes('video');
    }

    function getFileType(file) {
        const name = (file.name || '').toLowerCase();
        if (name.match(/\.(zip|rar|7z|tar|gz)$/)) return 'Archive';
        if (name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return 'Image';
        if (name.match(/\.(mp3|wav|flac|aac|ogg)$/)) return 'Audio';
        if (name.match(/\.(pdf|doc|docx|txt|rtf)$/)) return 'Document';
        return 'File';
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

    function truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.slice(0, len - 3) + '...' : str;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'copyToClipboard') {
            navigator.clipboard.writeText(request.text).then(() => {
                sendResponse({ success: true });
            }).catch(() => {
                sendResponse({ success: false });
            });
            return true;
        }
    });

    console.log('[OmniStream] TeraBox enhancer loaded');
})();
