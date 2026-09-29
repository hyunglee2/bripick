import type { HTMLAttributes } from "react";

export function Kbd({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
    return <kbd className={`ui-kbd ${className}`} {...props} />;
}

export function KbdGroup({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
    return <span className={`ui-kbd-group ${className}`} {...props} />;
}
