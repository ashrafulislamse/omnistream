/**
 * Cloud File Types — Supports TeraBox + Google Drive
 * Renamed from TeraBox-specific to multi-cloud compatible
 * (Original TeraBoxFile/TeraBoxResponse names kept for backward compatibility)
 */

export interface TeraBoxFile {
  fs_id: number | string; // TeraBox uses number, Google Drive uses string ID
  name: string;
  size: number;
  size_formatted?: string;
  type: string;
  mime_type?: string;
  is_dir?: string;
  duration?: string;
  quality?: string;
  download_link?: string;
  fast_download_link?: string;
  dlink?: string;
  fast_link?: string;
  stream_url?: string;
  stream_link?: string;
  fast_stream_url?: Record<string, string>;
  subtitle_url?: string;
  thumbnail?: string;
  folder?: string;
  web_link?: string;
  source?: 'terabox' | 'google_drive';
  video_info?: {
    width?: number;
    height?: number;
    duration?: number;
  };
  image_info?: {
    width?: number;
    height?: number;
  };
  created_at?: string;
}

export interface TeraBoxResponse {
  status: string;
  source?: string; // 'TeraBox' | 'Google Drive'
  total_files: number;
  list: TeraBoxFile[];
  cached?: boolean;
  cache_age_seconds?: number;
  error?: string;
  message?: string;
}

// Aliases for clarity in new code
export type CloudFile = TeraBoxFile;
export type CloudResponse = TeraBoxResponse;

/** Cloud source types */
export type CloudSource = 'terabox' | 'google_drive' | 'unknown';

/** URL validation patterns */
export const TERABOX_DOMAINS = [
  'terabox.com',
  '1024terabox.com',
  'teraboxapp.com',
  '1024tera.com',
];

export const GDRIVE_PATTERNS = [
  /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
  /docs\.google\.com\/.*\/d\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/,
];

/** Detect cloud source from URL */
export function detectCloudSource(url: string): { source: CloudSource; fileId?: string } {
  try {
    const parsed = new URL(url);

    // TeraBox
    if (TERABOX_DOMAINS.some(d => parsed.hostname.endsWith(d))) {
      return { source: 'terabox' };
    }

    // Google Drive
    for (const pattern of GDRIVE_PATTERNS) {
      const match = url.match(pattern);
      if (match) {
        return { source: 'google_drive', fileId: match[1] };
      }
    }

    return { source: 'unknown' };
  } catch {
    return { source: 'unknown' };
  }
}

/** Check if a URL is from a supported cloud source */
export function isValidCloudUrl(url: string): boolean {
  return detectCloudSource(url).source !== 'unknown';
}

/** Get human-readable source name */
export function getSourceLabel(source: CloudSource): string {
  switch (source) {
    case 'terabox': return 'TeraBox';
    case 'google_drive': return 'Google Drive';
    default: return 'Unknown';
  }
}
