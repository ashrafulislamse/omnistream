/**
 * Google Drive API Service
 * Handles authentication and file operations with Google Drive
 */

// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = `${window.location.origin}/auth/google/callback`;
const SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

// Video MIME types we support
export const VIDEO_MIME_TYPES = [
    'video/mp4',
    'video/webm',
    'video/x-matroska',
    'video/avi',
    'video/quicktime',
    'video/x-msvideo',
    'video/mpeg',
    'video/3gpp',
    'video/x-flv',
];

export interface GoogleDriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    thumbnailLink?: string;
    webContentLink?: string;
    webViewLink?: string;
    createdTime?: string;
    modifiedTime?: string;
    parents?: string[];
    iconLink?: string;
    starred?: boolean;
}

export interface GoogleDriveFolder {
    id: string;
    name: string;
    parents?: string[];
}

export interface GoogleUserInfo {
    id: string;
    email: string;
    name: string;
    picture?: string;
}

export interface DriveStorageQuota {
    limit: string;
    usage: string;
    usageInDrive: string;
}

class GoogleDriveService {
    private accessToken: string | null = null;
    private tokenExpiry: number | null = null;

    constructor() {
        // Load token from storage on init
        this.loadTokenFromStorage();
    }

    private loadTokenFromStorage() {
        const stored = localStorage.getItem('google_drive_token');
        if (stored) {
            const { token, expiry } = JSON.parse(stored);
            if (expiry > Date.now()) {
                this.accessToken = token;
                this.tokenExpiry = expiry;
            } else {
                localStorage.removeItem('google_drive_token');
            }
        }
    }

    private saveTokenToStorage(token: string, expiresIn: number) {
        const expiry = Date.now() + (expiresIn * 1000);
        localStorage.setItem('google_drive_token', JSON.stringify({ token, expiry }));
        this.accessToken = token;
        this.tokenExpiry = expiry;
    }

    /**
     * Check if user is connected to Google Drive
     */
    isConnected(): boolean {
        return this.accessToken !== null && (this.tokenExpiry || 0) > Date.now();
    }

    /**
     * Get the OAuth authorization URL
     */
    getAuthUrl(): string {
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: GOOGLE_REDIRECT_URI,
            response_type: 'token',
            scope: SCOPES,
            include_granted_scopes: 'true',
            state: 'google_drive_connect',
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    /**
     * Handle OAuth callback and extract token
     */
    handleCallback(hash: string): boolean {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');

        if (accessToken && expiresIn) {
            this.saveTokenToStorage(accessToken, parseInt(expiresIn));
            return true;
        }
        return false;
    }

    /**
     * Disconnect from Google Drive
     */
    disconnect() {
        this.accessToken = null;
        this.tokenExpiry = null;
        localStorage.removeItem('google_drive_token');
        localStorage.removeItem('google_user_info');
    }

    /**
     * Make authenticated request to Google API
     */
    private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
        if (!this.accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.disconnect();
                throw new Error('Google Drive session expired. Please reconnect.');
            }
            throw new Error(`Google API error: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get current user info
     */
    async getUserInfo(): Promise<GoogleUserInfo> {
        const cached = localStorage.getItem('google_user_info');
        if (cached) {
            return JSON.parse(cached);
        }

        const info = await this.request<GoogleUserInfo>(
            'https://www.googleapis.com/oauth2/v2/userinfo'
        );
        localStorage.setItem('google_user_info', JSON.stringify(info));
        return info;
    }

    /**
     * Get storage quota info
     */
    async getStorageQuota(): Promise<DriveStorageQuota> {
        const response = await this.request<{ storageQuota: DriveStorageQuota }>(
            'https://www.googleapis.com/drive/v3/about?fields=storageQuota'
        );
        return response.storageQuota;
    }

    /**
     * List video files from Drive
     */
    async listVideos(folderId: string = 'root', pageToken?: string): Promise<{
        files: GoogleDriveFile[];
        nextPageToken?: string;
    }> {
        const mimeQuery = VIDEO_MIME_TYPES.map(m => `mimeType='${m}'`).join(' or ');
        const query = folderId === 'root'
            ? `(${mimeQuery}) and trashed=false`
            : `'${folderId}' in parents and (${mimeQuery}) and trashed=false`;

        const params = new URLSearchParams({
            q: query,
            fields: 'nextPageToken,files(id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink,createdTime,modifiedTime,parents,iconLink,starred)',
            pageSize: '50',
            orderBy: 'modifiedTime desc',
        });

        if (pageToken) {
            params.set('pageToken', pageToken);
        }

        return this.request(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
    }

    /**
     * List all videos across entire Drive
     */
    async listAllVideos(pageToken?: string): Promise<{
        files: GoogleDriveFile[];
        nextPageToken?: string;
    }> {
        const mimeQuery = VIDEO_MIME_TYPES.map(m => `mimeType='${m}'`).join(' or ');
        const query = `(${mimeQuery}) and trashed=false`;

        const params = new URLSearchParams({
            q: query,
            fields: 'nextPageToken,files(id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink,createdTime,modifiedTime,parents,iconLink,starred)',
            pageSize: '50',
            orderBy: 'modifiedTime desc',
        });

        if (pageToken) {
            params.set('pageToken', pageToken);
        }

        return this.request(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
    }

    /**
     * List folders
     */
    async listFolders(parentId: string = 'root'): Promise<GoogleDriveFolder[]> {
        const query = parentId === 'root'
            ? "mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents"
            : `mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`;

        const params = new URLSearchParams({
            q: query,
            fields: 'files(id,name,parents)',
            pageSize: '100',
            orderBy: 'name',
        });

        const response = await this.request<{ files: GoogleDriveFolder[] }>(
            `https://www.googleapis.com/drive/v3/files?${params.toString()}`
        );
        return response.files;
    }

    /**
     * Search for videos
     */
    async searchVideos(query: string): Promise<GoogleDriveFile[]> {
        const mimeQuery = VIDEO_MIME_TYPES.map(m => `mimeType='${m}'`).join(' or ');
        const searchQuery = `(${mimeQuery}) and trashed=false and name contains '${query}'`;

        const params = new URLSearchParams({
            q: searchQuery,
            fields: 'files(id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink,createdTime,modifiedTime,starred)',
            pageSize: '50',
        });

        const response = await this.request<{ files: GoogleDriveFile[] }>(
            `https://www.googleapis.com/drive/v3/files?${params.toString()}`
        );
        return response.files;
    }

    /**
     * Get file metadata
     */
    async getFile(fileId: string): Promise<GoogleDriveFile> {
        const params = new URLSearchParams({
            fields: 'id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink,createdTime,modifiedTime,starred',
        });

        return this.request(`https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`);
    }

    /**
     * Get streaming URL for a video file
     */
    getStreamUrl(fileId: string): string {
        // Use the access token in the URL for streaming
        return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${this.accessToken}`;
    }

    /**
     * Get embed URL for Google Drive video player
     */
    getEmbedUrl(fileId: string): string {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();
export default googleDriveService;
