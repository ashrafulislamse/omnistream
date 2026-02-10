import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";
import type { ReactNode, HTMLAttributes } from "react";

interface ScrollRevealProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "up" | "scale" | "left" | "right" | "stagger";
  delay?: string;
  once?: boolean;
}

const variantClass: Record<string, string> = {
  up: "scroll-reveal",
  scale: "scroll-reveal-scale",
  left: "scroll-reveal-left",
  right: "scroll-reveal-right",
  stagger: "scroll-reveal-stagger",
};

export function ScrollReveal({
  children,
  variant = "up",
  delay,
  once = true,
  className,
  style,
  ...props
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal({ once });

  return (
    <div
      ref={ref}
      className={cn(variantClass[variant], isVisible && "is-visible", className)}
      style={{ transitionDelay: delay, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
