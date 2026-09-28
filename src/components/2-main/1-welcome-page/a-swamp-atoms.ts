import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { surfaceDepthScale } from "./u-swamp-surface";

export type SwampBubbleSpec = {
    seed: number;       // changes on every respawn so the bubble remounts and replays
    startX: number;     // in SWAMP_VIEW units
    startY: number;
    radius: number;
    duration: number;   // seconds
    delay: number;      // seconds
    driftX: number;     // sideways wobble amplitude
};

/** The SVG viewBox; its top edge is aligned with the top of the logo. */
export const SWAMP_VIEW = { width: 440, height: 288 } as const;

/** Area inside the puddle where bubbles surface. */
const PUDDLE_SURFACE = { left: 120, right: 320, top: 248, bottom: 270 } as const;

const SWAMP_LIME = "#7CCF49";
const SWAMP_GREEN = "#38A609";
const SWAMP_MOSS = "#61AF47";

/** Water and bubbles share these hues so the bubbles read as coming out of this swamp. */
export const SWAMP_COLORS = {
    waterCenter: `${SWAMP_LIME}D7`,
    waterMiddle: `${SWAMP_GREEN}52`,
    waterEdge: `${SWAMP_MOSS}51`,
    bubbleFill: `${SWAMP_LIME}26`,
    bubbleStroke: `${SWAMP_GREEN}B3`,
    splashFill: "#F7FEE7",  // pale enough to stand out against the water
    splashStroke: SWAMP_GREEN,
} as const;

let seedCounter = 0;

function rand(min: number, max: number) {
    return min + Math.random() * (max - min);
}

function createRandomBubble(maxDelay: number, durationScale: number): SwampBubbleSpec {
    return {
        seed: ++seedCounter,
        startX: rand(PUDDLE_SURFACE.left, PUDDLE_SURFACE.right),
        startY: rand(PUDDLE_SURFACE.top, PUDDLE_SURFACE.bottom),
        radius: rand(8, 18),
        duration: rand(4, 7) * durationScale,
        delay: rand(0, maxDelay),
        driftX: rand(8, 22) * (Math.random() < 0.5 ? -1 : 1),
    };
}

export const bubbleIdsAtom = atom(Array.from({ length: 2 + Math.floor(Math.random() * 3) }, (_, i) => i));

export const bubbleAtomFamily = atomFamily((_id: number) => atom(createRandomBubble(3, 1)));

export const puddleHoverAtom = atom(false);

/** Bubbles rise faster while the puddle is hovered or focused. */
export const bubbleDurationScaleAtom = atom((get) => get(puddleHoverAtom) ? 0.55 : 1);

export const OctopusPhase = {
    onShore: 'onShore',
    jumping: 'jumping',
    submerged: 'submerged',
    emerging: 'emerging',
} as const;

export type OctopusPhase = typeof OctopusPhase[keyof typeof OctopusPhase];

const BUBBLES_BEFORE_JUMP = 3;

const risenBubblesAtom = atom(0);

export const octopusPhaseAtom = atom<OctopusPhase>(OctopusPhase.onShore);

export const respawnBubbleAtom = atom(
    null,
    (get, set, id: number) => {
        set(bubbleAtomFamily(id), createRandomBubble(1.5, get(bubbleDurationScaleAtom)));

        set(risenBubblesAtom, (count) => count + 1);
        if (get(risenBubblesAtom) >= BUBBLES_BEFORE_JUMP && get(octopusPhaseAtom) === OctopusPhase.onShore) {
            set(octopusPhaseAtom, OctopusPhase.jumping);
        }
    }
);

export type SplashDropSpec = {
    dx: number;         // horizontal distance from the impact point to where the drop falls back
    height: number;     // apex height above the water
    startDx: number;    // where it leaves the water, relative to the impact point
    lean: number;       // how far out (0..1 of dx) the drop is before it turns over at the top
    size: number;       // radius of the round part
    stretch: number;    // tail length relative to size; ~1 is almost round
    duration: number;   // seconds
    delay: number;      // seconds
};

export type SplashSpec = {
    id: number;         // new id replays the splash
    drops: SplashDropSpec[];
};

export const splashAtom = atom<SplashSpec | null>(null);

/**
 * Inner drops fly higher and land closer, like a fountain; every value is jittered so no two splashes match.
 * Flight time follows sqrt(scale) as a real fall would; drops shrink less than the splash so they stay visible.
 */
