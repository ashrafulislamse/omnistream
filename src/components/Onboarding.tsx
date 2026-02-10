import { useState, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
    X, ChevronRight, ChevronLeft, Zap, Check, Sparkles
} from 'lucide-react';

interface OnboardingStep {
    target: string; // CSS selector
    title: string;
    description: string;
    icon: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const onboardingSteps: OnboardingStep[] = [
    {
        target: '[data-tour="stream-button"]',
        title: 'Start Streaming',
        description: 'Click here to paste a TeraBox link and start streaming instantly. It\'s that easy!',
        icon: <Zap className="w-5 h-5" />,
        position: 'right'
    },
    {
        target: '[data-tour="theme-toggle"]',
        title: 'Switch Themes',
        description: 'Toggle between light and dark mode to match your preference.',
        icon: <Sparkles className="w-5 h-5" />,
        position: 'bottom'
    }
];

interface OnboardingContextType {
    isOnboarding: boolean;
    startOnboarding: () => void;
    endOnboarding: () => void;
    currentStep: number;
}

const OnboardingContext = createContext<OnboardingContextType>({
    isOnboarding: false,
    startOnboarding: () => { },
    endOnboarding: () => { },
    currentStep: 0,
});

export function useOnboarding() {
    return useContext(OnboardingContext);
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const [isOnboarding, setIsOnboarding] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
        return localStorage.getItem('omnistream-onboarding-complete') === 'true';
    });

    // Check first visit
    useEffect(() => {
        const hasVisited = localStorage.getItem('omnistream-visited');
        if (!hasVisited && !hasSeenOnboarding) {
            // Delay showing onboarding to let page load
            const timeout = setTimeout(() => {
                setIsOnboarding(true);
                localStorage.setItem('omnistream-visited', 'true');
            }, 1500);
            return () => clearTimeout(timeout);
        }
    }, [hasSeenOnboarding]);

    const startOnboarding = () => {
        setCurrentStep(0);
        setIsOnboarding(true);
    };

    const endOnboarding = () => {
        setIsOnboarding(false);
        setCurrentStep(0);
        localStorage.setItem('omnistream-onboarding-complete', 'true');
        setHasSeenOnboarding(true);
    };

    return (
        <OnboardingContext.Provider value={{ isOnboarding, startOnboarding, endOnboarding, currentStep }}>
            {children}
            {isOnboarding && (
                <OnboardingOverlay
                    steps={onboardingSteps}
                    currentStep={currentStep}
                    onNext={() => setCurrentStep(prev => Math.min(prev + 1, onboardingSteps.length - 1))}
                    onPrev={() => setCurrentStep(prev => Math.max(prev - 1, 0))}
                    onComplete={endOnboarding}
                    onSkip={endOnboarding}
                />
            )}
        </OnboardingContext.Provider>
    );
}

interface OnboardingOverlayProps {
    steps: OnboardingStep[];
    currentStep: number;
    onNext: () => void;
    onPrev: () => void;
    onComplete: () => void;
    onSkip: () => void;
}

function OnboardingOverlay({ steps, currentStep, onNext, onPrev, onComplete, onSkip }: OnboardingOverlayProps) {
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const [tooltipSide, setTooltipSide] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
    const step = steps[currentStep];
    const isLast = currentStep === steps.length - 1;

    useEffect(() => {
        const target = document.querySelector(step.target);
        if (target) {
            const rect = target.getBoundingClientRect();
            const position = step.position || 'bottom';
            setTooltipSide(position);

            // Calculate position based on side
            let top = 0;
            let left = 0;

            switch (position) {
                case 'top':
                    top = rect.top - 16;
                    left = rect.left + rect.width / 2;
                    break;
                case 'bottom':
                    top = rect.bottom + 16;
                    left = rect.left + rect.width / 2;
                    break;
                case 'left':
                    top = rect.top + rect.height / 2;
                    left = rect.left - 16;
                    break;
                case 'right':
                    top = rect.top + rect.height / 2;
                    left = rect.right + 16;
                    break;
            }

            setTooltipPosition({ top, left });

            // Highlight target
            target.classList.add('onboarding-highlight');
            return () => target.classList.remove('onboarding-highlight');
        }
    }, [step]);

    return createPortal(
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onSkip} />

            {/* Tooltip */}
            <div
                className={cn(
                    "absolute z-10 w-80 p-5 bg-white dark:bg-[#12121a] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 animate-fade-in-scale",
                    tooltipSide === 'bottom' && "-translate-x-1/2",
                    tooltipSide === 'top' && "-translate-x-1/2 -translate-y-full",
                    tooltipSide === 'left' && "-translate-x-full -translate-y-1/2",
                    tooltipSide === 'right' && "-translate-y-1/2"
                )}
                style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
            >
                {/* Arrow */}
                <div
                    className={cn(
                        "absolute w-3 h-3 bg-white dark:bg-[#12121a] border-gray-200 dark:border-white/10 rotate-45",
                        tooltipSide === 'bottom' && "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-t",
                        tooltipSide === 'top' && "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-r border-b",
                        tooltipSide === 'left' && "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 border-t border-r",
                        tooltipSide === 'right' && "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-b border-l"
                    )}
                />

                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white flex-shrink-0">
                        {step.icon}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg dark:text-white">{step.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
                    </div>
                    <button
                        onClick={onSkip}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-400"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-1.5 mb-4">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 rounded-full transition-all",
                                i === currentStep
                                    ? "w-6 bg-teal-500"
                                    : i < currentStep
                                        ? "w-3 bg-teal-500/50"
                                        : "w-3 bg-gray-200 dark:bg-white/10"
                            )}
                        />
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={onSkip}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        Skip tour
                    </button>
                    <div className="flex items-center gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={onPrev}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={isLast ? onComplete : onNext}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                        >
                            {isLast ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Done
                                </>
                            ) : (
                                <>
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

// CSS for highlighted element (add to index.css or inline)
// .onboarding-highlight {
//   position: relative;
//   z-index: 101;
//   box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
//   border-radius: 12px;
// }
