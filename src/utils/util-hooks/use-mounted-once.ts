import { useState } from "react";

export function useMountedOnce(active: boolean) {
    const [mounted, setMounted] = useState(active);
    if (active && !mounted) {
        setMounted(true);
    }
    return mounted;
}
