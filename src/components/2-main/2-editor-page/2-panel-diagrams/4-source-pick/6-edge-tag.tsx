import { motion, useReducedMotion } from 'motion/react';
import type { EdgeMarker } from './1-types';

export function EdgeTag({ marker }: { marker: EdgeMarker; }) {
    const reduceMotion = useReducedMotion() === true;

    return (
        <motion.div
            className="absolute top-0 left-0 w-0 h-0 pointer-events-none"
            style={{ x: marker.at.x, y: marker.at.y, originX: 0, originY: 0 }}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
        >
            <div
                className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap px-2 py-0.5 text-xs font-medium font-mono text-primary bg-background border border-primary rounded-full shadow-sm pointer-events-none"
                data-source-pick="edge"
                data-source-pick-text={marker.text}
                title={marker.text}
            >
                {marker.text}
            </div>
        </motion.div>
    );
}
