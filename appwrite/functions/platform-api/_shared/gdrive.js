/**
 * Google Drive Provider
 * Fetches file metadata and download links from Google Drive
 * 
 * Supports:
 * - Public shared files (no auth required)
 * - Shared folders (lists contents)
 * - Direct download links
 * - Video streaming detection
 */

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Google Drive API base URL
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

/**
 * Fetch file metadata from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<{files: Array, success: boolean, error?: string}>}
 */
async function fetchGDriveFile(fileId) {
    if (!GOOGLE_API_KEY) {
        return { files: [], success: false, error: 'Google Drive API key not configured' };
    }

    try {
        // Get file metadata
        const metaUrl = `${DRIVE_API}/files/${fileId}?key=${GOOGLE_API_KEY}&fields=id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink,videoMediaMetadata,imageMediaMetadata,createdTime,modifiedTime,shared`;
        const metaResp = await fetch(metaUrl);

        if (!metaResp.ok) {
            const error = await metaResp.json().catch(() => ({}));
            if (metaResp.status === 404) {
                return { files: [], success: false, error: 'File not found or not shared publicly' };
            }
            if (metaResp.status === 403) {
                return { files: [], success: false, error: 'Access denied. Make sure the file is shared publicly.' };
            }
            return { files: [], success: false, error: error.error?.message || `Google API error ${metaResp.status}` };
        }

        const meta = await metaResp.json();

        // If it's a folder, list its contents
        if (meta.mimeType === 'application/vnd.google-apps.folder') {
            return fetchGDriveFolder(fileId);
        }

        // Map to OmniStream file format
        const file = mapGDriveFile(meta);
        return { files: [file], success: true, source: 'google_drive' };
    } catch (err) {
        console.error('[GDrive] Fetch error:', err);
        return { files: [], success: false, error: err.message || 'Failed to fetch from Google Drive' };
    }
}

/**
 * Fetch folder contents from Google Drive
 * @param {string} folderId - Google Drive folder ID
 * @returns {Promise<{files: Array, success: boolean}>}
 */
async function fetchGDriveFolder(folderId) {
    if (!GOOGLE_API_KEY) {
        return { files: [], success: false, error: 'Google Drive API key not configured' };
    }

    try {
        const listUrl = `${DRIVE_API}/files?key=${GOOGLE_API_KEY}&q='${folderId}'+in+parents&fields=files(id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink,videoMediaMetadata,imageMediaMetadata,createdTime)&pageSize=100&orderBy=name`;
        const listResp = await fetch(listUrl);

        if (!listResp.ok) {
            const error = await listResp.json().catch(() => ({}));
            return { files: [], success: false, error: error.error?.message || `Google API error ${listResp.status}` };
        }

        const data = await listResp.json();
        const files = (data.files || [])
            .filter(f => f.mimeType !== 'application/vnd.google-apps.folder')
            .map(mapGDriveFile);

        return { files, success: true, source: 'google_drive', isFolder: true };
    } catch (err) {
        console.error('[GDrive] Folder fetch error:', err);
        return { files: [], success: false, error: err.message };
    }
}

/**
 * Map Google Drive file metadata to OmniStream file format
 */
function mapGDriveFile(meta) {
    const isVideo = meta.mimeType?.startsWith('video/');
    const isAudio = meta.mimeType?.startsWith('audio/');
    const isImage = meta.mimeType?.startsWith('image/');

    // Determine file type
    let type = 'other';
    if (isVideo) type = 'video';
    else if (isAudio) type = 'audio';
    else if (isImage) type = 'image';
    else if (meta.mimeType?.includes('pdf')) type = 'document';
    else if (meta.mimeType?.includes('zip') || meta.mimeType?.includes('rar') || meta.mimeType?.includes('tar')) type = 'archive';

    // Build download link
    // For public files, the direct download pattern is:
    const dlink = `https://drive.google.com/uc?export=download&id=${meta.id}`;

    // Stream link for videos (Google Drive's built-in player)
    const streamLink = isVideo ? `https://drive.google.com/file/d/${meta.id}/preview` : undefined;

    return {
        name: meta.name,
        fs_id: meta.id, // Use Google Drive file ID
        size: parseInt(meta.size || '0', 10),
        type,
        mime_type: meta.mimeType,
        thumbnail: meta.thumbnailLink || undefined,
        dlink,
        stream_link: streamLink,
        fast_link: dlink,
        web_link: meta.webViewLink,
        source: 'google_drive',
        // Video-specific metadata
        ...(meta.videoMediaMetadata && {
            video_info: {
                width: meta.videoMediaMetadata.width,
                height: meta.videoMediaMetadata.height,
                duration: meta.videoMediaMetadata.durationMillis
                    ? Math.round(parseInt(meta.videoMediaMetadata.durationMillis) / 1000)
                    : undefined,
            },
        }),
        // Image-specific metadata
        ...(meta.imageMediaMetadata && {
            image_info: {
                width: meta.imageMediaMetadata.width,
                height: meta.imageMediaMetadata.height,
            },
        }),
        created_at: meta.createdTime,
    };
}

/**
 * Get a direct streaming URL for Google Drive videos
 * Uses the Google Drive video export endpoint
 */
async function getGDriveStreamUrl(fileId) {
    // Direct video stream URL pattern
    const streamUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    // For larger files, we need to handle the confirmation page
    try {
        const resp = await fetch(streamUrl, {
            method: 'HEAD',
            redirect: 'manual',
        });

        // If redirected, follow to get the actual download URL
        if (resp.status === 302 || resp.status === 301) {
            const location = resp.headers.get('location');
            if (location) {
                return { url: location, success: true };
            }
        }

        return { url: streamUrl, success: true };
    } catch (err) {
        return { url: streamUrl, success: true }; // Fall back to basic URL
    }
}

module.exports = {
    fetchGDriveFile,
    fetchGDriveFolder,
    mapGDriveFile,
    getGDriveStreamUrl,
};
