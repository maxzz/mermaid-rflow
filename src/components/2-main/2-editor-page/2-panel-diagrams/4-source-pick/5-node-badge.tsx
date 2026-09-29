import { useAtomValue, useSetAtom } from 'jotai';
import { motion, useReducedMotion } from 'motion/react';
import type { NodeMarker } from './1-types';
import { settleSourcePickAtom, sourcePickSettledAtom } from './4-settled-atoms';

const ENTER = {
    x: { type: 'spring' as const, stiffness: 520, damping: 34, mass: 0.62 },
    y: { type: 'spring' as const, stiffness: 520, damping: 34, mass: 0.62 },
    scale: { type: 'spring' as const, stiffness: 480, damping: 26, mass: 0.5 },
    opacity: { duration: 0.14 },
};

export function NodeBadge({ marker, settleKey }: { marker: NodeMarker; settleKey: string; }) {
    const settled = useAtomValue(sourcePickSettledAtom).has(settleKey);
    const settle = useSetAtom(settleSourcePickAtom);
    const reduceMotion = useReducedMotion() === true;

    if (settled || reduceMotion) {
        return (
            <div
                className="absolute top-0 left-0 w-0 h-0 pointer-events-none"
                style={{ transform: `translate(${marker.corner.x}px, ${marker.corner.y}px)` }}
            >
                <NodeChip marker={marker} />
            </div>
        );
    }

    return (
        <motion.div
            className="absolute top-0 left-0 w-0 h-0 pointer-events-none"
            style={{ originX: 0, originY: 0, willChange: 'transform' }}
            initial={{ x: marker.center.x, y: marker.center.y, scale: 0.45, opacity: 0 }}
            animate={{ x: marker.corner.x, y: marker.corner.y, scale: 1, opacity: 1 }}
            transition={ENTER}
            onAnimationComplete={() => settle(settleKey)}
        >
            <NodeChip marker={marker} />
        </motion.div>
    );
}

function NodeChip({ marker }: { marker: NodeMarker; }) {
    if (marker.shape === 'circle') {
        return (
            <div
                className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 select-none size-7 text-sm font-semibold font-mono text-primary bg-background border-2 border-primary rounded-full shadow-md flex items-center justify-center pointer-events-none"
                data-source-pick="node"
                data-source-pick-shape="circle"
                data-source-pick-name={marker.name}
                title={marker.name}
            >
                {marker.name}
            </div>
        );
    }

    return (
        <div
            className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap px-2 h-7 max-w-36 text-xs font-semibold font-mono text-primary bg-background border-2 border-primary rounded-full shadow-md truncate flex items-center justify-center pointer-events-none"
            data-source-pick="node"
            data-source-pick-shape="pill"
            data-source-pick-name={marker.name}
            title={marker.name}
        >
            {marker.name}
        </div>
    );
}
