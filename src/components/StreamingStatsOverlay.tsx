import React from "react";
import { Wifi, WifiOff, Activity, Database, Gauge } from "lucide-react";

interface StreamingStats {
  currentBitrate: number; // bps
  bufferedSeconds: number;
  droppedFrames: number;
  currentLevel: number;
  totalLevels: number;
  latency: number;
  networkType: string;
  isABREnabled: boolean;
}

interface StreamingStatsOverlayProps {
  stats: StreamingStats;
  visible: boolean;
}

export function StreamingStatsOverlay({ stats, visible }: StreamingStatsOverlayProps) {
  if (!visible) return null;

  const formatBitrate = (bps: number) => {
    if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
    if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`;
    return `${bps} bps`;
  };

  const getBufferHealth = (seconds: number) => {
    if (seconds >= 10) return { color: "text-green-400", label: "Excellent" };
    if (seconds >= 5) return { color: "text-primary", label: "Good" };
    if (seconds >= 2) return { color: "text-yellow-400", label: "Fair" };
    return { color: "text-red-400", label: "Low" };
  };

  const getNetworkIcon = () => {
    const type = stats.networkType.toLowerCase();
    if (type.includes("4g") || type.includes("5g")) {
      return <Wifi className="w-3 h-3 text-green-400" />;
    }
    if (type.includes("3g")) {
      return <Wifi className="w-3 h-3 text-yellow-400" />;
    }
    if (type === "unknown" || type.includes("2g")) {
      return <WifiOff className="w-3 h-3 text-red-400" />;
    }
    return <Wifi className="w-3 h-3 text-muted-foreground" />;
  };

  const bufferHealth = getBufferHealth(stats.bufferedSeconds);

  return (
    <div className="absolute top-2 left-2 glass-card px-3 py-2 text-xs font-mono space-y-1.5 z-40 select-none pointer-events-none min-w-[180px]">
      {/* Bitrate */}
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Gauge className="w-3 h-3" /> Bitrate
        </span>
        <span className="text-foreground">{formatBitrate(stats.currentBitrate)}</span>
      </div>

      {/* Buffer */}
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Database className="w-3 h-3" /> Buffer
        </span>
        <span className={bufferHealth.color}>
          {stats.bufferedSeconds.toFixed(1)}s ({bufferHealth.label})
        </span>
      </div>

      {/* Quality Level */}
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Activity className="w-3 h-3" /> Quality
        </span>
        <span className="text-foreground">
          {stats.currentLevel + 1}/{stats.totalLevels}
          {stats.isABREnabled && (
            <span className="ml-1 text-[10px] text-primary">(Auto)</span>
          )}
        </span>
      </div>

      {/* Network */}
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {getNetworkIcon()} Network
        </span>
        <span className="text-foreground capitalize">{stats.networkType}</span>
      </div>

      {/* Dropped Frames - only show if > 0 */}
      {stats.droppedFrames > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Dropped</span>
          <span className={stats.droppedFrames > 10 ? "text-red-400" : "text-yellow-400"}>
            {stats.droppedFrames} frames
          </span>
        </div>
      )}

      {/* Latency */}
      {stats.latency > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Latency</span>
          <span className={stats.latency > 100 ? "text-yellow-400" : "text-foreground"}>
            {stats.latency}ms
          </span>
        </div>
      )}
    </div>
  );
}
