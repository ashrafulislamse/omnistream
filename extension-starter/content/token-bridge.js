/**
 * OmniStream - Web App Token Bridge
 * Runs on the OmniStream web app to capture authentication tokens
 * and share them with the extension
 */

(function () {
    'use strict';

    // Only run on OmniStream web app
    if (!window.location.hostname.includes('terastream-vault.lovable.app') &&
        !window.location.hostname.includes('localhost')) {
        return;
    }

    console.log('[OmniStream Extension] Token bridge initialized');

    // Listen for auth token from the web app
    // The web app will dispatch this event after successful login
    window.addEventListener('omnistream-auth', async (event) => {
        const { token, user } = event.detail || {};

        if (token) {
            console.log('[OmniStream Extension] Received auth token from web app');

            try {
                await chrome.runtime.sendMessage({
                    action: 'setAuth',
                    token,
                    user,
                });

                console.log('[OmniStream Extension] Token saved to extension storage');

                // Notify the web app that token was received
                window.postMessage({ type: 'omnistream-auth-success' }, '*');
            } catch (error) {
                console.error('[OmniStream Extension] Failed to save token:', error);
                window.postMessage({ type: 'omnistream-auth-error', error: error.message }, '*');
            }
        }
    });

    // Also check localStorage for existing Supabase session
    // This handles the case where user is already logged in
    async function checkExistingSession() {
        try {
            // Supabase stores auth in localStorage with key pattern: sb-*-auth-token
            const keys = Object.keys(localStorage);
            const authKey = keys.find(k => k.includes('supabase') && k.includes('auth'));

            if (!authKey) {
                // Try the standard Supabase storage key format
                const projectId = 'jgjrjvlogegincqlsarn'; // From your .env
                const storageKey = `sb-${projectId}-auth-token`;
                const session = localStorage.getItem(storageKey);

                if (session) {
                    const parsed = JSON.parse(session);
                    if (parsed?.access_token) {
                        await sendTokenToExtension(parsed.access_token, parsed.user);
                    }
                }
                return;
            }

            const session = localStorage.getItem(authKey);
            if (session) {
                const parsed = JSON.parse(session);
                if (parsed?.access_token) {
                    await sendTokenToExtension(parsed.access_token, parsed.user);
                }
            }
        } catch (error) {
            console.error('[OmniStream Extension] Error checking existing session:', error);
        }
    }

    async function sendTokenToExtension(token, user) {
        try {
            // Check if we already have this token
            const existing = await chrome.runtime.sendMessage({ action: 'getAuth' });
            if (existing?.token === token) {
                console.log('[OmniStream Extension] Token already synced');
                return;
            }

            await chrome.runtime.sendMessage({
                action: 'setAuth',
                token,
                user: user ? { id: user.id, email: user.email } : null,
            });

            console.log('[OmniStream Extension] Session synced from web app');
        } catch (error) {
            // Extension might not be available
            console.log('[OmniStream Extension] Could not sync token:', error.message);
        }
    }

    // Check for existing session on page load
    if (document.readyState === 'complete') {
        checkExistingSession();
    } else {
        window.addEventListener('load', checkExistingSession);
    }

    // Watch for localStorage changes (user logs in/out)
    window.addEventListener('storage', (event) => {
        if (event.key?.includes('supabase') && event.key?.includes('auth')) {
            if (event.newValue) {
                try {
                    const parsed = JSON.parse(event.newValue);
                    if (parsed?.access_token) {
                        sendTokenToExtension(parsed.access_token, parsed.user);
                    }
                } catch { }
            } else {
                // Token was removed (logout)
                chrome.runtime.sendMessage({ action: 'logout' }).catch(() => { });
            }
        }
    });

    // Create a global function that the web app can call directly
    window.__omniStreamExtension = {
        setAuth: async (token, user) => {
            try {
                await chrome.runtime.sendMessage({ action: 'setAuth', token, user });
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        getAuth: async () => {
            try {
                return await chrome.runtime.sendMessage({ action: 'getAuth' });
            } catch (error) {
                return { authenticated: false, error: error.message };
            }
        },
        logout: async () => {
            try {
                await chrome.runtime.sendMessage({ action: 'logout' });
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        isInstalled: true,
        version: '2.0.0',
    };

    // Dispatch event to let the web app know extension is available
    window.dispatchEvent(new CustomEvent('omnistream-extension-ready', {
        detail: { version: '2.0.0' }
    }));

    console.log('[OmniStream Extension] Token bridge ready');
})();
