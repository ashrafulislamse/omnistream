import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import googleDriveService, {
    GoogleDriveFile,
    GoogleDriveFolder,
    GoogleUserInfo,
    DriveStorageQuota
} from '@/services/googleDrive';

interface UseGoogleDriveReturn {
    // Connection state
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;

    // User info
    userInfo: GoogleUserInfo | null;
    storageQuota: DriveStorageQuota | null;

    // Files
    videos: GoogleDriveFile[];
    folders: GoogleDriveFolder[];
    hasMore: boolean;

    // Actions
    connect: () => void;
    disconnect: () => void;
    loadVideos: (folderId?: string) => Promise<void>;
    loadAllVideos: () => Promise<void>;
    loadMoreVideos: () => Promise<void>;
    loadFolders: (parentId?: string) => Promise<void>;
    searchVideos: (query: string) => Promise<void>;
    getStreamUrl: (fileId: string) => string;
    getEmbedUrl: (fileId: string) => string;
    refresh: () => Promise<void>;
}

export function useGoogleDrive(): UseGoogleDriveReturn {
    const navigate = useNavigate();
    const location = useLocation();

    const [isConnected, setIsConnected] = useState(googleDriveService.isConnected());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
    const [storageQuota, setStorageQuota] = useState<DriveStorageQuota | null>(null);

    const [videos, setVideos] = useState<GoogleDriveFile[]>([]);
    const [folders, setFolders] = useState<GoogleDriveFolder[]>([]);
    const [nextPageToken, setNextPageToken] = useState<string | undefined>();
    const [currentFolderId, setCurrentFolderId] = useState<string>('root');

    // Handle OAuth callback
    useEffect(() => {
        if (location.pathname === '/auth/google/callback' && location.hash) {
            const success = googleDriveService.handleCallback(location.hash);
            if (success) {
                setIsConnected(true);
                navigate('/drive', { replace: true });
            } else {
                setError('Failed to connect to Google Drive');
                navigate('/sources', { replace: true });
            }
        }
    }, [location, navigate]);

    // Load user info when connected
    useEffect(() => {
        if (isConnected && !userInfo) {
            loadUserInfo();
        }
    }, [isConnected]);

    const loadUserInfo = async () => {
        try {
            const info = await googleDriveService.getUserInfo();
            setUserInfo(info);
            const quota = await googleDriveService.getStorageQuota();
            setStorageQuota(quota);
        } catch (err) {
            console.error('Failed to load user info:', err);
        }
    };

    const connect = useCallback(() => {
        const authUrl = googleDriveService.getAuthUrl();
        window.location.href = authUrl;
    }, []);

    const disconnect = useCallback(() => {
        googleDriveService.disconnect();
        setIsConnected(false);
        setUserInfo(null);
        setStorageQuota(null);
        setVideos([]);
        setFolders([]);
    }, []);

    const loadVideos = useCallback(async (folderId: string = 'root') => {
        setIsLoading(true);
        setError(null);
        setCurrentFolderId(folderId);

        try {
            const result = await googleDriveService.listVideos(folderId);
            setVideos(result.files);
            setNextPageToken(result.nextPageToken);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load videos');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadAllVideos = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await googleDriveService.listAllVideos();
            setVideos(result.files);
            setNextPageToken(result.nextPageToken);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load videos');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadMoreVideos = useCallback(async () => {
        if (!nextPageToken || isLoading) return;

        setIsLoading(true);
        try {
            const result = await googleDriveService.listVideos(currentFolderId, nextPageToken);
            setVideos(prev => [...prev, ...result.files]);
            setNextPageToken(result.nextPageToken);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load more videos');
        } finally {
            setIsLoading(false);
        }
    }, [nextPageToken, isLoading, currentFolderId]);

    const loadFolders = useCallback(async (parentId: string = 'root') => {
        try {
            const result = await googleDriveService.listFolders(parentId);
            setFolders(result);
        } catch (err) {
            console.error('Failed to load folders:', err);
        }
    }, []);

    const searchVideos = useCallback(async (query: string) => {
        if (!query.trim()) {
            loadAllVideos();
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await googleDriveService.searchVideos(query);
            setVideos(result);
            setNextPageToken(undefined);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
        } finally {
            setIsLoading(false);
        }
    }, [loadAllVideos]);

    const getStreamUrl = useCallback((fileId: string) => {
        return googleDriveService.getStreamUrl(fileId);
    }, []);

    const getEmbedUrl = useCallback((fileId: string) => {
        return googleDriveService.getEmbedUrl(fileId);
    }, []);

    const refresh = useCallback(async () => {
        await loadAllVideos();
        await loadUserInfo();
    }, [loadAllVideos]);

    return {
        isConnected,
        isLoading,
        error,
        userInfo,
        storageQuota,
        videos,
        folders,
        hasMore: !!nextPageToken,
        connect,
        disconnect,
        loadVideos,
        loadAllVideos,
        loadMoreVideos,
        loadFolders,
        searchVideos,
        getStreamUrl,
        getEmbedUrl,
        refresh,
    };
}

export default useGoogleDrive;
