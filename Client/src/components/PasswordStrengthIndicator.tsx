import React from "react";
import { cn } from "@/lib/utils";

const STRENGTH = {
    Weak: { value: 30, bar: "[&>div]:bg-destructive", text: "text-destructive" },
    Medium: { value: 60, bar: "[&>div]:bg-chart-4", text: "text-chart-4" },
    Strong: { value: 100, bar: "[&>div]:bg-chart-3", text: "text-chart-3" },
} as const;

const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
    const getPasswordStrength = (password: string): keyof typeof STRENGTH => {
        if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}/.test(password)) {
            return "Strong";
        } else if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}/.test(password)) {
            return "Medium";
        } else {
            return "Weak";
        }
    };

    const strength = getPasswordStrength(password);
    const config = STRENGTH[strength];

    return (
        <div className="my-4 flex flex-col items-center gap-2">
            <p className="text-sm">
                Password Strength:{' '}
                <span className={cn("font-semibold", config.text)}>{strength}</span>
            </p>
            <div
                role="progressbar"
                aria-valuenow={config.value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Password strength"
                className={cn(
                    "h-2 w-full overflow-hidden rounded-full bg-muted [&>div]:h-full [&>div]:rounded-full [&>div]:transition-all [&>div]:duration-300",
                    config.bar
                )}
            >
                <div style={{ width: `${config.value}%` }} />
            </div>
        </div>
    );
};

export default React.memo(PasswordStrengthIndicator);
