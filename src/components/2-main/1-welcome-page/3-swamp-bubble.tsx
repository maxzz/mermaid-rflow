import { useAtomValue, useSetAtom } from "jotai";
import { motion } from "motion/react";
import { bubbleAtomFamily, respawnBubbleAtom, SWAMP_COLORS } from "./a-swamp-atoms";

export function SwampBubble({ id }: { id: number; }) {
    const { seed, startX, startY, radius: r, duration, delay, driftX } = useAtomValue(bubbleAtomFamily(id));
    const respawn = useSetAtom(respawnBubbleAtom);

    const timing = { duration, delay };

    return (
        <motion.g
            key={seed}
            initial={{ x: startX, y: startY, scale: 0.3, opacity: 0 }}
            animate={{
                x: [startX, startX + driftX, startX - driftX * 0.6, startX + driftX * 0.4],
                y: [startY, r + 1],
                scale: [0.3, 1, 1],
                opacity: [0, 1, 1, 0],
            }}
            transition={{
                x: { ...timing, ease: "easeInOut" },
                y: { ...timing, ease: [0.45, 0, 0.75, 1] },
                scale: { ...timing, times: [0, 0.2, 1] },
                opacity: { ...timing, times: [0, 0.1, 0.88, 1] },
            }}
            onAnimationComplete={() => respawn(id)}
        >
            <circle r={r} fill={SWAMP_COLORS.bubbleFill} stroke={SWAMP_COLORS.bubbleStroke} strokeWidth={1.2} />

            {/* light reflection: a long arc and a 1/4-sized one behind it */}
            <path d={arcPath(r * 0.72, 215, 265)} className="fill-none stroke-white" strokeWidth={r * 0.16} strokeLinecap="round" />
            <path d={arcPath(r * 0.72, 190, 202)} className="fill-none stroke-white" strokeWidth={r * 0.12} strokeLinecap="round" />
        </motion.g>
    );
}

/** Clockwise arc around the bubble center; angles in degrees, SVG y-axis points down. */
function arcPath(radius: number, fromDeg: number, toDeg: number) {
    const [x0, y0] = polar(radius, fromDeg);
    const [x1, y1] = polar(radius, toDeg);
    return `M ${x0} ${y0} A ${radius} ${radius} 0 0 1 ${x1} ${y1}`;
}

function polar(radius: number, deg: number) {
    const rad = deg * Math.PI / 180;
    return [+(Math.cos(rad) * radius).toFixed(2), +(Math.sin(rad) * radius).toFixed(2)];
}
