export interface TeraBoxFile {
  fs_id: number;
  name: string;
  size: number;
  size_formatted: string;
  type: string;
  is_dir: string;
  duration?: string;
  quality?: string;
  download_link: string;
  fast_download_link: string;
  stream_url?: string;
  fast_stream_url?: Record<string, string>;
  subtitle_url?: string;
  thumbnail?: string;
  folder: string;
}

export interface TeraBoxResponse {
  status: string;
  total_files: number;
  list: TeraBoxFile[];
  error?: string;
}
