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
    let APP_URL = ''; // loaded from background

    // ============ Initialization ============
    init();

    async function init() {
        // Check settings
        const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
        if (response?.showOverlay === false) return;

        // Check auth
        const auth = await chrome.runtime.sendMessage({ action: 'getAuth' });
        isAuthenticated = auth?.authenticated ?? false;

        // Load APP_URL from background
        try {
            const stored = await chrome.storage.local.get('appUrl');
            APP_URL = stored.appUrl || '';
        } catch { }

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

        // If not authenticated, show auth gate instead of making a failing API call
        if (!isAuthenticated) {
            updateOverlay('auth');
            attachEventListeners();
            return;
        }

        // Fetch file info
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'fetchFileInfo',
                url: window.location.href,
            });

            if (response?.error) {
                // Check if it's an auth error
                const errMsg = (response.error || '').toLowerCase();
                if (errMsg.includes('auth') || errMsg.includes('token') || errMsg.includes('unauthorized')) {
                    updateOverlay('auth');
                } else {
                    updateOverlay('error', response.error);
                }
            } else if (response?.list?.length > 0) {
                currentFileInfo = response;
                updateOverlay('loaded', response);
            } else {
                updateOverlay('empty');
            }
        } catch (error) {
            console.error('[OmniStream] Error fetching file info:', error);
            const errMsg = (error.message || '').toLowerCase();
            if (errMsg.includes('auth') || errMsg.includes('token') || errMsg.includes('unauthorized')) {
                updateOverlay('auth');
            } else {
                updateOverlay('error', error.message);
            }
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
            <div class="ts-logo-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <polygon points="5,3 19,12 5,21" fill="white"/>
              </svg>
            </div>
            <span class="ts-logo-text">OmniStream</span>
          </div>
          <div class="ts-header-actions">
            <button class="ts-btn-icon ts-minimize" title="Minimize">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" x2="19" y1="12" y2="12"/></svg>
            </button>
            <button class="ts-btn-icon ts-close" title="Close">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="ts-content">
          ${getContentHTML(state, data)}
        </div>
      </div>
    `;
        return baseHTML;
    }

    // SVG icon helper for overlay
    function icon(name, size = 16) {
        const a = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
        const map = {
            play: `<svg ${a}><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
            download: `<svg ${a}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
            heart: `<svg ${a}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
            copy: `<svg ${a}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
            alert: `<svg ${a}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
            folder: `<svg ${a}><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
            lock: `<svg ${a}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
            expand: `<svg ${a}><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>`,
            file: `<svg ${a}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
            video: `<svg ${a}><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`,
            externalLink: `<svg ${a}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
        };
        return map[name] || map.file;
    }

    function getContentHTML(state, data) {
        switch (state) {
            case 'loading':
                return `
          <div class="ts-loading">
            <div class="ts-spinner"></div>
            <p>Analyzing file info...</p>
          </div>
        `;

            case 'error':
                return `
          <div class="ts-error">
            <span class="ts-error-icon">${icon('alert', 24)}</span>
            <p>${escapeHtml(data || 'Failed to fetch file info')}</p>
            <button class="ts-btn ts-btn-secondary ts-retry">Retry</button>
          </div>
        `;

            case 'empty':
                return `
          <div class="ts-empty">
            <span class="ts-empty-icon">${icon('folder', 24)}</span>
            <p>No files found in this link</p>
          </div>
        `;

            case 'auth':
                return `
          <div class="ts-auth">
            <span class="ts-auth-icon">${icon('lock', 24)}</span>
            <p>Sign in to OmniStream to continue</p>
            <button class="ts-btn ts-btn-primary ts-login">${icon('externalLink', 14)} Sign In</button>
          </div>
        `;

            case 'loaded':
                return getFileListHTML(data);

            case 'minimized':
                return `
          <div class="ts-minimized-content">
            <span class="ts-badge">${data?.list?.length || 0} files</span>
            <button class="ts-btn-icon ts-expand" title="Expand">${icon('expand', 14)}</button>
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

        // Show first file featured, rest in list
        const featured = videos[0] || files[0];
        const remaining = files.filter(f => f !== featured);
        const badgeType = isVideo(featured) ? 'ts-badge-video' : getFileType(featured) === 'Archive' ? 'ts-badge-archive' : getFileType(featured) === 'Image' ? 'ts-badge-image' : getFileType(featured) === 'Audio' ? 'ts-badge-audio' : 'ts-badge-file';

        let html = `
      <div class="ts-file-info">
        ${isCached ? `<div class="ts-cache-badge">${icon('play', 10)} Cached</div>` : ''}
        
        <div class="ts-featured-file">
          ${featured.thumbnail
                ? `<img class="ts-thumbnail" src="${featured.thumbnail}" alt="">`
                : `<div class="ts-thumbnail"><div class="ts-thumbnail-placeholder">${isVideo(featured) ? icon('video', 24) : icon('file', 24)}</div></div>`
            }
          <div class="ts-file-details">
            <h3 class="ts-file-name">${escapeHtml(truncate(featured.name, 48))}</h3>
            <div class="ts-file-meta">
              <span class="ts-badge ${badgeType}">
                ${isVideo(featured) ? 'VIDEO' : getFileType(featured).toUpperCase()}
              </span>
              <span class="ts-size">${formatSize(featured.size)}</span>
            </div>
          </div>
        </div>

        <div class="ts-actions">
          ${isVideo(featured) && featured.stream_link ? `
            <button class="ts-btn ts-btn-primary ts-action" data-action="stream" data-index="0">
              ${icon('play', 14)} Stream
            </button>
          ` : ''}
          <button class="ts-btn ts-btn-accent ts-action" data-action="download" data-index="0">
            ${icon('download', 14)} Download
          </button>
          <button class="ts-btn ts-btn-secondary ts-action" data-action="save" data-index="0">
            ${icon('heart', 14)}
          </button>
          <button class="ts-btn ts-btn-ghost ts-action" data-action="copy" data-index="0" title="Copy link">
            ${icon('copy', 14)}
          </button>
        </div>
    `;

        // Show remaining files if any
        if (remaining.length > 0) {
            html += `
        <div class="ts-more-files">
          <button class="ts-toggle-more">
            <span>+ ${remaining.length} more file${remaining.length > 1 ? 's' : ''}</span>
            <span class="ts-toggle-icon">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </button>
          <div class="ts-files-list ts-hidden">
            ${remaining.map((f, i) => `
              <div class="ts-file-row">
                <div class="ts-file-row-info">
                  <span class="ts-file-row-name">${escapeHtml(truncate(f.name, 35))}</span>
                  <span class="ts-file-row-size">${formatSize(f.size)}</span>
                </div>
                <div class="ts-file-row-actions">
                  <button class="ts-btn-sm ts-action" data-action="download" data-index="${i + 1}">${icon('download', 11)}</button>
                  <button class="ts-btn-sm ts-action" data-action="save" data-index="${i + 1}">${icon('heart', 11)}</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
        }

        // Footer
        html += `
        <div class="ts-footer">
          <span class="ts-stats">${files.length} file${files.length > 1 ? 's' : ''} · ${formatSize(totalSize)}</span>
          <button class="ts-btn-link ts-open-app">Open in OmniStream ${icon('externalLink', 11)}</button>
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
            const base = APP_URL;
            window.open(`${base}?url=${url}`, '_blank');
        });
    }

    async function handleAction(action, file, index) {
        switch (action) {
            case 'stream':
                if (file.stream_link) {
                    window.open(file.stream_link, '_blank');
                } else {
                    const url = encodeURIComponent(window.location.href);
                    const base = APP_URL;
                    window.open(`${base}?stream=${url}`, '_blank');
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

})();