function createSplashDrops(scale = 1, count = 9 + Math.floor(Math.random() * 5)): SplashDropSpec[] {
    return Array.from({ length: count }, (_, idx) => {
        const side = idx % 2 === 0 ? -1 : 1;
        const spread = rand(0.12, 1);
        const height = 55 + (1 - spread) * 85 + rand(-14, 14);
        return {
            dx: side * (24 + spread * 116) * scale,
            height: height * scale,
            startDx: rand(-5, 5) * scale,
            lean: rand(0.55, 0.95),
            size: rand(1.6, 4.4) * Math.sqrt(scale),
            stretch: rand(0.9, 2.2),
            duration: (0.7 + height / 240 + rand(-0.08, 0.12)) * Math.sqrt(scale),
            delay: rand(0, 0.1),
        };
    });
}

const startSplashAtom = atom(
    null,
    (_get, set) => {
        set(splashAtom, (prev) => ({ id: (prev?.id ?? 0) + 1, drops: createSplashDrops() }));
    }
);

/** The octopus hit the water: splash, then it stays in the swamp until the user enters the lab. */
export const octopusLandedAtom = atom(
    null,
    (_get, set) => {
        set(octopusPhaseAtom, OctopusPhase.submerged);
        set(startSplashAtom);
    }
);

/** The octopus leaves the water with a splash of its own. */
export const octopusLeavingWaterAtom = atom(
    null,
    (_get, set) => {
        set(startSplashAtom);
    }
);

//---------------------------------------------------------------------------

export type SurfaceRingSpec = {
    radius: number;     // final radius on the water plane
    duration: number;   // seconds
    delay: number;      // seconds
};

/** Something small plopped into the swamp; unrelated to the octopus. */
export type AmbientSplashSpec = {
    id: number;
    x: number;          // impact point, in SWAMP_VIEW units
    y: number;
    scale: number;      // relative to the octopus splash, including distance from the viewer
    drops: SplashDropSpec[];
    rings: SurfaceRingSpec[];
    lifetime: number;   // seconds until everything has faded
};

/** Ellipse inside the puddle outline; ambient splashes land within `AMBIENT_REACH` of it to stay clear of the edge. */
const PUDDLE_ELLIPSE = { cx: 220, cy: 258, rx: 185, ry: 19 } as const;
const AMBIENT_REACH = 0.7;

let ambientSplashCounter = 0;

function createAmbientSplash(): AmbientSplashSpec {
    const angle = rand(0, 2 * Math.PI);
    const reach = AMBIENT_REACH * Math.sqrt(Math.random());
    const x = PUDDLE_ELLIPSE.cx + PUDDLE_ELLIPSE.rx * reach * Math.cos(angle);
    const y = PUDDLE_ELLIPSE.cy + PUDDLE_ELLIPSE.ry * reach * Math.sin(angle);

    const size = rand(0.2, 0.32);
    const scale = size * surfaceDepthScale(y);
    const drops = createSplashDrops(scale, 4 + Math.floor(Math.random() * 3));

    const ringRadius = 58 * size; // on the water plane, so distance is applied by the projection
    const rings = Array.from({ length: Math.random() < 0.5 ? 2 : 3 }, (_, idx) => ({
        radius: ringRadius * (1 - idx * 0.2),
        duration: 1.4 + idx * 0.2,
        delay: idx * rand(0.18, 0.26),
    }));

    const lifetime = Math.max(...drops.map((d) => d.delay + d.duration), ...rings.map((r) => r.delay + r.duration)) + 0.1;

    return { id: ++ambientSplashCounter, x, y, scale, drops, rings, lifetime };
}

export const ambientSplashesAtom = atom<AmbientSplashSpec[]>([]);

export const addAmbientSplashAtom = atom(
    null,
    (_get, set) => {
        set(ambientSplashesAtom, (prev) => [...prev, createAmbientSplash()]);
    }
);

export const removeAmbientSplashAtom = atom(
    null,
    (_get, set, id: number) => {
        set(ambientSplashesAtom, (prev) => prev.filter((splash) => splash.id !== id));
    }
);

//---------------------------------------------------------------------------

/** Back on shore: count the bubbles again before the next jump. */
export const octopusEmergedAtom = atom(
    null,
    (_get, set) => {
        set(risenBubblesAtom, 0);
        set(octopusPhaseAtom, OctopusPhase.onShore);
    }
);

/** Clicking the title calls the octopus out of the swamp, or sends it in right away if it is on shore. */
export const summonOctopusAtom = atom(
    null,
    (get, set) => {
        const phase = get(octopusPhaseAtom);
        if (phase === OctopusPhase.submerged) {
            set(octopusPhaseAtom, OctopusPhase.emerging);
        } else if (phase === OctopusPhase.onShore) {
            set(octopusPhaseAtom, OctopusPhase.jumping);
        }
    }
);

export const resetSwampAtom = atom(
    null,
    (_get, set) => {
        set(risenBubblesAtom, 0);
        set(octopusPhaseAtom, OctopusPhase.onShore);
        set(splashAtom, null);
        set(ambientSplashesAtom, []);
    }
);
