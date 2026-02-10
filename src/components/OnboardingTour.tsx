import { useState, useEffect, ReactNode } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Link, Heart, Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to OmniStream",
    description: "Your premium streaming and download platform. Let's take a quick tour of the key features.",
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    id: "paste-link",
    title: "Paste Your Link",
    description: "Simply paste a TeraBox link in the input field to fetch all available files instantly.",
    icon: <Link className="w-6 h-6" />,
  },
  {
    id: "stream",
    title: "Stream Videos",
    description: "Watch videos directly in your browser with our HLS player. Resume from where you left off.",
    icon: <Play className="w-6 h-6" />,
  },
  {
    id: "download",
    title: "Download Files",
    description: "Download files individually or use bulk download for multiple files at once.",
    icon: <Download className="w-6 h-6" />,
  },
  {
    id: "favorites",
    title: "Save to Favorites",
    description: "Save your favorite files for quick access later. They'll sync across all your devices.",
    icon: <Heart className="w-6 h-6" />,
  },
];

const STORAGE_KEY = "omnistream_onboarding_complete";

interface OnboardingTourProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

export function OnboardingTour({ forceShow, onComplete }: OnboardingTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
      setCurrentStep(0);
      return;
    }

    // Check if onboarding was already completed
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Delay showing the tour for a smoother entrance
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card p-6 sm:p-8 glow-border animate-scale-in">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="text-center space-y-6">
          {/* Icon with glow */}
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              {step.icon}
            </div>
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">{step.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  i === currentStep
                    ? "bg-primary w-6"
                    : i < currentStep
                    ? "bg-primary/50"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            {!isFirst && (
              <Button
                variant="outline"
                onClick={handlePrev}
                className="gap-1 btn-press"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <Button onClick={handleNext} className="gap-1 btn-press min-w-[100px]">
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>

          {isFirst && (
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to check if onboarding is complete
export function useOnboardingComplete() {
  const [complete, setComplete] = useState(true);

  useEffect(() => {
    const value = localStorage.getItem(STORAGE_KEY);
    setComplete(!!value);
  }, []);

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
    setComplete(false);
  };

  return { complete, resetOnboarding };
}
