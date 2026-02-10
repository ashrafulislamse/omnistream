import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-card p-10 sm:p-14 text-center flex flex-col items-center animate-fade-in-up",
        className
      )}
    >
      {/* Decorative background */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl scale-150" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center text-primary/40">
          {icon}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex gap-3 flex-wrap justify-center">
          {action && (
            <Button onClick={action.onClick} className="gap-2 btn-press">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className="gap-2 btn-press"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
