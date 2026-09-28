import { type KeyboardEvent, useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { motion, useReducedMotion } from "motion/react";
import { AppPage, useNavigateToPage } from "@/store/4-ui-app-page-atoms";
import { classNames } from "@/utils";
import { bubbleIdsAtom, puddleHoverAtom, SWAMP_COLORS, SWAMP_VIEW } from "./a-swamp-atoms";
import { SwampBubble } from "./6-swamp-bubble";
import { SwampSplash } from "./5-swamp-splash";
import { SWAMP_SURFACE } from "./u-swamp-surface";

/** Centered on the surface origin, so the label's perspective and tilt pivot there. */
const LABEL_BOX = { width: 320, height: 72 } as const;

const LABEL = "Enter Labs";
// const LABEL = "Enter Laboratory";
//const LABEL = "Welcome to the labs!";

/**
 * A swamp puddle on the asphalt, seen at an angle from ~1.7 m high and ~15 m away (the octopus' habitat).
 * The puddle is the button; bubbles rise from it up to the top edge of the SVG.
 */
export function SwampEnterButton({ className }: { className?: string; }) {
    const navigate = useNavigateToPage();
    const setHover = useSetAtom(puddleHoverAtom);
    const bubbleIds = useAtomValue(bubbleIdsAtom);
    const reduceMotion = useReducedMotion();
    const buttonRef = useRef<SVGGElement>(null);

    useEffect(
        () => { buttonRef.current?.focus({ preventScroll: true }); },
        []);

    function onKeyDown(event: KeyboardEvent<SVGGElement>) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigate(AppPage.main);
        }
    }

    return (
        <svg
            className={classNames("overflow-visible pointer-events-none", className)}
            viewBox={`0 0 ${SWAMP_VIEW.width} ${SWAMP_VIEW.height}`}
            preserveAspectRatio="xMidYMax meet"
        >
            <SwampDefs />

            {/* wet asphalt around the puddle */}
            <ellipse cx={220} cy={258} rx={214} ry={26} className="fill-stone-500/25 dark:fill-stone-400/15" filter="url(#swamp-blur)" />

            <motion.g
                ref={buttonRef}
                role="button"
                tabIndex={0}
                aria-label={LABEL}
                className="group outline-none pointer-events-auto cursor-pointer"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                whileFocus={reduceMotion ? undefined : { scale: 1.03 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={{ type: "spring", bounce: 0.3, visualDuration: 0.3 }}
                onClick={() => navigate(AppPage.main)}
                onKeyDown={onKeyDown}
                onPointerEnter={() => setHover(true)}
                onPointerLeave={() => setHover(false)}
                onFocus={() => setHover(true)}
                onBlur={() => setHover(false)}
            >
                <path
                    data-swamp-puddle
                    d={PUDDLE_PATH}
                    fill="url(#swamp-water)"
                    className="stroke-lime-600/20 group-hover:stroke-lime-400 group-focus-visible:stroke-lime-300 transition-colors"
                    strokeWidth={2}
                />

                {/* sky reflections on the water surface */}
                <path d="M 96 245 C 130 243, 190 242, 232 243" className="fill-none stroke-white/25" strokeWidth={2} strokeLinecap="round" />
                <path d="M 262 244 C 290 244, 330 246, 350 249" className="fill-none stroke-white/15" strokeWidth={1.5} strokeLinecap="round" />

                <Duckweed />

                {/* SVG has no 3D transforms, so the label is HTML tilted back to lie on the water, like the Star Wars crawl */}
                <foreignObject
                    x={SWAMP_SURFACE.originX - LABEL_BOX.width / 2}
                    y={SWAMP_SURFACE.originY - LABEL_BOX.height / 2}
                    width={LABEL_BOX.width}
                    height={LABEL_BOX.height}
                    aria-hidden
                >
                    <div className="size-full flex items-center justify-center" style={{ perspective: `${SWAMP_SURFACE.perspective}px` }}>
                        <span
                            className="whitespace-nowrap select-none text-3xl font-heading font-bold 1tracking-widest text-lime-50 group-hover:text-white uppercase"
                            style={{ transform: `rotateX(${SWAMP_SURFACE.tiltDeg}deg)`, textShadow: "0 1px 2px rgb(0 0 0 / 0.45)" }}
                        >
                            {LABEL}
                        </span>
                    </div>
                </foreignObject>
            </motion.g>

            <SwampSplash />

            {!reduceMotion && bubbleIds.map((id) => <SwampBubble key={id} id={id} />)}
        </svg>
    );
}

function SwampDefs() {
    return (
        <defs>
            <radialGradient id="swamp-water" cx="50%" cy="38%" r="65%">
                <stop offset="0%" stopColor={SWAMP_COLORS.waterCenter} />
                <stop offset="55%" stopColor={SWAMP_COLORS.waterMiddle} />
                <stop offset="100%" stopColor={SWAMP_COLORS.waterEdge} />
            </radialGradient>

            <filter id="swamp-blur" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="7" />
            </filter>

            <clipPath id="swamp-puddle-clip">
                <path d={PUDDLE_PATH} />
            </clipPath>
        </defs>
    );
}

function Duckweed() {
    return (
        <g className="fill-lime-500/80">
            <ellipse cx={62} cy={259} rx={5} ry={0.9} />
            <ellipse cx={72} cy={263} rx={3.5} ry={0.7} />
            <ellipse cx={372} cy={261} rx={5} ry={0.9} />
            <ellipse cx={360} cy={266} rx={3} ry={0.6} />
            <ellipse cx={330} cy={272} rx={4} ry={0.7} />
            {/* a lily pad with its notch */}
            <path d="M 90 270 a 13 2.2 0 1 1 8 0.6 l -8 -0.6 z" className="fill-green-600" />
        </g>
    );
}

/** Irregular puddle outline; height/width ~0.11 to read as ground seen from ~1.7 m high at ~15 m (about 6.5 degrees). */
const PUDDLE_PATH = "\
M 34 259 \
C 30 247, 84 240, 138 242 \
C 170 236, 246 236, 282 241 \
C 336 238, 408 245, 404 256 \
C 418 266, 374 276, 314 276 \
C 268 280, 180 279, 130 276 \
C 76 277, 22 270, 34 259 Z";
