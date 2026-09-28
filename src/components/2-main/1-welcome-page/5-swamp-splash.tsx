import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { animate, motion, motionValue } from "motion/react";
import { OctopusPhase, octopusPhaseAtom, splashAtom, type SplashDropSpec, SWAMP_COLORS } from "./a-swamp-atoms";

/** A splash each time the octopus enters or leaves the water, and slow ripples while it hides there. */
export function SwampSplash() {
    const phase = useAtomValue(octopusPhaseAtom);
    const splash = useAtomValue(splashAtom);

    return (<>
        {phase === OctopusPhase.submerged && <HidingRipple />}
        {splash && <SplashBurst key={splash.id} drops={splash.drops} />}
    </>);
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

const CENTER_X = 220;
const SURFACE_Y = 257;
const surfaceEllipse = { style: { transformBox: "fill-box", transformOrigin: "center" } } as const;

//---------------------------------------------------------------------------

function SplashBurst({ drops }: { drops: SplashDropSpec[]; }) {
    return (
        <g>
            <Ripple delay={0} duration={0.9} />
            <Ripple delay={0.18} duration={1.1} />

            <Spout />

            {drops.map(
                (drop, idx) => <SplashDrop key={idx} spec={drop} />
            )}
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

/**
 * The drop flies along a cubic Bezier shaped like a fountain jet: it leaves the water almost vertically,
 * rounds off at the top, and falls steeply. Progress slows near the apex and speeds up on the way down.
 */
function SplashDrop({ spec }: { spec: SplashDropSpec; }) {
    const ref = useRef<SVGPathElement>(null);

    useEffect(
        () => {
            const el = ref.current;
            if (!el) {
                return;
            }

            const curve = dropCurve(spec);
            const place = (t: number) => el.setAttribute("transform", dropTransform(curve, t));
            place(0);

            const progress = motionValue(0);
            const unsubscribe = progress.on("change", place);
            const flight = animate(progress, [0, 0.5, 1], { duration: spec.duration, delay: spec.delay, times: [0, 0.5, 1], ease: [EASE_OUT_QUAD, EASE_IN_QUAD] });
            const fade = animate(el, { opacity: [1, 1, 0] }, { duration: spec.duration, delay: spec.delay, times: [0, 0.8, 1] });

            return () => {
                unsubscribe();
                flight.stop();
                fade.stop();
            };
        },
        [spec]);

    return (
        <path
            ref={ref}
            d={teardropPath(spec.size, spec.stretch)}
            fill={SWAMP_COLORS.splashFill}
            stroke={SWAMP_COLORS.splashStroke}
            strokeWidth={0.8}
            opacity={0}
        />
    );
}

const EASE_OUT_QUAD = [0.25, 0.46, 0.45, 0.94] as const;
const EASE_IN_QUAD = [0.55, 0.085, 0.68, 0.53] as const;

type Point = { x: number; y: number; };

function dropCurve({ dx, height, startDx, lean }: SplashDropSpec): [Point, Point, Point, Point] {
    const controlY = SURFACE_Y - height * 4 / 3; // puts the curve's apex at `height`
    return [
        { x: CENTER_X + startDx, y: SURFACE_Y },
        { x: CENTER_X + startDx + dx * 0.04, y: controlY },
        { x: CENTER_X + dx * lean, y: controlY },
        { x: CENTER_X + dx, y: SURFACE_Y + 2 },
    ];
}

/** Position on the curve, with the drop's tail trailing its direction of travel. */
function dropTransform([p0, p1, p2, p3]: [Point, Point, Point, Point], t: number) {
    const u = 1 - t;
    const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
    const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
    const vx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
    const vy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
    const deg = Math.atan2(-vx, vy) * 180 / Math.PI;
    return `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg.toFixed(1)})`;
}

/** Round bottom centered at the origin, tail pointing up (-y). */
function teardropPath(size: number, stretch: number) {
    const tip = size * (1 + stretch);
    const s = size;
    return `M 0 ${-tip} C ${s * 0.45} ${-tip * 0.5}, ${s} ${-s * 0.35}, ${s} 0 A ${s} ${s} 0 0 1 ${-s} 0 C ${-s} ${-s * 0.35}, ${-s * 0.45} ${-tip * 0.5}, 0 ${-tip} Z`;
}
