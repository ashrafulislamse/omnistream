import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from "react";

interface PipState {
  isActive: boolean;
  videoElement: HTMLVideoElement | null;
  hlsInstance: any;
  fileTitle: string;
}

interface PipContextValue {
  pipState: PipState;
  enterPip: (video: HTMLVideoElement, hls: any, title: string) => Promise<boolean>;
  exitPip: () => Promise<void>;
  reclaimVideo: () => { video: HTMLVideoElement; hls: any } | null;
  persistentContainerRef: React.RefObject<HTMLDivElement>;
}

const PipContext = createContext<PipContextValue | null>(null);

export function PipProvider({ children }: { children: React.ReactNode }) {
  const persistentContainerRef = useRef<HTMLDivElement>(null!);
  const [pipState, setPipState] = useState<PipState>({
    isActive: false,
    videoElement: null,
    hlsInstance: null,
    fileTitle: "",
  });

  // Listen for PIP exit from browser
  useEffect(() => {
    const onLeave = () => {
      setPipState((prev) => {
        // Move video back to persistent container (hidden) on PIP exit
        if (prev.videoElement && persistentContainerRef.current) {
          persistentContainerRef.current.appendChild(prev.videoElement);
          prev.videoElement.pause();
        }
        return { ...prev, isActive: false };
      });
    };

    document.addEventListener("leavepictureinpicture", onLeave);
    return () => document.removeEventListener("leavepictureinpicture", onLeave);
  }, []);

  const enterPip = useCallback(async (video: HTMLVideoElement, hls: any, title: string): Promise<boolean> => {
    try {
      // Move video to persistent container first so React unmount won't remove it
      if (persistentContainerRef.current) {
        persistentContainerRef.current.appendChild(video);
      }
      await video.requestPictureInPicture();
      setPipState({ isActive: true, videoElement: video, hlsInstance: hls, fileTitle: title });
      return true;
    } catch {
      return false;
    }
  }, []);

  const exitPip = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
    } catch { }
    setPipState((prev) => {
      if (prev.videoElement) {
        prev.videoElement.pause();
      }
      if (prev.hlsInstance) {
        prev.hlsInstance.destroy();
      }
      return { isActive: false, videoElement: null, hlsInstance: null, fileTitle: "" };
    });
  }, []);

  const reclaimVideo = useCallback((): { video: HTMLVideoElement; hls: any } | null => {
    if (!pipState.videoElement) return null;
    const result = { video: pipState.videoElement, hls: pipState.hlsInstance };
    // Don't reset state - the component will manage it from here
    setPipState({ isActive: false, videoElement: null, hlsInstance: null, fileTitle: "" });
    return result;
  }, [pipState]);

  return (
    <PipContext.Provider value={{ pipState, enterPip, exitPip, reclaimVideo, persistentContainerRef }}>
      {children}
      {/* Persistent container for PIP video elements - hidden but keeps them in DOM */}
      <div ref={persistentContainerRef} className="fixed -left-[9999px] -top-[9999px] w-0 h-0 overflow-hidden" aria-hidden />
    </PipContext.Provider>
  );
}

export function usePip() {
  const ctx = useContext(PipContext);
  if (!ctx) throw new Error("usePip must be used within PipProvider");
  return ctx;
}
