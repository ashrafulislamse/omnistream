/**
 * OmniStream - Link Detector
 * Detects TeraBox links on any webpage and adds quick save buttons
 */

(function () {
    'use strict';

    // Prevent double injection
    if (window.__omniStreamLinkDetector) return;
    window.__omniStreamLinkDetector = true;

    const VALID_DOMAINS = [
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
    ];
    const PROCESSED_CLASS = 'ts-link-processed';
    const DEBOUNCE_MS = 500;

    const s = 'width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';
    const ICONS = {
        bookmark: `<svg ${s}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
        check: `<svg ${s}><polyline points="20 6 9 17 4 12"/></svg>`,
        play: `<svg ${s}><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
        heart: `<svg ${s}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
        zap: `<svg ${s}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
        copy: `<svg ${s}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
        file: `<svg ${s}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
        x: `<svg ${s}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    };

    // Inject minimal styles
    injectStyles();

    // Initial detection
    detectAndEnhanceLinks();

    // Watch for dynamic content
    const observer = new MutationObserver(debounce(detectAndEnhanceLinks, DEBOUNCE_MS));
    observer.observe(document.body, { childList: true, subtree: true });

    // Listen for messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'copyToClipboard') {
            navigator.clipboard.writeText(request.text)
                .then(() => sendResponse({ success: true }))
                .catch(() => sendResponse({ success: false }));
            return true;
        }

        if (request.action === 'getSelectedLink') {
            const selection = window.getSelection().toString();
            const url = extractTeraBoxUrl(selection);
            sendResponse({ url });
            return true;
        }

        if (request.action === 'getPageLinks') {
            const links = findTeraBoxLinks();
            sendResponse({ links: links.map(l => ({ url: l.href, text: l.textContent })) });
            return true;
        }
    });

    /**
     * Find and enhance all TeraBox links on the page
     */
    function detectAndEnhanceLinks() {
        const links = findTeraBoxLinks();

        links.forEach(link => {
            if (link.classList.contains(PROCESSED_CLASS)) return;
            link.classList.add(PROCESSED_CLASS);

            // Add visual indicator
            addSaveButton(link);
        });
    }

    /**
     * Find all TeraBox links in the DOM
     */
    function findTeraBoxLinks() {
        const selectors = VALID_DOMAINS.map(d => `a[href*="${d}"]`).join(', ');
        return Array.from(document.querySelectorAll(selectors));
    }

    /**
     * Add a rich preview card next to a TeraBox link
     */
    function addSaveButton(link) {
        if (!link.offsetParent || link.closest('[contenteditable="true"]')) return;

        // Create inline badge button
        const btn = document.createElement('button');
        btn.className = 'ts-quick-btn';
        btn.innerHTML = ICONS.bookmark;
        btn.title = 'Save to OmniStream';

        // Create preview card (hidden by default)
        const card = document.createElement('div');
        card.className = 'ts-preview-card ts-hidden';
        card.innerHTML = `
            <div class="ts-preview-header">
                <span class="ts-preview-logo">${ICONS.play}</span>
                <span class="ts-preview-brand">OmniStream</span>
                <button class="ts-preview-close">${ICONS.x}</button>
            </div>
            <div class="ts-preview-body">
                <div class="ts-preview-icon">${ICONS.file}</div>
                <div class="ts-preview-info">
                    <div class="ts-preview-name">${escapeHtml(truncateStr(link.textContent?.trim() || 'TeraBox Link', 45))}</div>
                    <div class="ts-preview-meta">
                        <span class="ts-preview-badge">TERABOX</span>
                        <span class="ts-preview-url">${escapeHtml(truncateStr(link.href, 40))}</span>
                    </div>
                </div>
            </div>
            <div class="ts-preview-actions">
                <button class="ts-preview-btn ts-preview-btn-primary" data-act="save">${ICONS.heart} Save</button>
                <button class="ts-preview-btn ts-preview-btn-secondary" data-act="stream">${ICONS.zap} Stream</button>
                <button class="ts-preview-btn ts-preview-btn-ghost" data-act="copy">${ICONS.copy}</button>
            </div>
        `;

        // Show card on hover over the badge
        let hoverTimer;
        btn.addEventListener('mouseenter', () => {
            hoverTimer = setTimeout(() => card.classList.remove('ts-hidden'), 200);
        });
        btn.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimer);
            setTimeout(() => {
                if (!card.matches(':hover')) card.classList.add('ts-hidden');
            }, 300);
        });
        card.addEventListener('mouseleave', () => {
            card.classList.add('ts-hidden');
        });

        // Close card
        card.querySelector('.ts-preview-close')?.addEventListener('click', (e) => {
            e.stopPropagation();
            card.classList.add('ts-hidden');
        });

        // Badge click = quick save
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await performAction('save', link, btn);
        });

        // Card action buttons
        card.querySelectorAll('.ts-preview-btn').forEach(actionBtn => {
            actionBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const act = actionBtn.dataset.act;
                if (act === 'copy') {
                    try {
                        await navigator.clipboard.writeText(link.href);
                        actionBtn.classList.add('ts-success');
                        setTimeout(() => actionBtn.classList.remove('ts-success'), 1500);
                    } catch { /* ignore */ }
                } else if (act === 'stream') {
                    try {
                        const stored = await chrome.storage.local.get('appUrl');
                        const base = stored.appUrl || '';
                        window.open(`${base}?stream=${encodeURIComponent(link.href)}`, '_blank');
                    } catch { /* ignore */ }
                } else {
                    await performAction('save', link, actionBtn);
                }
            });
        });

        // Insert into DOM
        if (link.parentNode) {
            link.parentNode.insertBefore(btn, link.nextSibling);
            link.parentNode.insertBefore(card, btn.nextSibling);
        }
    }

    /**
     * Perform save action with visual feedback
     */
    async function performAction(action, link, btn) {
        btn.classList.add('ts-loading');
        btn.disabled = true;
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'addToQueue',
                url: link.href,
                title: link.textContent?.trim() || 'Untitled',
            });
            if (response?.error) throw new Error(response.error);

            btn.classList.remove('ts-loading');
            btn.classList.add('ts-success');
            if (btn.classList.contains('ts-quick-btn')) btn.innerHTML = ICONS.check;

            setTimeout(() => {
                btn.classList.remove('ts-success');
                if (btn.classList.contains('ts-quick-btn')) btn.innerHTML = ICONS.bookmark;
            }, 2500);
        } catch {
            btn.classList.remove('ts-loading');
            btn.classList.add('ts-error');
            if (btn.classList.contains('ts-quick-btn')) btn.innerHTML = '!';

            setTimeout(() => {
                btn.classList.remove('ts-error');
                if (btn.classList.contains('ts-quick-btn')) btn.innerHTML = ICONS.bookmark;
            }, 2500);
        }
        btn.disabled = false;
    }

    function truncateStr(str, len) {
        if (!str) return '';
        return str.length > len ? str.slice(0, len - 1) + '…' : str;
    }

    /**
     * Extract TeraBox URL from text
     */
    function extractTeraBoxUrl(text) {
        if (!text) return null;
        const domainPattern = VALID_DOMAINS.map(d => d.replace(/\./g, '\\.')).join('|');
        const pattern = new RegExp(`https?://[^\\s]*(?:${domainPattern})[^\\s]*`, 'gi');
        const match = text.match(pattern);
        return match ? match[0] : null;
    }

    /**
     * Inject styles for the quick save button and preview card
     */
    function injectStyles() {
        if (document.getElementById('ts-link-styles')) return;

        const style = document.createElement('style');
        style.id = 'ts-link-styles';
        style.textContent = `
      /* ---- Quick Save Badge ---- */
      .ts-quick-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        margin-left: 5px;
        padding: 0;
        background: hsl(222 25% 10%);
        border: 1px solid hsla(173 80% 48% / .35);
        border-radius: 5px;
        cursor: pointer;
        transition: all .2s cubic-bezier(.16,1,.3,1);
        vertical-align: middle;
        box-shadow: 0 2px 8px rgba(0,0,0,.25);
        position: relative;
      }
      .ts-quick-btn svg {
        width: 12px; height: 12px;
        color: hsl(173 80% 48%);
      }
      .ts-quick-btn:hover {
        transform: scale(1.12);
        border-color: hsl(173 80% 48%);
        box-shadow: 0 0 14px hsla(173 80% 48% / .3);
      }
      .ts-quick-btn:active { transform: scale(.94); }
      .ts-quick-btn.ts-loading {
        pointer-events: none; opacity: .6;
      }
      .ts-quick-btn.ts-loading::after {
        content: '';
        width: 10px; height: 10px;
        border: 2px solid transparent;
        border-top-color: hsl(173 80% 48%);
        border-radius: 50%;
        animation: ts-mini-spin .6s linear infinite;
      }
      .ts-quick-btn.ts-loading svg { display: none; }
      .ts-quick-btn.ts-success {
        background: linear-gradient(135deg, hsl(152 60% 38%), hsl(152 60% 45%));
        border-color: hsl(152 60% 45%);
      }
      .ts-quick-btn.ts-success svg { color: white; }
      .ts-quick-btn.ts-error {
        background: linear-gradient(135deg, hsl(0 72% 50%), hsl(0 72% 58%));
        border-color: hsl(0 72% 58%);
        color: white; font-size: 11px; font-weight: 700;
      }

      /* ---- Preview Card ---- */
      .ts-preview-card {
        position: absolute;
        z-index: 2147483646;
        width: 300px;
        margin-top: 6px;
        background: hsl(222 25% 9%);
        border: 1px solid hsl(222 14% 18%);
        border-radius: 10px;
        box-shadow: 0 12px 40px rgba(0,0,0,.5), 0 0 30px hsla(173 80% 48% / .08);
        overflow: hidden;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: ts-card-in .2s cubic-bezier(.16,1,.3,1);
      }
      .ts-preview-card.ts-hidden { display: none; }

      .ts-preview-header {
        display: flex; align-items: center; gap: 6px;
        padding: 8px 10px;
        background: linear-gradient(180deg, hsla(173 80% 48% / .06), transparent);
        border-bottom: 1px solid hsl(222 12% 14%);
      }
      .ts-preview-logo {
        width: 18px; height: 18px;
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, hsl(173 80% 48%), hsl(191 91% 43%));
        border-radius: 4px;
      }
      .ts-preview-logo svg { width: 10px; height: 10px; color: white; stroke: white; fill: white; }
      .ts-preview-brand {
        font-size: 11px; font-weight: 700;
        background: linear-gradient(135deg, hsl(173 80% 48%), hsl(191 91% 43%));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text; flex: 1;
        letter-spacing: -.02em;
      }
      .ts-preview-close {
        width: 20px; height: 20px;
        display: flex; align-items: center; justify-content: center;
        background: none; border: none; cursor: pointer;
        color: hsl(215 16% 47%); border-radius: 4px;
        transition: all .15s ease;
      }
      .ts-preview-close:hover { background: hsl(222 18% 15%); color: hsl(210 40% 96%); }
      .ts-preview-close svg { width: 11px; height: 11px; }

      .ts-preview-body {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 12px;
      }
      .ts-preview-icon {
        width: 36px; height: 36px;
        display: flex; align-items: center; justify-content: center;
        background: hsl(222 20% 12%);
        border: 1px solid hsl(222 12% 14%);
        border-radius: 8px; flex-shrink: 0;
        color: hsl(215 16% 47%);
      }
      .ts-preview-icon svg { width: 16px; height: 16px; }
      .ts-preview-info { flex: 1; min-width: 0; }
      .ts-preview-name {
        font-size: 12px; font-weight: 600; color: hsl(210 40% 96%);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        line-height: 1.3; margin-bottom: 3px;
      }
      .ts-preview-meta { display: flex; align-items: center; gap: 6px; }
      .ts-preview-badge {
        padding: 1px 6px;
        background: hsla(173 80% 48% / .1);
        border: 1px solid hsla(173 80% 48% / .2);
        border-radius: 3px;
        font-size: 9px; font-weight: 700; letter-spacing: .04em;
        color: hsl(173 80% 48%);
      }
      .ts-preview-url {
        font-size: 10px; color: hsl(215 14% 34%);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }

      .ts-preview-actions {
        display: flex; gap: 5px;
        padding: 8px 12px;
        border-top: 1px solid hsl(222 12% 14%);
      }
      .ts-preview-btn {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 4px; padding: 5px 10px;
        font-size: 10.5px; font-weight: 600;
        font-family: inherit; border: none; border-radius: 5px;
        cursor: pointer; transition: all .15s ease;
        line-height: 1; white-space: nowrap;
      }
      .ts-preview-btn svg { width: 11px; height: 11px; }
      .ts-preview-btn-primary {
        background: linear-gradient(135deg, hsl(173 80% 48%), hsl(191 91% 43%));
        color: hsl(222 30% 8%); flex: 1;
        box-shadow: 0 2px 8px hsla(173 80% 48% / .2);
      }
      .ts-preview-btn-primary:hover { filter: brightness(1.1); box-shadow: 0 3px 14px hsla(173 80% 48% / .35); }
      .ts-preview-btn-secondary {
        background: hsl(222 18% 15%);
        color: hsl(210 40% 96%); flex: 1;
        border: 1px solid hsl(222 14% 18%);
      }
      .ts-preview-btn-secondary:hover { background: hsl(222 14% 18%); }
      .ts-preview-btn-ghost {
        background: transparent; color: hsl(215 16% 47%);
        padding: 5px 7px;
      }
      .ts-preview-btn-ghost:hover { background: hsl(222 18% 15%); color: hsl(210 40% 96%); }
      .ts-preview-btn.ts-success { background: hsl(152 60% 45%) !important; color: white !important; border-color: transparent !important; }
      .ts-preview-btn.ts-loading { pointer-events: none; opacity: .6; }

      @keyframes ts-mini-spin { to { transform: rotate(360deg); } }
      @keyframes ts-card-in {
        from { opacity: 0; transform: translateY(-6px) scale(.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
        document.head.appendChild(style);
    }

    /**
     * Debounce utility
     */
    function debounce(fn, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), wait);
        };
    }

})();
