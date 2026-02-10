import { Database, Zap, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CacheStatusBadgeProps {
  source: "redis" | "memory" | "database" | "fresh";
  cacheAge?: number; // in seconds
  className?: string;
  showLabel?: boolean;
}

const sourceConfig = {
  redis: {
    icon: Database,
    label: "Redis Cache",
    shortLabel: "Redis",
    color: "text-primary bg-primary/10 border-primary/20",
    description: "Served from distributed cache"
  },
  memory: {
    icon: Zap,
    label: "Memory Cache",
    shortLabel: "Memory",
    color: "text-green-500 bg-green-500/10 border-green-500/20",
    description: "Instant from local memory"
  },
  database: {
    icon: Database,
    label: "Database Cache",
    shortLabel: "DB",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    description: "Served from shared cache"
  },
  fresh: {
    icon: RefreshCw,
    label: "Fresh Fetch",
    shortLabel: "Fresh",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    description: "Freshly fetched from API"
  },
};

function formatCacheAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function CacheStatusBadge({ source, cacheAge, className, showLabel = true }: CacheStatusBadgeProps) {
  const config = sourceConfig[source];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium transition-all",
        config.color,
        className
      )}
      title={`${config.description}${cacheAge ? ` • ${formatCacheAge(cacheAge)}` : ""}`}
    >
      <Icon className="w-3 h-3" />
      {showLabel && <span>{config.shortLabel}</span>}
      {cacheAge !== undefined && cacheAge > 0 && (
        <>
          <span className="opacity-50">•</span>
          <Clock className="w-2.5 h-2.5 opacity-70" />
          <span className="opacity-80">{formatCacheAge(cacheAge)}</span>
        </>
      )}
    </div>
  );
}

export function CacheStatusIndicator({ 
  fromCache, 
  cacheAge,
  cacheSource 
}: { 
  fromCache: boolean; 
  cacheAge?: number;
  cacheSource?: "redis" | "memory" | "database";
}) {
  const source = fromCache 
    ? (cacheSource || "memory") 
    : "fresh";

  return (
    <CacheStatusBadge 
      source={source} 
      cacheAge={fromCache ? cacheAge : undefined}
    />
  );
}
