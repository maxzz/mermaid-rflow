import { useAtomValue } from "jotai";
import { motion } from "motion/react";
import { OctopusPhase, octopusPhaseAtom, SWAMP_COLORS } from "./3-swamp-atoms";

const CENTER_X = 220;
const SURFACE_Y = 257;

const DROPS = [
    { dx: -62, height: 24, r: 2 },
    { dx: -40, height: 40, r: 2.6 },
    { dx: -18, height: 50, r: 1.8 },
    { dx: -4, height: 60, r: 2.4 },
    { dx: 14, height: 46, r: 2.8 },
    { dx: 36, height: 36, r: 2 },
    { dx: 60, height: 22, r: 2.4 },
] as const;

const surfaceEllipse = { style: { transformBox: "fill-box", transformOrigin: "center" } } as const;

/** Splash when the octopus lands, then slow ripples showing where it hides. */
export function SwampSplash() {
    const phase = useAtomValue(octopusPhaseAtom);
    if (phase !== OctopusPhase.submerged) {
        return null;
    }

    return (
        <g>
            <Ripple delay={0} duration={0.9} />
            <Ripple delay={0.18} duration={1.1} />

            {/* the octopus is still down there */}
            <motion.ellipse
                cx={CENTER_X}
                cy={SURFACE_Y}
                rx={60}
                ry={7}
                className="fill-none stroke-white/35"
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
                {...surfaceEllipse}
                initial={{ scale: 0.1, opacity: 0 }}
                animate={{ scale: [0.1, 1], opacity: [0.7, 0] }}
                transition={{ duration: 2.4, ease: "easeOut", delay: 1.4, repeat: Infinity, repeatDelay: 1.8 }}
            />

            {DROPS.map((drop, idx) => (
                <motion.circle
                    key={idx}
                    r={drop.r}
                    fill={SWAMP_COLORS.bubbleStroke}
                    initial={{ x: CENTER_X, y: SURFACE_Y, opacity: 1 }}
                    animate={{
                        x: [CENTER_X, CENTER_X + drop.dx * 0.55, CENTER_X + drop.dx],
                        y: [SURFACE_Y, SURFACE_Y - drop.height, SURFACE_Y + 4],
                        opacity: [1, 1, 0],
                    }}
                    transition={{ duration: 0.7, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"] }}
                />
            ))}
        </g>
    );
}

function Ripple({ delay, duration }: { delay: number; duration: number; }) {
    return (
        <motion.ellipse
            cx={CENTER_X}
            cy={SURFACE_Y}
            rx={110}
            ry={12}
            className="fill-none stroke-white/60"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            {...surfaceEllipse}
            initial={{ scale: 0.05, opacity: 0 }}
            animate={{ scale: [0.05, 1], opacity: [0.9, 0] }}
            transition={{ duration, delay, ease: "easeOut" }}
        />
    );
}
