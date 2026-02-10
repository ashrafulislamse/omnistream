import { useState, useEffect, memo } from "react";
import { Cloud, ImageOff } from "lucide-react";

interface ThumbnailImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  /** Pre-resolved permanent URL from proxy cache */
  proxiedSrc?: string;
  /** Show a badge indicating storage status */
  showStorageIndicator?: boolean;
}

/**
 * Smart thumbnail image: tries proxied URL first, falls back to original,
 * then to placeholder if both fail.
 */
export const ThumbnailImage = memo(function ThumbnailImage({
  src,
  alt,
  className = "w-full h-full object-cover",
  fallbackClassName = "w-full h-full object-contain p-8 opacity-30",
  proxiedSrc,
  showStorageIndicator = false,
}: ThumbnailImageProps) {
  const isStored = proxiedSrc && proxiedSrc !== src;
  const [currentSrc, setCurrentSrc] = useState(proxiedSrc || src);
  const [failed, setFailed] = useState(false);

  // Update when proxied URL becomes available
  useEffect(() => {
    if (proxiedSrc && proxiedSrc !== currentSrc) {
      setCurrentSrc(proxiedSrc);
      setFailed(false);
    }
  }, [proxiedSrc]);

  if (!currentSrc || failed) {
    return (
      <img
        src="/placeholder.svg"
        alt={alt}
        className={fallbackClassName}
        loading="lazy"
      />
    );
  }

  return (
    <>
      <img
        src={currentSrc}
        alt={alt}
        className={className}
        loading="lazy"
        onError={() => {
          if (currentSrc === proxiedSrc && src && src !== proxiedSrc) {
            setCurrentSrc(src);
          } else {
            setFailed(true);
          }
        }}
      />
      {showStorageIndicator && (
        <div
          className={`absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium backdrop-blur-md ${
            isStored
              ? "bg-primary/25 text-primary-foreground dark:bg-primary/30 dark:text-primary border border-primary/20"
              : "bg-background/80 text-muted-foreground dark:bg-card/90 dark:text-muted-foreground border border-border/60"
          }`}
          title={isStored ? "Permanently stored" : "Using original URL (may expire)"}
        >
          {isStored ? (
            <><Cloud className="w-2.5 h-2.5" /> Stored</>
          ) : (
            <><ImageOff className="w-2.5 h-2.5" /> Temp</>
          )}
        </div>
      )}
    </>
  );
});
