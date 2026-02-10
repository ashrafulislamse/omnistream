import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    SkipBack, SkipForward, Settings, Subtitles,
    PictureInPicture2, X, ChevronUp, ChevronDown,
    Gauge, Monitor, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ Types ============
interface VideoPlayerProps {
    src: string;
    poster?: string;
    title?: string;
    autoPlay?: boolean;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    onEnded?: () => void;
    initialTime?: number;
    className?: string;
}

interface PlaybackSpeed {
    label: string;
    value: number;
}

const PLAYBACK_SPEEDS: PlaybackSpeed[] = [
    { label: '0.5x', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: '1x', value: 1 },
    { label: '1.25x', value: 1.25 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2 },
];

// ============ Main Video Player ============
export function VideoPlayer({
    src,
    poster,
    title,
    autoPlay = false,
    onTimeUpdate,
    onEnded,
    initialTime = 0,
    className,
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const hideControlsTimeout = useRef<number | null>(null);

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPiP, setIsPiP] = useState(false);

    // Initialize video
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (initialTime > 0) {
            video.currentTime = initialTime;
        }

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
            setIsLoading(false);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            onTimeUpdate?.(video.currentTime, video.duration);
        };

        const handleProgress = () => {
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            onEnded?.();
        };

        const handleWaiting = () => setIsLoading(true);
        const handleCanPlay = () => setIsLoading(false);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('progress', handleProgress);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('progress', handleProgress);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [initialTime, onTimeUpdate, onEnded]);

    // PiP listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnterPiP = () => setIsPiP(true);
        const handleLeavePiP = () => setIsPiP(false);

        video.addEventListener('enterpictureinpicture', handleEnterPiP);
        video.addEventListener('leavepictureinpicture', handleLeavePiP);

        return () => {
            video.removeEventListener('enterpictureinpicture', handleEnterPiP);
            video.removeEventListener('leavepictureinpicture', handleLeavePiP);
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 't':
                    e.preventDefault();
                    setIsTheaterMode(!isTheaterMode);
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    skip(-10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    skip(10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    adjustVolume(0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    adjustVolume(-0.1);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isTheaterMode]);

    // Auto-hide controls
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        if (hideControlsTimeout.current) {
            clearTimeout(hideControlsTimeout.current);
        }
        if (isPlaying) {
            hideControlsTimeout.current = window.setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    }, [isPlaying]);

    // Control functions
    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(video.muted);
    };

    const adjustVolume = (delta: number) => {
        const video = videoRef.current;
        if (!video) return;
        const newVolume = Math.max(0, Math.min(1, volume + delta));
        video.volume = newVolume;
        setVolume(newVolume);
        if (newVolume > 0 && isMuted) {
            video.muted = false;
            setIsMuted(false);
        }
    };

    const skip = (seconds: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
    };

    const seek = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        const progress = progressRef.current;
        if (!video || !progress) return;

        const rect = progress.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        video.currentTime = percent * duration;
    };

    const changeSpeed = (speed: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.playbackRate = speed;
        setPlaybackSpeed(speed);
        setShowSpeedMenu(false);
    };

    const toggleFullscreen = async () => {
        const container = containerRef.current;
        if (!container) return;

        if (document.fullscreenElement) {
            await document.exitFullscreen();
            setIsFullscreen(false);
        } else {
            await container.requestFullscreen();
            setIsFullscreen(true);
        }
    };

    const togglePiP = async () => {
        const video = videoRef.current;
        if (!video) return;

        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            await video.requestPictureInPicture();
        }
    };

    // Format time
    const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0;

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative bg-black overflow-hidden group",
                isTheaterMode && !isFullscreen && "w-full max-w-none aspect-[21/9]",
                !isTheaterMode && !isFullscreen && "aspect-video",
                isFullscreen && "fixed inset-0 z-50",
                className
            )}
            onMouseMove={showControlsTemporarily}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                autoPlay={autoPlay}
                className="w-full h-full object-contain"
                onClick={togglePlay}
            />

            {/* Loading Spinner */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
                </div>
            )}

            {/* Title Bar */}
            {title && (
                <div className={cn(
                    "absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity",
                    showControls ? "opacity-100" : "opacity-0"
                )}>
                    <h2 className="text-lg font-semibold text-white truncate">{title}</h2>
                </div>
            )}

            {/* Play/Pause Overlay */}
            {!isLoading && (
                <div
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                    onClick={togglePlay}
                >
                    <div className={cn(
                        "p-5 rounded-full bg-black/50 backdrop-blur-sm transition-all transform",
                        isPlaying ? "scale-0 opacity-0" : "scale-100 opacity-100"
                    )}>
                        <Play className="w-12 h-12 text-white fill-current" />
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className={cn(
                "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity",
                showControls ? "opacity-100" : "opacity-0"
            )}>
                {/* Progress Bar */}
                <div
                    ref={progressRef}
                    className="px-4 py-2 cursor-pointer group/progress"
                    onClick={seek}
                >
                    <div className="relative h-1 bg-white/20 rounded-full overflow-hidden hover:h-1.5 transition-all">
                        {/* Buffered */}
                        <div
                            className="absolute h-full bg-white/30 rounded-full"
                            style={{ width: `${bufferedProgress}%` }}
                        />
                        {/* Progress */}
                        <div
                            className="absolute h-full bg-teal-500 rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                        {/* Thumb */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-teal-400 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                            style={{ left: `calc(${progress}% - 6px)` }}
                        />
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center gap-2 px-4 pb-4">
                    {/* Play/Pause */}
                    <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        {isPlaying ? (
                            <Pause className="w-6 h-6 text-white" />
                        ) : (
                            <Play className="w-6 h-6 text-white fill-current" />
                        )}
                    </button>

                    {/* Skip Back */}
                    <button onClick={() => skip(-10)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <SkipBack className="w-5 h-5 text-white" />
                    </button>

                    {/* Skip Forward */}
                    <button onClick={() => skip(10)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <SkipForward className="w-5 h-5 text-white" />
                    </button>

                    {/* Volume */}
                    <div className="flex items-center gap-1 group/volume">
                        <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            {isMuted || volume === 0 ? (
                                <VolumeX className="w-5 h-5 text-white" />
                            ) : (
                                <Volume2 className="w-5 h-5 text-white" />
                            )}
                        </button>
                        <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={isMuted ? 0 : volume}
                                onChange={(e) => {
                                    const v = parseFloat(e.target.value);
                                    setVolume(v);
                                    if (videoRef.current) {
                                        videoRef.current.volume = v;
                                        videoRef.current.muted = v === 0;
                                        setIsMuted(v === 0);
                                    }
                                }}
                                className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-teal-400 [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                    </div>

                    {/* Time */}
                    <div className="text-sm text-white/80 ml-2">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>

                    <div className="flex-1" />

                    {/* Speed */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <Gauge className="w-5 h-5 text-white" />
                            <span className="text-xs text-white/80">{playbackSpeed}x</span>
                        </button>
                        {showSpeedMenu && (
                            <>
                                <div className="fixed inset-0" onClick={() => setShowSpeedMenu(false)} />
                                <div className="absolute bottom-full right-0 mb-2 py-1 bg-[#1a1a24] border border-white/10 rounded-lg shadow-xl z-10">
                                    {PLAYBACK_SPEEDS.map((speed) => (
                                        <button
                                            key={speed.value}
                                            onClick={() => changeSpeed(speed.value)}
                                            className={cn(
                                                "w-full px-4 py-1.5 text-sm text-left hover:bg-white/10 transition-colors",
                                                playbackSpeed === speed.value && "text-teal-400"
                                            )}
                                        >
                                            {speed.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* PiP */}
                    {'pictureInPictureEnabled' in document && (
                        <button
                            onClick={togglePiP}
                            className={cn(
                                "p-2 hover:bg-white/10 rounded-lg transition-colors",
                                isPiP && "text-teal-400"
                            )}
                            title="Picture in Picture"
                        >
                            <PictureInPicture2 className="w-5 h-5" />
                        </button>
                    )}

                    {/* Theater Mode */}
                    <button
                        onClick={() => setIsTheaterMode(!isTheaterMode)}
                        className={cn(
                            "p-2 hover:bg-white/10 rounded-lg transition-colors",
                            isTheaterMode && "text-teal-400"
                        )}
                        title="Theater Mode (t)"
                    >
                        <Monitor className="w-5 h-5" />
                    </button>

                    {/* Fullscreen */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Fullscreen (f)"
                    >
                        {isFullscreen ? (
                            <Minimize className="w-5 h-5 text-white" />
                        ) : (
                            <Maximize className="w-5 h-5 text-white" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============ Mini Player ============
export function MiniPlayer({
    src,
    title,
    isVisible,
    onClose,
    onExpand,
}: {
    src: string;
    title?: string;
    isVisible: boolean;
    onClose: () => void;
    onExpand: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);

    if (!isVisible) return null;

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
            setIsPlaying(true);
        } else {
            video.pause();
            setIsPlaying(false);
        }
    };

    return (
        <div className="fixed bottom-20 right-4 z-40 w-80 rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 animate-scale-in">
            {/* Video */}
            <div className="relative aspect-video bg-black">
                <video
                    ref={videoRef}
                    src={src}
                    autoPlay
                    className="w-full h-full object-contain"
                    onClick={togglePlay}
                />

                {/* Controls Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <div className="flex items-center gap-2">
                        <button onClick={togglePlay} className="p-2 hover:bg-white/20 rounded-lg">
                            {isPlaying ? (
                                <Pause className="w-5 h-5 text-white" />
                            ) : (
                                <Play className="w-5 h-5 text-white fill-current" />
                            )}
                        </button>
                        <div className="flex-1" />
                        <button onClick={onExpand} className="p-2 hover:bg-white/20 rounded-lg">
                            <ChevronUp className="w-5 h-5 text-white" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Title Bar */}
            {title && (
                <div className="px-3 py-2 bg-[#0f0f18]">
                    <p className="text-sm font-medium text-white truncate">{title}</p>
                </div>
            )}
        </div>
    );
}

export default VideoPlayer;
