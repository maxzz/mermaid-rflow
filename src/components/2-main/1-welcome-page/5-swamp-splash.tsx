import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { animate, motion, motionValue, useReducedMotion } from "motion/react";
import { addAmbientSplashAtom, type AmbientSplashSpec, ambientSplashesAtom, OctopusPhase, octopusPhaseAtom, removeAmbientSplashAtom, splashAtom, type SplashDropSpec, type SurfaceRingSpec, SWAMP_COLORS } from "./a-swamp-atoms";
import { surfaceCirclePath } from "./u-swamp-surface";

/**
 * A splash each time the octopus enters or leaves the water, and slow ripples while it hides there.
 * Small splashes with rings also pop up now and then anywhere on the swamp.
 */
export function SwampSplash() {
    const phase = useAtomValue(octopusPhaseAtom);
    const splash = useAtomValue(splashAtom);
    const ambientSplashes = useAtomValue(ambientSplashesAtom);
    const reduceMotion = useReducedMotion();

    useAmbientSplashes(!reduceMotion);

    return (<>
        {phase === OctopusPhase.submerged && <HidingRipple />}
        {splash && <SplashBurst key={splash.id} drops={splash.drops} />}
        {ambientSplashes.map(
            (spec) => <AmbientSplash key={spec.id} spec={spec} />
        )}
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

            <Spout x={CENTER_X} y={SURFACE_Y} scale={1} />

            {drops.map(
                (drop, idx) => <SplashDrop key={idx} spec={drop} x={CENTER_X} y={SURFACE_Y} />
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

//---------------------------------------------------------------------------

function useAmbientSplashes(enabled: boolean) {
    const addSplash = useSetAtom(addAmbientSplashAtom);

    useEffect(
        () => {
            if (!enabled) {
                return;
            }

            let timer: ReturnType<typeof setTimeout>;
            const scheduleNext = () => {
                timer = setTimeout(() => { addSplash(); scheduleNext(); }, 1200 + Math.random() * 3300);
            };
            scheduleNext();

            return () => clearTimeout(timer);
        },
        [enabled, addSplash]);
}

function AmbientSplash({ spec }: { spec: AmbientSplashSpec; }) {
    const removeSplash = useSetAtom(removeAmbientSplashAtom);

    useEffect(
        () => {
            const timer = setTimeout(() => removeSplash(spec.id), spec.lifetime * 1000);
            return () => clearTimeout(timer);
        },
        [spec, removeSplash]);

    return (
        <g>
            <g clipPath="url(#swamp-puddle-clip)">
                {spec.rings.map(
                    (ring, idx) => <SurfaceRing key={idx} x={spec.x} y={spec.y} ring={ring} />
                )}
            </g>

            <Spout x={spec.x} y={spec.y} scale={spec.scale} />

            {spec.drops.map(
                (drop, idx) => <SplashDrop key={idx} spec={drop} x={spec.x} y={spec.y} />
            )}
        </g>
    );
}

/** A ring spreading over the water, drawn as a circle on the surface plane so it shares the label's perspective. */
function SurfaceRing({ x, y, ring }: { x: number; y: number; ring: SurfaceRingSpec; }) {
    const ref = useRef<SVGPathElement>(null);

    useEffect(
        () => {
            const el = ref.current;
            if (!el) {
                return;
            }

            const place = (t: number) => el.setAttribute("d", surfaceCirclePath(x, y, ring.radius * (0.06 + 0.94 * t)));
            place(0);

            const progress = motionValue(0);
            const unsubscribe = progress.on("change", place);
            const spread = animate(progress, 1, { duration: ring.duration, delay: ring.delay, ease: "easeOut" });
            const fade = animate(el, { opacity: [0.85, 0] }, { duration: ring.duration, delay: ring.delay, ease: "easeIn" });

            return () => {
                unsubscribe();
                spread.stop();
                fade.stop();
            };
        },
        [x, y, ring]);

    return (
        <path
            ref={ref}
            className="fill-none stroke-white/70"
            strokeWidth={1}
            opacity={0}
        />
    );
}

//---------------------------------------------------------------------------

/** A short column of water thrown straight up at the point of impact. */
function Spout({ x, y, scale }: { x: number; y: number; scale: number; }) {
    return (
        <motion.ellipse
            cx={x}
            cy={y - 30 * scale}
            rx={7 * scale}
            ry={30 * scale}
            fill={SWAMP_COLORS.splashFill}
            stroke={SWAMP_COLORS.splashStroke}
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
            style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
            initial={{ scaleY: 0, scaleX: 0.6, opacity: 1 }}
            animate={{ scaleY: [0, 1, 0.15], scaleX: [0.6, 1, 1.4], opacity: [1, 0.95, 0] }}
            transition={{ duration: 0.7 * Math.sqrt(scale), times: [0, 0.35, 1], ease: ["easeOut", "easeIn"] }}
        />
    );
}

/**
 * The drop flies along a cubic Bezier shaped like a fountain jet: it leaves the water almost vertically,
 * rounds off at the top, and falls steeply. Progress slows near the apex and speeds up on the way down.
 */
function SplashDrop({ spec, x, y }: { spec: SplashDropSpec; x: number; y: number; }) {
    const ref = useRef<SVGPathElement>(null);

    useEffect(
        () => {
            const el = ref.current;
            if (!el) {
                return;
            }

            const curve = dropCurve(spec, { x, y });
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
        [spec, x, y]);

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

function dropCurve({ dx, height, startDx, lean }: SplashDropSpec, origin: Point): [Point, Point, Point, Point] {
    const controlY = origin.y - height * 4 / 3; // puts the curve's apex at `height`
    return [
        { x: origin.x + startDx, y: origin.y },
        { x: origin.x + startDx + dx * 0.04, y: controlY },
        { x: origin.x + dx * lean, y: controlY },
        { x: origin.x + dx, y: origin.y + 2 },
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
