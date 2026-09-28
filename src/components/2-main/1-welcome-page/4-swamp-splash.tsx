import { useAtomValue } from "jotai";
import { motion } from "motion/react";
import { OctopusPhase, octopusPhaseAtom, splashIdAtom, SWAMP_COLORS } from "./3-swamp-atoms";

const CENTER_X = 220;
const SURFACE_Y = 257;

/** Offsets are in SWAMP_VIEW units; the middle drops fly highest, like a splash crown. */
const DROPS = [
    { dx: -92, height: 52, r: 2.2, delay: 0.04 },
    { dx: -70, height: 74, r: 3.2, delay: 0 },
    { dx: -48, height: 96, r: 2.4, delay: 0.02 },
    { dx: -30, height: 112, r: 3.6, delay: 0 },
    { dx: -14, height: 124, r: 2, delay: 0.05 },
    { dx: -4, height: 132, r: 2.8, delay: 0.02 },
    { dx: 8, height: 128, r: 3.4, delay: 0 },
    { dx: 22, height: 116, r: 2.2, delay: 0.03 },
    { dx: 38, height: 100, r: 3, delay: 0 },
    { dx: 56, height: 84, r: 2.6, delay: 0.04 },
    { dx: 76, height: 64, r: 3.2, delay: 0.01 },
    { dx: 96, height: 46, r: 2, delay: 0.05 },
] as const;

const EASE_OUT_QUAD = [0.25, 0.46, 0.45, 0.94] as const;
const EASE_IN_QUAD = [0.55, 0.085, 0.68, 0.53] as const;

const surfaceEllipse = { style: { transformBox: "fill-box", transformOrigin: "center" } } as const;

/** A splash each time the octopus enters or leaves the water, and slow ripples while it hides there. */
export function SwampSplash() {
    const phase = useAtomValue(octopusPhaseAtom);
    const splashId = useAtomValue(splashIdAtom);

    return (
        <>
            {phase === OctopusPhase.submerged && <HidingRipple />}
            {splashId > 0 && <SplashBurst key={splashId} />}
        </>
    );
}

function SplashBurst() {
    return (
        <g>
            <Ripple delay={0} duration={0.9} />
            <Ripple delay={0.18} duration={1.1} />

            <Spout />

            {DROPS.map((drop, idx) => <SplashDrop key={idx} {...drop} />)}
        </g>
    );
}

/** The octopus is still down there. */
function HidingRipple() {
    return (
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
    );
}

/**
 * x moves at a constant speed while y decelerates to the peak and accelerates back down,
 * so each drop traces a parabola that rounds off at the top.
 */
function SplashDrop({ dx, height, r, delay }: typeof DROPS[number]) {
    const duration = 0.55 + height / 220;

    return (
        <motion.circle
            r={r}
            fill={SWAMP_COLORS.splashFill}
            stroke={SWAMP_COLORS.splashStroke}
            strokeWidth={0.8}
            initial={{ x: CENTER_X, y: SURFACE_Y, opacity: 0 }}
            animate={{
                x: [CENTER_X + dx * 0.08, CENTER_X + dx],
                y: [SURFACE_Y, SURFACE_Y - height, SURFACE_Y + 3],
                opacity: [1, 1, 0],
            }}
            transition={{
                x: { duration, delay, ease: "linear" },
                y: { duration, delay, times: [0, 0.48, 1], ease: [EASE_OUT_QUAD, EASE_IN_QUAD] },
                opacity: { duration, delay, times: [0, 0.88, 1] },
            }}
        />
    );
}

/** A short column of water thrown straight up at the point of impact. */
function Spout() {
    return (
        <motion.ellipse
            cx={CENTER_X}
            cy={SURFACE_Y - 30}
            rx={7}
            ry={30}
            fill={SWAMP_COLORS.splashFill}
            stroke={SWAMP_COLORS.splashStroke}
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
            style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
            initial={{ scaleY: 0, scaleX: 0.6, opacity: 1 }}
            animate={{ scaleY: [0, 1, 0.15], scaleX: [0.6, 1, 1.4], opacity: [1, 0.95, 0] }}
            transition={{ duration: 0.7, times: [0, 0.35, 1], ease: ["easeOut", "easeIn"] }}
        />
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
