/**
 * OmniStream - Web App Token Bridge
 * Runs on the OmniStream web app to capture authentication tokens
 * and share them with the extension.
 * Supports Appwrite auth (cookie-based JWT) and custom events.
 */

(function () {
    'use strict';

    // Auto-detect and persist the APP_URL so other scripts can use it
    try {
        const appUrl = `${window.location.protocol}//${window.location.host}`;
        chrome.runtime.sendMessage({ action: 'setAppUrl', url: appUrl }).catch(() => { });
    } catch { }

    // Listen for auth token from the web app
    // The web app dispatches this event after successful login via AuthContext
    window.addEventListener('omnistream-auth', async (event) => {
        const { token, user } = event.detail || {};

        if (token) {
            try {
                await chrome.runtime.sendMessage({
                    action: 'setAuth',
                    token,
                    user,
                });

                // Notify the web app that token was received
                window.postMessage({ type: 'omnistream-auth-success' }, '*');
            } catch (error) {
                console.error('[OmniStream Extension] Failed to save token:', error);
                window.postMessage({ type: 'omnistream-auth-error', error: error.message }, '*');
            }
        } else {
            // Null detail = user logged out
            try {
                await chrome.runtime.sendMessage({ action: 'logout' });
            } catch { }
        }
    });

    // Listen for Appwrite config being set by the web app
    window.addEventListener('omnistream-config', async (event) => {
        const config = event.detail;
        if (config) {
            try {
                await chrome.runtime.sendMessage({ action: 'setAppwriteConfig', config });
            } catch { }
        }
    });

    // Check for existing Appwrite session in localStorage/cookies
    async function checkExistingSession() {
        try {
            // Appwrite Web SDK stores session as a cookie (a]_session_*)
            // and may also store a fallback JWT in localStorage
            const keys = Object.keys(localStorage);

            // Look for Appwrite session keys
            let token = null;
            let user = null;

            // Check for Appwrite fallback localStorage (cookieFallback)
            const cookieFallback = localStorage.getItem('cookieFallback');
            if (cookieFallback) {
                try {
                    const parsed = JSON.parse(cookieFallback);
                    // Appwrite stores sessions with key pattern: a_session_<projectId>
                    const sessionKey = Object.keys(parsed).find(k => k.startsWith('a_session_'));
                    if (sessionKey && parsed[sessionKey]) {
                        token = parsed[sessionKey];
                    }
                } catch { }
            }

            // Also look for any key containing 'appwrite' or 'session'
            if (!token) {
                const authKey = keys.find(k =>
                    (k.includes('appwrite') && k.includes('session')) ||
                    k.startsWith('a_session_')
                );
                if (authKey) {
                    token = localStorage.getItem(authKey);
                }
            }

            // Also check for legacy Supabase sessions (migration support)
            if (!token) {
                const sbKey = keys.find(k => k.includes('supabase') && k.includes('auth'));
                if (sbKey) {
                    try {
                        const parsed = JSON.parse(localStorage.getItem(sbKey));
                        if (parsed?.access_token) {
                            token = parsed.access_token;
                            user = parsed.user ? { id: parsed.user.id, email: parsed.user.email } : null;
                        }
                    } catch { }
                }
            }

            if (token) {
                await sendTokenToExtension(token, user);
            }
        } catch (error) {
            console.error('[OmniStream Extension] Error checking existing session:', error);
        }
    }

    async function sendTokenToExtension(token, user) {
        try {
            // Check if we already have this token
            const existing = await chrome.runtime.sendMessage({ action: 'getAuth' });
            if (existing?.token === token) return;

            await chrome.runtime.sendMessage({
                action: 'setAuth',
                token,
                user: user ? { id: user.id, email: user.email } : null,
            });

        } catch {
            // Extension might not be available
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
        // Appwrite cookieFallback changes
        if (event.key === 'cookieFallback') {
            if (event.newValue) {
                try {
                    const parsed = JSON.parse(event.newValue);
                    const sessionKey = Object.keys(parsed).find(k => k.startsWith('a_session_'));
                    if (sessionKey && parsed[sessionKey]) {
                        sendTokenToExtension(parsed[sessionKey], null);
                    }
                } catch { }
            } else {
                chrome.runtime.sendMessage({ action: 'logout' }).catch(() => { });
            }
            return;
        }

        // Legacy Supabase support
        if (event.key?.includes('supabase') && event.key?.includes('auth')) {
            if (event.newValue) {
                try {
                    const parsed = JSON.parse(event.newValue);
                    if (parsed?.access_token) {
                        sendTokenToExtension(parsed.access_token, parsed.user);
                    }
                } catch { }
            } else {
                chrome.runtime.sendMessage({ action: 'logout' }).catch(() => { });
            }
        }
    });

    // Create a global object the web app can call directly
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
        setConfig: async (config) => {
            try {
                await chrome.runtime.sendMessage({ action: 'setAppwriteConfig', config });
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

})();
