import { useState, useEffect, useCallback, useRef } from "react";

export interface NetworkQuality {
  effectiveType: "slow-2g" | "2g" | "3g" | "4g" | "5g" | "unknown";
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
  recommendedQuality: string;
  isStable: boolean;
}

interface BandwidthSample {
  bytes: number;
  duration: number;
  timestamp: number;
}

const QUALITY_THRESHOLDS = {
  "1080p": 5,    // 5+ Mbps for 1080p
  "720p": 2.5,   // 2.5+ Mbps for 720p
  "480p": 1,     // 1+ Mbps for 480p
  "360p": 0.5,   // 0.5+ Mbps for 360p
  "240p": 0,     // Fallback
};

/**
 * Hook for monitoring network quality and recommending video quality
 * Uses Network Information API + measured bandwidth samples
 */
export function useNetworkQuality() {
  const [quality, setQuality] = useState<NetworkQuality>({
    effectiveType: "unknown",
    downlink: 0,
    rtt: 0,
    saveData: false,
    recommendedQuality: "720p",
    isStable: true,
  });

  const samples = useRef<BandwidthSample[]>([]);
  const lastMeasurement = useRef<number>(0);

  // Get recommended quality based on bandwidth
  const getRecommendedQuality = useCallback((mbps: number): string => {
    for (const [q, threshold] of Object.entries(QUALITY_THRESHOLDS)) {
      if (mbps >= threshold) return q;
    }
    return "360p";
  }, []);

  // Calculate stability from recent samples
  const calculateStability = useCallback((recentSamples: BandwidthSample[]): boolean => {
    if (recentSamples.length < 3) return true;
    
    const bandwidths = recentSamples.map(s => (s.bytes * 8) / s.duration / 1_000_000);
    const avg = bandwidths.reduce((a, b) => a + b, 0) / bandwidths.length;
    const variance = bandwidths.reduce((sum, bw) => sum + Math.pow(bw - avg, 2), 0) / bandwidths.length;
    const stdDev = Math.sqrt(variance);
    
    // Connection is stable if std deviation is less than 30% of average
    return stdDev / avg < 0.3;
  }, []);

  // Record a bandwidth sample from actual download
  const recordSample = useCallback((bytes: number, durationMs: number) => {
    const now = Date.now();
    
    // Debounce - only record every 500ms
    if (now - lastMeasurement.current < 500) return;
    lastMeasurement.current = now;

    const sample: BandwidthSample = {
      bytes,
      duration: durationMs / 1000,
      timestamp: now,
    };

    samples.current = [
      ...samples.current.filter(s => now - s.timestamp < 30000), // Keep last 30s
      sample,
    ].slice(-20); // Max 20 samples

    // Calculate measured bandwidth
    const recentSamples = samples.current.filter(s => now - s.timestamp < 10000);
    if (recentSamples.length > 0) {
      const totalBytes = recentSamples.reduce((sum, s) => sum + s.bytes, 0);
      const totalDuration = recentSamples.reduce((sum, s) => sum + s.duration, 0);
      const measuredMbps = (totalBytes * 8) / totalDuration / 1_000_000;
      
      setQuality(prev => ({
        ...prev,
        downlink: measuredMbps,
        recommendedQuality: getRecommendedQuality(measuredMbps),
        isStable: calculateStability(recentSamples),
      }));
    }
  }, [getRecommendedQuality, calculateStability]);

  // Use Network Information API if available
  useEffect(() => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    const updateNetworkInfo = () => {
      if (!connection) return;

      const effectiveType = connection.effectiveType || "unknown";
      const downlink = connection.downlink || 0;
      const rtt = connection.rtt || 0;
      const saveData = connection.saveData || false;

      setQuality(prev => ({
        ...prev,
        effectiveType,
        downlink: prev.downlink || downlink, // Prefer measured bandwidth
        rtt,
        saveData,
        recommendedQuality: prev.downlink 
          ? getRecommendedQuality(prev.downlink) 
          : getRecommendedQuality(downlink),
      }));
    };

    updateNetworkInfo();

    if (connection) {
      connection.addEventListener?.("change", updateNetworkInfo);
      return () => connection.removeEventListener?.("change", updateNetworkInfo);
    }
  }, [getRecommendedQuality]);

  // Measure initial bandwidth with a small probe
  useEffect(() => {
    const measureInitialBandwidth = async () => {
      try {
        const start = performance.now();
        // Use a small, cacheable resource to estimate initial bandwidth
        const response = await fetch("/favicon.ico?" + Date.now(), {
          cache: "no-store",
        });
        const blob = await response.blob();
        const duration = performance.now() - start;
        
        if (duration > 10 && blob.size > 0) {
          recordSample(blob.size, duration);
        }
      } catch {
        // Ignore - use Network API estimates
      }
    };

    measureInitialBandwidth();
  }, [recordSample]);

  return {
    quality,
    recordSample,
    // Utility to check if current bandwidth supports a quality level
    canPlayQuality: useCallback((targetQuality: string): boolean => {
      const threshold = QUALITY_THRESHOLDS[targetQuality as keyof typeof QUALITY_THRESHOLDS];
      return threshold !== undefined && quality.downlink >= threshold;
    }, [quality.downlink]),
  };
}
