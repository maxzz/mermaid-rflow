import { type KeyboardEvent, useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { motion, useReducedMotion } from "motion/react";
import { AppPage, useNavigateToPage } from "@/store/4-ui-app-page-atoms";
import { classNames } from "@/utils";
import { bubbleIdsAtom, puddleHoverAtom, SWAMP_VIEW } from "./3-swamp-atoms";
import { SwampBubble } from "./3-swamp-bubble";

const LABEL = "Enter Labs";
// const LABEL = "Enter Laboratory";
//const LABEL = "Welcome to the labs!";

/**
 * A swamp puddle on the asphalt, seen at an angle from ~1.7 m high and ~7 m away (the octopus' habitat).
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
            <ellipse cx={220} cy={278} rx={212} ry={50} className="fill-stone-500/25 dark:fill-stone-400/15" filter="url(#swamp-blur)" />

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
                    d={PUDDLE_PATH}
                    fill="url(#swamp-water)"
                    className="stroke-lime-600/20 group-hover:stroke-lime-400 group-focus-visible:stroke-lime-300 transition-colors"
                    strokeWidth={2}
                />

                {/* sky reflections on the water surface */}
                <path d="M 96 256 C 130 246, 190 244, 232 247" className="fill-none stroke-white/25" strokeWidth={3} strokeLinecap="round" />
                <path d="M 262 250 C 290 249, 330 253, 350 259" className="fill-none stroke-white/15" strokeWidth={2} strokeLinecap="round" />

                <Duckweed />

                <text
                    x={220}
                    y={284}
                    textAnchor="middle"
                    className="text-lg font-heading font-semibold 1tracking-widest fill-lime-50 group-hover:fill-white uppercase select-none"
                >
                    {LABEL}
                </text>
            </motion.g>

            {!reduceMotion && bubbleIds.map((id) => <SwampBubble key={id} id={id} />)}
        </svg>
    );
}

function SwampDefs() {
    return (
        <defs>
            <radialGradient id="swamp-water" cx="50%" cy="38%" r="65%">
                <stop offset="0%" stopColor="#7CCF49D7" />
                <stop offset="55%" stopColor="#38A60952" />
                <stop offset="100%" stopColor="#61AF4751" />
            </radialGradient>
            <filter id="swamp-blur" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="7" />
            </filter>
        </defs>
    );
}

function Duckweed() {
    return (
        <g className="fill-lime-500/80">
            <ellipse cx={82} cy={282} rx={5} ry={1.8} />
            <ellipse cx={92} cy={287} rx={3.5} ry={1.3} />
            <ellipse cx={352} cy={290} rx={5} ry={1.8} />
            <ellipse cx={340} cy={295} rx={3} ry={1.1} />
            <ellipse cx={300} cy={301} rx={4} ry={1.4} />
            {/* a lily pad with its notch */}
            <path d="M 150 300 a 13 4.5 0 1 1 8 1.2 l -8 -1.2 z" className="fill-green-600" />
        </g>
    );
}

/** Irregular puddle outline; height/width ~0.26 to read as foreshortened ground. */
const PUDDLE_PATH = "\
M 34 276 \
C 30 252, 84 236, 138 240 \
C 170 228, 246 228, 282 238 \
C 336 232, 408 246, 404 270 \
C 418 290, 374 312, 314 312 \
C 268 320, 180 318, 130 312 \
C 76 314, 22 300, 34 276 Z";
