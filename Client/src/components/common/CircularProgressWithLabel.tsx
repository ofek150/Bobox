import { cn } from "@/lib/utils";

interface CircularProgressWithLabelProps {
    value: number;
    size?: number;
    className?: string;
}

/** Upload progress ring with the percentage in the middle. */
function CircularProgressWithLabel({
    value,
    size = 64,
    className,
}: CircularProgressWithLabelProps) {
    const clamped = Math.min(100, Math.max(0, value));
    const strokeWidth = Math.max(4, Math.round(size / 12));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
        <div
            role="progressbar"
            aria-valuenow={Math.round(clamped)}
            aria-valuemin={0}
            aria-valuemax={100}
            className={cn("relative inline-flex shrink-0", className)}
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className="fill-none stroke-muted"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className="fill-none stroke-primary transition-[stroke-dashoffset] duration-200"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (clamped / 100) * circumference}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground">
                {Math.round(clamped)}%
            </span>
        </div>
    );
}

export default CircularProgressWithLabel;
