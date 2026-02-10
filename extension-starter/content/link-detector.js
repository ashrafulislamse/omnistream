/**
 * OmniStream - Link Detector
 * Detects TeraBox links on any webpage and adds quick save buttons
 */

(function () {
    'use strict';

    // Prevent double injection
    if (window.__omniStreamLinkDetector) return;
    window.__omniStreamLinkDetector = true;

    const VALID_DOMAINS = ['terabox.com', '1024terabox.com', 'teraboxapp.com', '1024tera.com'];
    const PROCESSED_CLASS = 'ts-link-processed';
    const DEBOUNCE_MS = 500;

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
     * Add a quick save button next to a link
     */
    function addSaveButton(link) {
        // Don't add button if link is hidden or in a complex layout
        if (!link.offsetParent || link.closest('[contenteditable="true"]')) return;

        const btn = document.createElement('button');
        btn.className = 'ts-quick-btn';
        btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    `;
        btn.title = 'Save to OmniStream';

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            btn.classList.add('ts-loading');
            btn.disabled = true;

            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'addToQueue',
                    url: link.href,
                    title: link.textContent?.trim() || 'Untitled',
                });

                if (response?.error) {
                    throw new Error(response.error);
                }

                btn.classList.remove('ts-loading');
                btn.classList.add('ts-success');
                btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        `;

                setTimeout(() => {
                    btn.classList.remove('ts-success');
                    btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          `;
                }, 2500);
            } catch (error) {
                btn.classList.remove('ts-loading');
                btn.classList.add('ts-error');
                btn.innerHTML = '!';

                setTimeout(() => {
                    btn.classList.remove('ts-error');
                    btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          `;
                }, 2500);
            }

            btn.disabled = false;
        });

        // Insert button after link
        if (link.parentNode) {
            link.parentNode.insertBefore(btn, link.nextSibling);
        }
    }

    /**
     * Extract TeraBox URL from text
     */
    function extractTeraBoxUrl(text) {
        if (!text) return null;
        const pattern = /https?:\/\/[^\s]*(?:terabox|1024terabox|teraboxapp|1024tera)\.[^\s]*/gi;
        const match = text.match(pattern);
        return match ? match[0] : null;
    }

    /**
     * Inject minimal styles for the quick save button
     */
    function injectStyles() {
        if (document.getElementById('ts-link-styles')) return;

        const style = document.createElement('style');
        style.id = 'ts-link-styles';
        style.textContent = `
      .ts-quick-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        margin-left: 4px;
        padding: 0;
        background: linear-gradient(135deg, #0f172a, #1e293b);
        border: 1px solid rgba(20, 184, 166, 0.3);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        vertical-align: middle;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }
      
      .ts-quick-btn svg {
        width: 12px;
        height: 12px;
        color: #14b8a6;
      }
      
      .ts-quick-btn:hover {
        transform: scale(1.1);
        border-color: #14b8a6;
        box-shadow: 0 0 10px rgba(20, 184, 166, 0.3);
      }
      
      .ts-quick-btn:active {
        transform: scale(0.95);
      }
      
      .ts-quick-btn.ts-loading {
        pointer-events: none;
        opacity: 0.7;
      }
      
      .ts-quick-btn.ts-loading::after {
        content: '';
        width: 10px;
        height: 10px;
        border: 2px solid transparent;
        border-top-color: #14b8a6;
        border-radius: 50%;
        animation: ts-mini-spin 0.6s linear infinite;
      }
      
      .ts-quick-btn.ts-loading svg {
        display: none;
      }
      
      .ts-quick-btn.ts-success {
        background: linear-gradient(135deg, #059669, #10b981);
        border-color: #10b981;
      }
      
      .ts-quick-btn.ts-success svg {
        color: white;
      }
      
      .ts-quick-btn.ts-error {
        background: linear-gradient(135deg, #dc2626, #ef4444);
        border-color: #ef4444;
        color: white;
        font-size: 12px;
        font-weight: bold;
      }
      
      @keyframes ts-mini-spin {
        to { transform: rotate(360deg); }
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

    console.log('[OmniStream] Link detector loaded');
})();
