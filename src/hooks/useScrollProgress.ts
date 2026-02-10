import { useState, useEffect } from "react";

export function useScrollProgress(maxScroll = 200) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setProgress(Math.min(scrollY / maxScroll, 1));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [maxScroll]);

  return progress;
}
