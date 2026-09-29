import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/utils';
import type { EdgeLabelPlace, EdgeMarker } from './1-types';

const CHIP = 'select-none whitespace-nowrap px-2 py-0.5 text-xs font-medium font-mono text-primary bg-background border-2 border-primary rounded-full shadow-sm pointer-events-none';

/** Hang the caption off the anchor so the whole pill stays on one side of the stroke. */
const PLACE: Record<EdgeLabelPlace, string> = {
    'down-left': 'absolute right-2 top-0',
    'down-right': 'absolute left-2 top-0',
    'up-left': 'absolute right-2 bottom-0',
    'up-right': 'absolute left-2 bottom-0',
    'right-above': 'absolute bottom-2 left-0',
    'right-below': 'absolute top-2 left-0',
    'left-above': 'absolute bottom-2 right-0',
    'left-below': 'absolute top-2 right-0',
};

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
                className={cn(PLACE[marker.place], CHIP)}
                data-source-pick="edge"
                data-source-pick-text={marker.text}
                data-source-pick-place={marker.place}
                title={marker.text}
            >
                {marker.text}
            </div>
        </motion.div>
    );
}
