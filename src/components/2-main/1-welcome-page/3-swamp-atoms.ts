import { atom } from "jotai";
import { atomFamily } from "jotai-family";

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
} as const;

export type OctopusPhase = typeof OctopusPhase[keyof typeof OctopusPhase];

const BUBBLES_BEFORE_JUMP = 12;

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

/** The octopus hit the water: splash, then it stays in the swamp until the user enters the lab. */
export const octopusLandedAtom = atom(
    null,
    (_get, set) => {
        set(octopusPhaseAtom, OctopusPhase.submerged);
    }
);

export const resetSwampAtom = atom(
    null,
    (_get, set) => {
        set(risenBubblesAtom, 0);
        set(octopusPhaseAtom, OctopusPhase.onShore);
    }
);
