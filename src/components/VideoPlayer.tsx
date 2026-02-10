import React, { useState, useRef, useEffect, useCallback } from "react";
import type { TeraBoxFile } from "@/types/terabox";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { usePip } from "@/contexts/PipContext";
import { useNetworkQuality } from "@/hooks/useNetworkQuality";
import { usePlaylistPreloader } from "@/hooks/usePlaylistPreloader";
import { useVideoKeyboardShortcuts, KEYBOARD_SHORTCUTS } from "@/hooks/useVideoKeyboardShortcuts";
import { StreamingStatsOverlay } from "@/components/StreamingStatsOverlay";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, PictureInPicture2,
  Loader2, Gauge, RotateCcw, X, BarChart3, Zap, Keyboard
} from "lucide-react";

interface VideoPlayerProps {
  file: TeraBoxFile;
  sourceUrl?: string;
  onEnded?: () => void;
  nextFile?: TeraBoxFile | null; // For bandwidth-based preloading
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// HLS.js configuration for optimal streaming
const HLS_CONFIG = {
  // ABR Settings
  startLevel: -1, // Auto-select initial quality
  abrEwmaDefaultEstimate: 500000, // Initial bandwidth estimate (500 Kbps)
  abrEwmaFastLive: 3, // Fast adaptation for live
  abrEwmaSlowLive: 9, // Slow adaptation for stability
  abrEwmaFastVoD: 3,
  abrEwmaSlowVoD: 9,
  abrBandWidthFactor: 0.95, // Safety margin
  abrBandWidthUpFactor: 0.7, // More conservative on upgrades
  abrMaxWithRealBitrate: true,
  
  // Buffer Settings (5-10 second preload)
  maxBufferLength: 30, // Max buffer in seconds
  maxMaxBufferLength: 60, // Absolute max
  maxBufferSize: 60 * 1000 * 1000, // 60MB max buffer
  maxBufferHole: 0.5,
  lowBufferWatchdogPeriod: 0.5,
  highBufferWatchdogPeriod: 3,
  
  // Performance
  enableWorker: true,
  lowLatencyMode: false,
  backBufferLength: 30, // Keep 30s in back buffer
  
  // Chunk loading
  maxFragLookUpTolerance: 0.25,
  fragLoadingTimeOut: 20000,
  fragLoadingMaxRetry: 6,
  fragLoadingRetryDelay: 1000,
  fragLoadingMaxRetryTimeout: 64000,
  
  // Startup optimization
  testBandwidth: true,
  startFragPrefetch: true, // Prefetch next fragment
};

export function VideoPlayer({ file, sourceUrl, onEnded, nextFile }: VideoPlayerProps) {
  const qualities = file.fast_stream_url ? Object.keys(file.fast_stream_url) : [];
  const [selectedQuality, setSelectedQuality] = useState(
    file.quality && qualities.includes(file.quality) ? file.quality : qualities[qualities.length - 1] || ""
  );

  const streamSrc = selectedQuality && file.fast_stream_url
    ? file.fast_stream_url[selectedQuality]
    : file.stream_url;

  const useHls = streamSrc?.endsWith(".m3u8");

  return (
    <div className="w-full animate-fade-in-up space-y-4">
      <div className="relative rounded-2xl overflow-hidden glass-card glow-border">
        <CustomPlayer
          src={streamSrc || ""}
          poster={file.thumbnail}
          useHls={!!useHls}
          qualities={qualities}
          selectedQuality={selectedQuality}
          onQualityChange={setSelectedQuality}
          title={file.name}
          duration={file.duration}
          subtitleUrl={file.subtitle_url}
          fileId={file.fs_id}
          thumbnail={file.thumbnail}
          sourceUrl={sourceUrl}
          onEnded={onEnded}
          nextFile={nextFile}
        />
      </div>
    </div>
  );
}

interface CustomPlayerProps {
  src: string;
  poster?: string;
  useHls: boolean;
  qualities: string[];
  selectedQuality: string;
  onQualityChange: (q: string) => void;
  title: string;
  duration?: string;
  subtitleUrl?: string;
  fileId: number;
  thumbnail?: string;
  sourceUrl?: string;
  onEnded?: () => void;
  nextFile?: TeraBoxFile | null; // For bandwidth-based preloading
}

function CustomPlayer({
  src, poster, useHls, qualities, selectedQuality, onQualityChange, title, subtitleUrl, fileId, thumbnail, sourceUrl, onEnded, nextFile
}: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  const { enterPip, pipState } = usePip();
  const { quality: networkQuality, recordSample } = useNetworkQuality();
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout>>();

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showResume, setShowResume] = useState(false);
  const [resumePosition, setResumePosition] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isABREnabled, setIsABREnabled] = useState(true);
  const [streamingStats, setStreamingStats] = useState({
    currentBitrate: 0,
    bufferedSeconds: 0,
    droppedFrames: 0,
    currentLevel: 0,
    totalLevels: 1,
    latency: networkQuality.rtt,
    networkType: networkQuality.effectiveType,
    isABREnabled: true,
  });
  const previewDebounce = useRef<ReturnType<typeof setTimeout>>();
  const saveInterval = useRef<ReturnType<typeof setInterval>>();
  const statsInterval = useRef<ReturnType<typeof setInterval>>();

  const { getEntry, savePosition, clearEntry, getAutoResumePosition, markAsSkipped, clearSkipFlag } = useWatchHistory();
  const prevFileIdRef = useRef<number>(fileId);
  const hasAutoResumedRef = useRef(false);

  // Smart resume: Check for saved position on mount or video switch
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset auto-resume flag when video changes
    hasAutoResumedRef.current = false;

    // Check for auto-resume (previously skipped video)
    const autoResumePos = getAutoResumePosition(fileId);
    if (autoResumePos !== null) {
      // Auto-resume without prompting for skipped videos
      console.debug(`[SmartResume] Auto-resuming "${title}" at ${autoResumePos.toFixed(1)}s`);
      video.currentTime = autoResumePos;
      hasAutoResumedRef.current = true;
      clearSkipFlag(fileId);
      // Don't show resume prompt, just resume silently
      setShowResume(false);
      return;
    }

    // Otherwise, check for normal resume
    const entry = getEntry(fileId);
    if (entry && entry.position > 5) {
      setResumePosition(entry.position);
      setShowResume(true);
    } else {
      setShowResume(false);
    }
  }, [fileId, getEntry, getAutoResumePosition, clearSkipFlag, title]);

  // Save position when switching away from this video (mark as skipped)
  useEffect(() => {
    const prevId = prevFileIdRef.current;
    prevFileIdRef.current = fileId;

    // If fileId changed and we have a previous video, mark it as skipped
    if (prevId !== fileId) {
      const video = videoRef.current;
      if (video && video.duration > 0 && video.currentTime > 2) {
        console.debug(`[SmartResume] Marking video ${prevId} as skipped at ${video.currentTime.toFixed(1)}s`);
        // This uses the previous video's info - we need to save before the switch
        // Actually this runs after the switch, so we rely on the cleanup effect below
      }
    }
  }, [fileId]);

  // Periodically save watch position (every 5s)
  useEffect(() => {
    saveInterval.current = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && video.duration > 0) {
        savePosition(fileId, title, video.currentTime, video.duration, thumbnail, sourceUrl);
      }
    }, 5000);
    return () => clearInterval(saveInterval.current);
  }, [fileId, title, thumbnail, savePosition, sourceUrl]);

  // Save position on unmount / pause / video switch (mark as skipped on switch)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const onPauseOrEnd = () => {
      if (video.duration > 0) {
        savePosition(fileId, title, video.currentTime, video.duration, thumbnail, sourceUrl);
      }
    };
    
    video.addEventListener("pause", onPauseOrEnd);
    
    return () => {
      video.removeEventListener("pause", onPauseOrEnd);
      // On cleanup (video switch or unmount), mark as skipped if meaningful position
      if (video.duration > 0 && video.currentTime > 2) {
        markAsSkipped(fileId, title, video.currentTime, video.duration, thumbnail, sourceUrl);
      }
    };
  }, [fileId, title, thumbnail, sourceUrl, savePosition, markAsSkipped]);

  const handleResume = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = resumePosition;
      video.play();
    }
    setShowResume(false);
  };

  const handleStartOver = () => {
    clearEntry(fileId);
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play();
    }
    setShowResume(false);
  };

  // Load HLS with ABR and buffer optimization
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setLoading(true);

    if (useHls) {
      import("hls.js").then(({ default: Hls }) => {
        if (hlsRef.current) hlsRef.current.destroy();

        if (Hls.isSupported()) {
          const hls = new Hls(HLS_CONFIG);
          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(video);

          // ABR events
          hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            setLoading(false);
            setStreamingStats(prev => ({
              ...prev,
              totalLevels: data.levels.length,
            }));
          });

          hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
            const level = hls.levels[data.level];
            setStreamingStats(prev => ({
              ...prev,
              currentLevel: data.level,
              currentBitrate: level?.bitrate || 0,
            }));
          });

          // Track fragment loading for bandwidth measurement
          hls.on(Hls.Events.FRAG_LOADED, (_, data: any) => {
            const stats = data.frag?.stats || data.stats;
            if (stats?.loaded && stats?.loading) {
              const duration = stats.loading.end - stats.loading.start;
              recordSample(stats.loaded, duration);
            }
          });

          // Buffer monitoring
          hls.on(Hls.Events.FRAG_BUFFERED, () => {
            if (video.buffered.length > 0) {
              const bufferedEnd = video.buffered.end(video.buffered.length - 1);
              const bufferedSeconds = bufferedEnd - video.currentTime;
              setStreamingStats(prev => ({
                ...prev,
                bufferedSeconds: Math.max(0, bufferedSeconds),
              }));
            }
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              console.error("HLS fatal error:", data);
              setLoading(false);
              // Attempt recovery
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                hls.startLoad();
              } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError();
              }
            }
          });

        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src;
        }
      }).catch(() => { video.src = src; });
    } else {
      video.src = src;
    }

    return () => {
      // Don't destroy if PIP is active - the PipContext manages it
      if (document.pictureInPictureElement === video) return;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [src, useHls, recordSample]);

  // Bandwidth-based preloader for next playlist item
  usePlaylistPreloader(
    { fs_id: fileId, name: title, ...{ fast_stream_url: {} } } as TeraBoxFile,
    nextFile || null,
    hlsRef.current,
    undefined
  );

  // Stats update interval
  useEffect(() => {
    statsInterval.current = setInterval(() => {
      const video = videoRef.current;
      const hls = hlsRef.current;
      
      if (video && video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferedSeconds = Math.max(0, bufferedEnd - video.currentTime);
        
        // Get dropped frames from video element if available
        const videoStats = (video as any).getVideoPlaybackQuality?.();
        const droppedFrames = videoStats?.droppedVideoFrames || 0;

        setStreamingStats(prev => ({
          ...prev,
          bufferedSeconds,
          droppedFrames,
          latency: networkQuality.rtt,
          networkType: networkQuality.effectiveType,
          isABREnabled,
          currentBitrate: hls?.bandwidthEstimate || prev.currentBitrate,
        }));
      }
    }, 1000);

    return () => clearInterval(statsInterval.current);
  }, [networkQuality, isABREnabled]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onDurationChange = () => setDuration(video.duration);
    const onCanPlay = () => setLoading(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    const onEnding = () => { onEnded?.(); };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("ended", onEnding);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("ended", onEnding);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case "arrowup":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          setVolume(video.volume);
          break;
        case "arrowdown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          setVolume(video.volume);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          video.muted = !video.muted;
          setMuted(video.muted);
          break;
        case "p":
          e.preventDefault();
          togglePiP();
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    if (playing) {
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) setShowControls(true);
    else showControlsTemporarily();
  }, [playing, showControlsTemporarily]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setFullscreen(false);
    } else {
      el.requestFullscreen();
      setFullscreen(true);
    }
  };

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  // Keyboard shortcuts hook
  useVideoKeyboardShortcuts({
    videoRef,
    containerRef,
    enabled: true,
    onToggleFullscreen: toggleFullscreen,
    onToggleMute: toggleMute,
    seekAmount: 10,
  });

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        // Use PipContext to persist video across route changes
        await enterPip(video, hlsRef.current, title);
      }
    } catch {}
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pct * duration;
  };

  const handleSeekHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = pct * duration;
    setHoverTime(time);
    setHoverX(e.clientX - rect.left);

    clearTimeout(previewDebounce.current);
    previewDebounce.current = setTimeout(() => {
      const pv = previewVideoRef.current;
      const canvas = previewCanvasRef.current;
      if (!pv || !canvas) return;

      pv.currentTime = time;
      const drawFrame = () => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = 160;
        canvas.height = 90;
        ctx.drawImage(pv, 0, 0, 160, 90);
        setPreviewUrl(canvas.toDataURL("image/jpeg", 0.6));
      };
      pv.onseeked = drawFrame;
    }, 80);
  }, [duration]);

  const handleSeekLeave = useCallback(() => {
    setHoverTime(null);
    setPreviewUrl(null);
    clearTimeout(previewDebounce.current);
  }, []);

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const vol = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.volume = vol;
    setVolume(vol);
    setMuted(vol === 0);
    video.muted = vol === 0;
  };

  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettings(false);
  };

  const handleQualityChange = (q: string) => {
    const video = videoRef.current;
    const wasPlaying = video && !video.paused;
    const time = video?.currentTime || 0;
    onQualityChange(q);
    setShowSettings(false);
    // Restore position after source change
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        if (wasPlaying) videoRef.current.play();
      }
    }, 500);
  };

  const formatTime = (t: number) => {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-background group cursor-pointer"
      onMouseMove={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-controls]")) return;
        togglePlay();
      }}
    >
      <video
        ref={videoRef}
        poster={poster}
        crossOrigin="anonymous"
        className="w-full h-full object-contain"
        playsInline
      >
        {subtitleUrl && <track kind="subtitles" src={subtitleUrl} label="Subtitles" default />}
      </video>

      {/* Hidden preview video for thumbnail generation */}
      <video
        ref={previewVideoRef}
        src={useHls ? undefined : src}
        crossOrigin="anonymous"
        muted
        preload="metadata"
        className="hidden"
      />
      <canvas ref={previewCanvasRef} className="hidden" />

      {/* Streaming Stats Overlay */}
      <StreamingStatsOverlay stats={streamingStats} visible={showStats} />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}

      {/* Resume prompt */}
      {showResume && !playing && (
        <div className="absolute inset-0 flex items-center justify-center z-20" onClick={(e) => e.stopPropagation()}>
          <div className="glass-card glow-border p-6 max-w-sm mx-4 space-y-4 text-center" data-controls>
            <RotateCcw className="w-8 h-8 text-primary mx-auto" />
            <div>
              <p className="text-sm font-medium text-foreground">Resume watching?</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                You left off at {formatTime(resumePosition)}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleResume}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors animate-glow-pulse"
              >
                <Play className="w-4 h-4 inline mr-1.5 fill-primary-foreground" />
                Resume
              </button>
              <button
                onClick={handleStartOver}
                className="px-5 py-2.5 rounded-lg glass-card text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Start Over
              </button>
            </div>
            <button onClick={() => setShowResume(false)} className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Center play button (when paused) */}
      {!playing && !loading && !showResume && (
        <div className="absolute inset-0 bottom-20 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-primary/20 backdrop-blur-xl flex items-center justify-center glow-border hover:scale-110 transition-transform pointer-events-auto">
            <Play className="w-6 h-6 sm:w-8 sm:h-8 text-primary fill-primary ml-0.5" />
          </div>
        </div>
      )}

      {/* Title bar removed - parent already shows title */}

      {/* Bottom controls */}
      <div
        data-controls
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* Seek bar - larger hit area with visual track inside */}
        <div
          ref={seekBarRef}
          className="relative h-6 mb-3 cursor-pointer group/seek flex items-center"
          onClick={handleSeek}
          onMouseMove={handleSeekHover}
          onMouseLeave={handleSeekLeave}
          onMouseDown={() => setSeeking(true)}
          onMouseUp={() => setSeeking(false)}
        >
          {/* Thumbnail preview tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute bottom-8 -translate-x-1/2 pointer-events-none z-50 flex flex-col items-center"
              style={{ left: `${Math.max(80, Math.min(hoverX, (seekBarRef.current?.clientWidth || 0) - 80))}px` }}
            >
              <div className="rounded-lg overflow-hidden glass-card glow-border shadow-2xl shadow-primary/20">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-[160px] h-[90px] object-cover" />
                ) : (
                  <div className="w-[160px] h-[90px] bg-muted/20 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                  </div>
                )}
              </div>
              <span className="mt-1.5 text-xs font-mono text-foreground bg-background/80 px-2 py-0.5 rounded backdrop-blur-sm">
                {formatTime(hoverTime)}
              </span>
            </div>
          )}

          {/* Visual track */}
          <div className="absolute left-0 right-0 h-1.5 rounded-full bg-muted/30 group-hover/seek:h-2.5 transition-all">
            {/* Buffered */}
            <div className="absolute inset-y-0 left-0 rounded-full bg-muted/40" style={{ width: `${bufferedPct}%` }} />
            {/* Hover indicator */}
            {hoverTime !== null && (
              <div className="absolute inset-y-0 left-0 rounded-full bg-foreground/10" style={{ width: `${(hoverTime / duration) * 100}%` }} />
            )}
            {/* Progress */}
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary shadow-lg shadow-primary/50 opacity-0 group-hover/seek:opacity-100 transition-opacity -mr-2" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* Left controls */}
          <div className="flex items-center gap-1">
            <ControlButton onClick={togglePlay} title={playing ? "Pause (K)" : "Play (K)"}>
              {playing ? <Pause className="w-5 h-5 fill-foreground" /> : <Play className="w-5 h-5 fill-foreground ml-0.5" />}
            </ControlButton>

            <ControlButton onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }} title="Rewind 10s (J)">
              <SkipBack className="w-4 h-4" />
            </ControlButton>

            <ControlButton onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }} title="Forward 10s (L)">
              <SkipForward className="w-4 h-4" />
            </ControlButton>

            {/* Volume */}
            <ControlButton onClick={() => { const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted); } }} title="Mute (M)">
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </ControlButton>

            <div className="w-20 h-1 rounded-full bg-muted/30 cursor-pointer hidden sm:block" onClick={handleVolumeChange}>
              <div className="h-full rounded-full bg-foreground/80 transition-all" style={{ width: `${muted ? 0 : volume * 100}%` }} />
            </div>

            <span className="text-[10px] sm:text-xs font-mono text-muted-foreground ml-1 sm:ml-2 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 relative">
            {/* ABR indicator */}
            {isABREnabled && streamingStats.currentBitrate > 0 && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-muted-foreground mr-1">
                <Zap className="w-3 h-3 text-primary" />
                {(streamingStats.currentBitrate / 1_000_000).toFixed(1)}M
              </span>
            )}

            {playbackSpeed !== 1 && (
              <span className="text-xs font-mono text-primary mr-1">{playbackSpeed}x</span>
            )}

            <ControlButton onClick={() => setShowStats(!showStats)} title="Streaming Stats">
              <BarChart3 className={`w-4 h-4 ${showStats ? "text-primary" : ""}`} />
            </ControlButton>

            <ControlButton onClick={() => setShowShortcuts(!showShortcuts)} title="Keyboard Shortcuts">
              <Keyboard className={`w-4 h-4 ${showShortcuts ? "text-primary" : ""}`} />
            </ControlButton>

            <ControlButton onClick={() => setShowSettings(!showSettings)} title="Settings">
              <Settings className={`w-4 h-4 transition-transform ${showSettings ? "rotate-90" : ""}`} />
            </ControlButton>

            <ControlButton onClick={togglePiP} title="Picture-in-Picture (P)">
              <PictureInPicture2 className="w-4 h-4" />
            </ControlButton>

            <ControlButton onClick={toggleFullscreen} title="Fullscreen (F)">
              {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </ControlButton>

            {/* Keyboard Shortcuts panel */}
            {showShortcuts && (
              <div
                className="absolute bottom-12 right-16 glass-card p-3 min-w-[220px] glow-border z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Keyboard className="w-3 h-3" /> Keyboard Shortcuts
                </p>
                <div className="space-y-1.5">
                  {KEYBOARD_SHORTCUTS.map(({ key, action }) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{action}</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px] text-foreground">{key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings panel */}
            {showSettings && (
              <div
                className="absolute bottom-12 right-0 glass-card p-3 min-w-[200px] space-y-3 glow-border z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Playback Speed */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Gauge className="w-3 h-3" /> Playback Speed
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {PLAYBACK_SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`px-2 py-1.5 rounded text-xs font-mono transition-all ${
                          playbackSpeed === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* ABR Toggle */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Adaptive Quality
                  </p>
                  <button
                    onClick={() => {
                      const hls = hlsRef.current;
                      if (hls) {
                        if (isABREnabled) {
                          // Lock to current level
                          hls.currentLevel = hls.currentLevel;
                        } else {
                          // Re-enable auto
                          hls.currentLevel = -1;
                        }
                      }
                      setIsABREnabled(!isABREnabled);
                    }}
                    className={`w-full px-3 py-2 rounded text-xs font-medium transition-all flex items-center justify-between ${
                      isABREnabled
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span>Auto-adjust quality</span>
                    <span className={`w-2 h-2 rounded-full ${isABREnabled ? "bg-primary" : "bg-muted-foreground/50"}`} />
                  </button>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {isABREnabled ? "Adapts to your network speed" : "Fixed quality mode"}
                  </p>
                </div>

                {/* Quality */}
                {qualities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Quality</p>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => {
                          const hls = hlsRef.current;
                          if (hls) hls.currentLevel = -1;
                          setIsABREnabled(true);
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                          isABREnabled
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        Auto
                      </button>
                      {qualities.map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            handleQualityChange(q);
                            setIsABREnabled(false);
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                            !isABREnabled && selectedQuality === q
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ControlButton = React.forwardRef<
  HTMLButtonElement,
  { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; title: string }
>(({ children, onClick, title }, ref) => {
  return (
    <button
      ref={ref}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      title={title}
      className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-foreground/10 transition-all touch-manipulation"
    >
      {children}
    </button>
  );
});
ControlButton.displayName = "ControlButton";
